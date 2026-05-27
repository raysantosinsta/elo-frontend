/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Edit,
  Plus,
  Loader2,
  CheckCircle2,
  Key,
  Building2,
  Briefcase,
  AlertCircle,
  User as UserIcon,
  Phone,
  Mail,
  FileText,
  Shield,
  ChevronsUpDown,
  Check,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Tipos e Enums ---
export enum UserRole {
  MASTER = "MASTER",
  ADMIN = "ADMIN",
  EMPLOYER = "EMPLOYER",
}

interface CompanyRole {
  id: string;
  name: string;
  description?: string;
  level: number;
  status: "ACTIVE" | "INACTIVE";
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserData {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  contact: string;
  document?: string;
  professionalRole?: string;
  companyRoleId?: string;
  password?: string;
  companyId?: string;
}

interface CompanyOption {
  id: string;
  name: string;
  cnpj?: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: UserData | null;
  onSubmit: (values: any) => Promise<void>;
  isLoading: boolean;
  companies: CompanyOption[];
  currentUserRole?: string;
}

// --- Helpers ---
const cleanMask = (value: string | undefined) =>
  value ? value.replace(/\D/g, "") : "";

const removeCountryCode = (phone: string | undefined): string => {
  if (!phone) return "";
  let numbersOnly = phone.replace(/\D/g, "");
  if (numbersOnly.startsWith("55")) {
    numbersOnly = numbersOnly.substring(2);
  }
  return numbersOnly;
};

const formatPhone = (v: string | undefined) => {
  if (!v) return "";
  let cleanNumber = removeCountryCode(v);
  if (cleanNumber.length > 11) cleanNumber = cleanNumber.substring(0, 11);
  if (cleanNumber.length > 10) {
    return cleanNumber.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (cleanNumber.length > 5) {
    return cleanNumber.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  }
  if (cleanNumber.length > 2) {
    return cleanNumber.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  }
  return cleanNumber.replace(/^(\d*)/, "($1");
};

const formatCPF = (v: string | undefined) => {
  if (!v) return "";
  return v
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

// --- Schema com validação condicional ---
const baseUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  contact: z
    .string()
    .refine(
      (val) => cleanMask(val).length >= 10,
      "Telefone inválido (mínimo 10 dígitos)",
    ),
  document: z.string().optional(),
  companyRoleId: z.string().optional(),
  companyId: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

const createUserSchema = (isEditing: boolean, isADM: boolean) => {
  return baseUserSchema.superRefine((data, ctx) => {
    if (!isEditing && isADM && !data.companyRoleId) {
      ctx.addIssue({
        code: "custom",
        message: "Cargo profissional é obrigatório para criar usuários",
        path: ["companyRoleId"],
      });
    }

    if (!isEditing && (!data.password || data.password.length < 6)) {
      ctx.addIssue({
        code: "custom",
        message: "Senha obrigatória (mínimo 6 caracteres)",
        path: ["password"],
      });
    }

    if (data.password && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "As senhas não coincidem",
        path: ["confirmPassword"],
      });
    }
  });
};

type UserFormValues = z.infer<typeof baseUserSchema>;

export function UserFormModal({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isLoading,
  companies,
  currentUserRole,
}: UserFormModalProps) {
  const isEditing = !!initialData;
  const isMaster = currentUserRole === "MASTER";
  const isADM = currentUserRole === "ADMIN";
  const { user } = useAuth();

  const [companyRoles, setCompanyRoles] = useState<CompanyRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [companyOpen, setCompanyOpen] = React.useState(false);

  const userSchema = createUserSchema(isEditing, isADM);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      contact: "",
      document: "",
      companyRoleId: "",
      password: "",
      confirmPassword: "",
      companyId: "",
    },
  });

  // Buscar cargos da empresa (apenas para ADMIN)
  useEffect(() => {
    const fetchCompanyRoles = async () => {
      if (!isADM) {
        setCompanyRoles([]);
        return;
      }

      let targetCompanyId = "";

      if (isMaster) {
        targetCompanyId = form.getValues("companyId") || "";
        if (!targetCompanyId) {
          setCompanyRoles([]);
          setSelectedCompanyName("");
          return;
        }
        const selectedCompany = companies.find((c) => c.id === targetCompanyId);
        setSelectedCompanyName(selectedCompany?.name || "");
      } else {
        targetCompanyId = user?.companyId || "";
        if (!targetCompanyId) {
          setCompanyRoles([]);
          return;
        }
        setSelectedCompanyName(user?.company?.name || "Minha Empresa");
      }

      setLoadingRoles(true);
      try {
        const response = await api.get<{ data: CompanyRole[] }>(
          `/company-roles?limit=100&includeInactive=false`,
        );

        const roles = response.data.data || [];
        const filteredRoles = roles.filter(
          (role) => role.companyId === targetCompanyId,
        );
        setCompanyRoles(filteredRoles);

        if (filteredRoles.length === 0 && !isEditing && isADM) {
          toast.info(
            "Nenhum cargo cadastrado para sua empresa. Crie cargos primeiro.",
            {
              duration: 5000,
              action: {
                label: "Criar Cargos",
                onClick: () => window.open("/company-roles", "_blank"),
              },
            },
          );
        }
      } catch (error: any) {
        console.error("Erro ao buscar cargos:", error);
        toast.error("Erro ao carregar lista de cargos");
        setCompanyRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };

    if (isOpen && isADM) {
      fetchCompanyRoles();
    }
  }, [isOpen, isADM, isMaster, user?.companyId, form, companies, isEditing]);

  // Atualiza o formulário ao abrir
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const phoneWithoutCountryCode = removeCountryCode(initialData.contact);
        const formattedPhone = formatPhone(phoneWithoutCountryCode);

        form.reset({
          name: initialData.name,
          email: initialData.email,
          contact: formattedPhone,
          document: formatCPF(initialData.document || ""),
          companyRoleId: initialData.companyRoleId || "",
          password: "",
          confirmPassword: "",
          companyId: initialData.companyId || "",
        });
      } else {
        form.reset({
          name: "",
          email: "",
          contact: "",
          document: "",
          companyRoleId: "",
          password: "",
          confirmPassword: "",
          companyId: "",
        });
      }
    }
  }, [isOpen, initialData, form]);

  const handleSubmit = async (values: UserFormValues) => {
    console.log("🔍 [MODAL] Valores antes de enviar:", values);

    if (!isEditing && isADM && !values.companyRoleId) {
      toast.error("Selecione um cargo profissional para o usuário");
      form.setError("companyRoleId", {
        message: "Cargo profissional é obrigatório",
      });
      return;
    }

    if (!isEditing && (!values.password || values.password.length < 6)) {
      toast.error("Informe uma senha com pelo menos 6 caracteres");
      return;
    }

    if (!isEditing && isMaster && !values.companyId) {
      form.setError("companyId", { message: "Selecione a empresa" });
      return;
    }

    let professionalRoleName = "";

    if (isADM && values.companyRoleId) {
      const selectedRole = companyRoles.find(
        (role) => role.id === values.companyRoleId,
      );
      if (selectedRole) {
        professionalRoleName = selectedRole.name;
        console.log(`🔍 Cargo encontrado: ${selectedRole.name}`);
      }
    }

    const { confirmPassword, ...dataToSend } = values;

    const payload = {
      ...dataToSend,
      professionalRole: professionalRoleName,
      contact: cleanMask(values.contact),
      document: values.document ? cleanMask(values.document) : undefined,
    };

    console.log("🔍 [MODAL] Payload final (contact sem 55):", payload.contact);
    await onSubmit(payload);
  };

  const handleCompanyChange = (companyId: string) => {
    form.setValue("companyId", companyId);
    form.setValue("companyRoleId", "");

    const selectedCompany = companies.find((c) => c.id === companyId);
    setSelectedCompanyName(selectedCompany?.name || "");

    if (isADM) {
      setTimeout(() => {
        const fetchNewCompanyRoles = async () => {
          setLoadingRoles(true);
          try {
            const response = await api.get<{ data: CompanyRole[] }>(
              `/company-roles?limit=100&includeInactive=false`,
            );
            const roles = response.data.data || [];
            const filteredRoles = roles.filter(
              (role) => role.companyId === companyId,
            );
            setCompanyRoles(filteredRoles);
          } catch (error) {
            console.error("Erro ao buscar cargos:", error);
            setCompanyRoles([]);
          } finally {
            setLoadingRoles(false);
          }
        };
        fetchNewCompanyRoles();
      }, 100);
    }
  };

  const getRoleNameById = (roleId: string) => {
    const role = companyRoles.find((r) => r.id === roleId);
    return role?.name || "";
  };

  const selectedCompany = companies.find((c) => c.id === form.watch("companyId"));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 bg-white">
        {/* Header com cores atualizadas */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-[#F8FAFC] to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2F80ED]/10 rounded-lg text-[#2F80ED]">
              {isEditing ? <Edit size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#353A40]">
                {isEditing ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
              <DialogDescription className="text-[#7A7E83]">
                {isEditing
                  ? "Atualize os dados do usuário"
                  : isMaster
                    ? "Preencha os dados para criar um novo administrador"
                    : "Preencha os dados para criar um novo colaborador"}
              </DialogDescription>
            </div>
            {isADM && !isEditing && (
              <Badge
                variant="outline"
                className="ml-auto bg-[#2F80ED]/10 text-[#2F80ED] border-[#2F80ED]/20"
              >
                Cargo obrigatório
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6 py-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
                autoComplete="off"
              >
                {/* Seleção de Empresa (Apenas para MASTER) */}
                {isMaster && (
                  <div className="space-y-4 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                    <h3 className="text-sm font-semibold text-[#353A40] uppercase flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#2F80ED]" /> Vínculo Empresarial
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="companyId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-[#353A40]">
                            Empresa *
                          </FormLabel>
                          <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={companyOpen}
                                  className="w-full justify-between bg-white border-[#E2E8F0] focus:border-[#2F80ED] text-[#353A40]"
                                >
                                  {field.value && selectedCompany ? (
                                    <span className="flex items-center gap-2 truncate">
                                      <Building2 className="h-4 w-4 text-[#2F80ED] shrink-0" />
                                      <span className="truncate">{selectedCompany.name}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[#7A7E83]">
                                      Selecione uma empresa...
                                    </span>
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full min-w-[300px] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar empresa..." />
                                <CommandList>
                                  <CommandEmpty>
                                    Nenhuma empresa encontrada.
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {companies.map((company) => (
                                      <CommandItem
                                        key={company.id}
                                        value={company.name}
                                        onSelect={() => {
                                          const newValue = company.id === field.value ? "" : company.id;
                                          field.onChange(newValue);
                                          setCompanyOpen(false);
                                          if (newValue) {
                                            handleCompanyChange(company.id);
                                          }
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === company.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span className="font-medium text-[#353A40]">{company.name}</span>
                                          {company.cnpj && (
                                            <span className="text-[10px] text-[#7A7E83]">
                                              CNPJ: {company.cnpj}
                                            </span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#353A40] uppercase flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-[#2F80ED]" />
                    Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#353A40]">Nome Completo *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Ana Silva"
                              {...field}
                              className="focus:border-[#2F80ED] focus:ring-[#2F80ED]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="document"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#353A40]">CPF</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000.000.000-00"
                              {...field}
                              maxLength={14}
                              onChange={(e) =>
                                field.onChange(formatCPF(e.target.value))
                              }
                              className="focus:border-[#2F80ED] focus:ring-[#2F80ED]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator className="bg-[#E2E8F0]" />

                {/* Contato */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#353A40] uppercase flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#2F80ED]" />
                    Contato
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#353A40]">E-mail *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="email@empresa.com"
                              {...field}
                              className="focus:border-[#2F80ED] focus:ring-[#2F80ED]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#353A40]">Telefone *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              maxLength={15}
                              onChange={(e) => {
                                let value = e.target.value;
                                if (value.startsWith("55")) {
                                  value = value.substring(2);
                                }
                                field.onChange(formatPhone(value));
                              }}
                              className="focus:border-[#2F80ED] focus:ring-[#2F80ED]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator className="bg-[#E2E8F0]" />

                {/* SEÇÃO DE CARGO PROFISSIONAL - APENAS PARA ADMIN */}
                {isADM && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[#353A40] uppercase flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-[#2F80ED]" />
                      Cargo Profissional{" "}
                      <span className="text-red-500 text-base">*</span>
                    </h3>

                    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                      {loadingRoles ? (
                        <div className="flex items-center justify-center gap-2 p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-[#2F80ED]" />
                          <span className="text-sm text-[#7A7E83]">
                            Carregando cargos...
                          </span>
                        </div>
                      ) : (
                        <>
                          <FormField
                            control={form.control}
                            name="companyRoleId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#353A40]">
                                  Selecione o cargo *
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value || undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger
                                      className={`bg-white ${
                                        !isEditing && !field.value
                                          ? "border-red-300 focus:border-red-500"
                                          : "focus:border-[#2F80ED] focus:ring-[#2F80ED]"
                                      }`}
                                    >
                                      <SelectValue placeholder="Selecione um cargo">
                                        {field.value
                                          ? getRoleNameById(field.value)
                                          : null}
                                      </SelectValue>
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {companyRoles.map((role) => (
                                      <SelectItem key={role.id} value={role.id}>
                                        <div className="flex flex-col py-1">
                                          <span className="font-medium text-[#353A40]">
                                            {role.name}
                                          </span>
                                          {role.description && (
                                            <span className="text-xs text-[#7A7E83]">
                                              {role.description}
                                            </span>
                                          )}
                                          <span className="text-xs text-[#7A7E83]">
                                            Nível: {role.level}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {companyRoles.length === 0 && !loadingRoles && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-amber-700">
                                <p className="font-medium mb-1">
                                  Nenhum cargo cadastrado para{" "}
                                  {selectedCompanyName || "esta empresa"}
                                </p>
                                <p className="text-xs">
                                  Cadastre cargos profissionais antes de criar
                                  usuários.
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open("/company-roles", "_blank")
                                  }
                                  className="text-[#2F80ED] underline font-medium mt-2 hover:text-[#1E5CB8] transition-colors"
                                >
                                  Clique aqui para criar cargos →
                                </button>
                              </div>
                            </div>
                          )}

                          {!isEditing && (
                            <div className="mt-3 p-2 bg-green-50 border border-green-100 rounded-md">
                              <p className="text-xs text-green-700 flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                Usuários criados por você terão permissão de{" "}
                                <strong>COLABORADOR</strong> com o cargo
                                selecionado.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                <Separator className="bg-[#E2E8F0]" />

                {/* Segurança */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#353A40] uppercase flex items-center gap-2">
                    <Key className="h-4 w-4 text-[#2F80ED]" />
                    Segurança
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#353A40]">
                            {isEditing
                              ? "Nova Senha (opcional)"
                              : "Senha Inicial *"}
                          </FormLabel>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-[#7A7E83]" />
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                className="pl-9 focus:border-[#2F80ED] focus:ring-[#2F80ED]"
                                {...field}
                                autoComplete="new-password"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                          {isEditing && (
                            <p className="text-xs text-[#7A7E83] mt-1">
                              Deixe em branco para manter a senha atual
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#353A40]">
                            {isEditing
                              ? "Confirmar Nova Senha"
                              : "Confirmar Senha"}
                          </FormLabel>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-[#7A7E83]" />
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Repita a senha"
                                className="pl-9 focus:border-[#2F80ED] focus:ring-[#2F80ED]"
                                {...field}
                                autoComplete="new-password"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </div>

        {/* Footer com botões */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-[#E2E8F0] text-[#353A40] hover:bg-[#F8FAFC]"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => form.handleSubmit(handleSubmit)()}
            disabled={isLoading}
            className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white shadow-sm transition-all duration-200 min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Salvando..." : "Criando..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isEditing ? "Salvar Alterações" : "Criar Usuário"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
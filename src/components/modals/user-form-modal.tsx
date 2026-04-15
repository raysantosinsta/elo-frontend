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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// --- Tipos e Enums ---
export enum UserRole {
  MASTER = "MASTER",
  ADMIN = "ADMIN",
  EMPLOYER = "EMPLOYER",
}

interface CompanyRole {
  id: string; // ← ESTA PROPRIEDADE DEVE EXISTIR
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

// --- Helpers e Schema ---
const cleanMask = (value: string | undefined) =>
  value ? value.replace(/\D/g, "") : "";

const baseUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  contact: z
    .string()
    .refine((val) => cleanMask(val).length >= 10, "Telefone inválido"),
  document: z.string().optional(),
  // professionalRole: z.string().optional(),
  companyRoleId: z.string().optional(),
  companyId: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

const userSchema = baseUserSchema.superRefine(
  ({ password, confirmPassword }, ctx) => {
    if (password && password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "As senhas não coincidem",
        path: ["confirmPassword"],
      });
    }
  },
);

type UserFormValues = z.infer<typeof userSchema>;

const formatPhone = (v: string | undefined) => {
  if (!v) return "";
  let r = v.replace(/\D/g, "");
  if (r.length > 11) r = r.substring(0, 11);
  if (r.length > 10) return r.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (r.length > 5) return r.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  if (r.length > 2) return r.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return r.replace(/^(\d*)/, "($1");
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
  const { user } = useAuth();

  const [companyRoles, setCompanyRoles] = useState<CompanyRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      contact: "",
      document: "",
      // professionalRole: "",
      companyRoleId: "",
      password: "",
      confirmPassword: "",
      companyId: "",
    },
  });

  // Buscar cargos da empresa
  useEffect(() => {
    const fetchCompanyRoles = async () => {
      let targetCompanyId = "";

      if (isMaster) {
        targetCompanyId = form.getValues("companyId") || "";
        if (!targetCompanyId) {
          setCompanyRoles([]);
          return;
        }
      } else {
        targetCompanyId = user?.companyId || "";
        if (!targetCompanyId) {
          setCompanyRoles([]);
          return;
        }
      }

      setLoadingRoles(true);
      try {
        const response = await api.get<{ data: CompanyRole[] }>(
          `/company-roles?limit=100&includeInactive=false`,
        );

        const roles = response.data.data || [];
        setCompanyRoles(roles);

        if (roles.length === 0 && !isEditing) {
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

    if (isOpen) {
      fetchCompanyRoles();
    }
  }, [isOpen, isMaster, user?.companyId, form, isEditing]);

  // Atualiza o formulário ao abrir
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          name: initialData.name,
          email: initialData.email,
          contact: formatPhone(initialData.contact),
          document: formatCPF(initialData.document || ""),
          // professionalRole: initialData.professionalRole || "",
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
          // professionalRole: "",
          companyRoleId: "",
          password: "",
          confirmPassword: "",
          companyId: "",
        });
      }
    }
  }, [isOpen, initialData, form]);

  // UserFormModal.tsx

  const handleSubmit = async (values: UserFormValues) => {
    console.log("🔍 [MODAL] Valores antes de enviar:", {
      companyRoleId: values.companyRoleId,
      // professionalRole: values.professionalRole,
    });

    if (!isEditing && (!values.password || values.password.length < 6)) {
      form.setError("password", {
        message: "Senha obrigatória (mín. 6 dígitos)",
      });
      return;
    }

    if (!isEditing && isMaster && !values.companyId) {
      form.setError("companyId", { message: "Selecione a empresa." });
      return;
    }

    // 🔥 BUSCAR O NOME DO CARGO PELO ID
    let professionalRoleName = "";

    if (values.companyRoleId) {
      const selectedRole = companyRoles.find(
        (role) => role.id === values.companyRoleId,
      );
      if (selectedRole) {
        professionalRoleName = selectedRole.name;
        console.log(
          `🔍 Cargo encontrado: ${selectedRole.name} (ID: ${selectedRole.id})`,
        );
      }
    }

    const { confirmPassword, ...dataToSend } = values;

    // 🔥 ENVIA O NOME DO CARGO em vez do ID
    const payload = {
      ...dataToSend,
      professionalRole: professionalRoleName, // 🔥 Envia o NOME (ex: "Modelagem")
    };

    console.log("🔍 [MODAL] Payload final:", payload);

    await onSubmit(payload);
  };

  const handleCompanyChange = (companyId: string) => {
    form.setValue("companyId", companyId);
    form.setValue("companyRoleId", "");
    setTimeout(() => {
      const fetchNewCompanyRoles = async () => {
        setLoadingRoles(true);
        try {
          const response = await api.get<{ data: CompanyRole[] }>(
            `/company-roles?limit=100&includeInactive=false`,
          );
          const roles = response.data.data || [];
          setCompanyRoles(roles);
        } catch (error) {
          console.error("Erro ao buscar cargos:", error);
          setCompanyRoles([]);
        } finally {
          setLoadingRoles(false);
        }
      };
      fetchNewCompanyRoles();
    }, 100);
  };

  const getSelectedRoleName = () => {
    const roleId = form.watch("companyRoleId");
    const role = companyRoles.find((r) => r.id === roleId);
    return role?.name || "";
  };

  const shouldShowRolesSelect = () => {
    if (isMaster) {
      return !!form.watch("companyId");
    }
    return true;
  };

  // 🔥 Função para obter o nome do cargo pelo ID (para mostrar no SelectValue)
  const getRoleNameById = (roleId: string) => {
    const role = companyRoles.find((r) => r.id === roleId);
    return role?.name || "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 bg-white">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded text-orange-600">
              {isEditing ? <Edit size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <DialogTitle>
                {isEditing ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Atualize os dados abaixo."
                  : "Preencha para criar um novo acesso."}
              </DialogDescription>
            </div>
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
                {/* Seleção de Empresa (Apenas para Master) */}
                {isMaster && (
                  <div className="space-y-4 p-4 bg-orange-50 border border-orange-100 rounded-md">
                    <h3 className="text-sm font-bold text-orange-800 uppercase flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Vínculo Empresarial
                    </h3>
                    <FormField
                      control={form.control}
                      name="companyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empresa</FormLabel>
                          <Select
                            onValueChange={handleCompanyChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Selecione a empresa" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                    <span className="w-1 h-4 bg-orange-500 rounded-full" />{" "}
                    Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Ana Silva" {...field} />
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
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000.000.000-00"
                              {...field}
                              maxLength={14}
                              onChange={(e) =>
                                field.onChange(formatCPF(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Acesso e Cargo Profissional */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                    <span className="w-1 h-4 bg-orange-500 rounded-full" />{" "}
                    Acesso & Função
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="email@empresa.com"
                              {...field}
                              autoComplete="off"
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
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              maxLength={15}
                              onChange={(e) =>
                                field.onChange(formatPhone(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* SELEÇÃO DINÂMICA DE CARGOS DA EMPRESA */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-md">
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-700">
                        {isMaster
                          ? "Cargo na Empresa"
                          : "Cargo na Minha Empresa"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="companyRoleId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Selecione o Cargo
                            </FormLabel>

                            {loadingRoles ? (
                              <div className="flex items-center gap-2 p-2 border rounded-md bg-white">
                                <Loader2 className="h-4 w-4 animate-spin text-[#D35400]" />
                                <span className="text-sm text-gray-500">
                                  Carregando cargos...
                                </span>
                              </div>
                            ) : (
                              <>
                                {shouldShowRolesSelect() ? (
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || undefined}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="bg-white">
                                        {/* 🔥 Mostra apenas o nome do cargo selecionado */}
                                        <SelectValue placeholder="Selecione um cargo">
                                          {field.value
                                            ? getRoleNameById(field.value)
                                            : null}
                                        </SelectValue>
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {companyRoles.map((role) => (
                                        <SelectItem
                                          key={role.id}
                                          value={role.id}
                                        >
                                          {/* 🔥 Na lista dropdown, mostra nome + descrição + nível para facilitar escolha */}
                                          <div className="flex flex-col">
                                            <span className="font-medium">
                                              {role.name}
                                            </span>
                                            {role.description && (
                                              <span className="text-xs text-gray-500">
                                                {role.description}
                                              </span>
                                            )}
                                            <span className="text-xs text-gray-400">
                                              Nível: {role.level}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="p-2 border rounded-md bg-gray-50 text-gray-500 text-sm">
                                    {isMaster
                                      ? "Selecione uma empresa primeiro"
                                      : "Carregando..."}
                                  </div>
                                )}

                                {/* Aviso quando não há cargos */}
                                {shouldShowRolesSelect() &&
                                  companyRoles.length === 0 &&
                                  !loadingRoles && (
                                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                                      <div className="text-sm text-amber-700">
                                        <p>
                                          Nenhum cargo cadastrado para esta
                                          empresa.
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            window.open(
                                              "/company-roles",
                                              "_blank",
                                            )
                                          }
                                          className="text-[#D35400] underline font-medium mt-1 hover:text-[#D35400]/80"
                                        >
                                          Clique aqui para criar cargos →
                                        </button>
                                      </div>
                                    </div>
                                  )}
                              </>
                            )}

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* {form.watch("professionalRole") &&
                        getSelectedRoleName() && (
                          <div className="text-xs text-gray-500 mt-1">
                            Cargo profissional: {form.watch("professionalRole")}
                          </div>
                        )} */}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Segurança */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                    <span className="w-1 h-4 bg-orange-500 rounded-full" />{" "}
                    Segurança
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {isEditing
                              ? "Nova Senha (Opcional)"
                              : "Senha Inicial"}
                          </FormLabel>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                className="pl-9"
                                {...field}
                                autoComplete="new-password"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Senha</FormLabel>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Repita a senha"
                                className="pl-9"
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

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => form.handleSubmit(handleSubmit)()}
            disabled={isLoading}
            className="bg-[#D35400] hover:bg-[#D35400]/90 text-white min-w-[120px]"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

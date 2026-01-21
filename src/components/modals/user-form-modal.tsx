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

// --- DADOS DOS CARGOS (Hierarquia) ---
const JOB_HIERARCHY = [
  {
    category: "Gestão e Estratégia",
    roles: [
      "CEO / Diretor Executivo",
      "Sócio / Proprietário",
      "Diretor de Operações (COO)",
      "Gestor de Processos",
    ],
  },
  {
    category: "Administrativo e Financeiro",
    roles: [
      "Analista Financeiro",
      "Assistente Administrativo",
      "Auxiliar de Escritório",
    ],
  },
  {
    category: "Comercial e Vendas",
    roles: ["Gerente Comercial", "Vendedor(a)", "Representante Comercial"],
  },
  {
    category: "Produção e Operacional",
    roles: ["Gerente de Produção", "Supervisor de Qualidade", "Líder de Produção"],
  },
  {
    category: "Tecnologia e Marketing",
    roles: [
      "Analista de Sistemas / TI",
      "Desenvolvedor de Software",
      "Analista de Marketing",
    ],
  },
];

// --- Tipos e Enums ---
export enum UserRole {
  MASTER = "MASTER",
  ADMIN = "ADMIN",
  EMPLOYER = "EMPLOYER",
}

interface UserData {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  contact: string;
  document?: string;
  professionalRole?: string;
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
const cleanMask = (value: string | undefined) => (value ? value.replace(/\D/g, "") : "");

const baseUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  contact: z.string().refine((val) => cleanMask(val).length >= 10, "Telefone inválido"),
  document: z.string().optional(),
  professionalRole: z.string().optional(), // O cargo final será salvo aqui
  companyId: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

const userSchema = baseUserSchema.superRefine(({ password, confirmPassword }, ctx) => {
  if (password && password !== confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "As senhas não coincidem",
      path: ["confirmPassword"],
    });
  }
});

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

// Helper para encontrar a categoria com base no cargo (para edição)
const findCategoryByRole = (role: string) => {
  const found = JOB_HIERARCHY.find((cat) => cat.roles.includes(role));
  return found ? found.category : "";
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

  // Estado local para controlar a categoria selecionada (o Select Pai)
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      contact: "",
      document: "",
      professionalRole: "",
      password: "",
      confirmPassword: "",
      companyId: "",
    },
  });

  // Atualiza o formulário ao abrir
 // Atualiza o formulário ao abrir
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Lógica de Edição
        const category = initialData.professionalRole
          ? findCategoryByRole(initialData.professionalRole)
          : "";
        
        // 1. Resetar o formulário (Dados principais)
        form.reset({
          name: initialData.name,
          email: initialData.email,
          contact: formatPhone(initialData.contact),
          document: formatCPF(initialData.document || ""),
          professionalRole: initialData.professionalRole || "",
          password: "",
          confirmPassword: "",
          companyId: initialData.companyId || "",
        });

        // 2. Atualizar o estado visual (Select Pai)
        // Usamos setTimeout para evitar o erro "setState synchronously within an effect"
        setTimeout(() => {
          setSelectedCategory(category);
        }, 0);

      } else {
        // Lógica de Criação
        form.reset({
          name: "",
          email: "",
          contact: "",
          document: "",
          professionalRole: "",
          password: "",
          confirmPassword: "",
          companyId: "",
        });

        setTimeout(() => {
          setSelectedCategory("");
        }, 0);
      }
    }
  }, [isOpen, initialData, form]);

  const handleSubmit = async (values: UserFormValues) => {
    if (!isEditing && (!values.password || values.password.length < 6)) {
      form.setError("password", { message: "Senha obrigatória (mín. 6 dígitos)" });
      return;
    }

    if (!isEditing && isMaster && !values.companyId) {
      form.setError("companyId", { message: "Selecione a empresa." });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...dataToSend } = values;
    await onSubmit(dataToSend);
  };

  // Filtra os cargos baseados na categoria selecionada no estado
  const currentRoles = JOB_HIERARCHY.find((c) => c.category === selectedCategory)?.roles || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 bg-white">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded text-orange-600">
              {isEditing ? <Edit size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <DialogTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Atualize os dados abaixo." : "Preencha para criar um novo acesso."}
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
                {/* Seleção de Empresa (Master) */}
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
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                    <span className="w-1 h-4 bg-orange-500 rounded-full" /> Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl><Input placeholder="Ex: Ana Silva" {...field} /></FormControl>
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
                            <Input placeholder="000.000.000-00" {...field} maxLength={14} onChange={(e) => field.onChange(formatCPF(e.target.value))} />
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
                    <span className="w-1 h-4 bg-orange-500 rounded-full" /> Acesso & Função
                  </h3>

                  {/* Linha de Contatos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input placeholder="email@empresa.com" {...field} autoComplete="off" />
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
                            <Input placeholder="(00) 00000-0000" {...field} maxLength={15} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 🔥 LÓGICA DO SELECT E SUB-SELECT */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-md">
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-700">Cargo na Empresa</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Select de Categoria (Controla apenas o estado local) */}
                      <div className="space-y-2">
                        <FormLabel className="text-xs">Área / Departamento</FormLabel>
                        <Select
                          value={selectedCategory}
                          onValueChange={(val) => {
                            setSelectedCategory(val);
                            form.setValue("professionalRole", ""); // Limpa o cargo ao mudar categoria
                          }}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Selecione o departamento" />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_HIERARCHY.map((item) => (
                              <SelectItem key={item.category} value={item.category}>
                                {item.category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 2. Select de Cargo (Conectado ao formulário) */}
                      <FormField
                        control={form.control}
                        name="professionalRole"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Cargo Específico</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                              disabled={!selectedCategory} // Desabilita se não tiver categoria
                            >
                              <FormControl>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder={selectedCategory ? "Selecione o cargo" : "Selecione a área primeiro"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {currentRoles.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Segurança */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                    <span className="w-1 h-4 bg-orange-500 rounded-full" /> Segurança
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isEditing ? "Nova Senha (Opcional)" : "Senha Inicial"}</FormLabel>
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
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => form.handleSubmit(handleSubmit)()} disabled={isLoading} className="bg-[#D35400] hover:bg-[#D35400]/90 text-white min-w-[120px]">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
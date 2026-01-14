/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  Edit,
  Key,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Power,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

// --- Imports de Serviços e Contextos ---
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/error-context";
import { api } from "@/services/api";

// --- Imports de Componentes UI (Shadcn/UI) ---
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// --- Componentes Customizados (Tabela e Filtro) ---
import { CompanyFilter } from "@/components/company-filter";
import { Column, GenericTable } from "@/components/generic-table";

// --- Enums & Interfaces ---
enum UserRole {
  MASTER = "MASTER",
  ADMIN = "ADMIN",
  EMPLOYER = "EMPLOYER",
}

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
  contact: string;
  professionalRole?: string;
  document?: string;
  companyId: string;
  company?: { name: string };
  createdAt: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

// --- Helpers de Máscaras ---
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

const cleanMask = (value: string | undefined) => value ? value.replace(/\D/g, "") : "";

// --- Zod Schema ---
const userFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  role: z.nativeEnum(UserRole, { error: "Permissão inválida" }),
  contact: z.string().refine((val) => cleanMask(val).length >= 10, "Telefone inválido"),
  document: z.string().optional(),
  professionalRole: z.string().optional(),
  password: z.string().optional(),
  companyId: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

// --- Componente Principal ---
export default function UserManagementPage() {
  const router = useRouter();
  const { showError } = useError();
  const { user: currentUser, loading: authLoading } = useAuth();

  // Estados
  const [users, setUsers] = useState<User[]>([]);
  const [companiesList, setCompaniesList] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtro de Empresa (Lista Principal)
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>(undefined);

  // Estados de UI (Modais)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);

  // Estado de Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isMaster = currentUser?.role === "MASTER";
  const canManage = isMaster || currentUser?.role === "ADMIN";

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "", email: "", role: UserRole.EMPLOYER,
      contact: "", document: "", professionalRole: "", password: "", companyId: ""
    },
  });

  // --- 1. Carregar lista de empresas (Select) ---
  // --- 1. Carregar lista de empresas (Select) ---
  useEffect(() => {
    if (isMaster) {
      // Adicionamos '&page=1' para garantir que vem do início
      api.get('/companies?limit=100&page=1').then((response) => {
        // O backend retorna { data: [...], total: ... }
        // Precisamos garantir que estamos pegando o array .data
        const data = response.data.data || [];

        // Ordenação para ficar bonito no Select (Opcional)
        const sortedData = data.sort((a: any, b: any) => a.name.localeCompare(b.name));

        setCompaniesList(sortedData);
      }).catch(err => {
        console.error("Erro ao carregar empresas", err);
        toast.error("Erro ao carregar lista de empresas.");
      });
    }
  }, [isMaster]);

  // --- 2. Carregar Usuários ---
  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "100");
      params.append("page", "1");

      if (isMaster && filterCompanyId) {
        params.append("companyId", filterCompanyId);
      }

      const response = await api.get<{ data: User[], total: number } | User[]>(`/users?${params.toString()}`);

      let data: User[] = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      }

      setUsers(data);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isMaster, filterCompanyId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- 3. Submit (Create / Update) ---
  const onSubmit = async (values: UserFormValues) => {
    console.log("📝 [Frontend] Iniciando Submit. Valores brutos:", values);

    if (!isEditing && (!values.password || values.password.length < 6)) {
      form.setError("password", { message: "Senha obrigatória (mín. 6 dígitos)" });
      return;
    }

    // Regra: Master deve selecionar empresa
    if (!isEditing && isMaster && !values.companyId && values.role !== UserRole.MASTER) {
      console.warn("⚠️ [Frontend] Master tentou criar sem selecionar empresa.");
      form.setError("companyId", { message: "Selecione a empresa para este usuário." });
      return;
    }

    setIsFormLoading(true);

    const payload: any = {
      ...values,
      contact: cleanMask(values.contact),
      document: cleanMask(values.document),
    };

    // Lógica de envio do ID
    if (isMaster) {
      payload.companyId = values.companyId;
      console.log("👑 [Frontend] Usuário é MASTER. Enviando companyId:", payload.companyId);
    } else {
      delete payload.companyId;
      console.log("👤 [Frontend] Usuário é ADMIN. Removendo companyId (Backend injeta).");
    }

    console.log("🚀 [Frontend] Payload Final enviado para API:", payload);

    try {
      if (isEditing && editingId) {
        await api.patch(`/users/${editingId}`, payload);
        toast.success("Usuário atualizado!");
        fetchUsers();
      } else {
        const { data: newUser } = await api.post<User>("/users", payload);
        toast.success("Usuário criado!");
        console.log("✅ [Frontend] Usuário criado com sucesso:", newUser);

        const shouldShow =
          (!isMaster) ||
          (isMaster && !filterCompanyId) ||
          (isMaster && filterCompanyId === newUser.companyId);

        if (shouldShow) {
          setUsers(prev => [newUser, ...prev]);
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error("❌ [Frontend] Erro na requisição:", error);
    } finally {
      setIsFormLoading(false);
    }
  };

  // --- Actions ---
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus as any } : u));
    try {
      await api.patch(`/users/${id}/status/${newStatus}`);
      toast.success(`Status alterado para ${newStatus}`);
    } catch {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: currentStatus as any } : u));
      toast.error("Erro ao alterar status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${deleteId}`);
      setUsers(prev => prev.filter(u => u.id !== deleteId));
      toast.success("Usuário excluído.");
      setIsDeleteOpen(false);
    } catch {
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Modais Helpers ---
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    // Se estiver filtrando na tela, já abre o modal com a empresa selecionada
    form.reset({
      name: "", email: "", role: UserRole.EMPLOYER,
      contact: "", document: "", professionalRole: "", password: "",
      companyId: (isMaster && filterCompanyId) ? filterCompanyId : ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setIsEditing(true);
    setEditingId(user.id);
    form.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      contact: formatPhone(user.contact),
      document: formatCPF(user.document || ""),
      professionalRole: user.professionalRole || "",
      password: "",
      companyId: user.companyId || ""
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.reset();
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  }, [users, searchTerm]);

  // --- Colunas ---
  const columns: Column<User>[] = useMemo(() => {
    const cols: Column<User>[] = [
      {
        header: "Usuário",
        className: "w-[280px]",
        cell: (user) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border border-orange-200">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-slate-800">{user.name}</span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Mail className="h-3 w-3" /> {user.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Permissão",
        cell: (user) => (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="w-fit text-[10px] uppercase">
              {user.role}
            </Badge>
            {user.professionalRole && (
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> {user.professionalRole}
              </span>
            )}
          </div>
        )
      }
    ];

    if (isMaster) {
      cols.push({
        header: "Empresa",
        cell: (user) => (
          <div className="flex items-center gap-1 text-sm text-slate-600">
            <Building2 className="h-3 w-3 text-slate-400" />
            {user.company?.name || "N/A"}
          </div>
        )
      });
    }

    cols.push(
      {
        header: "Contato",
        cell: (user) => (
          <div className="flex flex-col text-sm text-slate-600">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {formatPhone(user.contact)}</span>
            {user.document && <span className="text-xs text-slate-400 pl-4">{formatCPF(user.document)}</span>}
          </div>
        )
      },
      {
        header: "Status",
        cell: (user) => (
          <Badge className={user.status === "ACTIVE" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
            {user.status === "ACTIVE" ? "Ativo" : "Inativo"}
          </Badge>
        )
      }
    );

    if (canManage) {
      cols.push({
        header: "Ações",
        className: "text-right",
        cell: (user) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleOpenEdit(user)}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.status)}>
                <Power className="mr-2 h-4 w-4" /> {user.status === "ACTIVE" ? "Desativar" : "Ativar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => { setDeleteId(user.id); setIsDeleteOpen(true); }}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      });
    }

    return cols;
  }, [isMaster, canManage]);

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="min-h-screen w-full bg-[#F5F0E6] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2D3436]">Usuários</h1>
            <p className="text-[#95A5A6]">Gerencie o acesso ao sistema.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Filtro da Lista */}
            {isMaster && (
              <CompanyFilter value={filterCompanyId} onChange={setFilterCompanyId} />
            )}

            {canManage && (
              <Button onClick={handleOpenCreate} className="bg-[#D35400] hover:bg-[#D35400]/90 text-white w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Novo Usuário
              </Button>
            )}
          </div>
        </div>

        {/* Tabela */}
        <GenericTable
          title="Lista de Usuários"
          data={filteredUsers}
          columns={columns}
          isLoading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          emptyMessage="Nenhum usuário encontrado."
        />

        {/* Modal */}
        <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 bg-white">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50">
              <DialogTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
              <DialogDescription>{isEditing ? "Atualize os dados abaixo." : "Preencha para criar um novo acesso."}</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-6 py-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* 🔥 SELECÃO DE EMPRESA (APENAS MASTER) */}
                    {isMaster && (
                      <div className="space-y-4 p-4 bg-orange-50 border border-orange-100 rounded-md">
                        <h3 className="text-sm font-bold text-orange-800 uppercase flex items-center gap-2">
                          <Building2 className="h-4 w-4" /> Vínculo Empresarial
                        </h3>
                        <FormField control={form.control} name="companyId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Empresa</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Selecione a empresa" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {companiesList.map((company) => (
                                  <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {/* Dados Pessoais */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                        <span className="w-1 h-4 bg-orange-500 rounded-full" /> Dados Pessoais
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: Ana Silva" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="document" render={({ field }) => (
                          <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} maxLength={14} onChange={e => field.onChange(formatCPF(e.target.value))} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>

                    <Separator />

                    {/* Acesso e Cargo */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                        <span className="w-1 h-4 bg-orange-500 rounded-full" /> Acesso
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="email@empresa.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="contact" render={({ field }) => (
                          <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} maxLength={15} onChange={e => field.onChange(formatPhone(e.target.value))} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="role" render={({ field }) => (
                          <FormItem><FormLabel>Permissão</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {currentUser?.role === 'MASTER' && <SelectItem value={UserRole.MASTER}>Master</SelectItem>}
                                <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                                <SelectItem value={UserRole.EMPLOYER}>Colaborador</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="professionalRole" render={({ field }) => (
                          <FormItem><FormLabel>Cargo Profissional</FormLabel><FormControl><Input placeholder="Ex: Vendedor" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>

                    <Separator />

                    {/* Segurança */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                        <span className="w-1 h-4 bg-orange-500 rounded-full" /> Segurança
                      </h3>
                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem className="max-w-md">
                          <FormLabel>{isEditing ? "Nova Senha (Opcional)" : "Senha Inicial"}</FormLabel>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <FormControl><Input type="password" placeholder="Mínimo 6 caracteres" className="pl-9" {...field} /></FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </form>
                </Form>
              </ScrollArea>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseModal}>Cancelar</Button>
              <Button onClick={() => form.handleSubmit(onSubmit)()} disabled={isFormLoading} className="bg-[#D35400] hover:bg-[#D35400]/90 text-white">
                {isFormLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {isEditing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Alerta de Exclusão */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" /> Atenção</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir este usuário? Esta ação é irreversível.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
                {isDeleting ? "Excluindo..." : "Sim, Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
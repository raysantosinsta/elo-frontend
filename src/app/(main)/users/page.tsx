/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  MoreHorizontal,
  Mail,
  User as UserIcon,
  Shield,
  Phone,
  Briefcase,
  Edit,
  Trash2,
  Power,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Serviços e Contextos
import { api } from "@/services/api";
import { useError } from "@/contexts/error-context";
import { useAuth } from "@/contexts/AuthContext";

// Componentes UI (Design System)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Componentes Customizados
import { GenericTable, Column } from "@/components/generic-table";
import { CompanyFilter } from "@/components/company-filter";

// --- Enums & Types ---
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
  createdAt: string;
}

// --- Helpers de Máscara (Padronizado) ---
const formatPhone = (v: string | undefined) => {
  if (!v) return "";
  let r = v.replace(/\D/g, "");
  if (r.length > 11) r = r.substring(0, 11);

  if (r.length > 10) { // (11) 98888-8888
    return r.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (r.length > 5) { // (11) 8888-8888
    return r.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else if (r.length > 2) {
    return r.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  }
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

const cleanMask = (value: string | undefined) => {
  if (!value) return "";
  return value.replace(/\D/g, "");
};

// --- Zod Schemas ---
const userFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Formato de e-mail inválido"),
  role: z.nativeEnum(UserRole, { error: "Permissão inválida" }),
  contact: z.string().refine((val) => cleanMask(val).length >= 10, "Telefone inválido (mínimo 10 dígitos)"),
  document: z.string().optional(), 
  professionalRole: z.string().optional(),
  password: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UserManagementPage() {
  const router = useRouter();
  const { showError } = useError();
  const { user: currentUser } = useAuth();

  // --- States ---
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filtro de Empresa
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>(undefined);

  // Control States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Permission Logic (RBAC) ---
  const isMaster = currentUser?.role === "MASTER";
  const canManage = isMaster || currentUser?.role === "ADMIN";

  // --- Form Setup ---
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: UserRole.EMPLOYER,
      contact: "",
      document: "",
      professionalRole: "",
      password: "",
    },
  });

  // --- API Actions ---
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append("limit", "100");
      // Se tiver filtro selecionado E for Master, envia na query.
      // Se for Admin, o backend ignora a query e usa o token.
      if (filterCompanyId) {
        params.append("companyId", filterCompanyId);
      }

      const response = await api.get<{ data: User[] }>(`/users?${params.toString()}`);
      setUsers(Array.isArray(response.data) ? response.data : []); 
    } catch (error: any) {
      console.error("Erro fetch:", error);
    } finally {
      setLoading(false);
    }
  }, [filterCompanyId]);

  useEffect(() => {
    if (currentUser) fetchUsers();
  }, [fetchUsers, currentUser]);

  // --- Submit (Create or Update) ---
  const onSubmit = async (values: UserFormValues) => {
    // Validação de senha na criação
    if (!isEditing && (!values.password || values.password.length < 6)) {
      form.setError("password", { message: "Senha obrigatória (min. 6 caracteres)" });
      return;
    }

    if (!canManage) {
        toast.error("Permissão negada.");
        return;
    }

    // 🔥 REGRA DO MASTER: Precisa selecionar a empresa no filtro antes de criar
    if (!isEditing && isMaster && !filterCompanyId) {
        toast.error("Como Master, selecione uma empresa no filtro superior para criar um usuário nela.");
        return;
    }

    // Preparação do Payload
    const payload: any = {
        ...values,
        contact: cleanMask(values.contact),
        document: cleanMask(values.document),
    };

    // 🔥 INJEÇÃO DE CONTEXTO PARA MASTER
    // Se for Master criando, injetamos o ID da empresa selecionada no filtro
    if (!isEditing && isMaster && filterCompanyId) {
        payload.companyId = filterCompanyId;
    }

    // Se for ADMIN, não enviamos companyId. O Backend pega do token.

    setIsFormLoading(true);
    try {
      if (isEditing && editingId) {
        // PATCH
        await api.patch(`/users/${editingId}`, payload);
        toast.success("Usuário atualizado com sucesso!");
        
        // Atualização Otimista
        setUsers((prev) => prev.map((u) => u.id === editingId ? { ...u, ...payload, role: values.role } as User : u));
      } else {
        // POST
        const { data: newUser } = await api.post<User>("/users", payload);
        toast.success("Usuário criado com sucesso!");
        setUsers((prev) => [newUser, ...prev]);
      }
      handleCloseModal();
    } catch (error) {
      // Interceptor trata erro visual
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!canManage) return;
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/users/${id}/status/${newStatus}`);
      toast.success(`Usuário ${newStatus === 'ACTIVE' ? 'ativado' : 'desativado'}`);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: newStatus } : u));
    } catch (error) { }
  };

  const handleDelete = async () => {
    if (!deleteId || !canManage) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${deleteId}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteId));
      toast.success("Usuário removido permanentemente.");
      setIsDeleteOpen(false);
    } catch (error) {
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Modal Controllers ---
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    form.reset({
        name: "",
        email: "",
        role: UserRole.EMPLOYER,
        contact: "",
        document: "",
        professionalRole: "",
        password: "",
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
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.reset();
  };

  // --- Filter Logic (Busca Local) ---
  const filteredUsers = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase();
    return users.filter(u => 
      u.name.toLowerCase().includes(lowerTerm) || 
      u.email.toLowerCase().includes(lowerTerm)
    );
  }, [users, searchTerm]);

  // --- Table Columns ---
  const columns: Column<User>[] = useMemo(() => {
    const baseCols: Column<User>[] = [
      {
        header: "Usuário",
        className: "w-[300px]",
        cell: (user) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#2C3E50]/10 flex items-center justify-center text-[#2C3E50] font-bold text-sm border border-[#2C3E50]/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[#2D3436]">{user.name}</span>
              <span className="text-xs text-[#95A5A6] flex items-center gap-1">
                <Mail className="h-3 w-3" /> {user.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Cargo / Função",
        cell: (user) => (
          <div className="flex flex-col gap-1">
            <Badge 
              variant="secondary" 
              className={`w-fit text-[10px] ${
                user.role === 'MASTER' ? 'bg-purple-100 text-purple-700' :
                user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}
            >
              {user.role}
            </Badge>
            {user.professionalRole && (
              <span className="text-xs text-[#2C3E50] flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-[#D35400]" /> {user.professionalRole}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Contato",
        cell: (user) => (
          <div className="flex flex-col">
             <span className="text-sm text-[#95A5A6] flex items-center gap-1">
                <Phone className="h-3 w-3" /> {formatPhone(user.contact)}
             </span>
             {user.document && (
                 <span className="text-[10px] text-[#95A5A6] ml-4">
                    CPF: {formatCPF(user.document)}
                 </span>
             )}
          </div>
        ),
      },
      {
        header: "Status",
        cell: (user) => (
          <Badge
            variant="outline"
            className={
              user.status === "ACTIVE"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }
          >
            {user.status === "ACTIVE" ? "Ativo" : "Inativo"}
          </Badge>
        ),
      },
    ];

    if (canManage) {
      baseCols.push({
        header: "Ações",
        className: "text-right",
        cell: (user) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-[#2C3E50] hover:text-[#D35400] hover:bg-transparent">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleOpenEdit(user)}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.status)}>
                <Power className="mr-2 h-4 w-4" /> 
                {user.status === "ACTIVE" ? "Desativar" : "Ativar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600" 
                onClick={() => { setDeleteId(user.id); setIsDeleteOpen(true); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      });
    }

    return baseCols;
  }, [canManage]);

  return (
    <div className="min-h-screen w-full bg-[#F5F0E6] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- Header --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-[#2D3436]">Usuários</h1>
            <p className="text-[#95A5A6]">Gerencie o acesso e a equipe.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            
            {/* 🔥 FILTRO DE EMPRESA: Se Master mudar aqui, define onde o user será criado */}
            {canManage && (
              <CompanyFilter 
                value={filterCompanyId} 
                onChange={setFilterCompanyId} 
              />
            )}

            {canManage && (
              <Button
                onClick={handleOpenCreate}
                className="bg-[#D35400] hover:bg-[#D35400]/90 text-white shadow-md transition-transform hover:scale-105 active:scale-95 w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" /> Novo Usuário
              </Button>
            )}
          </div>
        </div>

        {/* --- Generic Table --- */}
        <GenericTable
          title="Equipe Registrada"
          data={filteredUsers}
          columns={columns}
          isLoading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          emptyMessage="Nenhum usuário encontrado."
        />

        {/* --- Create/Edit Modal --- */}
        <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden bg-white border-[#F5F0E6]">
            <DialogHeader className="px-6 py-4 border-b border-[#F5F0E6] bg-[#F5F0E6]/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#F5F0E6] rounded text-[#D35400]">
                  {isEditing ? <Edit size={20} /> : <UserIcon size={20} />}
                </div>
                <div>
                  <DialogTitle className="text-[#2D3436] text-xl">
                    {isEditing ? "Editar Usuário" : "Novo Usuário"}
                  </DialogTitle>
                  <DialogDescription className="text-[#95A5A6]">
                    {isEditing ? "Atualize as informações do colaborador." : "Cadastre um novo membro na equipe."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-6 py-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
                    
                    {/* Seção 1: Dados Pessoais */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-[#D35400] rounded-full" /> Dados Pessoais
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#2D3436]">Nome Completo</FormLabel>
                            <FormControl><Input placeholder="João Silva" {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                            <FormMessage className="text-[#D35400]" />
                          </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="document" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#2D3436]">Documento (CPF)</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="000.000.000-00" 
                                    {...field} 
                                    maxLength={14}
                                    onChange={(e) => field.onChange(formatCPF(e.target.value))}
                                    className="focus-visible:ring-[#2C3E50]" 
                                />
                            </FormControl>
                            <FormMessage className="text-[#D35400]" />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <Separator className="bg-[#95A5A6]/20" />

                    {/* Seção 2: Contato & Acesso */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-[#D35400] rounded-full" /> Acesso e Contato
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#2D3436]">E-mail (Login)</FormLabel>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#95A5A6]" />
                                <FormControl><Input placeholder="joao@empresa.com" {...field} className="pl-9 focus-visible:ring-[#2C3E50]" /></FormControl>
                            </div>
                            <FormMessage className="text-[#D35400]" />
                          </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="contact" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#2D3436]">Telefone / WhatsApp</FormLabel>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[#95A5A6]" />
                                <FormControl>
                                    <Input 
                                        placeholder="(00) 00000-0000" 
                                        {...field} 
                                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                        maxLength={15}
                                        className="pl-9 focus-visible:ring-[#2C3E50]" 
                                    />
                                </FormControl>
                            </div>
                            <FormMessage className="text-[#D35400]" />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="role" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#2D3436]">Permissão do Sistema</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="focus:ring-[#2C3E50]">
                                  <SelectValue placeholder="Selecione um cargo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {currentUser?.role === 'MASTER' && <SelectItem value={UserRole.MASTER}>Master</SelectItem>}
                                <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                                <SelectItem value={UserRole.EMPLOYER}>Employer (Colaborador)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[#D35400]" />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="professionalRole" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#2D3436]">Cargo Profissional</FormLabel>
                            <FormControl><Input placeholder="Ex: Vendedor, Motorista" {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                            <FormMessage className="text-[#D35400]" />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <Separator className="bg-[#95A5A6]/20" />

                    {/* Seção 3: Segurança */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-[#D35400] rounded-full" /> Segurança
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="password" render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel className="text-[#2D3436]">
                                {isEditing ? "Nova Senha (Opcional)" : "Senha de Acesso"}
                            </FormLabel>
                            <div className="relative">
                                <Key className="absolute left-3 top-2.5 h-4 w-4 text-[#95A5A6]" />
                                <FormControl>
                                    <Input 
                                        type="password" 
                                        placeholder={isEditing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"} 
                                        {...field} 
                                        className="pl-9 focus-visible:ring-[#2C3E50]" 
                                    />
                                </FormControl>
                            </div>
                            <FormMessage className="text-[#D35400]" />
                          </FormItem>
                        )} />
                        
                        {isEditing && (
                            <div className="flex items-center p-4 bg-yellow-50 rounded-md border border-yellow-200 text-sm text-yellow-800 md:col-span-2">
                                <Shield className="h-5 w-5 mr-2" />
                                <span>Alterar a senha desconectará o usuário de todas as sessões ativas.</span>
                            </div>
                        )}
                      </div>
                    </div>

                  </form>
                </Form>
              </ScrollArea>
            </div>

            <div className="px-6 py-4 border-t border-[#F5F0E6] bg-[#F5F0E6]/30 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={handleCloseModal} className="border-[#95A5A6] text-[#2D3436]">Cancelar</Button>
              <Button 
                onClick={() => form.handleSubmit(onSubmit)()} 
                disabled={isFormLoading} 
                className="bg-[#D35400] hover:bg-[#D35400]/90 text-white min-w-[140px]"
              >
                {isFormLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {isEditing ? "Salvar Alterações" : "Criar Usuário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* --- Delete Alert --- */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#D35400]">
                <AlertTriangle className="h-5 w-5" /> Atenção
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#2D3436]">
                Tem certeza que deseja excluir este usuário? Esta ação removerá o acesso ao sistema imediatamente e é irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="text-[#2D3436]">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => { e.preventDefault(); handleDelete(); }} 
                disabled={isDeleting} 
                className="bg-[#D35400] hover:bg-[#D35400]/90 text-white"
              >
                {isDeleting ? "Excluindo..." : "Sim, excluir usuário"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
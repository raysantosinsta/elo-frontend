/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  AlertTriangle,
  Briefcase,
  Building2,
  Edit,
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
import { toast } from "sonner";

// --- Imports de Serviços e Contextos ---
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/error-context";
import { api } from "@/services/api";

// --- Imports de Componentes UI ---
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Componentes Customizados ---
import { CompanyFilter } from "@/components/company-filter";
import { Column, GenericTable } from "@/components/generic-table";
import { PageHeader } from "@/components/page-header";
import { UserFormModal } from "@/components/modals/user-form-modal";

// --- Enums & Interfaces ---
enum UserRole {
  MASTER = "MASTER",
  ADMIN = "ADMIN",
  EMPLOYER = "EMPLOYER",
}

// 🔥 INTERFACE ATUALIZADA COM companyRole
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
  companyRole?: { id: string; name: string; level: number }; // 🔥 ADICIONADO
  createdAt: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

// Helpers
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

const ITEMS_PER_PAGE = 10;

export default function UserManagementPage() {
  const router = useRouter();
  const { showError } = useError();
  const { user: currentUser, loading: authLoading } = useAuth();

  // Estados
  const [users, setUsers] = useState<User[]>([]);
  const [companiesList, setCompaniesList] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Filtro e Paginação
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>(undefined);

  // Estados de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);

  // Estado de Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isMaster = currentUser?.role === "MASTER";
  const canManage = isMaster || currentUser?.role === "ADMIN";

  // --- 1. Carregar lista de empresas ---
  useEffect(() => {
    if (isMaster) {
      api.get('/companies?limit=100&page=1').then((response) => {
        const data = response.data.data || [];
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

      const response = await api.get<{ data: User[]; total: number } | User[]>(`/users?${params.toString()}`);

      let data: User[] = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      }

      console.log("📦 Usuários carregados:", data.map(u => ({
        name: u.name,
        companyRole: u.companyRole
      })));

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

  // --- Filtro e Paginação ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCompanyId]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  }, [users, searchTerm]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  // --- Handlers de Modal ---
  const handleOpenCreate = () => {
    const initialData = (isMaster && filterCompanyId) ? { companyId: filterCompanyId } : null;
    setEditingUser(initialData as any); 
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  // --- Submit do Formulário ---
  const handleFormSubmit = async (values: any) => {
    setIsFormLoading(true);

    const payload: any = {
      ...values,
      contact: cleanMask(values.contact),
      document: cleanMask(values.document),
    };

    if (isMaster) {
      payload.companyId = values.companyId;
    } else {
      delete payload.companyId;
    }

    try {
      if (editingUser && editingUser.id) {
        await api.patch(`/users/${editingUser.id}`, payload);
        toast.success("Usuário atualizado!");
        fetchUsers();
      } else {
        const { data: newUser } = await api.post<User>("/users", payload);
        toast.success("Usuário criado!");
        
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
      console.error("Erro na requisição:", error);
    } finally {
      setIsFormLoading(false);
    }
  };

  // --- Outras Ações ---
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

  // 🔥 COLUNAS ATUALIZADAS COM CARGO NA EMPRESA
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
      },
      // 🔥 NOVA COLUNA: Cargo na Empresa
      {
        header: "Cargo na Empresa",
        cell: (user) => (
          <div className="flex items-center gap-1">
            {user.companyRole ? (
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                <Briefcase className="h-3 w-3 mr-1" />
                {user.companyRole.name}
              </Badge>
            ) : (
              <span className="text-xs text-slate-400">Não definido</span>
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

        <PageHeader 
          title="Usuários" 
          description="Gerencie o acesso ao sistema."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nome ou e-mail..."
        >
          {isMaster && (
            <CompanyFilter value={filterCompanyId} onChange={setFilterCompanyId} />
          )}

          {canManage && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleOpenCreate} 
                    size="icon" 
                    className="bg-[#D35400] hover:bg-[#D35400]/90 text-white shadow-md transition-transform hover:scale-105 rounded-full h-10 w-10"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="sr-only">Adicionar novo usuário</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adicionar novo usuário</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </PageHeader>

        <GenericTable
          title="Listagem"
          data={paginatedUsers}
          columns={columns}
          isLoading={loading}
          onSearchChange={undefined} 
          emptyMessage="Nenhum usuário encontrado."
          pagination={{
            currentPage: currentPage,
            totalPages: totalPages,
            onPageChange: (page) => setCurrentPage(page),
            totalItems: filteredUsers.length,
            itemsPerPage: ITEMS_PER_PAGE
          }}
        />

        <UserFormModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={editingUser as any}
          onSubmit={handleFormSubmit}
          isLoading={isFormLoading}
          companies={companiesList}
          currentUserRole={currentUser?.role}
        />

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
/* eslint-disable react-hooks/set-state-in-effect */
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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// --- Imports de Serviços e Contextos ---
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/error-context";
import { api } from "@/services/api";
import { useUsers } from "@/hooks/useUsers"; // 🔥 IMPORTE O HOOK

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
  companyRole?: { id: string; name: string; level: number };
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
  if (!r.startsWith("55")) r = `55${r}`;
  if (r.length > 13) r = r.substring(0, 13);
  if (r.length === 13)
    return r.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})/, "+$1 ($2) $3-$4");
  if (r.length === 12)
    return r.replace(/^(\d{2})(\d{2})(\d{4})(\d{4})/, "+$1 ($2) $3-$4");
  if (r.length >= 11) return r.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (r.length >= 10) return r.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  if (r.length >= 5) return r.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return r;
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

const cleanMask = (value: string | undefined) =>
  value ? value.replace(/\D/g, "") : "";

const ITEMS_PER_PAGE = 10;

export default function UserManagementPage() {
  const router = useRouter();
  const { showError } = useError();
  const { user: currentUser, loading: authLoading } = useAuth();

  // Estados
  const [companiesList, setCompaniesList] = useState<CompanyOption[]>([]);

  // Estados de Filtro e Paginação
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>(
    undefined,
  );

  // Estados de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Estado de Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isMaster = currentUser?.role === "MASTER";
  const canManage = isMaster || currentUser?.role === "ADMIN";

  // 🔥🔥🔥 USANDO O HOOK CORRETAMENTE 🔥🔥🔥
  const { users, isLoading, createUser, updateUser, toggleStatus, deleteUser } =
    useUsers({
      companyId: filterCompanyId,
      isMaster,
    });

  // --- Carregar lista de empresas (apenas para MASTER) ---
  useEffect(() => {
    if (isMaster) {
      api
        .get("/companies?limit=100&page=1")
        .then((response) => {
          const data = response.data.data || [];
          const sortedData = data.sort((a: any, b: any) =>
            a.name.localeCompare(b.name),
          );
          setCompaniesList(sortedData);
        })
        .catch((err) => {
          console.error("Erro ao carregar empresas", err);
          toast.error("Erro ao carregar lista de empresas.");
        });
    }
  }, [isMaster]);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCompanyId]);

  // Filtro e Paginação
  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    const term = searchTerm.toLowerCase();
    return users.filter((u: any) => {
      const name = u?.name?.toLowerCase() || "";
      const email = u?.email?.toLowerCase() || "";
      return name.includes(term) || email.includes(term);
    });
  }, [users, searchTerm]);

  const paginatedUsers = useMemo(() => {
    if (!filteredUsers || filteredUsers.length === 0) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  // Handlers de Modal
  const handleOpenCreate = () => {
    const initialData =
      isMaster && filterCompanyId ? { companyId: filterCompanyId } : null;
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

  // 🔥 SUBMIT USANDO AS MUTATIONS DO HOOK
  const handleFormSubmit = async (values: any) => {
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
        await updateUser.mutateAsync({ id: editingUser.id, values: payload });
      } else {
        await createUser.mutateAsync(payload);
      }
      handleCloseModal();
    } catch (error) {
      // Erro já tratado no hook
      console.error("Erro:", error);
    }
  };

  // Handler para deletar
  const handleDeleteClick = async () => {
    if (!deleteId) return;
    await deleteUser.mutateAsync(deleteId);
    setIsDeleteOpen(false);
    setDeleteId(null);
  };

  // Handler para toggle status
  const handleToggleStatus = (id: string, status: string) => {
    toggleStatus.mutate({ id, currentStatus: status });
  };

  const isFormLoading = createUser.isPending || updateUser.isPending;
  const isDeleting = deleteUser.isPending;

  // Colunas
 // Colunas - com dependências corretas para o React Compiler
const columns: Column<User>[] = useMemo(() => {
  const cols: Column<User>[] = [
    {
      header: "Usuário",
      className: "w-[280px]",
      cell: (user) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#2F80ED]/10 text-[#2F80ED] flex items-center justify-center font-bold border border-[#2F80ED]/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[#353A40]">
              {user?.name || "Usuário sem nome"}
            </span>
            <span className="text-xs text-[#7A7E83] flex items-center gap-1">
              <Mail className="h-3 w-3" />{" "}
              {user?.email || "sem-email@exemplo.com"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Permissão",
      cell: (user) => (
        <Badge
          variant="outline"
          className="w-fit text-[10px] uppercase border-[#CBD5E1] text-[#7A7E83]"
        >
          {user?.role || "N/A"}
        </Badge>
      ),
    },
    {
      header: "Cargo na Empresa",
      cell: (user) => (
        <div className="flex items-center gap-1">
          {user?.companyRole ? (
            <Badge className="bg-[#2F80ED]/10 text-[#2F80ED] hover:bg-[#2F80ED]/20 border-[#2F80ED]/20">
              <Briefcase className="h-3 w-3 mr-1" />
              {user.companyRole.name}
            </Badge>
          ) : (
            <span className="text-xs text-[#7A7E83]">Não definido</span>
          )}
        </div>
      ),
    },
  ];

  if (isMaster) {
    cols.push({
      header: "Empresa",
      cell: (user) => (
        <div className="flex items-center gap-1 text-sm text-[#7A7E83]">
          <Building2 className="h-3 w-3 text-[#7A7E83]" />
          {user?.company?.name || "N/A"}
        </div>
      ),
    });
  }

  cols.push(
    {
      header: "Contato",
      cell: (user) => (
        <div className="flex flex-col text-sm text-[#353A40]">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-[#7A7E83]" />{" "}
            {formatPhone(user?.contact) || "Não informado"}
          </span>
          {user?.document && (
            <span className="text-xs text-[#7A7E83] pl-4">
              {formatCPF(user.document)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (user) => (
        <Badge
          className={
            user?.status === "ACTIVE"
              ? "bg-green-100 text-green-700 border-green-200"
              : "bg-red-100 text-red-700 border-red-200"
          }
        >
          {user?.status === "ACTIVE" ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  );

  if (canManage) {
    cols.push({
      header: "Ações",
      className: "text-right",
      cell: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-[#7A7E83] hover:text-[#2F80ED]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-white border border-[#E2E8F0] rounded-xl shadow-lg"
          >
            <DropdownMenuLabel className="text-[#353A40]">
              Ações
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => handleOpenEdit(user)}
              className="cursor-pointer text-[#353A40] hover:bg-[#F5F6FA]"
            >
              <Edit className="mr-2 h-4 w-4 text-[#2F80ED]" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleToggleStatus(user.id, user.status)}
              disabled={toggleStatus.isPending}
              className="cursor-pointer text-[#353A40] hover:bg-[#F5F6FA]"
            >
              <Power className="mr-2 h-4 w-4 text-[#2F80ED]" />{" "}
              {user?.status === "ACTIVE" ? "Desativar" : "Ativar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#E2E8F0]" />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer hover:bg-red-50"
              onClick={() => {
                setDeleteId(user.id);
                setIsDeleteOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  return cols;
}, [isMaster, canManage, toggleStatus.isPending, handleOpenEdit, handleToggleStatus, setDeleteId, setIsDeleteOpen]);
//  ^^^ Adicione TODAS as dependências usadas dentro do useMemo

  if (authLoading || isLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F6FA]">
        <Loader2 className="animate-spin text-[#2F80ED] h-8 w-8" />
      </div>
    );

  return (
    <div className="min-h-screen w-full bg-[#F5F6FA] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Usuários"
          description="Gerencie o acesso ao sistema."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nome ou e-mail..."
        >
          {isMaster && (
            <CompanyFilter
              value={filterCompanyId}
              onChange={setFilterCompanyId}
            />
          )}
          {canManage && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleOpenCreate}
                    size="icon"
                    className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white shadow-sm transition-transform hover:scale-105 rounded-full h-10 w-10"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="sr-only">Adicionar novo usuário</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#353A40] text-white">
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
          isLoading={isLoading}
          onSearchChange={undefined}
          emptyMessage="Nenhum usuário encontrado."
          pagination={{
            currentPage: currentPage,
            totalPages: totalPages,
            onPageChange: (page) => setCurrentPage(page),
            totalItems: filteredUsers.length,
            itemsPerPage: ITEMS_PER_PAGE,
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
          <AlertDialogContent className="bg-white border border-[#E2E8F0] rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#353A40]">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Atenção
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#7A7E83]">
                Tem certeza que deseja excluir este usuário? Esta ação é
                irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isDeleting}
                className="border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteClick();
                }}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isDeleting ? "Excluindo..." : "Sim, Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

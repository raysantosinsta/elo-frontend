/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  AlertTriangle,
  Briefcase,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// Serviços e Contextos
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/error-context";
import { api } from "@/services/api";

// Componentes UI
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
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { GenericTable, type Column } from "@/components/generic-table";
import { PageHeader } from "@/components/page-header";

// --- Types ---
interface CompanyRole {
  id: string;
  name: string;
  description?: string;
  level: number;
  status: "ACTIVE" | "INACTIVE";
  companyId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    companyRoleUsers: number;
    professionalRoleUsers: number;
  };
}

interface CreateRoleDto {
  name: string;
  description?: string;
  level?: number;
}

interface UpdateRoleDto extends Partial<CreateRoleDto> {
  status?: "ACTIVE" | "INACTIVE";
}

const ITEMS_PER_PAGE = 10;

export default function CompanyRolesManagementPage() {
  const { showError } = useError();
  const { user, loading: authLoading } = useAuth();
  const isMaster = user?.role === "MASTER";
  const isAdmin = user?.role === "ADMIN";
  const canManage = isMaster || isAdmin;

  // Estados
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Estados Modal de Formulário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CompanyRole | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [formData, setFormData] = useState<CreateRoleDto>({
    name: "",
    description: "",
    level: 1,
  });

  // Estado Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado Restore
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!canManage) {
      console.log("❌ [fetchRoles] Sem permissão para gerenciar cargos", {
        canManage,
        isMaster,
        isAdmin,
        userRole: user?.role,
      });
      return;
    }

    console.log("🔄 [fetchRoles] Iniciando busca de cargos...", {
      includeInactive,
      limit: 100,
    });

    try {
      setLoading(true);
      const response = await api.get<{ data: CompanyRole[]; total: number }>(
        `/company-roles?limit=100&includeInactive=${includeInactive}`,
      );

      console.log("✅ [fetchRoles] Resposta recebida:", {
        status: response.status,
        dataLength: response.data?.data?.length,
        total: response.data?.total,
      });

      setRoles(response.data.data || []);
    } catch (error: any) {
      console.error("❌ [fetchRoles] Erro:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      showError("Erro", "Não foi possível carregar os cargos");
    } finally {
      setLoading(false);
    }
  }, [canManage, includeInactive, showError]);

  useEffect(() => {
    if (user) fetchRoles();
  }, [fetchRoles, user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, includeInactive]);

  // --- Lógica de Filtro e Paginação ---
  const filteredRoles = useMemo(() => {
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.description &&
          role.description.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [roles, searchTerm]);

  const paginatedRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredRoles.slice(startIndex, endIndex);
  }, [filteredRoles, currentPage]);

  const totalPages = Math.ceil(filteredRoles.length / ITEMS_PER_PAGE);

  // --- Handlers de Modal ---
  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData({ name: "", description: "", level: 1 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: CompanyRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      level: role.level,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setFormData({ name: "", description: "", level: 1 });
  };

  const handleFormChange = (
    field: keyof CreateRoleDto,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- Submit Create/Update ---
  const onSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("O nome do cargo é obrigatório");
      return;
    }

    if (formData.level && (formData.level < 1 || formData.level > 100)) {
      toast.error("O nível deve estar entre 1 e 100");
      return;
    }

    setIsFormLoading(true);

    try {
      if (editingRole) {
        const updateData: UpdateRoleDto = {
          name: formData.name,
          description: formData.description || undefined,
          level: formData.level,
        };
        const response = await api.patch<CompanyRole>(
          `/company-roles/${editingRole.id}`,
          updateData,
        );

        await fetchRoles(); // Rebusca os dados

        setRoles((prev) =>
          prev.map((r) => (r.id === editingRole.id ? response.data : r)),
        );
        toast.success("Cargo atualizado com sucesso!");
      } else {
        const response = await api.post<CompanyRole>(
          "/company-roles",
          formData,
        );

        // 🔥 Forçar refresh da lista
        await fetchRoles();

        setRoles((prev) => [response.data, ...prev]);
        toast.success("Cargo criado com sucesso!");
      }
      handleCloseModal();
    } catch (error: any) {
      console.error("Erro ao salvar cargo:", error);
      const errorMsg = error.response?.data?.message || "Erro ao salvar cargo";
      toast.error(errorMsg);
    } finally {
      setIsFormLoading(false);
    }
  };

  // --- Toggle Status ---
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!isMaster && !isAdmin) {
      showError(
        "Permissão Negada",
        "Apenas Master ou Admin podem alterar o status.",
      );
      return;
    }

    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/company-roles/${id}`, { status: newStatus });
      toast.success(
        `Cargo ${newStatus === "ACTIVE" ? "ativado" : "inativado"} com sucesso`,
      );
      setRoles((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
      );
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      toast.error(error.response?.data?.message || "Erro ao alterar status");
    }
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/company-roles/${deleteId}`);
      setRoles((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success("Cargo removido com sucesso.");
      setIsDeleteOpen(false);
      setDeleteId(null);
    } catch (error: any) {
      console.error("Erro ao deletar cargo:", error);
      const errorMsg = error.response?.data?.message || "Erro ao deletar cargo";
      toast.error(errorMsg);
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Restore ---
  const handleRestore = async () => {
    if (!restoreId) return;
    try {
      const response = await api.patch<CompanyRole>(
        `/company-roles/${restoreId}/restore`,
      );
      setRoles((prev) =>
        prev.map((r) => (r.id === restoreId ? response.data : r)),
      );
      toast.success("Cargo restaurado com sucesso!");
      setIsRestoreOpen(false);
      setRestoreId(null);
    } catch (error: any) {
      console.error("Erro ao restaurar cargo:", error);
      toast.error(error.response?.data?.message || "Erro ao restaurar cargo");
    }
  };

  // --- Colunas da Tabela ---
  const tableColumns: Column<CompanyRole>[] = useMemo(() => {
    const cols: Column<CompanyRole>[] = [
      {
        header: "Cargo",
        cell: (role) => (
          <div className="flex flex-col">
            <span className="font-semibold text-[#353A40] flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#2F80ED]" />
              {role.name}
            </span>
            {role.description && (
              <span className="text-xs text-[#7A7E83] mt-1 line-clamp-1">
                {role.description}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Status",
        cell: (role) => (
          <Badge
            variant="outline"
            className={
              role.status === "ACTIVE"
                ? "bg-green-50 text-green-700 border-green-200 whitespace-nowrap"
                : "bg-gray-100 text-gray-500 border-gray-200 whitespace-nowrap"
            }
          >
            {role.status === "ACTIVE" ? "Ativo" : "Inativo"}
          </Badge>
        ),
      },
    ];

    if (canManage) {
      cols.push({
        header: "Ações",
        cell: (role) => (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 text-[#7A7E83] hover:text-[#2F80ED] hover:bg-transparent"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white border border-[#E2E8F0] rounded-xl shadow-lg"
              >
                <DropdownMenuLabel className="text-[#353A40]">
                  Opções
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleOpenEdit(role)}
                  className="cursor-pointer text-[#353A40] hover:bg-[#F5F6FA]"
                >
                  <Edit className="mr-2 h-4 w-4 text-[#2F80ED]" /> Editar
                </DropdownMenuItem>
                {role.status === "ACTIVE" ? (
                  <DropdownMenuItem
                    onClick={() => handleToggleStatus(role.id, role.status)}
                    className="text-amber-600 cursor-pointer hover:bg-amber-50"
                  >
                    <Power className="mr-2 h-4 w-4" /> Inativar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      setRestoreId(role.id);
                      setIsRestoreOpen(true);
                    }}
                    className="text-green-600 cursor-pointer hover:bg-green-50"
                  >
                    <Power className="mr-2 h-4 w-4" /> Reativar
                  </DropdownMenuItem>
                )}
                {role.status === "INACTIVE" && (
                  <>
                    <DropdownMenuSeparator className="bg-[#E2E8F0]" />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 cursor-pointer hover:bg-red-50"
                      onClick={() => {
                        setDeleteId(role.id);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      });
    }
    return cols;
  }, [canManage]);

  if (authLoading)
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F6FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2F80ED]" />
      </div>
    );

  if (!user || (!isMaster && !isAdmin)) return null;

  return (
    <div className="min-h-screen w-full bg-[#F5F6FA] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="Cargos da Empresa"
          description="Gerencie os cargos da sua organização."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por cargo e descrição ..."
        >
          <div className="flex items-center gap-2">
            <Button
              variant={includeInactive ? "default" : "outline"}
              size="sm"
              onClick={() => setIncludeInactive(!includeInactive)}
              className={
                includeInactive
                  ? "bg-[#2F80ED] hover:bg-[#1E5CB8] text-white"
                  : "border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA]"
              }
            >
              {includeInactive ? "Ocultar Inativos" : "Mostrar Inativos"}
            </Button>

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
                      <span className="sr-only">Criar novo cargo</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#353A40] text-white">
                    <p>Criar novo cargo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </PageHeader>

        {/* Tabela */}
        <GenericTable
          title="Listagem de Cargos"
          data={paginatedRoles}
          columns={tableColumns}
          isLoading={loading}
          emptyMessage="Nenhum cargo encontrado."
          pagination={{
            currentPage: currentPage,
            totalPages: totalPages,
            onPageChange: (page) => setCurrentPage(page),
            totalItems: filteredRoles.length,
            itemsPerPage: ITEMS_PER_PAGE,
          }}
        />

        {/* Modal de Formulário */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white border border-[#E2E8F0] rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-[#353A40] font-bold">
                {editingRole ? "Editar Cargo" : "Novo Cargo"}
              </DialogTitle>
              <DialogDescription className="text-[#7A7E83]">
                {editingRole
                  ? "Altere as informações do cargo existente."
                  : "Preencha os dados para criar um novo cargo."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#353A40] font-medium">
                  Nome do Cargo *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="Ex: Coordenador de Produção"
                  className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-[#353A40] font-medium"
                >
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleFormChange("description", e.target.value)
                  }
                  placeholder="Descreva as responsabilidades do cargo..."
                  rows={3}
                  className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseModal}
                className="border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA]"
              >
                Cancelar
              </Button>
              <Button
                onClick={onSubmit}
                disabled={isFormLoading}
                className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white"
              >
                {isFormLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingRole ? "Salvar Alterações" : "Criar Cargo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alerta de Exclusão */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent className="bg-white border border-[#E2E8F0] rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#353A40]">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Confirmar
                Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#7A7E83]">
                Tem certeza que deseja excluir este cargo permanentemente?
                <br />
                <span className="text-sm text-red-500 font-medium">
                  Esta ação não pode ser desfeita.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isDeleting}
                className="text-[#353A40] border-[#CBD5E1] hover:bg-[#F5F6FA]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isDeleting ? "Excluindo..." : "Sim, excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Alerta de Restauração */}
        <AlertDialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
          <AlertDialogContent className="bg-white border border-[#E2E8F0] rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#353A40]">
                <Power className="h-5 w-5 text-[#2F80ED]" /> Reativar Cargo
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#7A7E83]">
                Deseja reativar este cargo? Ele ficará disponível novamente para
                atribuição aos usuários.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-[#353A40] border-[#CBD5E1] hover:bg-[#F5F6FA]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleRestore();
                }}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Sim, reativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

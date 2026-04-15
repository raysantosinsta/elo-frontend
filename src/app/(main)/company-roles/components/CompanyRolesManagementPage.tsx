/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  AlertTriangle,
  Briefcase,
  Edit,
  Hash,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  Trash2,
  UserCheck,
  UserCog,
  Users,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  companyRoleUsers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  professionalRoleUsers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

interface CreateRoleDto {
  name: string;
  description?: string;
  level?: number;
}

interface UpdateRoleDto extends Partial<CreateRoleDto> {
  status?: "ACTIVE" | "INACTIVE";
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
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

  // Estado para visualizar usuários do cargo
  const [viewUsersRole, setViewUsersRole] = useState<CompanyRole | null>(null);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [usersTab, setUsersTab] = useState<"company" | "professional">("company");
  const [companyRoleUsers, setCompanyRoleUsers] = useState<UserInfo[]>([]);
  const [professionalRoleUsers, setProfessionalRoleUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

 // No fetchRoles, adicione logs detalhados
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
      fullResponse: response.data,
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

  // --- Fetch Users by Role ---
  const fetchUsersByRole = async (roleId: string, type: "company" | "professional") => {
    setLoadingUsers(true);
    try {
      const endpoint = type === "company" 
        ? `/company-roles/${roleId}/company-role-users`
        : `/company-roles/${roleId}/professional-role-users`;
      
      const response = await api.get<{ data: UserInfo[]; total: number }>(
        `${endpoint}?limit=100`
      );
      
      if (type === "company") {
        setCompanyRoleUsers(response.data.data || []);
      } else {
        setProfessionalRoleUsers(response.data.data || []);
      }
    } catch (error: any) {
      console.error(`Erro ao buscar usuários (${type}):`, error);
      toast.error(`Erro ao carregar usuários do cargo`);
    } finally {
      setLoadingUsers(false);
    }
  };

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
        setRoles((prev) =>
          prev.map((r) => (r.id === editingRole.id ? response.data : r)),
        );
        toast.success("Cargo atualizado com sucesso!");
      } else {
        const response = await api.post<CompanyRole>("/company-roles", formData);
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
      showError("Permissão Negada", "Apenas Master ou Admin podem alterar o status.");
      return;
    }

    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/company-roles/${id}`, { status: newStatus });
      toast.success(`Cargo ${newStatus === "ACTIVE" ? "ativado" : "inativado"} com sucesso`);
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
      const response = await api.patch<CompanyRole>(`/company-roles/${restoreId}/restore`);
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

  // --- View Users by Role ---
  const handleViewUsers = async (role: CompanyRole) => {
    setViewUsersRole(role);
    setUsersTab("company");
    setCompanyRoleUsers([]);
    setProfessionalRoleUsers([]);
    setIsUsersModalOpen(true);
    await fetchUsersByRole(role.id, "company");
    await fetchUsersByRole(role.id, "professional");
  };

  // --- Colunas da Tabela ---
  const tableColumns: Column<CompanyRole>[] = useMemo(() => {
    const cols: Column<CompanyRole>[] = [
      {
        header: "Cargo",
        className: "w-[250px]",
        cell: (role) => (
          <div className="flex flex-col">
            <span className="font-medium text-[#2D3436] flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#D35400]" />
              {role.name}
            </span>
            {role.description && (
              <span className="text-xs text-[#95A5A6] mt-1 line-clamp-1">
                {role.description}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Nível",
        cell: (role) => (
          <div className="flex items-center gap-1">
            <Hash className="h-3 w-3 text-[#95A5A6]" />
            <Badge variant="outline" className="bg-[#F5F0E6] text-[#2C3E50]">
              {role.level}
            </Badge>
          </div>
        ),
      },
      {
        header: "Usuários (Empresa)",
        cell: (role) => (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-[#2C3E50] hover:text-[#D35400]"
            onClick={() => handleViewUsers(role)}
          >
            <UserCog className="h-4 w-4" />
            <span>{role._count?.companyRoleUsers || 0}</span>
          </Button>
        ),
      },
      {
        header: "Usuários (Profissional)",
        cell: (role) => (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-[#2C3E50] hover:text-[#D35400]"
            onClick={() => handleViewUsers(role)}
          >
            <UserCheck className="h-4 w-4" />
            <span>{role._count?.professionalRoleUsers || 0}</span>
          </Button>
        ),
      },
      {
        header: "Status",
        cell: (role) => (
          <Badge
            variant="outline"
            className={
              role.status === "ACTIVE"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-500 border-gray-200"
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
        className: "text-right",
        cell: (role) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-[#2C3E50] hover:text-[#D35400] hover:bg-transparent"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Opções</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleOpenEdit(role)}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              {role.status === "ACTIVE" ? (
                <DropdownMenuItem
                  onClick={() => handleToggleStatus(role.id, role.status)}
                  className="text-amber-600"
                >
                  <Power className="mr-2 h-4 w-4" /> Inativar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    setRestoreId(role.id);
                    setIsRestoreOpen(true);
                  }}
                  className="text-green-600"
                >
                  <Power className="mr-2 h-4 w-4" /> Reativar
                </DropdownMenuItem>
              )}
              {role.status === "INACTIVE" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
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
        ),
      });
    }
    return cols;
  }, [canManage]);

  if (authLoading)
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F0E6]">
        <Loader2 className="h-8 w-8 animate-spin text-[#D35400]" />
      </div>
    );

  if (!user || (!isMaster && !isAdmin)) return null;

  return (
    <div className="min-h-screen w-full bg-[#F5F0E6] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="Cargos da Empresa"
          description="Gerencie os cargos e funções da sua organização."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nome ou descrição..."
        >
          <div className="flex items-center gap-2">
            <Button
              variant={includeInactive ? "default" : "outline"}
              size="sm"
              onClick={() => setIncludeInactive(!includeInactive)}
              className={
                includeInactive
                  ? "bg-[#D35400] hover:bg-[#D35400]/90"
                  : "border-[#D35400] text-[#D35400] hover:bg-[#D35400]/10"
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
                      className="bg-[#D35400] hover:bg-[#D35400]/90 text-white shadow-md transition-transform hover:scale-105 rounded-full h-10 w-10"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="sr-only">Criar novo cargo</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
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
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#2D3436]">
                {editingRole ? "Editar Cargo" : "Novo Cargo"}
              </DialogTitle>
              <DialogDescription className="text-[#95A5A6]">
                {editingRole
                  ? "Altere as informações do cargo existente."
                  : "Preencha os dados para criar um novo cargo."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#2D3436]">
                  Nome do Cargo *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="Ex: Coordenador de Produção"
                  className="border-[#E5E5E5] focus:border-[#D35400] focus:ring-[#D35400]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level" className="text-[#2D3436]">
                  Nível Hierárquico (1-100)
                </Label>
                <Input
                  id="level"
                  type="number"
                  min={1}
                  max={100}
                  value={formData.level}
                  onChange={(e) =>
                    handleFormChange("level", parseInt(e.target.value) || 1)
                  }
                  placeholder="Ex: 5"
                  className="border-[#E5E5E5] focus:border-[#D35400] focus:ring-[#D35400]"
                />
                <p className="text-xs text-[#95A5A6]">
                  Valores menores = maior hierarquia (ex: 1 = Diretor, 10 = Estagiário)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-[#2D3436]">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  placeholder="Descreva as responsabilidades do cargo..."
                  rows={3}
                  className="border-[#E5E5E5] focus:border-[#D35400] focus:ring-[#D35400]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseModal}
                className="border-[#E5E5E5] text-[#2D3436]"
              >
                Cancelar
              </Button>
              <Button
                onClick={onSubmit}
                disabled={isFormLoading}
                className="bg-[#D35400] hover:bg-[#D35400]/90 text-white"
              >
                {isFormLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingRole ? "Salvar Alterações" : "Criar Cargo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Usuários do Cargo com Tabs */}
        <Dialog open={isUsersModalOpen} onOpenChange={setIsUsersModalOpen}>
          <DialogContent className="sm:max-w-[700px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#2D3436] flex items-center gap-2">
                <Users className="h-5 w-5 text-[#D35400]" />
                Usuários com o cargo: {viewUsersRole?.name}
              </DialogTitle>
              <DialogDescription className="text-[#95A5A6]">
                Visualize os usuários que possuem este cargo.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={usersTab} onValueChange={(v) => setUsersTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="company" className="flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Cargo na Empresa
                </TabsTrigger>
                <TabsTrigger value="professional" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Cargo Profissional
                </TabsTrigger>
              </TabsList>

              <TabsContent value="company" className="mt-4">
                <div className="max-h-[400px] overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[#D35400]" />
                    </div>
                  ) : companyRoleUsers.length > 0 ? (
                    <div className="space-y-2">
                      {companyRoleUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-medium text-[#2D3436]">{user.name}</p>
                            <p className="text-sm text-[#95A5A6]">{user.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#95A5A6]">
                      Nenhum usuário vinculado a este cargo como cargo de empresa.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="professional" className="mt-4">
                <div className="max-h-[400px] overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[#D35400]" />
                    </div>
                  ) : professionalRoleUsers.length > 0 ? (
                    <div className="space-y-2">
                      {professionalRoleUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-medium text-[#2D3436]">{user.name}</p>
                            <p className="text-sm text-[#95A5A6]">{user.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#95A5A6]">
                      Nenhum usuário vinculado a este cargo como cargo profissional.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                onClick={() => setIsUsersModalOpen(false)}
                className="bg-[#D35400] hover:bg-[#D35400]/90 text-white"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alerta de Exclusão */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#D35400]">
                <AlertTriangle className="h-5 w-5" /> Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#2D3436]">
                Tem certeza que deseja excluir este cargo permanentemente?
                <br />
                <span className="text-sm text-red-500 font-medium">
                  Esta ação não pode ser desfeita.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="text-[#2D3436]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isDeleting ? "Excluindo..." : "Sim, excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Alerta de Restauração */}
        <AlertDialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#D35400]">
                <Power className="h-5 w-5" /> Reativar Cargo
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#2D3436]">
                Deseja reativar este cargo? Ele ficará disponível novamente
                para atribuição aos usuários.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-[#2D3436]">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleRestore();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
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
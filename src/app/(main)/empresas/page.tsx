/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Edit,
  Loader2,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Power,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
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

import { GenericTable, type Column } from "@/components/generic-table";
import { PageHeader } from "@/components/page-header";
import { CompanyFormModal } from "@/components/modals/company-form-modal";

// --- Types ---
interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
  complemento?: string;
  ramoAtividade?: string;
  status: "ACTIVE" | "INACTIVE";
}

// Helpers
const cleanMask = (value: string | undefined) => {
  if (!value) return "";
  return value.replace(/\D/g, "");
};

const formatPhone = (v: string | undefined) => {
  if (!v) return "";
  let r = v.replace(/\D/g, "");
  if (r.length > 11) r = r.substring(0, 11);
  if (r.length > 10) return r.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  else if (r.length > 5)
    return r.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  else if (r.length > 2) return r.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return r.replace(/^(\d*)/, "($1");
};

const formatCNPJ = (v: string | undefined) => {
  if (!v) return "";
  return v
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    .substring(0, 18);
};

const ITEMS_PER_PAGE = 5;

export default function CompanyManagementPage() {
  const router = useRouter();
  const { showError } = useError();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Estados
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Estados UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);

  // Estado Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isMaster = user?.role === "MASTER";
  const isAdmin = user?.role === "ADMIN";

  // --- Fetch ---
  const fetchCompanies = useCallback(async () => {
    if (!isMaster && !isAdmin) return;
    try {
      setLoading(true);
      const response = await api.get<{ data: Company[] }>(
        "/companies?limit=100",
      );
      setCompanies(response.data.data || []);
    } catch (error: any) {
      console.error("Erro fetch:", error);
    } finally {
      setLoading(false);
    }
  }, [isMaster, isAdmin]);

  useEffect(() => {
    if (user) fetchCompanies();
  }, [fetchCompanies, user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --- Lógica de Dados ---
  const filteredCompanies = useMemo(() => {
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj.includes(searchTerm),
    );
  }, [companies, searchTerm]);

  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCompanies.slice(startIndex, endIndex);
  }, [filteredCompanies, currentPage]);

  const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);

  // --- Handlers de Modal ---
  const handleOpenCreate = () => {
    setEditingCompany(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (company: Company) => {
    setEditingCompany(company);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  const onSubmit = async (values: any) => {
    setIsFormLoading(true);

    const payload: any = {
      name: values.name,
      email: values.email,
      telefone: cleanMask(values.telefone),
      cep: cleanMask(values.cep),
      endereco: values.endereco,
      numero: values.numero,
      bairro: values.bairro,
      cidade: values.cidade,
      estado: values.estado,
      notificationDays: Number(values.notificationDays),
    };

    payload.complemento = values.complemento?.trim() || null;
    payload.ramoAtividade = values.ramoAtividade?.trim() || null;

    const cnpjClean = cleanMask(values.cnpj);
    if (editingCompany) {
      const originalCnpj = cleanMask(editingCompany.cnpj);
      if (cnpjClean && cnpjClean.length === 14 && cnpjClean !== originalCnpj) {
        payload.cnpj = cnpjClean;
      }
    } else if (cnpjClean && cnpjClean.length === 14) {
      payload.cnpj = cnpjClean;
    }

    try {
      if (editingCompany) {
        const response = await api.patch(
          `/companies/${editingCompany.id}`,
          payload,
        );

        await queryClient.invalidateQueries({
          queryKey: ["company-settings", editingCompany.id],
        });

        window.dispatchEvent(
          new CustomEvent("companyUpdated", {
            detail: { companyId: editingCompany.id, updatedAt: new Date() },
          }),
        );

        toast.success("Empresa atualizada com sucesso!");
        await fetchCompanies();
      } else {
        const response = await api.post<Company>("/companies", payload);
        toast.success("Empresa criada com sucesso!");
        setCompanies((prev) => [response.data, ...prev]);
      }

      handleCloseModal();
    } catch (error: any) {
      console.error("❌ Erro ao salvar:", error);
      const errorMsg =
        error.response?.data?.message || "Erro ao salvar empresa";
      toast.error(errorMsg);
    } finally {
      setIsFormLoading(false);
    }
  };

  // --- Actions ---
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!isMaster) {
      showError("Permissão Negada", "Apenas Master pode alterar o status.");
      return;
    }
    const newApiStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/companies/${id}`, { status: newApiStatus });
      toast.success(
        `Status alterado para ${newApiStatus === "ACTIVE" ? "Ativo" : "Inativo"}`,
      );
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newApiStatus } : c)),
      );
    } catch (error) {}
  };

  const handleDelete = async () => {
    if (!deleteId || !isMaster) return;
    setIsDeleting(true);
    try {
      await api.delete(`/companies/${deleteId}`);
      setCompanies((prev) => prev.filter((c) => c.id !== deleteId));
      toast.success("Empresa removida com sucesso.");
      setIsDeleteOpen(false);
      setDeleteId(null);
    } catch (error) {
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Colunas ---
  const tableColumns: Column<Company>[] = useMemo(() => {
    const cols: Column<Company>[] = [
      {
        header: "Empresa",
        className: "w-[280px]",
        cell: (company) => (
          <div className="flex flex-col">
            <span className="font-semibold text-[#353A40]">{company.name}</span>
            <span className="text-xs text-[#7A7E83] flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" /> {formatCNPJ(company.cnpj)}
            </span>
          </div>
        ),
      },
      {
        header: "Contato",
        cell: (company) => (
          <div className="text-sm text-[#353A40] flex flex-col gap-1">
            <span className="flex items-center gap-1">✉️ {company.email}</span>
            <span className="flex items-center gap-1 text-[#7A7E83]">
              <Phone className="h-3 w-3" /> {formatPhone(company.telefone)}
            </span>
          </div>
        ),
      },
      {
        header: "Localização",
        cell: (company) => (
          <span className="text-sm text-[#353A40] flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[#2F80ED]" /> {company.cidade}/
            {company.estado}
          </span>
        ),
      },
      {
        header: "Status",
        cell: (company) => (
          <Badge
            variant="outline"
            className={
              company.status === "ACTIVE"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-500 border-gray-200"
            }
          >
            {company.status === "ACTIVE" ? "Ativo" : "Inativo"}
          </Badge>
        ),
      },
    ];
    if (isMaster || isAdmin) {
      cols.push({
        header: "Ações",
        className: "text-right",
        cell: (company) => (
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
                onClick={() => handleOpenEdit(company)}
                className="cursor-pointer text-[#353A40] hover:bg-[#F5F6FA]"
              >
                <Edit className="mr-2 h-4 w-4 text-[#2F80ED]" /> Editar
              </DropdownMenuItem>
              {isMaster && (
                <DropdownMenuItem
                  onClick={() => handleToggleStatus(company.id, company.status)}
                  className="cursor-pointer text-[#353A40] hover:bg-[#F5F6FA]"
                >
                  <Power className="mr-2 h-4 w-4 text-[#2F80ED]" />{" "}
                  {company.status === "ACTIVE" ? "Desativar" : "Ativar"}
                </DropdownMenuItem>
              )}
              {isMaster && (
                <>
                  <DropdownMenuSeparator className="bg-[#E2E8F0]" />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 cursor-pointer hover:bg-red-50"
                    onClick={() => {
                      setDeleteId(company.id);
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
  }, [isMaster, isAdmin]);

  if (authLoading)
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F6FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2F80ED]" />
      </div>
    );
  if (!user || (user.role !== "MASTER" && user.role !== "ADMIN")) return null;

  return (
    <div className="min-h-screen w-full bg-[#F5F6FA] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="Empresas"
          description="Gerencie seus parceiros comerciais."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar empresa ou CNPJ..."
        >
          {isMaster && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleOpenCreate}
                    size="icon"
                    className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white shadow-sm transition-transform hover:scale-105 rounded-full h-10 w-10"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="sr-only">Criar nova empresa</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#353A40] text-white">
                  <p>Criar nova empresa</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </PageHeader>

        {/* Tabela */}
        <GenericTable
          title="Listagem"
          data={paginatedCompanies}
          columns={tableColumns}
          isLoading={loading}
          onSearchChange={undefined}
          emptyMessage="Nenhuma empresa encontrada."
          pagination={{
            currentPage: currentPage,
            totalPages: totalPages,
            onPageChange: (page) => setCurrentPage(page),
            totalItems: filteredCompanies.length,
            itemsPerPage: ITEMS_PER_PAGE,
          }}
        />

        {/* Modal */}
        <CompanyFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={editingCompany as any}
          onSubmit={onSubmit}
          isLoading={isFormLoading}
        />

        {/* Alerta de Exclusão */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent className="bg-white border border-[#E2E8F0] rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#353A40]">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Atenção
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#7A7E83]">
                Tem certeza que deseja excluir esta empresa? Ação irreversível.
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
                {isDeleting ? "Excluindo..." : "Sim, excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

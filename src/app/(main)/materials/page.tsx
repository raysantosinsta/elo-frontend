/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, Loader2, AlertTriangle, Package, Power, 
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

// --- Imports de Contexto e API ---
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

// --- Components UI ---
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// --- Componentes Customizados ---
import { GenericTable, type Column } from "@/components/generic-table";
import { PageHeader } from "@/components/page-header";
import { MaterialFormModal } from "@/components/modals/material-form-modal";

export default function MaterialsPage() {
  const { user, loading: authLoading } = useAuth();

  // Estados de Dados
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Estados de Modal (Criar/Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);

  // Estados de Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Fetch Data ---
  const fetchMaterials = useCallback(async () => {
    if (!user) return; 

    setLoading(true);
    try {
      // Nota: Sua API deve suportar o filtro de status se quiser ver os inativos
      // Por padrão, muitas APIs retornam apenas ACTIVE. Se quiser ver todos, talvez precise passar status=ALL
      const { data } = await api.get('/materials', {
        params: {
          page: page,
          limit: 10,
          ...(searchTerm && { search: searchTerm })
        }
      });
      
      setMaterials(data.data || []); 
      setTotalPages(data.meta?.lastPage || 1);
      setTotalItems(data.meta?.total || 0);

    } catch (error) {
      console.error("Erro ao buscar materiais", error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, user]);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        if (page !== 1 && searchTerm !== '') setPage(1);
        else fetchMaterials();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [fetchMaterials, user, searchTerm]);

  // --- Handlers ---
  const handleOpenCreate = () => {
    setEditingMaterial(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (material: any) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMaterial(null);
  };

  const handleFormSubmit = async (formData: any) => {
    setIsFormLoading(true);
    try {
      if (editingMaterial) {
        await api.patch(`/materials/${editingMaterial.id}`, formData);
        toast.success('Material atualizado!');
      } else {
        await api.post('/materials', formData);
        toast.success('Material criado com sucesso!');
      }
      handleCloseModal();
      fetchMaterials();
    } catch (error) {
      console.error("Erro ao salvar", error);
    } finally {
      setIsFormLoading(false);
    }
  };

  // 🔥 Handler para Alternar Status (Ativar/Desativar)
  const handleToggleStatus = async (material: any) => {
    const newStatus = material.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    
    // Optimistic Update (Atualiza a UI antes da API responder para parecer instantâneo)
    const oldMaterials = [...materials];
    setMaterials(prev => prev.map(m => m.id === material.id ? { ...m, status: newStatus } : m));

    try {
      // Como sua rota de update é genérica (PATCH /materials/:id), enviamos apenas o campo status
      await api.patch(`/materials/${material.id}`, { status: newStatus });
      toast.success(`Material ${newStatus === "ACTIVE" ? "ativado" : "desativado"} com sucesso!`);
    } catch (error) {
      // Reverte se der erro
      setMaterials(oldMaterials);
      toast.error("Erro ao alterar status do material.");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/materials/${deleteId}`);
      toast.success('Material inativado/removido.'); // Depende se sua API faz soft delete ou hard delete no DELETE
      fetchMaterials();
      setIsDeleteOpen(false);
    } catch (error) {
       console.error("Erro ao deletar", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Colunas da Tabela ---
  const columns: Column<any>[] = useMemo(() => [
    {
      header: "Material",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
             <Package size={18} />
          </div>
          <div>
            <p className="font-medium text-[#2D3436]">{item.name}</p>
            <p className="text-[#95A5A6] text-xs mt-0.5 truncate max-w-[200px]">
              {item.description || 'Sem descrição'}
            </p>
          </div>
        </div>
      )
    },
    {
      header: "Tipo",
      cell: (item) => (
        <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200">
          {item.type}
        </Badge>
      )
    },
    {
      header: "Cor",
      cell: (item) => (
        <div className="flex items-center gap-2">
          {item.color ? (
            <>
              <div 
                className="w-3 h-3 rounded-full border border-gray-300 shadow-sm" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-slate-600">{item.color}</span>
            </>
          ) : (
            <span className="text-sm text-slate-400">N/A</span>
          )}
        </div>
      )
    },
    {
      header: "Unidade",
      className: "text-center",
      cell: (item) => (
        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
          {item.unitOfMeasure}
        </span>
      )
    },
    {
      header: "Rendimento",
      className: "text-right",
      cell: (item) => (
        <div className="text-right text-sm font-medium text-slate-700">
          {item.yieldPerKg} <span className="text-xs text-[#95A5A6] font-normal">/kg</span>
        </div>
      )
    },
    // 🔥 Nova Coluna de Status (Igual Usuários)
    {
      header: "Status",
      cell: (item) => (
        <Badge className={item.status === "ACTIVE" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
          {item.status === "ACTIVE" ? "Ativo" : "Inativo"}
        </Badge>
      )
    },
    {
      header: "Ações",
      className: "text-right",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            
            <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            
            {/* 🔥 Opção de Desativar/Ativar */}
            <DropdownMenuItem onClick={() => handleToggleStatus(item)}>
              <Power className="mr-2 h-4 w-4" /> 
              {item.status === "ACTIVE" ? "Desativar" : "Ativar"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600" 
              onClick={() => { setDeleteId(item.id); setIsDeleteOpen(true); }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ], [materials]); // 🔥 Adicione 'materials' nas dependências para o handleToggleStatus funcionar com o state atual

  // --- Renderização ---
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F0E6]">
        <Loader2 className="h-8 w-8 animate-spin text-[#D35400]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-8 font-sans selection:bg-[#D35400] selection:text-white">
      
      <div className="max-w-7xl mx-auto space-y-6">
        
        <PageHeader 
          title="Materiais" 
          description="Gerencie o estoque e insumos da produção."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nome, tipo ou cor..."
        >
          <Button
            onClick={handleOpenCreate}
            className="bg-[#D35400] hover:bg-[#A04000] text-white shadow-md transition-all gap-2"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Novo Material</span>
          </Button>
        </PageHeader>

        <GenericTable
          title="Inventário"
          data={materials}
          columns={columns}
          isLoading={loading}
          emptyMessage="Nenhum material encontrado."
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            onPageChange: setPage,
            totalItems: totalItems,
            itemsPerPage: 10
          }}
        />

        <MaterialFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={editingMaterial}
          onSubmit={handleFormSubmit}
          isLoading={isFormLoading}
        />

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" /> Atenção
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este material permanentemente?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => { e.preventDefault(); handleDelete(); }} 
                disabled={isDeleting} 
                className="bg-red-600 hover:bg-red-700 text-white"
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
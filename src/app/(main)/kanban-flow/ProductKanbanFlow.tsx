/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  CalendarClock,
  Factory,
  Filter as FilterIcon,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// --- Imports de Infraestrutura ---
import { useAuth } from "@/contexts/AuthContext";
import { useKanbanDrag } from "@/hooks/use-kanban-drag";
import { api } from "@/services/api";

// --- Imports dos Componentes Base (UI System) ---
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { KanbanFilter } from "@/components/kanban/kanban-filter";
import { KanbanHeader } from "@/components/kanban/kanban-header";
import { KanbanLayout } from "@/components/kanban/kanban-layout";

// --- Imports de UI Genéricos ---
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Imports de Modais Específicos ---
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { FlowItemModal } from "@/components/modals/flow-item-modal";

// --- Tipagens Locais ---
interface FlowMedia { id: string; url: string; filename: string; }
interface UserProfile { id: string; name: string; }
interface FlowItem {
  id: string;
  title: string;
  orderNumber: string;
  productRef: string;
  quantity: number;
  priority: number;
  status: string;
  stageId?: string;
  supplierId?: string;
  supplier?: { id: string; name: string; category?: string };
  dueDate?: string;
  images: FlowMedia[];
  audios: FlowMedia[];
  videos: FlowMedia[];
  description?: string;
}
interface FlowStage {
  id: string;
  name: string;
  order: number;
  color?: string;
  items: FlowItem[];
}
interface ProductFlow {
  id: string;
  name: string;
  stages: FlowStage[];
}

// --- Helpers ---
const formatDateUTC = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};
const getPriorityColor = (p: number) => { 
  if (p === 1) return "#E74C3C"; 
  if (p === 2) return "#F1C40F"; 
  return "#27AE60"; 
};

export default function ProductFlowKanban() {
  const { user } = useAuth();

  // --- Estados Principais ---
  const [flows, setFlows] = useState<ProductFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");
  const [currentFlow, setCurrentFlow] = useState<ProductFlow | null>(null);
  
  // Recursos auxiliares
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Estados de Controle de Modais ---
  const [isFlowModal, setIsFlowModal] = useState(false);
  const [isStageModal, setIsStageModal] = useState(false);
  const [isItemModal, setIsItemModal] = useState(false);
  const [isEditItemModal, setIsEditItemModal] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);
  
  // Estados de Exclusão
  const [isDeleteItemModal, setIsDeleteItemModal] = useState(false);
  const [isDeleteStageModal, setIsDeleteStageModal] = useState(false);
  const [isDeleteFlowModal, setIsDeleteFlowModal] = useState(false);

  // --- Estados de Edição/Seleção ---
  const [editingStage, setEditingStage] = useState<FlowStage | null>(null);
  const [editingItem, setEditingItem] = useState<FlowItem | null>(null);
  const [previewItem, setPreviewItem] = useState<FlowItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FlowItem | null>(null);
  const [stageToDelete, setStageToDelete] = useState<FlowStage | null>(null);
  
  // Forms states simples
  const [flowName, setFlowName] = useState("");
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState("#2C3E50");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Filtros ---
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterDateType, setFilterDateType] = useState("dueDate");
  const [filterOnlyOutsourced, setFilterOnlyOutsourced] = useState(false);
  const [filteredItems, setFilteredItems] = useState<FlowItem[] | null>(null);

  // --- Drag & Drop Setup ---
  // Achatar todos os itens para passar para o hook
  const allItems = currentFlow?.stages.flatMap(s => s.items) || [];
  
  const { moveItem, onDragStart } = useKanbanDrag({
    items: allItems,
    setItems: (updatedItems) => {
        // Optimistic Update Complexo: Precisamos reconstruir a estrutura de Flow -> Stages -> Items
        // Como 'updatedItems' é uma lista plana, apenas atualizamos a UI via re-fetch ou
        // manipulamos o 'currentFlow' localmente se quisermos performance extrema.
        // Para simplificar e manter integridade, confiamos no refetch do board após o drop.
        // Mas para feedback visual imediato (o hook faz isso no array plano), aqui deixamos vazio
        // pois o hook 'moveItem' retorna void e gerencia estado interno se passado.
        // *Nota:* O hook useKanbanDrag fornecido anteriormente espera um array plano.
    },
    idField: "stageId",
    moveCallback: async (itemId, newStageId) => {
       await api.put(`/flow/items/${itemId}/move`, { newStageId });
       // Recarrega o board para garantir ordem e dados corretos
       fetchFlowBoard(selectedFlowId);
    }
  });

  // --- Fetching ---
  const fetchFlows = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const { data } = await api.get(`/flow?companyId=${user.company.id}`);
      const flowsArray = Array.isArray(data) ? data : data.flows || [];
      setFlows(flowsArray);
      if (flowsArray.length > 0 && !selectedFlowId) {
        setSelectedFlowId(flowsArray[0].id);
      }
    } catch (err) { toast.error("Erro ao carregar fluxos"); }
  }, [user?.company?.id, selectedFlowId]);

  const fetchFlowBoard = useCallback(async (flowId: string) => {
    if (!flowId) return;
    // setLoading(true); // Opcional: evitar flicker se já estiver carregado
    try {
      const { data } = await api.get(`/flow/${flowId}/board?companyId=${user?.company?.id}`);
      setCurrentFlow(data);
    } catch (err) { toast.error("Erro ao carregar quadro"); }
    finally { setLoading(false); }
  }, [user?.company?.id]);

  const fetchResources = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const [usersRes, suppliersRes] = await Promise.all([
        api.get(`/users/company/${user.company.id}`),
        api.get(`/suppliers?companyId=${user.company.id}`)
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      const supData = suppliersRes.data.data || suppliersRes.data;
      setSuppliers(Array.isArray(supData) ? supData : []);
    } catch (err) { console.error(err); }
  }, [user?.company?.id]);

  useEffect(() => {
    if (user) {
      Promise.all([fetchFlows(), fetchResources()]).then(() => setLoading(false));
    }
  }, [user, fetchFlows, fetchResources]);

  useEffect(() => {
    if (selectedFlowId) {
       fetchFlowBoard(selectedFlowId);
    } else {
       setCurrentFlow(null);
    }
  }, [selectedFlowId, fetchFlowBoard]);

  // --- Filters Logic ---
  const applyFilter = async () => {
    if (!filterStartDate || !filterEndDate) return toast.error("Selecione data inicial e final");
    setLoading(true);
    try {
      const query = new URLSearchParams({ 
          startDate: filterStartDate, 
          endDate: filterEndDate, 
          dateField: filterDateType, 
          onlyOutsourced: filterOnlyOutsourced.toString() 
      });
      const { data } = await api.get(`/flow/filter/items?${query.toString()}`);
      setFilteredItems(data);
      toast.success(`${data.length} itens encontrados`);
    } catch (err) { toast.error("Erro ao filtrar itens"); } 
    finally { setLoading(false); }
  };

  // --- CRUD Handlers ---

  // Fluxo
  const handleCreateFlow = async () => {
    if (!flowName.trim()) return toast.error("Nome obrigatório");
    try {
      const { data: newFlow } = await api.post(`/flow`, { name: flowName.trim() });
      setFlows(prev => [...prev, newFlow]);
      setSelectedFlowId(newFlow.id);
      setIsFlowModal(false);
      setFlowName("");
      toast.success("Fluxo criado!");
    } catch { toast.error("Erro ao criar fluxo"); }
  };

  const handleDeleteFlow = async () => {
     if (!selectedFlowId) return;
     try {
        await api.delete(`/flow/${selectedFlowId}`);
        const remaining = flows.filter(f => f.id !== selectedFlowId);
        setFlows(remaining);
        setSelectedFlowId(remaining.length > 0 ? remaining[0].id : "");
        setIsDeleteFlowModal(false);
        toast.success("Fluxo excluído");
     } catch { toast.error("Erro ao excluir fluxo"); }
  };

  // Etapa
  const handleStageSubmit = async () => {
     if (!selectedFlowId || !stageName.trim()) return toast.error("Nome obrigatório");
     try {
        if (editingStage) {
           await api.put(`/flow/stages/${editingStage.id}`, { name: stageName, color: stageColor, order: editingStage.order });
        } else {
           await api.post(`/flow/${selectedFlowId}/stages`, { name: stageName, color: stageColor });
        }
        setIsStageModal(false);
        fetchFlowBoard(selectedFlowId);
        toast.success(editingStage ? "Etapa atualizada" : "Etapa criada");
     } catch { toast.error("Erro ao salvar etapa"); }
  };

  const handleDeleteStage = async () => {
     if (!stageToDelete) return;
     try {
        await api.delete(`/flow/stages/${stageToDelete.id}`);
        setIsDeleteStageModal(false);
        fetchFlowBoard(selectedFlowId);
        toast.success("Etapa removida");
     } catch { toast.error("Erro ao remover etapa"); }
  };

  // Item
  const handleItemSubmit = async (values: any, files: any, removedMedia: any) => {
    if (!selectedFlowId) return;
    setIsSubmitting(true);
    try {
        if (editingItem) {
            await api.put(`/flow/items/${editingItem.id}`, values);
            // Lógica de mídia (simplificada para o exemplo, similar ao Kanban de Tarefas)
            if(removedMedia.images.length) for (const id of removedMedia.images) await api.delete(`/flow/items/${editingItem.id}/media/image/${id}`);
            // ... uploads
            await uploadMedia(editingItem.id, files);
            toast.success("Item atualizado");
        } else {
            const { data: newItem } = await api.post(`/flow/${selectedFlowId}/items`, values);
            await uploadMedia(newItem.id, files);
            toast.success("Item criado");
        }
        setIsItemModal(false);
        setIsEditItemModal(false);
        fetchFlowBoard(selectedFlowId);
    } catch { toast.error("Erro ao salvar item"); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteItem = async () => {
     if (!itemToDelete) return;
     try {
        await api.delete(`/flow/items/${itemToDelete.id}`);
        setIsDeleteItemModal(false);
        fetchFlowBoard(selectedFlowId);
        toast.success("Item excluído");
     } catch { toast.error("Erro ao excluir item"); }
  };

  const uploadMedia = async (itemId: string, files: any) => {
     const upload = async (file: File, type: string) => {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/flow/items/${itemId}/media/${type}`, fd, { headers: { 'Content-Type': 'multipart/form-data' }});
     };
     for(const f of files.images) await upload(f, "image");
     for(const f of files.audios) await upload(f, "audio");
     for(const f of files.videos) await upload(f, "video");
  };

  // --- Configuration Actions (Header) ---
  const flowConfigActions = [
    { 
      label: 'Criar Item', 
      onClick: () => { setEditingItem(null); setIsItemModal(true); },
      icon: <Plus className="w-4 h-4 mr-2" />
    },
    { 
      label: 'Nova Etapa', 
      onClick: () => { setEditingStage(null); setStageName(""); setStageColor("#2C3E50"); setIsStageModal(true); },
      icon: <Layers className="w-4 h-4 mr-2" />
    },
    { 
      label: 'Novo Fluxo', 
      onClick: () => { setFlowName(""); setIsFlowModal(true); },
      icon: <Factory className="w-4 h-4 mr-2" />
    },
    {
      label: 'Excluir Fluxo Atual',
      onClick: () => setIsDeleteFlowModal(true),
      icon: <Trash2 className="w-4 h-4 mr-2" />,
      variant: "destructive" as const
    }
  ];

  if (loading && !currentFlow && flows.length > 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F0E6]">
        <RefreshCw className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <KanbanLayout>
      {/* 1. Header com Seletor de Fluxo */}
      <KanbanHeader
        title="Esteira de Produção"
        icon={<Factory className="w-5 h-5 text-orange-400" />}
        configActions={flowConfigActions}
        rightContent={
          <div className="flex items-center gap-2">
             {flows.length > 0 ? (
                <div className="relative">
                  <select
                    className="appearance-none bg-black/20 text-white text-sm rounded-md pl-3 pr-8 py-1.5 border border-white/10 hover:bg-black/30 cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500"
                    value={selectedFlowId}
                    onChange={(e) => setSelectedFlowId(e.target.value)}
                  >
                    {flows.map(f => <option key={f.id} value={f.id} className="text-gray-900">{f.name}</option>)}
                  </select>
                </div>
             ) : (
                <span className="text-xs text-white/60 italic">Nenhum fluxo</span>
             )}
          </div>
        }
      />

      {/* 2. Filtros Específicos de Fluxo */}
      {currentFlow && (
        <KanbanFilter>
           <div className="grid gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">De</label>
              <Input type="date" className="h-8 text-xs w-32" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
           </div>
           <div className="grid gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Até</label>
              <Input type="date" className="h-8 text-xs w-32" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
           </div>
           <div className="grid gap-1">
               <label className="text-[10px] uppercase font-bold text-slate-400">Considerar Data</label>
               <select 
                 className="flex h-8 w-32 rounded-md border border-input bg-background px-2 py-1 text-xs"
                 value={filterDateType}
                 onChange={e => setFilterDateType(e.target.value)}
               >
                  <option value="dueDate">Prazo</option>
                  <option value="productionStartedAt">Início</option>
                  <option value="deliveryAt">Entrega</option>
               </select>
           </div>
           <div className="flex items-center gap-2 pt-4 h-8">
              <div className="flex items-center space-x-2 border rounded-md px-3 h-8 bg-white">
                 <input 
                   type="checkbox" 
                   id="outsourced" 
                   checked={filterOnlyOutsourced} 
                   onChange={e => setFilterOnlyOutsourced(e.target.checked)}
                   className="rounded text-orange-500 focus:ring-orange-500" 
                 />
                 <label htmlFor="outsourced" className="text-xs font-medium cursor-pointer">Terceirizados</label>
              </div>
              <Button size="sm" variant="default" className="h-8 text-xs bg-slate-800" onClick={applyFilter}>
                 <FilterIcon className="w-3 h-3 mr-2"/> Filtrar
              </Button>
              {filteredItems && (
                 <Button size="sm" variant="ghost" className="h-8 text-xs text-red-500" onClick={() => setFilteredItems(null)}>
                    <X className="w-3 h-3 mr-1"/> Limpar
                 </Button>
              )}
           </div>
        </KanbanFilter>
      )}

      {/* 3. Board */}
      <KanbanBoard>
         {!selectedFlowId ? (
            <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
               <Factory size={48} className="mb-4 text-slate-400"/>
               <p className="text-slate-500">Selecione ou crie um fluxo para começar.</p>
               <Button variant="outline" className="mt-4" onClick={() => setIsFlowModal(true)}>Criar Fluxo</Button>
            </div>
         ) : (
            currentFlow?.stages?.sort((a, b) => a.order - b.order).map(stage => {
               // Filtragem Lógica (UI level)
               const itemsToShow = filteredItems 
                  ? stage.items.filter(i => filteredItems.some(fi => fi.id === i.id))
                  : stage.items;

               return (
                  <KanbanColumn
                     key={stage.id}
                     id={stage.id}
                     title={stage.name}
                     color={stage.color || "#34495E"} // Cor específica da etapa
                     count={itemsToShow.length}
                     onDropItem={moveItem}
                     onEditClick={() => { setEditingStage(stage); setStageName(stage.name); setStageColor(stage.color || "#34495E"); setIsStageModal(true); }}
                     onDeleteClick={() => { setStageToDelete(stage); setIsDeleteStageModal(true); }}
                     onAddClick={() => { setEditingItem(null); setIsItemModal(true); }}
                  >
                     {itemsToShow.sort((a, b) => a.priority - b.priority).map(item => (
                        <KanbanCard
                           key={item.id}
                           id={item.id}
                           title={item.title}
                           subtitle={item.productRef} // Referência do produto
                           priorityColor={getPriorityColor(item.priority)}
                           coverImage={item.images[0]?.url}
                           imagesCount={item.images.length}
                           onDragStart={(e) => onDragStart(e, item.id)}
                           onView={() => { setPreviewItem(item); setIsPreviewModal(true); }}
                           onEdit={() => { setEditingItem(item); setIsEditItemModal(true); }}
                           onDelete={() => { setItemToDelete(item); setIsDeleteItemModal(true); }}
                           footer={
                              <div className="flex gap-2 items-center w-full">
                                 <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                                    <Package size={10}/> {item.quantity}
                                 </span>
                                 {item.supplier && (
                                    <span className="text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase truncate max-w-[80px]">
                                       {item.supplier.name}
                                    </span>
                                 )}
                                 {item.dueDate && (
                                    <span className="ml-auto text-[9px] text-slate-400 flex items-center gap-1">
                                       <CalendarClock size={10} /> {formatDateUTC(item.dueDate)}
                                    </span>
                                 )}
                              </div>
                           }
                        >
                           {/* Conteúdo específico do card de item */}
                           <p className="line-clamp-2 text-xs text-slate-600 mb-1">{item.description}</p>
                           <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">#{item.orderNumber || "SEM-PEDIDO"}</span>
                           </div>
                        </KanbanCard>
                     ))}
                  </KanbanColumn>
               )
            })
         )}
         
         {/* Botão de Adicionar Etapa no final do Board */}
         {currentFlow && (
             <button 
               onClick={() => { setEditingStage(null); setStageName(""); setStageColor("#2C3E50"); setIsStageModal(true); }}
               className="min-w-[50px] m-4 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
               title="Adicionar Etapa"
             >
                <Plus size={24} />
             </button>
         )}
      </KanbanBoard>

      {/* --- MODAIS --- */}

      {/* 1. Modal de Item (Complexo) */}
      <FlowItemModal 
         isOpen={isItemModal || isEditItemModal}
         onClose={() => { setIsItemModal(false); setIsEditItemModal(false); setEditingItem(null); }}
         initialData={editingItem}
         onSubmit={handleItemSubmit}
         isLoading={isSubmitting}
         users={users}
         suppliers={suppliers}
         stages={currentFlow?.stages.map(s => ({ id: s.id, name: s.name, order: s.order })) || []}
      />

      {/* 2. Modal de Etapa */}
      <Dialog open={isStageModal} onOpenChange={setIsStageModal}>
         <DialogContent>
            <DialogHeader><DialogTitle>{editingStage ? "Editar Etapa" : "Nova Etapa"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={stageName} onChange={e => setStageName(e.target.value)} placeholder="Ex: CORTE" />
               </div>
               <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2">
                     <Input type="color" value={stageColor} onChange={e => setStageColor(e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                     <Input value={stageColor} onChange={e => setStageColor(e.target.value)} className="font-mono uppercase" />
                  </div>
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsStageModal(false)}>Cancelar</Button>
               <Button onClick={handleStageSubmit} className="bg-orange-600 hover:bg-orange-700">Salvar</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* 3. Modal de Fluxo */}
      <Dialog open={isFlowModal} onOpenChange={setIsFlowModal}>
         <DialogContent>
            <DialogHeader><DialogTitle>Novo Fluxo de Produção</DialogTitle></DialogHeader>
            <div className="py-4">
               <Label>Nome do Fluxo</Label>
               <Input value={flowName} onChange={e => setFlowName(e.target.value)} placeholder="Ex: Coleção Inverno 2025" />
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsFlowModal(false)}>Cancelar</Button>
               <Button onClick={handleCreateFlow} className="bg-orange-600 hover:bg-orange-700">Criar</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* 4. Modal Delete Genérico */}
      <ConfirmDeleteModal 
         isOpen={isDeleteItemModal || isDeleteStageModal || isDeleteFlowModal}
         onClose={() => { setIsDeleteItemModal(false); setIsDeleteStageModal(false); setIsDeleteFlowModal(false); }}
         onConfirm={() => {
            if(isDeleteItemModal) handleDeleteItem();
            else if(isDeleteStageModal) handleDeleteStage();
            else if(isDeleteFlowModal) handleDeleteFlow();
         }}
         title="Confirmar Exclusão"
         description="Tem certeza? Esta ação removerá o item e seus dados associados."
      />

      {/* 5. Modal Preview */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
         <DialogContent className="max-w-2xl">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  {previewItem?.title}
                  <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                     {previewItem?.productRef}
                  </span>
               </DialogTitle>
               <DialogDescription>
                  Pedido: {previewItem?.orderNumber || "N/A"}
               </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm py-4">
               <div>
                  <p className="font-semibold text-slate-500 text-xs uppercase">Quantidade</p>
                  <p>{previewItem?.quantity} un.</p>
               </div>
               <div>
                  <p className="font-semibold text-slate-500 text-xs uppercase">Prioridade</p>
                  <p>{previewItem?.priority === 1 ? "Alta" : previewItem?.priority === 2 ? "Média" : "Baixa"}</p>
               </div>
               <div>
                  <p className="font-semibold text-slate-500 text-xs uppercase">Fornecedor</p>
                  <p>{previewItem?.supplier?.name || "Produção Interna"}</p>
               </div>
               <div>
                  <p className="font-semibold text-slate-500 text-xs uppercase">Prazo</p>
                  <p>{formatDateUTC(previewItem?.dueDate)}</p>
               </div>
               <div className="col-span-2 mt-2">
                  <p className="font-semibold text-slate-500 text-xs uppercase mb-1">Descrição</p>
                  <div className="bg-slate-50 p-3 rounded text-slate-700 border border-slate-100">
                     {previewItem?.description || "Sem observações."}
                  </div>
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsPreviewModal(false)}>Fechar</Button>
               <Button onClick={() => { setIsPreviewModal(false); setEditingItem(previewItem); setIsEditItemModal(true); }}>Editar</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

    </KanbanLayout>
  );
}
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
  X,
  // Novos icones para o preview detalhado
  Paperclip,
  ImageIcon,
  Mic,
  MapPin,
  Calendar,
  Flag
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  supplier?: { id: string; name: string; category?: string; city?: string; state?: string }; // Ajustado para suportar dados extras se houver
  dueDate?: string;
  images: FlowMedia[];
  audios: FlowMedia[];
  videos: FlowMedia[];
  description?: string;
  createdAt?: string; // Adicionado opcional
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
const formatDateShort = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: 'UTC' });

const isOverdue = (d: string) => new Date(d) < new Date();

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
  const allItems = useMemo(() => currentFlow?.stages.flatMap(s => s.items) || [], [currentFlow]);
  
  const { moveItem, onDragStart } = useKanbanDrag({
    items: allItems,
    setItems: () => {
        // Optimistic Update é complexo aqui, confiamos no refetch
    },
    idField: "stageId",
    moveCallback: async (itemId, newStageId) => {
       await api.put(`/flow/items/${itemId}/move`, { newStageId });
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

  const handleItemSubmit = async (values: any, files: any, removedMedia: any) => {
    if (!selectedFlowId) return;
    setIsSubmitting(true);
    try {
        if (editingItem) {
            // CRIAR UM OBJETO COMBINADO PARA O PUT
            const payload = {
                ...values,
                // Adiciona os arrays de remoção ao payload enviado para o backend
                removeImageIds: removedMedia.images,
                removeVideoIds: removedMedia.videos,
                removeAudioIds: removedMedia.audios
            };

            // Envia o payload com os dados E os IDs para remover
            await api.put(`/flow/items/${editingItem.id}`, payload);
            
            // Depois faz o upload das NOVAS mídias
            await uploadMedia(editingItem.id, files);
            
            toast.success("Item atualizado");
        } else {
            // (Lógica de criação mantida igual...)
            const { data: newItem } = await api.post(`/flow/${selectedFlowId}/items`, values);
            await uploadMedia(newItem.id, files);
            toast.success("Item criado");
        }
        
        setIsItemModal(false);
        setIsEditItemModal(false);
        fetchFlowBoard(selectedFlowId);
    } catch (err) { 
        console.error(err);
        toast.error("Erro ao salvar item"); 
    } finally { 
        setIsSubmitting(false); 
    }
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

      <KanbanBoard>
         {!selectedFlowId ? (
            <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
               <Factory size={48} className="mb-4 text-slate-400"/>
               <p className="text-slate-500">Selecione ou crie um fluxo para começar.</p>
               <Button variant="outline" className="mt-4" onClick={() => setIsFlowModal(true)}>Criar Fluxo</Button>
            </div>
         ) : (
            currentFlow?.stages?.sort((a, b) => a.order - b.order).map(stage => {
               const itemsToShow = filteredItems 
                  ? stage.items.filter(i => filteredItems.some(fi => fi.id === i.id))
                  : stage.items;

               return (
                  <KanbanColumn
                     key={stage.id}
                     id={stage.id}
                     title={stage.name}
                     color={stage.color || "#34495E"}
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
                           subtitle={item.productRef}
                           priorityColor={getPriorityColor(item.priority)}
                           coverImage={item.images[0]?.url}
                           imagesCount={item.images.length}
                           onDragStart={(e) => onDragStart(e, item.id)}
                           onDoubleClick={() => { setPreviewItem(item); setIsPreviewModal(true); }}
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
                                       <CalendarClock size={10} /> {formatDateShort(item.dueDate)}
                                    </span>
                                 )}
                              </div>
                           }
                        >
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

      {/* --- PREVIEW MODAL ATUALIZADO (IGUAL AO SOLICITADO) --- */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <div className="px-6 py-4 border-b sticky top-0 bg-white z-20 flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-800">{previewItem?.title}</DialogTitle>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">
                  Prioridade {previewItem?.priority === 1 ? "Alta" : previewItem?.priority === 2 ? "Média" : "Baixa"}
                </span>
                <span className="text-[10px] uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded font-bold text-orange-600">
                  {previewItem?.status || "PENDENTE"}
                </span>
                 <span className="text-[10px] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded font-bold text-blue-600">
                  Ref: {previewItem?.productRef}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-8">
            {/* LÓGICA DE MÍDIA CORRIGIDA AQUI */}
            {((previewItem?.images?.length || 0) + (previewItem?.videos?.length || 0) + (previewItem?.audios?.length || 0) > 0) && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Paperclip size={16} className="text-orange-600" /> Arquivos e Anexos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* IMAGENS */}
                  {previewItem?.images?.map((img) => (
                    <div key={img.id} className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img src={img.url} alt="Anexo" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <a href={img.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-2">
                        <ImageIcon size={16} /> Visualizar Original
                      </a>
                    </div>
                  ))}
                  {/* VIDEOS */}
                  {previewItem?.videos?.map((video) => (
                    <div key={video.id} className="rounded-xl overflow-hidden bg-black border border-slate-200 shadow-inner">
                      <video controls className="w-full aspect-video"><source src={video.url} type="video/mp4" /></video>
                    </div>
                  ))}
                  {/* AUDIOS */}
                  {previewItem?.audios?.map((audio) => (
                    <div key={audio.id} className="col-span-1 md:col-span-2 flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mic size={14} className="text-orange-600" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">Anexo de Áudio</span>
                      </div>
                      <audio controls className="w-full h-10"><source src={audio.url} type="audio/mpeg" /></audio>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight text-[11px]">Descrição do Item</h4>
              <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[100px] leading-relaxed">
                {previewItem?.description || "Nenhuma descrição detalhada fornecida para este item."}
              </div>
            </div>

            {/* ADAPTAÇÃO: Mostra o Fornecedor no lugar do Endereço (já que Item não tem endereço físico direto no seu código) */}
            {previewItem?.supplier && (
              <div className="bg-orange-50/30 p-4 rounded-xl border border-orange-100 space-y-2">
                <h4 className="text-sm font-bold text-orange-700 flex items-center gap-2">
                  <MapPin size={16} /> Fornecedor / Local de Produção
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold">{previewItem.supplier.name}</span>
                  {previewItem.supplier.category && <span> • {previewItem.supplier.category}</span>}
                  <br />
                  {(previewItem.supplier.city || previewItem.supplier.state) && (
                     <span className="text-xs text-slate-500">{previewItem.supplier.city} - {previewItem.supplier.state}</span>
                  )}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Qtd. Solicitada</span>
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                     <Package size={12} />
                   </div>
                   <span className="text-sm font-semibold text-slate-700">{previewItem?.quantity} unidades</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Prazo de Entrega</span>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className={previewItem?.dueDate && isOverdue(previewItem.dueDate) ? "text-red-500" : "text-slate-400"} />
                  <span className={`text-sm font-semibold ${previewItem?.dueDate && isOverdue(previewItem.dueDate) ? "text-red-600" : "text-slate-700"}`}>
                    {previewItem?.dueDate ? formatDateShort(previewItem.dueDate) : "Sem prazo definido"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t sticky bottom-0 z-20">
            <Button variant="outline" className="text-slate-600" onClick={() => setIsPreviewModal(false)}>Fechar Janela</Button>
            <Button className="bg-[#D35400] hover:bg-[#A04000]" onClick={() => { setIsPreviewModal(false); setEditingItem(previewItem); setIsEditItemModal(true); }}>
              Editar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </KanbanLayout>
  );
}
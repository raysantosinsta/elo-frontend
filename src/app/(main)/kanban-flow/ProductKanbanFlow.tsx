/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import {
  CalendarClock,
  Factory,
  Filter,
  Layers,
  Menu,
  Package,
  Plus,
  Settings,
  Trash2,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Componentes do Kanban
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { useKanbanDrag } from "@/hooks/use-kanban-drag";

// 🔥 CORREÇÃO: Importamos APENAS o componente, NÃO a interface (para usar a local)
import { FlowItemModal } from "@/components/modals/flow-item-modal";

const THEME = {
  colors: {
    textMain: "#2D3436",
    background: "#F5F0E6",
    primary: "#D35400",
    secondaryText: "#000000ff",
    navigation: "#2C3E50",
    white: "#FFFFFF",
    danger: "#E74C3C",
    success: "#27AE60",
    warning: "#F1C40F",
  },
};

// --- INTERFACES LOCAIS (Com 'supplier' definido para exibição) ---
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface FlowMedia {
  id: string;
  url: string;
  filename: string;
  duration?: number;
}

interface FlowStage {
  id: string;
  name: string;
  order: number;
  color?: string;
  items: FlowItem[];
}

// 🔥 Interface completa usada nesta página (inclui supplier object)
interface FlowItem {
  id: string;
  title: string;
  orderNumber: string;
  productRef: string;
  quantity: number;
  priority: number;
  status: string;
  enteredAt: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: UserProfile;
  stage?: FlowStage;
  stageId?: string;
  images: FlowMedia[];
  audios: FlowMedia[];
  videos: FlowMedia[];
  flowId: string;
  description?: string;
  
  // Datas de Controle
  dueDate?: string;            
  productionStartedAt?: string; 
  deliveryAt?: string;          
  
  // Fornecedores / Terceirização
  supplierId?: string;
  // 🔥 Esta propriedade é essencial para o card mostrar o nome
  supplier?: { id: string; name: string; category?: string };
}

interface ProductFlow {
  id: string;
  name: string;
  description?: string;
  stages: FlowStage[];
  items: FlowItem[];
  createdAt: string;
  updatedAt: string;
}

// --- UTILS ---
const formatDateUTC = (dateString?: string) => { if (!dateString) return "-"; return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' }); };
const getPriorityColor = (p: number) => { if (p === 1) return "#E74C3C"; if (p === 2) return "#F1C40F"; return "#27AE60"; };

export default function ProductFlowKanban() {
  const { user, logout, loading: authLoading } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  const [flows, setFlows] = useState<ProductFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<string>("");
  const [currentFlow, setCurrentFlow] = useState<ProductFlow | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDeleteItemModal, setIsDeleteItemModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FlowItem | null>(null);
  
  // Modais
  const [isFlowModal, setIsFlowModal] = useState(false);
  const [isStageModal, setIsStageModal] = useState(false);
  const [isItemModal, setIsItemModal] = useState(false);
  const [isEditItemModal, setIsEditItemModal] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);
  const [isDeleteStageModal, setIsDeleteStageModal] = useState(false);
  const [isDeleteFlowModal, setIsDeleteFlowModal] = useState(false);

  // Estados de Filtro
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterDateType, setFilterDateType] = useState("dueDate");
  const [filterOnlyOutsourced, setFilterOnlyOutsourced] = useState(false);
  const [filteredItems, setFilteredItems] = useState<FlowItem[] | null>(null);

  // Seleções
  const [stageToDelete, setStageToDelete] = useState<FlowStage | null>(null);
  const [previewItem, setPreviewItem] = useState<FlowItem | null>(null);
  const [editingStage, setEditingStage] = useState<FlowStage | null>(null);
  const [editingItem, setEditingItem] = useState<FlowItem | null>(null);

  // Forms
  const [flowName, setFlowName] = useState("");
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState(THEME.colors.navigation);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FETCHING DATA ---
  const fetchFlows = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const { data } = await api.get(`/flow?companyId=${user.company.id}`);
      const flowsArray = Array.isArray(data) ? data : data.flows || data.data || [];
      setFlows(flowsArray);
      if (flowsArray.length > 0 && !selectedFlow) setSelectedFlow(flowsArray[0].id);
    } catch (err) { console.error(err); toast.error("Erro ao carregar fluxos"); }
  }, [user?.company?.id, selectedFlow]);

  const fetchFlowBoard = useCallback(async (flowId: string) => {
    if (!flowId) return;
    try {
      const { data } = await api.get(`/flow/${flowId}/board?companyId=${user?.company?.id}`);
      setCurrentFlow(data);
    } catch (err) { console.error(err); toast.error("Erro ao carregar quadro"); }
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
      setLoading(true);
      Promise.all([fetchFlows(), fetchResources()]).finally(() => setLoading(false));
    }
  }, [user, fetchFlows, fetchResources]);
  
  useEffect(() => { if (selectedFlow) fetchFlowBoard(selectedFlow); }, [selectedFlow, fetchFlowBoard]);

  // --- DRAG AND DROP ---
  // Extrai todos os itens para passar ao hook
  const allItems = currentFlow?.stages.flatMap(s => s.items) || [];
  
  const { moveItem, onDragStart } = useKanbanDrag({
    items: allItems,
    setItems: (newItems) => { 
        // Lógica de update local se necessário
    },
    idField: "stageId",
    moveCallback: async (itemId, newColId) => {
       await api.put(`/flow/items/${itemId}/move`, { newStageId: newColId });
       await fetchFlowBoard(selectedFlow);
    }
  });

  const applyFilter = async () => {
    if (!filterStartDate || !filterEndDate) return toast.error("Selecione data inicial e final");
    setLoading(true);
    try {
      const query = new URLSearchParams({ startDate: filterStartDate, endDate: filterEndDate, dateField: filterDateType, onlyOutsourced: filterOnlyOutsourced.toString() });
      const { data } = await api.get(`/flow/filter/items?${query.toString()}`);
      setFilteredItems(data);
      toast.success(`${data.length} itens encontrados`);
    } catch (err) { toast.error("Erro ao filtrar itens"); } finally { setLoading(false); }
  };

  // --- CRUD ACTIONS ---
  const createFlow = async () => {
    if (!flowName.trim()) return toast.error("Nome do fluxo obrigatório");
    try {
      const { data: newFlow } = await api.post(`/flow`, { name: flowName.trim() });
      setFlows((prev) => [...prev, newFlow]); setFlowName(""); setIsFlowModal(false); setSelectedFlow(newFlow.id);
      toast.success(`Fluxo "${newFlow.name}" criado!`);
    } catch { toast.error("Erro ao criar fluxo"); }
  };

  const handleDeleteFlow = async () => {
    if (!selectedFlow) return;
    try {
      await api.delete(`/flow/${selectedFlow}`);
      const updatedFlows = flows.filter((f) => f.id !== selectedFlow);
      setFlows(updatedFlows); setIsDeleteFlowModal(false);
      if (updatedFlows.length > 0) setSelectedFlow(updatedFlows[0].id);
      else { setSelectedFlow(""); setCurrentFlow(null); }
      toast.success("Fluxo excluído.");
    } catch { toast.error("Erro ao excluir fluxo."); }
  };

  const createStage = async () => {
    if (!selectedFlow || !stageName.trim()) return toast.error("Preencha o nome da etapa");
    try {
      await api.post(`/flow/${selectedFlow}/stages`, { name: stageName, color: stageColor });
      await fetchFlowBoard(selectedFlow); setStageName(""); setIsStageModal(false); toast.success("Etapa criada.");
    } catch { toast.error("Erro ao criar etapa."); }
  };

  const updateStage = async () => {
    if (!editingStage || !stageName.trim()) return;
    try {
      await api.put(`/flow/stages/${editingStage.id}`, { name: stageName, color: stageColor, order: editingStage.order });
      await fetchFlowBoard(selectedFlow); setStageName(""); setIsStageModal(false); toast.success("Etapa atualizada.");
    } catch { toast.error("Erro ao atualizar etapa."); }
  };

  const deleteStage = async () => {
    if (!stageToDelete) return;
    try {
      await api.delete(`/flow/stages/${stageToDelete.id}`);
      await fetchFlowBoard(selectedFlow); setIsDeleteStageModal(false); setStageToDelete(null); toast.success("Etapa removida.");
    } catch { toast.error("Erro ao remover etapa."); }
  };

  const handleConfirmDeleteItem = async () => {
     if (!itemToDelete) return;
     setIsSubmitting(true);
     try {
       await api.delete(`/flow/items/${itemToDelete.id}`);
       await fetchFlowBoard(selectedFlow);
       if (filteredItems) setFilteredItems(prev => prev ? prev.filter(i => i.id !== itemToDelete!.id) : null);
       toast.success("Item excluído.");
       setIsDeleteItemModal(false);
       setItemToDelete(null);
     } catch { toast.error("Erro ao excluir item."); } finally { setIsSubmitting(false); }
  };

  const handleItemSubmit = async (values: any, files: any, removedMedia: any) => {
    if (!selectedFlow) return;
    setIsSubmitting(true);
    try {
        if (editingItem) {
            // UPDATE
            await api.put(`/flow/items/${editingItem.id}`, values);
            
            // Remove Mídias
            if(removedMedia.images.length) for (const id of removedMedia.images) await api.delete(`/flow/items/${editingItem.id}/media/image/${id}`);
            if(removedMedia.audios.length) for (const id of removedMedia.audios) await api.delete(`/flow/items/${editingItem.id}/media/audio/${id}`);
            if(removedMedia.videos.length) for (const id of removedMedia.videos) await api.delete(`/flow/items/${editingItem.id}/media/video/${id}`);

            // Adiciona Mídias
            await uploadAllMediaFiles(editingItem.id, files);
            
            toast.success("Item atualizado!");
            setIsEditItemModal(false);
        } else {
            // CREATE
            const { data: responseData } = await api.post(`/flow/${selectedFlow}/items`, values);
            await uploadAllMediaFiles(responseData.id, files);
            toast.success("Item criado!");
            setIsItemModal(false);
        }
        await fetchFlowBoard(selectedFlow);
        if (filteredItems) applyFilter();
    } catch (err) {
        console.error(err);
        toast.error("Erro ao salvar item.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const uploadSingleMedia = async (itemId: string, file: File, type: "image" | "audio" | "video") => {
    const formData = new FormData();
    formData.append("file", file, file.name); 
    await api.post(`/flow/items/${itemId}/media/${type}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  };

  const uploadAllMediaFiles = async (itemId: string, files: any) => {
    for (const f of files.images) await uploadSingleMedia(itemId, f, "image");
    for (const f of files.audios) await uploadSingleMedia(itemId, f, "audio");
    for (const f of files.videos) await uploadSingleMedia(itemId, f, "video");
  };

  if (authLoading || loading) return <div className="flex h-screen items-center justify-center flex-col gap-4" style={{ backgroundColor: THEME.colors.background }}><div className="animate-spin rounded-full h-12 w-12 border-b-4" style={{ borderColor: THEME.colors.primary }} /><p className="font-medium animate-pulse" style={{ color: THEME.colors.textMain }}>Carregando esteira...</p></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: THEME.colors.background }}>
      
      {/* Header */}
      <header className="px-4 py-3 shadow-md sticky top-0 z-40 transition-colors" style={{ backgroundColor: THEME.colors.navigation }}>
        <div className="flex justify-between items-center max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X /> : <Menu />}</Button>
            <div><h1 className="text-lg font-bold text-white flex items-center gap-2"><Factory size={18} className="text-orange-400" /> ESTEIRA DE PRODUÇÃO</h1><p className="text-xs text-blue-200 font-medium">{user.company?.name}</p></div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <select className="bg-black/20 text-white text-sm rounded-md px-3 py-1.5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all cursor-pointer hover:bg-black/30" value={selectedFlow} onChange={(e) => setSelectedFlow(e.target.value)}><option value="" className="text-gray-900">Selecione um fluxo</option>{flows.map((f) => <option key={f.id} value={f.id} className="text-gray-900">{f.name}</option>)}</select>
            {selectedFlow && (
              <>
                <Button onClick={() => setIsDeleteFlowModal(true)} size="sm" className="bg-red-500/80 hover:bg-red-600 text-white border-0" title="Excluir Fluxo Atual"><Trash2 size={14} /></Button>
                <div className="h-6 w-px bg-white/20 mx-1" />
                <Button onClick={() => { setStageName(""); setStageColor(THEME.colors.navigation); setIsStageModal(true); }} size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0"><Layers size={14} className="mr-2" /> Nova Etapa</Button>
                <Button onClick={() => { setIsItemModal(true); }} size="sm" className="text-white border-0 shadow-md hover:brightness-110 transition-all" style={{ backgroundColor: THEME.colors.primary }}><Plus size={16} className="mr-2" /> Novo Item</Button>
              </>
            )}
            <Button onClick={() => setIsFlowModal(true)} size="sm" variant="ghost" className="text-white hover:bg-white/10"><Settings size={16} /></Button>
          </div>
        </div>
      </header>

      {/* --- ÁREA DE FILTROS --- */}
      {selectedFlow && (
      <div className="mx-4 md:mx-6 mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
        <div className="space-y-1"><Label className="text-xs font-semibold text-gray-600">De</Label><Input type="date" className="h-9 w-36" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold text-gray-600">Até</Label><Input type="date" className="h-9 w-36" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold text-gray-600">Filtrar por data de:</Label><select className="h-9 border rounded px-2 text-sm bg-white w-40 focus:ring-2 focus:ring-orange-500 outline-none" value={filterDateType} onChange={e => setFilterDateType(e.target.value)}><option value="dueDate">Prazo (Meta)</option><option value="productionStartedAt">Início Produção</option><option value="deliveryAt">Entrega</option><option value="enteredAt">Criação</option></select></div>
        <div className="flex items-center gap-2 pb-2 h-9"><input type="checkbox" id="outsourcedCheck" checked={filterOnlyOutsourced} onChange={e => setFilterOnlyOutsourced(e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500" /><Label htmlFor="outsourcedCheck" className="cursor-pointer text-sm font-medium">Apenas Terceirizados</Label></div>
        <div className="flex gap-2 pb-0.5"><Button size="sm" onClick={applyFilter} className="bg-gray-800 hover:bg-gray-900 text-white"><Filter size={14} className="mr-2"/> Filtrar</Button>{filteredItems && (<Button size="sm" variant="ghost" onClick={() => setFilteredItems(null)} className="text-red-500 hover:text-red-700 hover:bg-red-50"><X size={14} className="mr-2"/> Limpar Filtro</Button>)}</div>
      </div>
      )}

      {/* --- CONTEÚDO PRINCIPAL (KANBAN) --- */}
      <KanbanBoard>
        {!selectedFlow ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-center opacity-60"><Layers size={64} style={{ color: THEME.colors.secondaryText }} className="mb-4" /><h2 className="text-xl font-bold" style={{ color: THEME.colors.textMain }}>Nenhum fluxo selecionado</h2><p style={{ color: THEME.colors.secondaryText }}>Selecione um fluxo existente ou crie um novo para começar.</p><Button onClick={() => setIsFlowModal(true)} className="mt-4" style={{ backgroundColor: THEME.colors.primary }}>Criar Fluxo</Button></div>
        ) : (
          <>
            {currentFlow?.stages?.sort((a, b) => a.order - b.order).map((stage) => {
              const itemsToShow = filteredItems ? stage.items.filter(item => filteredItems.some(f => f.id === item.id)) : stage.items;
              return (
                <KanbanColumn
                    key={stage.id}
                    id={stage.id}
                    title={stage.name}
                    count={itemsToShow.length}
                    color={stage.color}
                    onDropItem={moveItem}
                    onEditClick={() => { setEditingStage(stage); setStageName(stage.name); setStageColor(stage.color || ""); setIsStageModal(true); }}
                    onDeleteClick={() => { setStageToDelete(stage); setIsDeleteStageModal(true); }}
                >
                    {itemsToShow?.sort((a, b) => a.priority - b.priority).map((item) => (
                        <KanbanCard 
                            key={item.id} 
                            id={item.id} 
                            title={item.title}
                            subtitle={item.productRef}
                            priorityColor={getPriorityColor(item.priority)}
                            coverImage={item.images[0]?.url}
                            imagesCount={item.images.length}
                            onDragStart={(e) => onDragStart(e, item.id)}
                            onView={() => { setPreviewItem(item); setIsPreviewModal(true); }}
                            onEdit={() => { setEditingItem(item); setIsEditItemModal(true); }}
                            onDelete={() => { setItemToDelete(item); setIsDeleteItemModal(true); }}
                            footer={
                                <div className="flex gap-2 items-center">
                                    <span className="flex items-center gap-1 text-slate-500"><Package size={12}/> {item.quantity}</span>
                                    {/* 🔥 Agora o 'item' aqui é o da interface local, que TEM supplier */}
                                    {item.supplier && <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1 rounded"><Factory size={10}/> {item.supplier.name}</span>}
                                    {item.dueDate && <span className="flex items-center gap-1 text-slate-400"><CalendarClock size={12}/> {formatDateUTC(item.dueDate)}</span>}
                                </div>
                            }
                        >
                            <p className="line-clamp-2 text-xs text-slate-600">{item.description}</p>
                        </KanbanCard>
                    ))}
                </KanbanColumn>
              );
            })}
            <button onClick={() => { setStageName(""); setStageColor(THEME.colors.navigation); setIsStageModal(true); }} className="w-[300px] h-[100px] border-2 border-dashed rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all border-slate-300"><div className="flex flex-col items-center gap-2"><Plus size={24} /><span className="font-medium">Adicionar Etapa</span></div></button>
          </>
        )}
      </KanbanBoard>

      <FlowItemModal 
        isOpen={isItemModal || isEditItemModal}
        onClose={() => { setIsItemModal(false); setIsEditItemModal(false); setEditingItem(null); }}
        initialData={editingItem as any} // Cast simples pois o modal usa uma interface interna ligeiramente diferente
        onSubmit={handleItemSubmit}
        isLoading={isSubmitting}
        users={users.map(u => ({ id: u.id, name: u.name }))}
        suppliers={suppliers}
        stages={currentFlow?.stages?.sort((a, b) => a.order - b.order).map(s => ({ id: s.id, name: s.name, order: s.order })) || []}
      />

      <Dialog open={isStageModal} onOpenChange={setIsStageModal}>
        <DialogContent><DialogHeader><DialogTitle style={{ color: THEME.colors.textMain }}>{editingStage ? "Editar Etapa" : "Nova Etapa"}</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Nome</Label><Input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="Ex: CORTE, COSTURA" /></div><div className="space-y-2"><Label>Cor de Identificação</Label><div className="flex gap-2"><Input type="color" value={stageColor} onChange={(e) => setStageColor(e.target.value)} className="w-12 p-1 cursor-pointer" /><Input value={stageColor} onChange={(e) => setStageColor(e.target.value)} className="flex-1 font-mono uppercase" /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setIsStageModal(false)}>Cancelar</Button><Button onClick={editingStage ? updateStage : createStage} style={{ backgroundColor: THEME.colors.primary }}>Salvar</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isFlowModal} onOpenChange={setIsFlowModal}>
        <DialogContent><DialogHeader><DialogTitle style={{ color: THEME.colors.textMain }}>Novo Fluxo</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Nome do Fluxo</Label><Input value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="Ex: Confecção Verão 2025" /></div></div><DialogFooter><Button variant="outline" onClick={() => setIsFlowModal(false)}>Cancelar</Button><Button onClick={createFlow} style={{ backgroundColor: THEME.colors.primary }}>Criar</Button></DialogFooter></DialogContent>
      </Dialog>

      <ConfirmDeleteModal isOpen={isDeleteItemModal || isDeleteStageModal || isDeleteFlowModal} onClose={() => { setIsDeleteItemModal(false); setIsDeleteStageModal(false); setIsDeleteFlowModal(false); }} onConfirm={() => { if(isDeleteItemModal) handleConfirmDeleteItem(); else if(isDeleteStageModal) deleteStage(); else if(isDeleteFlowModal) handleDeleteFlow(); }} loading={isSubmitting} title="Excluir?" description="Esta ação não pode ser desfeita." />

      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
             <DialogHeader><DialogTitle>{previewItem?.title}</DialogTitle><DialogDescription>REF: {previewItem?.productRef}</DialogDescription></DialogHeader>
             {previewItem && (
                 <div className="space-y-4 py-4">
                     <div className="grid grid-cols-2 gap-4 text-sm">
                         <div><strong>Qtd:</strong> {previewItem.quantity}</div>
                         <div><strong>Prioridade:</strong> {previewItem.priority}</div>
                         <div><strong>Prazo:</strong> {formatDateUTC(previewItem.dueDate)}</div>
                         {/* Preview também usa a interface local */}
                         <div><strong>Fornecedor:</strong> {previewItem.supplier?.name || "Interno"}</div>
                     </div>
                     <p className="text-gray-600 bg-slate-50 p-3 rounded">{previewItem.description}</p>
                 </div>
             )}
             <DialogFooter><Button variant="outline" onClick={() => setIsPreviewModal(false)}>Fechar</Button><Button onClick={() => { setIsPreviewModal(false); if(previewItem) { setEditingItem(previewItem); setIsEditItemModal(true); } }}>Editar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
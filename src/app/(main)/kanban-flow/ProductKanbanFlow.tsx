/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Calendar,
  CalendarClock,
  ChevronDown,
  Factory,
  Filter as FilterIcon,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Paperclip,
  ImageIcon,
  Mic,
  MapPin,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// --- Infraestrutura ---
import { useAuth } from "@/contexts/AuthContext";
import { useKanbanDrag } from "@/hooks/use-kanban-drag";
import { api } from "@/services/api";

// --- Componentes Base ---
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { KanbanFilter } from "@/components/kanban/kanban-filter";
import { KanbanHeader } from "@/components/kanban/kanban-header";
import { KanbanLayout } from "@/components/kanban/kanban-layout";

// --- UI Genérica ---
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Modais ---
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { FlowItemModal } from "@/components/modals/flow-item-modal";

// --- Tipagens ---
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
  supplier?: { id: string; name: string; category?: string; city?: string; state?: string };
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

  // --- Estados de Dados ---
  const [flows, setFlows] = useState<ProductFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");
  const [currentFlow, setCurrentFlow] = useState<ProductFlow | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Estados de UI ---
  const [isFlowModal, setIsFlowModal] = useState(false);
  const [isStageModal, setIsStageModal] = useState(false);
  const [isItemModal, setIsItemModal] = useState(false);
  const [isEditItemModal, setIsEditItemModal] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'item' | 'stage' | 'flow', id: string } | null>(null);

  // --- Estados de Edição ---
  const [editingStage, setEditingStage] = useState<FlowStage | null>(null);
  const [editingItem, setEditingItem] = useState<FlowItem | null>(null);
  const [previewItem, setPreviewItem] = useState<FlowItem | null>(null);
  const [initialStageId, setInitialStageId] = useState<string | undefined>(undefined);

  const [flowName, setFlowName] = useState("");
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState("#2D3436");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Filtros (Restaurados e Ajustados) ---
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterDateType, setFilterDateType] = useState("dueDate");
  const [filterOnlyOutsourced, setFilterOnlyOutsourced] = useState(false);
  const [filteredItems, setFilteredItems] = useState<FlowItem[] | null>(null);

  // --- Fetching Data ---
  const fetchFlows = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const { data } = await api.get(`/flow?companyId=${user.company.id}`);
      setFlows(data);
      if (data.length > 0 && !selectedFlowId) setSelectedFlowId(data[0].id);
    } catch { toast.error("Erro ao carregar fluxos"); }
  }, [user?.company?.id, selectedFlowId]);

  const fetchFlowBoard = useCallback(async (flowId: string) => {
    if (!flowId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/flow/${flowId}/board`);
      setCurrentFlow(data);
    } catch { toast.error("Erro ao carregar quadro"); }
    finally { setLoading(false); }
  }, []);

  const fetchResources = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const [uRes, sRes] = await Promise.all([
        api.get(`/users/company/${user.company.id}`),
        api.get(`/suppliers?companyId=${user.company.id}`)
      ]);
      setUsers(uRes.data);
      setSuppliers(sRes.data.data || sRes.data);
    } catch { console.error("Erro recursos"); }
  }, [user?.company?.id]);

  useEffect(() => {
    if (user) { fetchFlows(); fetchResources(); }
  }, [user, fetchFlows, fetchResources]);

  useEffect(() => {
    if (selectedFlowId) fetchFlowBoard(selectedFlowId);
  }, [selectedFlowId, fetchFlowBoard]);

  // --- Filter Action ---
  const applyFilter = async () => {
    if (!filterStartDate || !filterEndDate) return toast.error("Selecione o período");
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
    } catch { toast.error("Erro ao filtrar"); }
    finally { setLoading(false); }
  };

  // --- Handlers: Flow, Stage, Item ---
  const handleOpenNewStage = useCallback(() => {
    if (!selectedFlowId) return toast.error("Selecione um fluxo");
    setEditingStage(null);
    setStageName("");
    setStageColor("#2D3436");
    setIsStageModal(true);
  }, [selectedFlowId]);

  const handleStageSubmit = async () => {
    if (!selectedFlowId || !stageName.trim()) return;
    try {
      if (editingStage) await api.put(`/flow/stages/${editingStage.id}`, { name: stageName, color: stageColor });
      else await api.post(`/flow/${selectedFlowId}/stages`, { name: stageName, color: stageColor });
      setIsStageModal(false);
      fetchFlowBoard(selectedFlowId);
      toast.success("Salvo!");
    } catch { toast.error("Erro etapa"); }
  };

  const handleAddItemFromColumn = (stageId: string) => {
    setEditingItem(null);
    setInitialStageId(stageId);
    setIsItemModal(true);
  };

  const handleItemSubmit = async (values: any, files: any, removedMedia: any) => {
    if (!selectedFlowId) return;
    setIsSubmitting(true);
    try {
      let itemId = editingItem?.id;
      if (editingItem) {
        await api.put(`/flow/items/${itemId}`, { ...values, ...removedMedia });
      } else {
        const { data: newItem } = await api.post(`/flow/${selectedFlowId}/items`, values);
        itemId = newItem.id;
      }
      if (itemId && files) await uploadMedia(itemId, files);
      setIsItemModal(false);
      setIsEditItemModal(false);
      fetchFlowBoard(selectedFlowId);
      toast.success("Item salvo!");
    } catch { toast.error("Erro item"); }
    finally { setIsSubmitting(false); }
  };

  const uploadMedia = async (itemId: string, files: any) => {
    const upload = async (file: File, type: string) => {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/flow/items/${itemId}/media/${type}`, fd);
    };
    for (const f of files.images) await upload(f, "image");
    for (const f of files.audios) await upload(f, "audio");
    for (const f of files.videos) await upload(f, "video");
  };

  const handleCreateFlow = async () => {
    if (!flowName.trim()) return;
    try {
      const { data } = await api.post(`/flow`, { name: flowName });
      setFlows(prev => [...prev, data]);
      setSelectedFlowId(data.id);
      setIsFlowModal(false);
      setFlowName("");
    } catch { toast.error("Erro fluxo"); }
  };

  const confirmDelete = (type: 'item' | 'stage' | 'flow', id: string) => {
    setDeleteTarget({ type, id });
    setDeleteModalOpen(true);
  };

  const handleDeleteExecute = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'item') await api.delete(`/flow/items/${deleteTarget.id}`);
      if (deleteTarget.type === 'stage') await api.delete(`/flow/stages/${deleteTarget.id}`);
      if (deleteTarget.type === 'flow') {
        await api.delete(`/flow/${deleteTarget.id}`);
        setFlows(prev => prev.filter(f => f.id !== deleteTarget.id));
        setSelectedFlowId("");
      }
      fetchFlowBoard(selectedFlowId);
    } catch { toast.error("Erro excluir"); }
    finally { setDeleteModalOpen(false); }
  };

  // --- Drag & Drop ---
  const allItems = useMemo(() => currentFlow?.stages.flatMap(s => s.items) || [], [currentFlow]);
  const { moveItem, onDragStart } = useKanbanDrag({
    items: allItems,
    setItems: () => { },
    idField: "stageId",
    moveCallback: async (itemId, newStageId) => {
      await api.put(`/flow/items/${itemId}/move`, { newStageId });
      fetchFlowBoard(selectedFlowId);
    }
  });

  const flowConfigActions = [
    {
      label: 'Nova Etapa',
      onClick: handleOpenNewStage,
      icon: <Layers className="w-4 h-4 mr-2" />
    },
    {
      label: 'Novo Fluxo',
      onClick: () => setIsFlowModal(true),
      icon: <Factory className="w-4 h-4 mr-2" />
    },
    // 🔥 ADICIONE ESTA OPÇÃO:
    {
      label: 'Excluir Fluxo Atual',
      onClick: () => {
        if (selectedFlowId) {
          confirmDelete('flow', selectedFlowId);
        }
      },
      icon: <Trash2 className="w-4 h-4 mr-2" />,
      variant: "destructive" as const // Isso deixará o texto vermelho
    }
  ];

  if (loading && !currentFlow && flows.length > 0) {
    return <div className="h-screen flex items-center justify-center bg-[#F5F0E6]"><RefreshCw className="animate-spin text-orange-500" /></div>;
  }

  return (
    <KanbanLayout>
      <KanbanHeader
        title="Esteira de Produção"
        icon={<Factory size={20} />}
        configActions={flowConfigActions}
        rightContent={
          <div className="flex items-center gap-2">
            {flows.length > 0 && (
              <div className="flex items-center gap-1">
                <select
                  className="bg-black/20 text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none"
                  value={selectedFlowId}
                  onChange={(e) => setSelectedFlowId(e.target.value)}
                >
                  {flows.map(f => <option key={f.id} value={f.id} className="text-slate-900">{f.name}</option>)}
                </select>

                {/* 🔥 BOTÃO DE EXCLUSÃO RÁPIDA AO LADO DO SELECT */}
                {/* <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/50 hover:text-red-500 hover:bg-red-500/10"
                  onClick={() => confirmDelete('flow', selectedFlowId)}
                >
                  <Trash2 size={16} />
                </Button> */}
              </div>
            )}
          </div>
        }
      />

      {/* FILTRO RESTAURADO: Agora apenas com Datas (Sem Horas) */}
      <KanbanFilter>
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1">
            <Label className="text-[10px] uppercase font-bold text-[#95A5A6]">De</Label>
            <Input type="date" className="h-8 w-36 text-xs bg-white" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] uppercase font-bold text-[#95A5A6]">Até</Label>
            <Input type="date" className="h-8 w-36 text-xs bg-white" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] uppercase font-bold text-[#95A5A6]">Tipo de Data</Label>
            <select
              className="h-8 w-32 rounded-md border border-input bg-white px-2 py-1 text-xs"
              value={filterDateType}
              onChange={e => setFilterDateType(e.target.value)}
            >
              <option value="dueDate">Prazo</option>
              <option value="productionStartedAt">Início</option>
              <option value="deliveryAt">Entrega</option>
            </select>
          </div>
          <Button size="sm" className="bg-[#2C3E50] h-8 text-xs text-white" onClick={applyFilter}>
            <FilterIcon size={12} className="mr-2" /> Filtrar
          </Button>
          {filteredItems && (
            <Button size="sm" variant="ghost" className="h-8 text-xs text-red-500" onClick={() => setFilteredItems(null)}>
              Limpar
            </Button>
          )}
        </div>
      </KanbanFilter>

      <KanbanBoard>
        {currentFlow?.stages?.sort((a, b) => a.order - b.order).map(stage => {
          const itemsToShow = filteredItems
            ? stage.items.filter(i => filteredItems.some(fi => fi.id === i.id))
            : stage.items;

          return (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              title={stage.name}
              color={stage.color || "#2C3E50"}
              count={itemsToShow.length}
              onDropItem={moveItem}
              onAddClick={() => handleAddItemFromColumn(stage.id)}
              onEditClick={() => { setEditingStage(stage); setStageName(stage.name); setStageColor(stage.color || "#2C3E50"); setIsStageModal(true); }}
              onDeleteClick={() => confirmDelete('stage', stage.id)}
            >
              {itemsToShow.sort((a, b) => a.priority - b.priority).map(item => (
                <KanbanCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  subtitle={item.productRef}
                  priorityColor={getPriorityColor(item.priority)}
                  coverImage={item.images && item.images.length > 0 ? item.images[0].url : undefined}
                  onDragStart={(e) => onDragStart(e, item.id)}
                  onDoubleClick={() => { setPreviewItem(item); setIsPreviewModal(true); }}
                  onEdit={() => { setEditingItem(item); setIsEditItemModal(true); }}
                  onDelete={() => confirmDelete('item', item.id)}
                  footer={
                    <div className="flex justify-between items-center w-full text-[10px] font-bold text-[#95A5A6]">
                      <span className="flex items-center gap-1"><Package size={12} /> {item.quantity} un.</span>
                      {item.dueDate && <span className="flex items-center gap-1"><CalendarClock size={12} /> {formatDateShort(item.dueDate)}</span>}
                    </div>
                  }
                >
                  <p className="line-clamp-2 text-xs text-[#95A5A6] mb-2">{item.description}</p>
                  <div className="text-[10px] font-mono bg-[#F5F0E6] text-[#2D3436] px-1.5 py-0.5 rounded w-fit border border-[#95A5A6]/20">#{item.orderNumber}</div>
                </KanbanCard>
              ))}
            </KanbanColumn>
          )
        })}
      </KanbanBoard>

      {/* --- MODAIS (FLUXO, ETAPA, DELETE) --- */}
      <FlowItemModal
        isOpen={isItemModal || isEditItemModal}
        onClose={() => { setIsItemModal(false); setIsEditItemModal(false); setEditingItem(null); setInitialStageId(undefined); }}
        initialData={editingItem as any}
        initialStageId={initialStageId}
        onSubmit={handleItemSubmit}
        isLoading={isSubmitting}
        users={users}
        suppliers={suppliers}
        stages={currentFlow?.stages || []}
      />

      <Dialog open={isStageModal} onOpenChange={setIsStageModal}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>{editingStage ? "Editar" : "Nova"} Etapa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Nome</Label>
            <Input value={stageName} onChange={e => setStageName(e.target.value)} />
            <Label>Cor</Label>
            <Input type="color" value={stageColor} onChange={e => setStageColor(e.target.value)} className="h-10 w-full" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStageModal(false)}>Cancelar</Button>
            <Button onClick={handleStageSubmit} className="bg-orange-600 text-white">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFlowModal} onOpenChange={setIsFlowModal}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>Novo Fluxo</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <Label>Nome do Fluxo</Label>
            <Input value={flowName} onChange={e => setFlowName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleCreateFlow} className="bg-orange-600 text-white">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteExecute}
        title="Confirmar Exclusão"
        description="Esta ação não pode ser desfeita."
      />

      {/* Preview Dialog */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl bg-white rounded-xl">
          <div className="px-6 py-4 border-b sticky top-0 bg-white z-20 flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-bold text-[#2D3436]">{previewItem?.title}</DialogTitle>
              <div className="text-[10px] font-bold text-[#95A5A6] uppercase tracking-widest mt-1">Ref: {previewItem?.productRef}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsPreviewModal(false)}><X size={20} /></Button>
          </div>
          <div className="p-6 space-y-8">
            {previewItem?.images && previewItem.images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previewItem.images.map(img => (
                  <div key={img.id} className="rounded-xl overflow-hidden border shadow-sm aspect-video">
                    <img src={img.url} alt="anexo" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-tighter">Descrição</h4>
              <div className="bg-[#F5F0E6]/50 p-4 rounded-xl border text-sm whitespace-pre-wrap leading-relaxed">
                {previewItem?.description || "Nenhuma descrição."}
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-[#F5F0E6]/30 border-t">
            <Button variant="outline" onClick={() => setIsPreviewModal(false)}>Fechar</Button>
            <Button className="bg-orange-600 text-white" onClick={() => { setIsPreviewModal(false); setEditingItem(previewItem); setIsEditItemModal(true); }}>
              Editar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </KanbanLayout>
  );
}
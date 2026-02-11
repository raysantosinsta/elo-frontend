/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Calendar,
  Check,
  ChevronDown,
  Factory,
  Layers,
  Package,
  Trash2,
  X,
  Lock,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// --- Infraestrutura ---
import { useAuth } from "@/contexts/AuthContext";
import { useKanbanDrag } from "@/hooks/use-kanban-drag";
import { api } from "@/services/api";

// --- Componentes Kanban ---
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { KanbanHeader } from "@/components/kanban/kanban-header";
import { KanbanLayout } from "@/components/kanban/kanban-layout";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// --- Modais ---
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { FlowItemModal } from "@/components/modals/flow-item-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// --- CONSTANTES ---
// Lista de cargos profissionais da sua empresa
const PROFESSIONAL_ROLES = [
  { value: "modelista", label: "Modelista / Modelagem" },
  { value: "piloteira", label: "Piloteira / Pilotagem" },
  { value: "cortador", label: "Cortador / Corte" },
  { value: "costureira", label: "Costureira / Costura" },
  { value: "acabamento", label: "Acabamento" },
  { value: "expedicao", label: "Expedição" },
  { value: "Gerente de Produção", label: "Gerente de Produção" },
];

// --- INTERFACES ---
interface FlowMedia {
  id: string;
  url: string;
  filename: string;
}
interface UserProfile {
  id: string;
  name: string;
  professionalRole?: string; // 🔥 Adicionado
}
interface FlowItem {
  id: string;
  title: string;
  orderNumber: string;
  productRef: string;
  quantity: number;
  priority: number;
  status: string;
  stageId?: string;
  flowId: string;
  flowColor?: string;
  flowName?: string;
  supplierId?: string;
  supplier?: {
    id: string;
    name: string;
    category?: string;
    city?: string;
    state?: string;
  };
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
  allowedRole?: string; // 🔥 Campo de Cargo Permitido
  items: FlowItem[];
}
interface ProductFlow {
  id: string;
  name: string;
  color?: string;
  stages: FlowStage[];
}
interface FlowTemplate {
  id: string;
  name: string;
  structure: any;
}

// --- Helpers ---
const formatDateShort = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export default function ProductFlowKanban() {
  const { user } = useAuth();
  console.log("user", user);

  // --- Estados de Dados ---
  const [flows, setFlows] = useState<ProductFlow[]>([]);
  const [selectedFlowIds, setSelectedFlowIds] = useState<string[]>([]);
  const [boards, setBoards] = useState<ProductFlow[]>([]);
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Estados de Modais ---
  const [isFlowModal, setIsFlowModal] = useState(false);
  const [isStageModal, setIsStageModal] = useState(false);
  const [isItemModal, setIsItemModal] = useState(false);
  const [isEditItemModal, setIsEditItemModal] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // --- Estados de Seleção / Edição ---
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<FlowStage | null>(null);
  const [editingItem, setEditingItem] = useState<FlowItem | null>(null);
  const [previewItem, setPreviewItem] = useState<FlowItem | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [itemToDelete, setItemToDelete] = useState<{
    type: "item" | "stage" | "template";
    id: string;
  } | null>(null);

  const [flowName, setFlowName] = useState("");
  const [newFlowColor, setNewFlowColor] = useState("#D35400");
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState("#2D3436");
  const [stageAllowedRole, setStageAllowedRole] = useState<string>(""); // 🔥 Novo Estado
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalReadOnly, setIsModalReadOnly] = useState(false);

  // ===========================================================================
  // 🛡️ LÓGICA DE PERMISSÃO (Espelho do Backend)
  // ===========================================================================
  const canUserEditStage = useCallback(
    (stage: FlowStage) => {
      if (!user) return false;

      // 1. Superusuários (Ajuste conforme suas roles de sistema: ADMIN, MASTER, etc)
      // Assumindo que user.role contém o nível de acesso do sistema
      const systemRole = (user as any).role || "";
      if (["MASTER", "ADMIN", "MANAGER"].includes(systemRole)) return true;

      // 2. Etapa Livre
      if (!stage.allowedRole || stage.allowedRole.trim() === "") return true;

      // 3. Match Parcial (Lógica do Backend)
      const userRole = user.professionalRole?.toLowerCase() || "";
      const requiredRole = stage.allowedRole.toLowerCase();

      return userRole.includes(requiredRole);
    },
    [user],
  );

  // Exemplo de integração no componente principal

  const handleAdvanceItem = async (item: FlowItem) => {
    // 1. Optimistic UI (Feedback imediato)
    toast.loading("Avançando item...", { id: "advance-toast" });

    try {
      // 2. Chamada à API
      await api.post(`/flow/items/${item.id}/advance`);

      // 3. Sucesso
      toast.success(`Item "${item.title}" movido para próxima etapa!`, {
        id: "advance-toast",
      });

      // 4. Fecha modais se estiverem abertos
      setIsPreviewModal(false);
      setIsEditItemModal(false);

      // 5. Recarrega o board
      fetchSelectedBoards();
    } catch (error: any) {
      // 6. Tratamento de Erro
      const errorMsg = error.response?.data?.message || "Erro ao mover item.";
      toast.error(errorMsg, { id: "advance-toast" });
    }
  };

  /**
   * Busca fluxos, recursos e templates iniciais.
   */
  const fetchInitialData = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const [fRes, uRes, sRes, tRes] = await Promise.all([
        api.get(`/flow?companyId=${user.company.id}`),
        api.get(`/users/company/${user.company.id}`),
        api.get(`/suppliers?companyId=${user.company.id}`),
        api.get(`/flow/templates`),
      ]);
      setFlows(fRes.data);
      setUsers(uRes.data);
      setSuppliers(sRes.data.data || sRes.data);
      setTemplates(tRes.data);
      if (fRes.data.length > 0 && selectedFlowIds.length === 0)
        setSelectedFlowIds([fRes.data[0].id]);
    } catch {
      toast.error("Erro ao carregar dados iniciais");
    }
  }, [user?.company?.id]);

  /**
   * Carrega os quadros selecionados.
   */
  const fetchSelectedBoards = useCallback(async () => {
    if (selectedFlowIds.length === 0) {
      setBoards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const promises = selectedFlowIds.map((id) =>
        api.get(`/flow/${id}/board`),
      );
      const results = await Promise.all(promises);
      setBoards(results.map((r) => r.data));
    } catch {
      toast.error("Erro ao carregar quadros");
    } finally {
      setLoading(false);
    }
  }, [selectedFlowIds]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);
  useEffect(() => {
    fetchSelectedBoards();
  }, [selectedFlowIds, fetchSelectedBoards]);

  /**
   * Cria um novo fluxo.
   */
  const handleCreateFlow = async () => {
    if (!flowName.trim()) return toast.error("Nome obrigatório");
    try {
      const { data } = await api.post(`/flow`, {
        name: flowName,
        color: newFlowColor,
      });
      setFlows((prev) => [...prev, data]);
      setSelectedFlowIds((prev) => [...prev, data.id]);
      setIsFlowModal(false);
      setFlowName("");
      toast.success("Fluxo criado!");
    } catch {
      toast.error("Erro ao criar fluxo");
    }
  };

  /**
   * Salva o conjunto de etapas atual como um template.
   */
  const handleSaveTemplate = async () => {
    if (selectedFlowIds.length === 0)
      return toast.error("Selecione um fluxo base");
    const name = prompt("Nome do template:");
    if (!name) return;
    try {
      await api.post(`/flow/${selectedFlowIds[0]}/save-template`, { name });
      toast.success("Template salvo!");
      const { data } = await api.get(`/flow/templates`);
      setTemplates(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao salvar template");
    }
  };

  /**
   * Aplica um template de etapas ao fluxo atual.
   */
  const handleApplyTemplate = async () => {
    if (!selectedTemplateId || selectedFlowIds.length === 0)
      return toast.error("Selecione template e fluxo");
    try {
      await api.post(
        `/flow/${selectedFlowIds[0]}/apply-template/${selectedTemplateId}`,
      );
      toast.success("Etapas aplicadas!");
      fetchSelectedBoards();
    } catch {
      toast.error("Erro ao aplicar template");
    }
  };

  /**
   * Gerencia deleção de itens, etapas ou templates.
   */
  const handleDeleteExecute = async () => {
    if (!itemToDelete) return;
    try {
      const { type, id } = itemToDelete;
      if (type === "stage" && flows.some((f) => f.id === id)) {
        await api.delete(`/flow/${id}`);
        setFlows((p) => p.filter((f) => f.id !== id));
        setSelectedFlowIds((p) => p.filter((fid) => fid !== id));
        toast.success("Fluxo removido");
      } else if (type === "template") {
        await api.delete(`/flow/templates/${id}`);
        setTemplates((p) => p.filter((t) => t.id !== id));
        if (selectedTemplateId === id) setSelectedTemplateId("");
        toast.success("Template excluído");
      } else {
        await api.delete(
          type === "item" ? `/flow/items/${id}` : `/flow/stages/${id}`,
        );
        toast.success("Excluído!");
      }
      fetchSelectedBoards();
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  /**
   * Gerencia criação/edição de etapas.
   */
  const handleStageSubmit = async () => {
    if (!stageName.trim()) return toast.error("Nome obrigatório");
    setIsSubmitting(true);

    // 🔥 PAYLOAD ATUALIZADO: Inclui allowedRole
    const payload = {
      name: stageName,
      color: stageColor,
      allowedRole: stageAllowedRole === "all" ? null : stageAllowedRole,
    };

    try {
      if (editingStage) {
        await api.put(`/flow/stages/${editingStage.id}`, payload);
        toast.success("Etapa atualizada");
      } else {
        await api.post(`/flow/${selectedFlowIds[0]}/stages`, payload);
        toast.success("Etapa criada");
      }
      setIsStageModal(false);
      fetchSelectedBoards();
    } catch {
      toast.error("Erro ao salvar etapa");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Gerencia criação/edição de itens.
   */
  const handleItemSubmit = async (
    values: any,
    files: any,
    removedMedia: any,
  ): Promise<void> => {
    if (selectedFlowIds.length === 0) {
      toast.error("Selecione um fluxo");
      return;
    }
    setIsSubmitting(true);
    try {
      const uploadMedia = async (itemId: string, files: any) => {
        const upload = (file: File, type: string) => {
          const fd = new FormData();
          fd.append("file", file);
          return api.post(`/flow/items/${itemId}/media/${type}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        };
        const promises = [];
        if (files.images)
          for (const f of files.images) promises.push(upload(f, "image"));
        if (files.audios)
          for (const f of files.audios) promises.push(upload(f, "audio"));
        if (files.videos)
          for (const f of files.videos) promises.push(upload(f, "video"));
        return Promise.all(promises);
      };

      if (editingItem) {
        await api.put(`/flow/items/${editingItem.id}`, {
          ...values,
          removeImageIds: removedMedia.images,
          removeVideoIds: removedMedia.videos,
          removeAudioIds: removedMedia.audios,
        });
        if (files) await uploadMedia(editingItem.id, files);
        toast.success("Item atualizado");
      } else {
        const { data: newItem } = await api.post(
          `/flow/${selectedFlowIds[0]}/items`,
          { ...values, flowId: selectedFlowIds[0], stageId: activeStageId },
        );
        if (newItem?.id && files) await uploadMedia(newItem.id, files);
        toast.success("Item criado");
      }
      setIsItemModal(false);
      setIsEditItemModal(false);
      setEditingItem(null);
      await fetchSelectedBoards();
    } catch {
      toast.error("Erro ao salvar item");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Lógica de unificação multi-fluxo.
   */
  const unifiedStages = useMemo(() => {
    const stageGroups: Record<string, FlowStage> = {};
    boards.forEach((board) => {
      const flowColor = board.color || "#D35400";
      board.stages.forEach((stage) => {
        const key = stage.name.toUpperCase();
        // Preserva o allowedRole da etapa original
        if (!stageGroups[key]) stageGroups[key] = { ...stage, items: [] };
        const itemsWithMetadata = stage.items.map((item) => ({
          ...item,
          flowColor,
          flowName: board.name,
        }));
        stageGroups[key].items.push(...itemsWithMetadata);
      });
    });
    return Object.values(stageGroups).sort((a, b) => a.order - b.order);
  }, [boards]);

  const { moveItem, onDragStart } = useKanbanDrag({
    items: unifiedStages.flatMap((s) => s.items),
    setItems: () => {},
    idField: "stageId",
    moveCallback: async (itemId, newStageId) => {
      await api.put(`/flow/items/${itemId}/move`, { newStageId });
      fetchSelectedBoards();
    },
  });

  const toggleFlow = (id: string) =>
    setSelectedFlowIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );

  return (
    <KanbanLayout>
      <KanbanHeader
        title="Esteira de Produção"
        icon={<Factory size={20} />}
        onAddFlow={() => setIsFlowModal(true)}
        // 🔥 RESETAR ESTADO AO ADICIONAR ETAPA
        onAddStage={() => {
          setEditingStage(null);
          setStageName("");
          setStageColor("#2D3436");
          setStageAllowedRole(""); // Reset
          setIsStageModal(true);
        }}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={setSelectedTemplateId}
        onApplyTemplate={handleApplyTemplate}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={(id) => {
          setItemToDelete({ type: "template", id });
          setDeleteModalOpen(true);
        }}
        rightContent={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white/10 text-white border-white/20 h-9 text-xs"
                  >
                    <Layers size={16} className="mr-2" /> Fluxos Ativos (
                    {selectedFlowIds.length}){" "}
                    <ChevronDown size={14} className="ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 p-2 bg-[#2C3E50] border-white/10 text-white"
                  align="end"
                >
                  {flows.map((f) => (
                    <div
                      key={f.id}
                      className={cn(
                        "group flex items-center justify-between p-2 rounded-md transition-all",
                        selectedFlowIds.includes(f.id)
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:bg-white/5",
                      )}
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer flex-1"
                        onClick={() => toggleFlow(f.id)}
                      >
                        <div
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: f.color || "#D35400" }}
                        />
                        <span className="text-sm font-medium">{f.name}</span>
                        {selectedFlowIds.includes(f.id) && (
                          <Check size={14} className="text-orange-500 ml-1" />
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete({ type: "stage", id: f.id });
                          setDeleteModalOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        }
      />

      <KanbanBoard>
        {unifiedStages.map((stage) => {
          // 🔥 Calcula permissão para ESTA coluna específica
          const hasPermission = canUserEditStage(stage);
          return (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              title={stage.name}
              count={stage.items.length}
              onDropItem={moveItem}
              onAddItem={
                hasPermission
                  ? () => {
                      setActiveStageId(stage.id);
                      setIsModalReadOnly(false); // Criar é sempre editável se o botão aparecer
                      setIsItemModal(true);
                    }
                  : undefined
              }
              // 🔥 POPULAR ESTADO AO EDITAR ETAPA
              onEditClick={() => {
                setEditingStage(stage);
                setStageName(stage.name);
                setStageColor(stage.color || "#2D3436");
                setStageAllowedRole(stage.allowedRole || "");
                setIsStageModal(true);
              }}
              onDeleteClick={() => {
                setItemToDelete({ type: "stage", id: stage.id });
                setDeleteModalOpen(true);
              }}
            >
              {!hasPermission && (
                <div className="text-[10px] text-center text-slate-400 py-1 flex items-center justify-center gap-1 bg-slate-50 mb-2 rounded border border-dashed">
                  <Lock size={10} /> Somente Leitura
                </div>
              )}
              {stage.items.map((item) => (
                <KanbanCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  subtitle={item.productRef}
                  priorityColor={item.flowColor}
                  coverImage={item.images[0]?.url}
                  onDragStart={
                    hasPermission ? (e) => onDragStart(e, item.id) : undefined
                  }
                  // Duplo clique abre o modal. Se não tem permissão, abre como ReadOnly
                  onDoubleClick={() => {
                    setEditingItem(item);
                    setIsModalReadOnly(!hasPermission); // Se não tem permissão, é ReadOnly
                    setIsEditItemModal(true);
                  }}
                  // Só passa a função onEdit se tiver permissão (o card esconde o botão se for undefined)
                  onEdit={
                    hasPermission
                      ? () => {
                          setEditingItem(item);
                          setIsModalReadOnly(false);
                          setIsEditItemModal(true);
                        }
                      : undefined // TODO: remover tooltip
                  }
                  // Só permite excluir se tiver permissão
                  onDelete={
                    hasPermission
                      ? () => {
                          setItemToDelete({ type: "item", id: item.id });
                          setDeleteModalOpen(true);
                        }
                      : undefined
                  }
                  // Só permite avançar se tiver permissão
                  onComplete={
                    hasPermission ? () => handleAdvanceItem(item) : undefined
                  }
                  footer={
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-slate-400 font-bold">
                        <Package size={10} className="inline mr-1" />
                        {item.quantity}
                      </span>
                      <div
                        className="px-2 py-0.5 rounded-full text-[8px] font-bold text-white uppercase"
                        style={{ backgroundColor: item.flowColor }}
                      >
                        {item.flowName}
                      </div>
                    </div>
                  }
                />
              ))}
            </KanbanColumn>
          );
        })}
      </KanbanBoard>

      <FlowItemModal
        isOpen={isItemModal}
        onClose={() => setIsItemModal(false)}
        onSubmit={handleItemSubmit}
        isLoading={isSubmitting}
        users={users}
        suppliers={suppliers}
        stages={[]}
        currentUserRole={user?.professionalRole || user?.role}
        isReadOnly={false} // Criar novo é sempre editável
      />

      <FlowItemModal
        isOpen={isEditItemModal}
        onClose={() => {
          setIsEditItemModal(false);
          setEditingItem(null);
        }}
        initialData={editingItem}
        onSubmit={handleItemSubmit}
        isLoading={isSubmitting}
        users={users}
        suppliers={suppliers}
        stages={unifiedStages} // 🔥 Mude de [] para unifiedStages
        initialStageId={activeStageId} // Passa a coluna onde clicou no "+"
        onAdvance={handleAdvanceItem}
        onDelete={(id) => {
          setIsEditItemModal(false);
          setItemToDelete({ type: "item", id });
          setDeleteModalOpen(true);
        }}
        currentUserRole={user?.professionalRole || user?.role}
        isReadOnly={isModalReadOnly}
      />

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteExecute}
        title={`Excluir ${itemToDelete?.type === "item" ? "produto" : itemToDelete?.type === "template" ? "template" : "etapa/fluxo"}?`}
      />

      {/* Modal Preview */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl bg-white rounded-xl">
          <div className="px-6 py-4 border-b sticky top-0 bg-white z-20 flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-bold text-[#2D3436]">
                {previewItem?.title}
              </DialogTitle>
              <div className="text-[10px] font-bold text-[#95A5A6] uppercase tracking-widest mt-1">
                Ref: {previewItem?.productRef}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPreviewModal(false)}
            >
              <X size={20} />
            </Button>
          </div>
          <div className="p-6 space-y-8">
            {previewItem?.images && previewItem.images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previewItem.images.map((img: any) => (
                  <div
                    key={img.id}
                    className="rounded-xl overflow-hidden border shadow-sm aspect-video"
                  >
                    <img
                      src={img.url}
                      alt="anexo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-tighter text-[#95A5A6]">
                Descrição
              </h4>
              <div className="bg-[#F5F0E6]/50 p-4 rounded-xl border text-sm whitespace-pre-wrap leading-relaxed">
                {previewItem?.description || "Sem descrição."}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 border-t pt-6 text-sm font-bold">
              <div className="flex items-center gap-3">
                <Package size={20} className="text-orange-500" /> Qtd:{" "}
                {previewItem?.quantity} un.
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-orange-500" /> Prazo:{" "}
                {previewItem?.dueDate
                  ? formatDateShort(previewItem.dueDate)
                  : "N/D"}
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t">
            <Button variant="outline" onClick={() => setIsPreviewModal(false)}>
              Fechar
            </Button>
            <Button
              className="bg-orange-600 text-white"
              onClick={() => {
                setIsPreviewModal(false);
                setEditingItem(previewItem);
                setIsEditItemModal(true);
              }}
            >
              Editar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔥 MODAL DE STAGE ATUALIZADO (com Select de Cargo) */}
      <Dialog open={isStageModal} onOpenChange={setIsStageModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{editingStage ? "Editar" : "Nova"} Etapa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm font-medium">
            <div className="space-y-2">
              <Label>Nome da Etapa</Label>
              <Input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Ex: Pilotagem"
              />
            </div>

            {/* 🔥 NOVO SELECT DE CARGO */}
            <div className="space-y-2">
              <Label>Cargo Permitido (Quem pode mover?)</Label>
              <Select
                value={stageAllowedRole}
                onValueChange={setStageAllowedRole}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um cargo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="font-bold text-emerald-600">
                      Liberado para todos
                    </span>
                  </SelectItem>
                  {PROFESSIONAL_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500">
                Se selecionar Todos, qualquer usuário poderá retirar itens desta
                coluna.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cor da Etapa</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="h-10 w-12 p-1 cursor-pointer"
                />
                <Input
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="uppercase"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStageModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleStageSubmit}
              className="bg-orange-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Flow */}
      <Dialog open={isFlowModal} onOpenChange={setIsFlowModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Novo Fluxo</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 text-sm font-medium">
            <Label>Nome</Label>
            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
            />
            <Label>Cor do Fluxo</Label>
            <Input
              type="color"
              value={newFlowColor}
              onChange={(e) => setNewFlowColor(e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateFlow}
              className="bg-orange-600 text-white"
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </KanbanLayout>
  );
}

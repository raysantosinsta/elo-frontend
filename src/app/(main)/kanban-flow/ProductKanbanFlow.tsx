/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCreateFlowItem } from "@/hooks/use-create-flow-item";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Factory,
  Filter as FilterIcon,
  Layers,
  Loader2,
  Lock,
  Package,
  Plus,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { toast } from "sonner";

import { useCompanySettings } from "@/hooks/use-company-settings";
import { useKanbanBoards } from "@/hooks/use-kanban-boards";

// --- Infraestrutura ---
import { useAuth } from "@/contexts/AuthContext";
import { useKanbanDrag } from "@/hooks/use-kanban-drag";
import { api } from "@/services/api";

// --- Componentes Kanban ---
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { KanbanFilter } from "@/components/kanban/kanban-filter";
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

// --- Modais ---
import { CompleteStageModal } from "@/components/modals/complete-stage-modal";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { FlowItemModal } from "@/components/modals/flow-item-modal";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// --- CONSTANTES ---
const PROFESSIONAL_ROLES = [
  { value: "modelista", label: "Modelista / Modelagem" },
  { value: "piloteira", label: "Piloteira / Pilotagem" },
  { value: "cortador", label: "Cortador / Corte" },
  { value: "costureira", label: "Costureira / Costura" },
  { value: "acabamento", label: "Acabamento" },
  { value: "expedicao", label: "Expedição" },
  { value: "gerente", label: "Gerente" },
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
  professionalRole?: string;
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
  assignedToId?: string;
  assignedTo?: { id: string; name: string };
  supplier?: {
    id: string;
    name: string;
    category?: string;
    city?: string;
    state?: string;
  };
  dueDate?: string;
  productionStartedAt?: string;
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
  allowedRole?: string;
  defaultDays?: number;
  flowId: string;
  items: FlowItem[];
}

export interface ProductFlow {
  id: string;
  name: string;
  color?: string;
  deadline?: string;
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  // --- Estados Mobile ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileFilterDrawerOpen, setIsMobileFilterDrawerOpen] =
    useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  // 🔥 Buscar configuração da empresa
  const {
    data: companySettings,
    isLoading: loadingSettings,
    refetch: refetchSettings,
  } = useCompanySettings(user?.company?.id || "");

  const notificationDays = companySettings?.notificationDays ?? 7;

  // 🔥 LOG do notificationDays
  useEffect(() => {
    console.log("🔍 [ProductFlowKanban] notificationDays:", notificationDays);
  }, [notificationDays]);

  // 🔥 Forçar atualização dos filtros quando notificationDays mudar
  useEffect(() => {
    if (tempFilterUpcoming && notificationDays) {
      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
        ),
      );
      const notificationLimit = new Date(todayUTC);
      notificationLimit.setUTCDate(todayUTC.getUTCDate() + notificationDays);

      const todayStr = todayUTC.toISOString().split("T")[0];
      const limitStr = notificationLimit.toISOString().split("T")[0];

      setTempFilterStartDate(todayStr);
      setTempFilterEndDate(limitStr);
      handleFilterClick();
    }
  }, [notificationDays]);

  // ===========================================================================
  // 🔥 REF PARA CONTROLAR PRIMEIRA RENDERIZAÇÃO
  // ===========================================================================
  const isFirstRender = useRef(true);

  // --- Estados de Dados ---
  const [flows, setFlows] = useState<ProductFlow[]>([]);
  const [selectedFlowIds, setSelectedFlowIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

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
  const [stageAllowedRole, setStageAllowedRole] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalReadOnly, setIsModalReadOnly] = useState(false);

  // --- ESTADOS DE FILTRO ---
  const [tempFilterDateType, setTempFilterDateType] = useState<
    "productionStartedAt" | "dueDate"
  >("productionStartedAt");
  const [tempFilterStartDate, setTempFilterStartDate] = useState("");
  const [tempFilterEndDate, setTempFilterEndDate] = useState("");
  const [tempFilterOverdue, setTempFilterOverdue] = useState(false);
  const [tempFilterUpcoming, setTempFilterUpcoming] = useState(false);
  const [tempFilterAssignedTo, setTempFilterAssignedTo] = useState("all");
  const [tempFilterSupplier, setTempFilterSupplier] = useState("all");
  const [tempFilterProductRef, setTempFilterProductRef] = useState("");

  // --- ESTADOS DE FILTRO ATIVOS ---
  const [activeFilterDateType, setActiveFilterDateType] = useState<
    "productionStartedAt" | "dueDate"
  >("productionStartedAt");
  const [activeFilterStartDate, setActiveFilterStartDate] = useState("");
  const [activeFilterEndDate, setActiveFilterEndDate] = useState("");
  const [activeFilterOverdue, setActiveFilterOverdue] = useState(false);
  const [activeFilterUpcoming, setActiveFilterUpcoming] = useState(false);
  const [activeFilterAssignedTo, setActiveFilterAssignedTo] = useState("all");
  const [activeFilterSupplier, setActiveFilterSupplier] = useState("all");
  const [activeFilterProductRef, setActiveFilterProductRef] = useState("");

  // ===========================================================================
  // 🎯 FILTRO POR NOME DA COLUNA
  // ===========================================================================
  const [columnNameFilter, setColumnNameFilter] = useState<string>("");
  const [activeColumnNameFilter, setActiveColumnNameFilter] =
    useState<string>("");
  const [isFiltering, setIsFiltering] = useState(false);

  // ===========================================================================
  // 🎯 FILTRO POR COLUNA (overdue/upcoming)
  // ===========================================================================
  const [activeColumnFilter, setActiveColumnFilter] = useState<{
    columnId: string | null;
    filterType: "overdue" | "upcoming" | null;
  }>({ columnId: null, filterType: null });

  const [deadline, setDeadline] = useState("");

  // ===========================================================================
  // 🔥 ESTADOS PARA EDIÇÃO DE FLUXO
  // ===========================================================================
  const [editFlowId, setEditFlowId] = useState<string | null>(null);
  const [editFlowName, setEditFlowName] = useState("");
  const [editFlowColor, setEditFlowColor] = useState("#D35400");
  const [editFlowDeadline, setEditFlowDeadline] = useState("");
  const [isEditFlowModalOpen, setIsEditFlowModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ===========================================================================
  // 🎯 ESTADOS PARA MODAL DE CONCLUSÃO DE ETAPA
  // ===========================================================================
  const [isCompleteStageModalOpen, setIsCompleteStageModalOpen] =
    useState(false);
  const [completingItem, setCompletingItem] = useState<FlowItem | null>(null);
  const [nextStageForCompletion, setNextStageForCompletion] = useState<{
    id: string;
    name: string;
    allowedRole?: string | null;
    isAfterCorte: boolean;
    isDistribuicao: boolean;
  } | null>(null);

  // ===========================================================================
  // 🎯 ESTADOS PARA MODAL DE ARRASTAR
  // ===========================================================================
  const [isDragModalOpen, setIsDragModalOpen] = useState(false);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragTargetStage, setDragTargetStage] = useState<{
    id: string;
    name: string;
    allowedRole?: string | null;
    isAfterCorte?: boolean;
    isDistribuicao?: boolean;
  } | null>(null);

  // ===========================================================================
  // 🎯 ESTADO PARA ARMAZENAR STAGES DO ITEM SENDO EDITADO
  // ===========================================================================
  const [currentItemStages, setCurrentItemStages] = useState<FlowStage[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // 🔥 ESTADOS PARA MODAL DE SALVETEMPLATE
  const [isTemplateAlertOpen, setIsTemplateAlertOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const [allStages, setAllStages] = useState<FlowStage[]>([]);

  // Verifica se a condição para mostrar o toast já foi disparada
  const [hasShownEmptyRefToast, setHasShownEmptyRefToast] = useState(false);
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ===========================================================================
  // 🎯 ESTADO PARA ITENS AGUARDANDO REMOÇÃO (3 segundos)
  // ===========================================================================
  const [itemsPendingRemoval, setItemsPendingRemoval] = useState<Set<string>>(
    new Set(),
  );

  const [stageDefaultDays, setStageDefaultDays] = useState<number>(1);
  const [openColumnSelector, setOpenColumnSelector] = useState(false);

  const createItemMutation = useCreateFlowItem();

  // ===========================================================================
  // 🔥 NOVO: HOOK useKanbanBoards
  // ===========================================================================
  const {
    boards,
    isLoading: loading,
    invalidateBoards,
    refetch: refetchBoards,
  } = useKanbanBoards({
    selectedFlowIds,
    filters: {
      startDate: activeFilterStartDate,
      endDate: activeFilterEndDate,
      dateType: activeFilterDateType,
      isOverdue: activeFilterOverdue,
      isUpcoming: activeFilterUpcoming,
      assignedToId: activeFilterAssignedTo,
      supplierId: activeFilterSupplier,
      productRef: activeFilterProductRef,
      stageName: activeColumnNameFilter,
    },
    enabled: true,
  });

  // ===========================================================================
  // 🔥 FUNÇÃO AUXILIAR PARA ATUALIZAR BOARDS APÓS AÇÕES
  // ===========================================================================
  const refreshBoardsAfterAction = useCallback(async () => {
    console.log("🔄 [refreshBoardsAfterAction] Invalidando cache de boards");
    await invalidateBoards();
  }, [invalidateBoards]);

  // ===========================================================================
  // 🔥 FUNÇÃO AUXILIAR PARA VERIFICAR SE ESTÁ APÓS CORTE
  // ===========================================================================
  const checkIfIsAfterCorte = (stageId: string, flowId: string): boolean => {
    const board = boards.find((b) => b.id === flowId);
    if (!board) {
      console.warn(`⚠️ Board não encontrado para flowId: ${flowId}`);
      return false;
    }

    const sortedStages = [...board.stages].sort((a, b) => a.order - b.order);
    const CORTE_KEYWORDS = ["corte", "cortador", "cortar", "cut"];

    const corteIndex = sortedStages.findIndex((stage) =>
      CORTE_KEYWORDS.some((keyword) =>
        stage.name.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );

    if (corteIndex === -1) return false;

    const stageIndex = sortedStages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) return false;

    return stageIndex > corteIndex;
  };

  // ===========================================================================
  // 🔥 REF PARA GUARDAR O ÚLTIMO ITEM MOVIDO
  // ===========================================================================
  const lastMovedItemRef = useRef<{
    id: string;
    targetStageId: string;
    targetStageName: string;
  } | null>(null);

  // ===========================================================================
  // 🔥 EFEITO PARA FORÇAR RE-RENDER QUANDO ITEMS PENDING MUDAM
  // ===========================================================================
  useEffect(() => {
    console.log(
      "🔄 itemsPendingRemoval mudou:",
      Array.from(itemsPendingRemoval),
    );
  }, [itemsPendingRemoval]);

  const startItemRemovalTimer = (itemId: string) => {
    console.log(
      `⏰ Iniciando contagem de 3 segundos para remover item ${itemId}`,
    );

    setItemsPendingRemoval((prev) => {
      const newSet = new Set(prev);
      newSet.add(itemId);
      return newSet;
    });

    setTimeout(() => {
      console.log(`✅ Removendo item ${itemId} da tela após 3 segundos`);
      setItemsPendingRemoval((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }, 3000);
  };

  // useEffect para atualizar as opções de coluna quando os boards mudarem
  const columnOptions = useMemo(() => {
    const uniqueColumnNames = new Set<string>();
    boards.forEach((board) => {
      board.stages.forEach((stage: { name: string }) => {
        uniqueColumnNames.add(stage.name);
      });
    });
    return Array.from(uniqueColumnNames).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [boards]);

  useEffect(() => {
    console.log("📊 Boards atualizados via useQuery:", {
      quantidade: boards.length,
      flows: boards.map((b) => ({
        id: b.id,
        name: b.name,
        stages: b.stages.length,
        items: b.stages.reduce(
          (acc: any, s: { items: string | any[] }) => acc + s.items.length,
          0,
        ),
      })),
    });
  }, [boards]);

  // Carregue todas as stages quando os fluxos forem selecionados
  useEffect(() => {
    const loadAllStages = async () => {
      if (selectedFlowIds.length === 0) return;
      try {
        const stagesPromises = selectedFlowIds.map((flowId) =>
          api.get(`/flow/${flowId}/stages`).then((res) => res.data),
        );
        const results = await Promise.all(stagesPromises);
        const flattenedStages = results.flat();
        setAllStages(flattenedStages);
      } catch (error) {
        console.error("Erro ao carregar todas as stages:", error);
      }
    };
    loadAllStages();
  }, [selectedFlowIds]);

  const handleEditItem = async (item: FlowItem) => {
    console.log("📝 Buscando detalhes completos do item:", item.id);
    setIsModalLoading(true);

    try {
      const response = await api.get(`/flow/items/${item.id}`);
      const fullItemData = response.data;
      setEditingItem(fullItemData);

      let itemBoard = boards.find((b) => b.id === fullItemData.flowId);
      if (!itemBoard) {
        console.log("🔄 Board não encontrado localmente, buscando da API...");
        const boardResponse = await api.get(
          `/flow/${fullItemData.flowId}/board`,
        );
        itemBoard = boardResponse.data;
      }

      if (!itemBoard) {
        throw new Error("Não foi possível encontrar a coleção deste item.");
      }

      const stagesWithDefaults = itemBoard.stages.map((stage: any) => ({
        ...stage,
        defaultDays: stage.defaultDays,
      }));

      setCurrentItemStages(stagesWithDefaults);
      const currentStage = stagesWithDefaults.find(
        (s: { id: any }) => s.id === fullItemData.stageId,
      );
      setIsModalReadOnly(currentStage ? !canUserEditStage(currentStage) : true);

      setTimeout(() => {
        setIsEditItemModal(true);
        setIsModalLoading(false);
      }, 50);
    } catch (error: any) {
      console.error("❌ Erro ao carregar detalhes do item:", error);
      toast.error("Erro ao carregar mídias e detalhes do item.");
      setIsModalLoading(false);
    }
  };

  const handleCreateItem = (stageId: string) => {
    const itemBoard = boards.find((b) =>
      b.stages.some((s: { id: string }) => s.id === stageId),
    );
    if (!itemBoard) {
      console.error("❌ Board não encontrado para stage:", stageId);
      toast.error("Erro ao carregar dados do fluxo");
      return;
    }

    const stagesWithFlowId = itemBoard.stages.map(
      (stage: { defaultDays: any }) => ({
        ...stage,
        flowId: itemBoard.id,
        defaultDays: stage.defaultDays,
      }),
    );

    const clickedStage = stagesWithFlowId.find(
      (s: { id: string }) => s.id === stageId,
    );
    setActiveStageId(stageId);
    setCurrentItemStages(stagesWithFlowId);

    setTimeout(() => {
      setIsModalReadOnly(false);
      setIsItemModal(true);
    }, 50);
  };

  const handleOpenCompleteModal = (item: FlowItem) => {
    const currentBoard = boards.find((b) => b.id === item.flowId);
    if (!currentBoard) {
      toast.error("Fluxo não encontrado.");
      return;
    }

    const allStages = [...currentBoard.stages].sort(
      (a, b) => a.order - b.order,
    );
    const currentIndex = allStages.findIndex((s) => s.id === item.stageId);
    const nextStage = allStages[currentIndex + 1];

    if (!nextStage) {
      toast.promise(handleAdvanceItem(item), {
        loading: `Finalizando "${item.title}"...`,
        success: () => `Item "${item.title}" concluído com sucesso!`,
        error: (err) =>
          err?.response?.data?.message || "Erro ao finalizar item.",
      });
      return;
    }

    const CORTE_KEYWORDS = ["corte", "cortador", "cortar", "cut"];
    const DISTRIBUICAO_KEYWORDS = [
      "distribuição",
      "distribuicao",
      "expedição",
      "expedicao",
    ];

    const corteIndex = allStages.findIndex((s) =>
      CORTE_KEYWORDS.some((keyword) =>
        s.name.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );

    const isDistribuicao = DISTRIBUICAO_KEYWORDS.some((keyword) =>
      nextStage.name.toLowerCase().includes(keyword.toLowerCase()),
    );

    const isAfterCorte = corteIndex !== -1 && currentIndex + 1 > corteIndex;

    setCompletingItem(item);
    setNextStageForCompletion({
      id: nextStage.id,
      name: nextStage.name,
      allowedRole: nextStage.allowedRole,
      isAfterCorte,
      isDistribuicao,
    });
    setIsCompleteStageModalOpen(true);
  };

  const handleCompleteWithResponsible = async (
    responsibleId: string,
    type: "user" | "supplier",
    quantity?: number,
  ) => {
    if (!completingItem || !nextStageForCompletion) return;

    const toastId = toast.loading("Concluindo etapa...");

    try {
      if (quantity !== undefined) {
        await api.put(`/flow/items/${completingItem.id}`, { quantity });
      }

      const payload: any = { newStageId: nextStageForCompletion.id };
      if (type === "user") {
        payload.assignedToId = responsibleId;
      } else {
        payload.supplierId = responsibleId;
      }

      await api.put(`/flow/items/${completingItem.id}/move`, payload);

      toast.success(`Item movido para "${nextStageForCompletion.name}"!`, {
        id: toastId,
      });

      await refreshBoardsAfterAction();

      setIsCompleteStageModalOpen(false);
      setCompletingItem(null);
      setNextStageForCompletion(null);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || "Erro ao concluir etapa.";
      toast.error(errorMsg, { id: toastId, duration: 4000 });
    }
  };

  // ===========================================================================
  // 🛡️ LÓGICA DE PERMISSÃO
  // ===========================================================================
  const canUserEditStage = useCallback(
    (stage: FlowStage) => {
      if (!user) return false;
      const systemRole = (user as any).role || "";
      if (["MASTER", "ADMIN", "MANAGER"].includes(systemRole)) return true;
      if (!stage.allowedRole || stage.allowedRole.trim() === "") return true;
      const userRole = user.professionalRole?.toLowerCase() || "";
      const requiredRole = stage.allowedRole.toLowerCase();
      return userRole.includes(requiredRole);
    },
    [user],
  );

  // ===========================================================================
  // 🔄 FUNÇÕES DE FILTRO POR COLUNA
  // ===========================================================================
  const handleColumnFilterOverdue = (columnId: string) => {
    if (
      activeColumnFilter.columnId === columnId &&
      activeColumnFilter.filterType === "overdue"
    ) {
      setActiveColumnFilter({ columnId: null, filterType: null });
    } else {
      setActiveColumnFilter({ columnId, filterType: "overdue" });
      setTempFilterUpcoming(false);
      setTempFilterOverdue(false);
    }
  };

  const handleColumnFilterUpcoming = (columnId: string) => {
    if (
      activeColumnFilter.columnId === columnId &&
      activeColumnFilter.filterType === "upcoming"
    ) {
      setActiveColumnFilter({ columnId: null, filterType: null });
    } else {
      setActiveColumnFilter({ columnId, filterType: "upcoming" });
      setTempFilterUpcoming(false);
      setTempFilterOverdue(false);
    }
  };

  const filterColumnItems = (stage: FlowStage) => {
    let items = stage.items;

    if (
      activeColumnFilter.columnId === stage.id &&
      activeColumnFilter.filterType
    ) {
      const todayUTC = new Date();
      const year = todayUTC.getUTCFullYear();
      const month = String(todayUTC.getUTCMonth() + 1).padStart(2, "0");
      const day = String(todayUTC.getUTCDate()).padStart(2, "0");
      const todayStr = `${year}-${month}-${day}`;

      const sevenDaysFromNow = new Date(todayUTC);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split("T")[0];

      items = items.filter((item) => {
        if (activeColumnFilter.filterType === "overdue") {
          const dueDate = item.dueDate?.split("T")[0];
          if (!dueDate) return false;
          return dueDate < todayStr;
        } else if (activeColumnFilter.filterType === "upcoming") {
          const dueDate = item.dueDate?.split("T")[0];
          if (!dueDate) return false;
          return dueDate >= todayStr && dueDate <= sevenDaysFromNowStr;
        }
        return true;
      });
    }
    return items;
  };

  // ===========================================================================
  // 🔄 FUNÇÕES DE FILTRO GLOBAL
  // ===========================================================================
  useEffect(() => {
    const filterParam = searchParams.get("filter");
    const typeParam = searchParams.get("dateType");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const assignedParam = searchParams.get("assignedToId");
    const supplierParam = searchParams.get("supplierId");
    const productRefParam = searchParams.get("productRef");
    const stageNameParam = searchParams.get("stageName");
    const flowIdParam = searchParams.get("flowId");
    const flowIdsParam = searchParams.get("flowIds");

    let idsFromUrl: string[] = [];
    if (flowIdsParam) {
      idsFromUrl = flowIdsParam.split(",").filter(Boolean);
    } else if (flowIdParam) {
      idsFromUrl = [flowIdParam];
    }

    if (idsFromUrl.length > 0) {
      setSelectedFlowIds((prev) => {
        const isSame =
          prev.length === idsFromUrl.length &&
          prev.every((id, idx) => id === idsFromUrl[idx]);
        if (isSame) return prev;
        return idsFromUrl;
      });
    }

    const isOverdue = filterParam === "overdue";
    const isUpcoming = filterParam === "upcoming";

    setTempFilterOverdue(isOverdue);
    setActiveFilterOverdue(isOverdue);
    setTempFilterUpcoming(isUpcoming);
    setActiveFilterUpcoming(isUpcoming);

    const finalDateType = isUpcoming
      ? "dueDate"
      : typeParam === "productionStartedAt" || typeParam === "dueDate"
        ? typeParam
        : "productionStartedAt";

    const finalStartDate = startDateParam ? startDateParam.split("T")[0] : "";
    const finalEndDate = endDateParam ? endDateParam.split("T")[0] : "";

    setTempFilterDateType(finalDateType);
    setActiveFilterDateType(finalDateType);
    setTempFilterStartDate(finalStartDate);
    setActiveFilterStartDate(finalStartDate);
    setTempFilterEndDate(finalEndDate);
    setActiveFilterEndDate(finalEndDate);

    const finalAssigned = assignedParam || "all";
    const finalSupplier = supplierParam || "all";
    const finalRef = productRefParam || "";
    const finalColumn = stageNameParam || "";

    setTempFilterAssignedTo(finalAssigned);
    setActiveFilterAssignedTo(finalAssigned);
    setTempFilterSupplier(finalSupplier);
    setActiveFilterSupplier(finalSupplier);
    setTempFilterProductRef(finalRef);
    setActiveFilterProductRef(finalRef);
    setColumnNameFilter(finalColumn);
    setActiveColumnNameFilter(finalColumn);
  }, [searchParams]);

  // ===========================================================================
  // 🔥 FUNÇÃO handleFilterClick (modificada para usar invalidateBoards)
  // ===========================================================================
  const handleFilterClick = async () => {
    setIsFiltering(true);

    const params = new URLSearchParams();

    if (columnNameFilter && columnNameFilter.trim() !== "") {
      params.set("stageName", columnNameFilter.trim());
    }

    if (tempFilterUpcoming) {
      const today = new Date();
      const notificationLimit = new Date(today);
      notificationLimit.setDate(today.getDate() + notificationDays);

      const todayStr = today.toISOString().split("T")[0];
      const limitStr = notificationLimit.toISOString().split("T")[0];

      params.set("startDate", todayStr);
      params.set("endDate", limitStr);
      params.set("filter", "upcoming");
    } else if (tempFilterOverdue) {
      params.set("isOverdue", "true");
      params.set("filter", "overdue");
    } else if (tempFilterDateType) {
      params.set("dateType", tempFilterDateType);
    }

    if (tempFilterStartDate) params.set("startDate", tempFilterStartDate);
    if (tempFilterEndDate) params.set("endDate", tempFilterEndDate);
    if (tempFilterOverdue) params.set("filter", "overdue");
    if (tempFilterAssignedTo !== "all")
      params.set("assignedToId", tempFilterAssignedTo);
    if (tempFilterSupplier !== "all")
      params.set("supplierId", tempFilterSupplier);
    if (tempFilterProductRef && tempFilterProductRef.trim() !== "") {
      params.set("productRef", tempFilterProductRef.trim());
    }

    router.push(`?${params.toString()}`);

    await new Promise((resolve) => setTimeout(resolve, 100));

    await invalidateBoards();
    setIsFiltering(false);
  };

  const handleClearFilters = async () => {
    setTempFilterStartDate("");
    setTempFilterEndDate("");
    setTempFilterOverdue(false);
    setTempFilterUpcoming(false);
    setTempFilterAssignedTo("all");
    setTempFilterSupplier("all");
    setTempFilterDateType("dueDate");
    setTempFilterProductRef("");
    setColumnNameFilter("");
    setActiveColumnNameFilter("");

    router.push("/kanban-flow");

    await new Promise((resolve) => setTimeout(resolve, 100));
    await invalidateBoards();
  };

  const toggleOverdueFilter = () => {
    if (tempFilterOverdue) {
      setTempFilterOverdue(false);
    } else {
      setTempFilterOverdue(true);
      setTempFilterUpcoming(false);
      setTempFilterStartDate("");
      setTempFilterEndDate("");
    }
  };

  const toggleUpcomingFilter = () => {
    if (tempFilterUpcoming) {
      setTempFilterUpcoming(false);
      setTempFilterStartDate("");
      setTempFilterEndDate("");
    } else {
      setTempFilterUpcoming(true);
      setTempFilterOverdue(false);
      setTempFilterDateType("dueDate");

      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
        ),
      );

      const notificationLimit = new Date(todayUTC);
      notificationLimit.setUTCDate(todayUTC.getUTCDate() + notificationDays);

      const todayStr = todayUTC.toISOString().split("T")[0];
      const limitStr = notificationLimit.toISOString().split("T")[0];

      setTempFilterStartDate(todayStr);
      setTempFilterEndDate(limitStr);
    }
  };

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

      const hasFlowsInUrl =
        searchParams.get("flowIds") || searchParams.get("flowId");

      if (
        fRes.data.length > 0 &&
        selectedFlowIds.length === 0 &&
        !hasFlowsInUrl
      ) {
        setSelectedFlowIds([fRes.data[0].id]);
      }
    } catch {
      toast.error("Erro ao carregar dados iniciais");
    }
  }, [user?.company?.id, searchParams, selectedFlowIds.length]);

  // ===========================================================================
  // 🎯 EFEITO PRINCIPAL - Carrega dados iniciais
  // ===========================================================================
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // ===========================================================================
  // 🎯 FUNÇÃO DE AVANÇAR ITEM
  // ===========================================================================
  const handleAdvanceItem = async (item: FlowItem) => {
    try {
      await api.post(`/flow/items/${item.id}/advance`);
      setIsPreviewModal(false);
      setIsEditItemModal(false);
      await refreshBoardsAfterAction();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Erro ao mover item.";
      console.log(errorMsg);
      throw error;
    }
  };

  const handleCreateFlow = async () => {
    if (!flowName.trim()) return toast.error("Nome obrigatório");

    try {
      setIsCreatingFlow(true);

      const payload: any = {
        name: flowName,
        color: newFlowColor,
      };

      if (deadline) {
        const deadlineDate = new Date(deadline);
        deadlineDate.setUTCHours(12, 0, 0, 0);
        payload.deadline = deadlineDate.toISOString();
      }

      const { data } = await api.post(`/flow`, payload);
      setFlows((prev) => [...prev, data]);
      setSelectedFlowIds((prev) => [...prev, data.id]);
      setIsFlowModal(false);
      setFlowName("");
      setNewFlowColor("#D35400");
      setDeadline("");
      toast.success("Fluxo criado!");

      await refreshBoardsAfterAction();
    } catch (error) {
      toast.error("Erro ao criar fluxo");
      console.error("Erro ao criar fluxo:", error);
    } finally {
      setIsCreatingFlow(false);
    }
  };

  const openEditModal = (flow: ProductFlow) => {
    setEditFlowId(flow.id);
    setEditFlowName(flow.name);
    setEditFlowColor(flow.color || "#D35400");

    if (flow.deadline) {
      const date = new Date(flow.deadline);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      setEditFlowDeadline(`${year}-${month}-${day}`);
    } else {
      setEditFlowDeadline("");
    }

    setIsEditFlowModalOpen(true);
  };

  const handleUpdateFlow = async () => {
    if (!editFlowId) return;
    if (!editFlowName.trim()) {
      toast.error("Nome do fluxo é obrigatório");
      return;
    }

    setIsSaving(true);

    try {
      const payload: any = {
        name: editFlowName,
        color: editFlowColor,
      };

      if (editFlowDeadline) {
        const deadlineDate = new Date(editFlowDeadline);
        deadlineDate.setUTCHours(12, 0, 0, 0);
        payload.deadline = deadlineDate.toISOString();
      } else {
        payload.deadline = null;
      }

      await api.put(`/flow/${editFlowId}`, payload);

      setFlows((prev) =>
        prev.map((f) =>
          f.id === editFlowId
            ? {
                ...f,
                name: editFlowName,
                color: editFlowColor,
                deadline: payload.deadline,
              }
            : f,
        ),
      );

      toast.success("Fluxo atualizado com sucesso!");
      setIsEditFlowModalOpen(false);

      await refreshBoardsAfterAction();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao atualizar fluxo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (selectedFlowIds.length === 0) {
      return toast.error("Selecione um fluxo base");
    }
    setIsTemplateAlertOpen(true);
  };

  const executeSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Nome do template é obrigatório");
      return;
    }

    setIsSavingTemplate(true);
    const toastId = toast.loading("Salvando template...");

    try {
      await api.post(`/flow/${selectedFlowIds[0]}/save-template`, {
        name: templateName.trim(),
      });

      toast.success("Template salvo com sucesso!", { id: toastId });

      const { data } = await api.get(`/flow/templates`);
      setTemplates(data);

      setIsTemplateAlertOpen(false);
      setTemplateName("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao salvar template", {
        id: toastId,
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId || selectedFlowIds.length === 0)
      return toast.error("Selecione template e fluxo");
    try {
      await api.post(
        `/flow/${selectedFlowIds[0]}/apply-template/${selectedTemplateId}`,
      );
      toast.success("Etapas aplicadas!");
      await refreshBoardsAfterAction();
    } catch {
      toast.error("Erro ao aplicar template");
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    try {
      await api.delete(`/flow/${flowId}`);

      setFlows((prev) => prev.filter((f) => f.id !== flowId));
      setSelectedFlowIds((prev) => {
        const newSelectedIds = prev.filter((id) => id !== flowId);
        if (newSelectedIds.length === 0) {
          // O useQuery vai lidar com o estado vazio
        }
        return newSelectedIds;
      });

      toast.success("Fluxo removido");
      await refreshBoardsAfterAction();
    } catch (error) {
      toast.error("Erro ao excluir fluxo");
      console.error(error);
      throw error;
    }
  };

  const handleDeleteExecute = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    try {
      const { type, id } = itemToDelete;

      if (type === "stage" && flows.some((f) => f.id === id)) {
        await handleDeleteFlow(id);
      } else if (type === "template") {
        await api.delete(`/flow/templates/${id}`);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        if (selectedTemplateId === id) setSelectedTemplateId("");
        toast.success("Template excluído");
      } else {
        await api.delete(
          type === "item" ? `/flow/items/${id}` : `/flow/stages/${id}`,
        );
        toast.success("Excluído!");
        await refreshBoardsAfterAction();
      }
    } catch (error) {
      toast.error("Erro ao excluir");
      console.error(error);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleStageSubmit = async () => {
    if (!stageName.trim()) return toast.error("Nome obrigatório");
    setIsSubmitting(true);

    const payload = {
      name: stageName,
      color: stageColor,
      allowedRole:
        stageAllowedRole === "all" || !stageAllowedRole
          ? null
          : stageAllowedRole,
      defaultDays: stageDefaultDays,
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
      await refreshBoardsAfterAction();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Erro ao salvar etapa";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===========================================================================
  // 🎯 FUNÇÃO DE SUBMIT DO ITEM (CRIAÇÃO/EDIÇÃO) - COM REACT QUERY
  // ===========================================================================
  const handleItemSubmit = async (
    values: any,
    files: any,
    removedMedia: any,
  ): Promise<void> => {
    console.log("🎯 [handleItemSubmit] INICIANDO SUBMIT DO ITEM");

    if (selectedFlowIds.length === 0) {
      console.error("❌ Nenhum fluxo selecionado");
      toast.error("Selecione um fluxo");
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadMedia = async (itemId: string, files: any) => {
        const upload = async (file: File, type: string) => {
          const fd = new FormData();
          fd.append("file", file);
          try {
            const response = await api.post(
              `/flow/items/${itemId}/media/${type}`,
              fd,
              { headers: { "Content-Type": "multipart/form-data" } },
            );
            return response.data;
          } catch (error) {
            console.error(`❌ Erro no upload de ${type}:`, error);
            throw error;
          }
        };

        const promises = [];
        if (files.images?.length > 0) {
          for (const f of files.images) promises.push(upload(f, "image"));
        }
        if (files.audios?.length > 0) {
          for (const f of files.audios) promises.push(upload(f, "audio"));
        }
        if (files.videos?.length > 0) {
          for (const f of files.videos) promises.push(upload(f, "video"));
        }
        if (promises.length > 0) {
          return await Promise.all(promises);
        }
        return [];
      };

      if (editingItem) {
        const updatePayload = {
          ...values,
          removeImageIds: removedMedia.images,
          removeVideoIds: removedMedia.videos,
          removeAudioIds: removedMedia.audios,
        };

        await api.put(`/flow/items/${editingItem.id}`, updatePayload);

        if (
          files &&
          (files.images?.length > 0 ||
            files.audios?.length > 0 ||
            files.videos?.length > 0)
        ) {
          await uploadMedia(editingItem.id, files);
        }

        toast.success("Item atualizado com sucesso!");
      } else {
        if (!values.flowId || !values.stageId) {
          toast.error("Selecione uma coleção e etapa");
          setIsSubmitting(false);
          return;
        }

        const createPayload = {
          title: values.title,
          description: values.description || null,
          productRef: values.productRef || null,
          quantity: Number(values.quantity) || 0,
          status: values.status || "PENDENTE",
          flowId: values.flowId,
          stageId: values.stageId,
          assignedToId:
            values.assignedToId === "unassigned" ? null : values.assignedToId,
          supplierId:
            values.supplierId === "internal" ? null : values.supplierId,
          dueDate: values.dueDate || null,
          productionStartedAt: values.productionStartedAt || null,
          deliveryAt: values.deliveryAt || null,
          orderNumber: values.orderNumber || "",
          priority: values.priority || 3,
        };

        const response = await api.post(`/flow/items`, createPayload);
        const newItem = response.data;

        if (
          newItem?.id &&
          files &&
          (files.images?.length > 0 ||
            files.audios?.length > 0 ||
            files.videos?.length > 0)
        ) {
          await uploadMedia(newItem.id, files);
        }

        toast.success("Item criado com sucesso!");
      }

      setIsItemModal(false);
      setIsEditItemModal(false);
      setEditingItem(null);
      setCurrentItemStages([]);
      setActiveStageId(null);

      queryClient.invalidateQueries({ queryKey: ["kanban-boards"] });
      queryClient.invalidateQueries({ queryKey: ["all-items"] });
      queryClient.invalidateQueries({ queryKey: ["all-flows"] });

      if (values.flowId) {
        queryClient.invalidateQueries({
          queryKey: ["flow-board", values.flowId],
        });
        queryClient.invalidateQueries({
          queryKey: ["selected-flow", values.flowId],
        });
      }

      queryClient.invalidateQueries({ queryKey: ["flow"], exact: false });
    } catch (error: any) {
      console.error("❌ [handleItemSubmit] ERRO:", error);

      let errorMessage = "Erro ao salvar item";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage =
          "Dados inválidos. Verifique as informações e tente novamente.";
      } else if (error.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error.response?.status === 403) {
        errorMessage = "Você não tem permissão para realizar esta ação.";
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shouldShowItem = useCallback(
    (item: FlowItem): boolean => {
      if (item.status === "CONCLUIDO") {
        return itemsPendingRemoval.has(item.id);
      }
      return true;
    },
    [itemsPendingRemoval],
  );

  // ===========================================================================
  // 🎯 UNIFIED STAGES - Agrupa stages por nome
  // ===========================================================================
  const unifiedStages = useMemo(() => {
    const stageGroups: Record<string, FlowStage> = {};

    boards.forEach((board) => {
      const flowColor = board.color || "#D35400";
      const flowName = board.name;

      board.stages.forEach(
        (stage: {
          name: string;
          id: any;
          order: any;
          color: any;
          allowedRole: any;
          defaultDays: any;
          items: any[];
        }) => {
          const key = stage.name.toUpperCase();

          if (!stageGroups[key]) {
            stageGroups[key] = {
              id: stage.id,
              name: stage.name,
              order: stage.order,
              color: stage.color,
              allowedRole: stage.allowedRole,
              defaultDays: stage.defaultDays,
              flowId: board.id,
              items: [],
            };
          }

          const itemsWithMetadata = stage.items
            .filter((item) => shouldShowItem(item))
            .map((item) => ({
              ...item,
              flowColor,
              flowName,
              _originalStageId: item.stageId,
              _originalFlowId: board.id,
            }));

          stageGroups[key].items.push(...itemsWithMetadata);
        },
      );
    });

    return Object.values(stageGroups).sort((a, b) => a.order - b.order);
  }, [boards, itemsPendingRemoval, shouldShowItem]);

  // ===========================================================================
  // 🔥 HOOK DE DRAG (ajustado para usar refreshBoardsAfterAction)
  // ===========================================================================
  const { moveItem, onDragStart, executeMove } = useKanbanDrag({
    items: unifiedStages.flatMap((s) => s.items),
    setItems: () => {},
    idField: "stageId",

    moveCallback: async (itemId, newStageId, responsibleId, type) => {
      const payload: any = { newStageId };
      if (type === "supplier") {
        payload.supplierId = responsibleId;
      } else if (type === "user") {
        payload.assignedToId = responsibleId;
      }

      try {
        const response = await api.put(`/flow/items/${itemId}/move`, payload);
        const movedItem = response.data;

        const itemBoard = boards.find((b) => b.id === movedItem.flowId);
        if (itemBoard) {
          const targetStage = itemBoard.stages.find(
            (s: { id: string }) => s.id === newStageId,
          );
          if (targetStage) {
            lastMovedItemRef.current = {
              id: itemId,
              targetStageId: newStageId,
              targetStageName: targetStage.name,
            };
          }
        }
        return response.data;
      } catch (error: any) {
        console.error("❌ [moveCallback] Erro:", error);
        throw error;
      }
    },

    onRequireResponsible: (itemId, targetStageId, targetStageName) => {
      const item = unifiedStages
        .flatMap((s) => s.items)
        .find((i) => i.id === itemId);
      if (!item) return;

      const targetStage = unifiedStages.find(
        (s) => s.name.toLowerCase() === targetStageName.toLowerCase(),
      );
      if (!targetStage) return;

      const isDistribuicao = checkIfIsDistribuicao(targetStage.name);
      const isAfterCorte = checkIfIsAfterCorte(targetStageId, item.flowId);
      const isOficina = targetStage.name?.trim().toLowerCase() === "oficina";

      if (isOficina) {
        setDragItemId(itemId);
        setDragTargetStage({
          id: targetStageId,
          name: targetStage.name,
          allowedRole: targetStage.allowedRole,
          isAfterCorte,
          isDistribuicao,
        });
        setIsDragModalOpen(true);
        return;
      }

      if (
        targetStage?.allowedRole &&
        targetStage.allowedRole !== "all" &&
        targetStage.allowedRole !== "null" &&
        targetStage.allowedRole.trim() !== ""
      ) {
        setDragItemId(itemId);
        setDragTargetStage({
          id: targetStageId,
          name: targetStage.name,
          allowedRole: targetStage.allowedRole,
          isAfterCorte,
          isDistribuicao,
        });
        setIsDragModalOpen(true);
      } else {
        executeMove(itemId, targetStageId);
      }
    },

    onMoveSuccess: async () => {
      console.log("🔄 [onMoveSuccess] Movimento concluído com sucesso!");
      lastMovedItemRef.current = null;
      await refreshBoardsAfterAction();
    },

    onMoveError: (error) => {
      console.error("❌ [onMoveError] Erro no movimento:", error);
    },
  });

  const handleDragWithResponsible = async (
    responsibleId: string,
    type: "user" | "supplier",
    quantity?: number,
  ) => {
    if (!dragItemId || !dragTargetStage) return;

    try {
      if (quantity !== undefined) {
        await api.put(`/flow/items/${dragItemId}`, { quantity });
      }

      await executeMove(dragItemId, dragTargetStage.id, responsibleId, type);

      setIsDragModalOpen(false);
      setDragItemId(null);
      setDragTargetStage(null);
      await refreshBoardsAfterAction();
    } catch (error: any) {
      console.error("❌ [DRAG] Erro ao mover item:", error);
      let errorMsg = "Erro ao mover item.";
      if (error.response?.data?.message) errorMsg = error.response.data.message;
      toast.error(errorMsg);
    }
  };

  const toggleFlow = (id: string) =>
    setSelectedFlowIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );

  const hasActiveProductRefFilter =
    activeFilterProductRef && activeFilterProductRef.trim() !== "";
  const hasNoItemsAfterFilter = boards.every((board) =>
    board.stages.every(
      (stage: { items: string | any[] }) => stage.items.length === 0,
    ),
  );

  useEffect(() => {
    if (
      hasActiveProductRefFilter &&
      hasNoItemsAfterFilter &&
      !loading &&
      !hasShownEmptyRefToast
    ) {
      toast.info(
        "Nenhum item encontrado. A referência pode ainda não ter sido criada ou já foi finalizada.",
        { duration: 5000, icon: <Package className="h-4 w-4" /> },
      );
      setHasShownEmptyRefToast(true);
    }
    if (!hasActiveProductRefFilter || !hasNoItemsAfterFilter) {
      setHasShownEmptyRefToast(false);
    }
  }, [hasActiveProductRefFilter, hasNoItemsAfterFilter, loading]);

  const hasActiveFilters =
    activeFilterStartDate ||
    activeFilterEndDate ||
    activeFilterOverdue ||
    activeFilterUpcoming ||
    activeFilterAssignedTo !== "all" ||
    activeFilterSupplier !== "all" ||
    activeFilterProductRef ||
    activeColumnNameFilter;

  const calculateDaysRemaining = (deadlineDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const checkIfIsDistribuicao = (stageName: string): boolean => {
    const DISTRIBUICAO_KEYWORDS = [
      "distribuição",
      "distribuicao",
      "expedição",
      "expedicao",
    ];
    return DISTRIBUICAO_KEYWORDS.some((keyword) =>
      stageName.toLowerCase().includes(keyword.toLowerCase()),
    );
  };

  if (loading && boards.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F0E6]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#D35400]" size={40} />
          <p className="text-slate-500 text-sm animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <KanbanLayout>
      {/* Header com menu mobile */}
      <div className="relative">
        <KanbanHeader
          title="Esteira de Produção"
          icon={<Factory size={20} />}
          onAddFlow={() => setIsFlowModal(true)}
          onAddStage={() => {
            setEditingStage(null);
            setStageName("");
            setStageColor("#2D3436");
            setStageAllowedRole("");
            setIsStageModal(true);
          }}
          flows={flows}
          selectedFlowIds={selectedFlowIds}
          onToggleFlow={toggleFlow}
          onEditFlow={openEditModal}
          onDeleteFlow={(id) => {
            setItemToDelete({ type: "stage", id });
            setDeleteModalOpen(true);
          }}
          calculateDaysRemaining={calculateDaysRemaining}
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={setSelectedTemplateId}
          onApplyTemplate={handleApplyTemplate}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={(id) => {
            setItemToDelete({ type: "template", id });
            setDeleteModalOpen(true);
          }}
        />

        {/* Botão de filtro mobile */}
        <button
          className="fixed bottom-20 right-6 z-50 md:hidden bg-white rounded-full shadow-lg p-3 border border-slate-200 touch-feedback"
          onClick={() => setIsMobileFilterDrawerOpen(true)}
          aria-label="Abrir filtros"
        >
          <FilterIcon size={20} className="text-orange-600" />
        </button>
      </div>

      {/* Filtros Desktop (escondido no mobile) */}
      <div className="hidden md:block">
        <KanbanFilter>
          <div className="grid gap-1 min-w-[200px]">
            <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
              Filtrar por Coluna
            </label>
            <Popover
              open={openColumnSelector}
              onOpenChange={setOpenColumnSelector}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openColumnSelector}
                  className="h-8 w-full justify-between bg-background pl-8 pr-2 text-xs font-normal border-input hover:bg-accent"
                >
                  <div className="flex items-center gap-2 truncate pl-6 relative">
                    <Layers className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    <span className="truncate">
                      {columnNameFilter || "Todas as colunas"}
                    </span>
                  </div>
                  <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar etapa..."
                    className="h-8 text-xs"
                  />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty className="py-3 text-center text-xs text-slate-500">
                      Nenhuma coluna encontrada.
                    </CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setColumnNameFilter("");
                          setOpenColumnSelector(false);
                        }}
                        className="text-xs cursor-pointer"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary",
                            !columnNameFilter
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50",
                          )}
                        >
                          {!columnNameFilter && <Check className="h-3 w-3" />}
                        </div>
                        Todas as colunas
                      </CommandItem>
                      {columnOptions.map((option) => (
                        <CommandItem
                          key={option}
                          value={option}
                          onSelect={(currentValue) => {
                            setColumnNameFilter(
                              currentValue === columnNameFilter ? "" : option,
                            );
                            setOpenColumnSelector(false);
                          }}
                          className="text-xs cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-3 w-3 text-orange-600",
                              columnNameFilter === option
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {option}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-1 min-w-[140px]">
            <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
              Responsável
            </label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground"
              value={tempFilterAssignedTo}
              onChange={(e) => setTempFilterAssignedTo(e.target.value)}
            >
              <option value="all">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1 min-w-[140px]">
            <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
              Oficina
            </label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground"
              value={tempFilterSupplier}
              onChange={(e) => setTempFilterSupplier(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="internal">Produção Interna</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1 min-w-[180px]">
            <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
              Referência do Produto
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Buscar por ref..."
                className="h-8 text-xs pl-8 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                value={tempFilterProductRef}
                onChange={(e) => setTempFilterProductRef(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleFilterClick();
                  }
                }}
              />
              <Package className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-500 dark:text-slate-400" />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button
              size="sm"
              variant={tempFilterOverdue ? "destructive" : "outline"}
              className={`h-8 text-xs font-medium touch-feedback ${
                tempFilterOverdue
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "text-foreground"
              }`}
              onClick={toggleOverdueFilter}
            >
              <AlertTriangle className="w-3 h-3 mr-2" />
              Atrasados
            </Button>

            <Button
              size="sm"
              variant={tempFilterUpcoming ? "default" : "outline"}
              className={`h-8 text-xs font-medium touch-feedback ${
                tempFilterUpcoming
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "text-foreground"
              }`}
              onClick={toggleUpcomingFilter}
            >
              <Clock className="w-3 h-3 mr-2" />
              Próximos a vencer ({notificationDays} dias)
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              className="h-8 text-xs font-medium min-w-[100px] bg-orange-600 hover:bg-orange-700 text-white touch-feedback"
              onClick={handleFilterClick}
              disabled={isFiltering}
            >
              {isFiltering ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Filtrando...
                </>
              ) : (
                <>
                  <FilterIcon className="w-3 h-3 mr-2" /> Filtrar
                </>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={handleClearFilters}
                title="Limpar Filtros"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {activeColumnFilter.columnId && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-slate-500 hover:text-red-600"
              onClick={() =>
                setActiveColumnFilter({ columnId: null, filterType: null })
              }
            >
              <X className="w-3 h-3 mr-1" />
              Limpar Filtro da Coluna
            </Button>
          )}
        </KanbanFilter>
      </div>

      {activeColumnNameFilter && (
        <div className="px-4 py-2 mb-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Layers size={16} className="text-orange-600" />
            <span className="font-medium text-orange-800">
              Filtrando apenas a coluna:{" "}
              <strong>&quot;{activeColumnNameFilter}&quot;</strong>
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-orange-600 hover:text-orange-800 hover:bg-orange-100"
            onClick={() => {
              setColumnNameFilter("");
              handleClearFilters();
            }}
          >
            <X size={14} className="mr-1" />
            Limpar
          </Button>
        </div>
      )}

      <KanbanBoard>
        {hasActiveProductRefFilter && hasNoItemsAfterFilter ? (
          <div className="flex flex-col items-center justify-center w-full py-16 px-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 max-w-md text-center">
              <Package className="h-12 w-12 text-orange-300 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                A referência{" "}
                <span className="font-bold text-orange-600">
                  &ldquo;{activeFilterProductRef}&rdquo;
                </span>{" "}
                não foi criada ou já foi finalizada.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-6 text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={handleClearFilters}
              >
                <X className="h-3 w-3 mr-2" />
                Limpar Filtro
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-4 gap-4 scroll-smooth snap-x snap-mandatory md:overflow-x-visible md:snap-none">
            {unifiedStages.map((stage, index) => {
              const hasPermission = canUserEditStage(stage);
              const filteredItems = filterColumnItems(stage);
              const isOverdueActive =
                activeColumnFilter.columnId === stage.id &&
                activeColumnFilter.filterType === "overdue";
              const isUpcomingActive =
                activeColumnFilter.columnId === stage.id &&
                activeColumnFilter.filterType === "upcoming";

              return (
                <KanbanColumn
                  key={stage.id}
                  id={stage.id}
                  title={stage.name}
                  count={filteredItems.length}
                  color={stage.color}
                  isFirstColumn={index === 0}
                  defaultDays={stage.defaultDays}
                  className="min-w-[280px] md:min-w-0 snap-start"
                  onDropItem={(itemId) => {
                    const allItems = unifiedStages.flatMap((s) => s.items);
                    const draggingItem = allItems.find((i) => i.id === itemId);
                    if (!draggingItem) return;

                    const itemBoard = boards.find(
                      (b) => b.id === draggingItem.flowId,
                    );
                    if (!itemBoard) return;

                    const correctStage = itemBoard.stages.find(
                      (s: { name: string }) =>
                        s.name.toUpperCase() === stage.name.toUpperCase(),
                    );
                    if (!correctStage) return;

                    moveItem(itemId, correctStage.id, stage.name);
                  }}
                  onAddItem={
                    hasPermission ? () => handleCreateItem(stage.id) : undefined
                  }
                  onEditClick={() => {
                    setEditingStage(stage);
                    setStageName(stage.name);
                    setStageColor(stage.color || "#2D3436");
                    setStageAllowedRole(stage.allowedRole || "");
                    setStageDefaultDays(stage.defaultDays ?? 1);
                    setIsStageModal(true);
                  }}
                  onDeleteClick={() => {
                    setItemToDelete({ type: "stage", id: stage.id });
                    setDeleteModalOpen(true);
                  }}
                  onFilterOverdue={() => handleColumnFilterOverdue(stage.id)}
                  onFilterUpcoming={() => handleColumnFilterUpcoming(stage.id)}
                  isOverdueFilterActive={isOverdueActive}
                  isUpcomingFilterActive={isUpcomingActive}
                  filterDisabled={false}
                >
                  {!hasPermission && (
                    <div className="text-[10px] text-center text-slate-400 py-1 flex items-center justify-center gap-1 bg-slate-50 mb-2 rounded border border-dashed">
                      <Lock size={10} /> Somente Leitura
                    </div>
                  )}

                  {(isOverdueActive || isUpcomingActive) && (
                    <div
                      className="mb-2 p-1 text-[8px] font-bold uppercase text-center rounded bg-opacity-20 flex items-center justify-center gap-1"
                      style={{
                        backgroundColor: isOverdueActive
                          ? "#ef444420"
                          : "#f59e0b20",
                        color: isOverdueActive ? "#ef4444" : "#f59e0b",
                        border: `1px solid ${isOverdueActive ? "#ef4444" : "#f59e0b"}30`,
                      }}
                    >
                      {isOverdueActive ? (
                        <>
                          <AlertTriangle size={10} />
                          Filtrando: Atrasados
                        </>
                      ) : (
                        <>
                          <Clock size={10} />
                          Filtrando: Proximos a vencer (7 dias)
                        </>
                      )}
                      <button
                        className="ml-1 hover:opacity-70"
                        onClick={() =>
                          setActiveColumnFilter({
                            columnId: null,
                            filterType: null,
                          })
                        }
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}

                  {filteredItems.map((item) => (
                    <KanbanCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      subtitle={item.productRef}
                      priorityColor={item.flowColor}
                      dueDate={item.dueDate}
                      coverImage={item.images[0]?.url}
                      onDragStart={
                        hasPermission
                          ? (e) => onDragStart(e, item.id)
                          : undefined
                      }
                      onDoubleClick={() => {
                        setEditingItem(item);
                        setIsModalReadOnly(!hasPermission);
                        handleEditItem(item);
                      }}
                      onEdit={
                        hasPermission
                          ? () => {
                              setEditingItem(item);
                              setIsModalReadOnly(false);
                              handleEditItem(item);
                            }
                          : undefined
                      }
                      onDelete={
                        hasPermission
                          ? () => {
                              setItemToDelete({ type: "item", id: item.id });
                              setDeleteModalOpen(true);
                            }
                          : undefined
                      }
                      onComplete={
                        hasPermission
                          ? () => handleOpenCompleteModal(item)
                          : undefined
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
          </div>
        )}
      </KanbanBoard>

      {/* FAB para mobile */}
      {/* <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <button
          onClick={() => {
            const firstStageId = unifiedStages[0]?.id;
            if (firstStageId) handleCreateItem(firstStageId);
          }}
          className="w-14 h-14 rounded-full bg-orange-600 text-white shadow-lg 
                     active:scale-95 transition-transform duration-200
                     flex items-center justify-center hover:bg-orange-700 touch-feedback"
          aria-label="Criar novo item"
        >
          <Plus size={24} />
        </button>
      </div> */}

      {/* Bottom Sheet de Filtros Mobile */}
      {isMobileFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsMobileFilterDrawerOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl 
                          transform transition-transform duration-300 animate-slide-up
                          max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Filtros</h3>
              <button
                onClick={() => setIsMobileFilterDrawerOpen(false)}
                className="p-2 touch-feedback"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Coluna</label>
                <select
                  className="w-full p-3 border rounded-lg text-base"
                  value={columnNameFilter}
                  onChange={(e) => setColumnNameFilter(e.target.value)}
                >
                  <option value="">Todas as colunas</option>
                  {columnOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Responsável</label>
                <select
                  className="w-full p-3 border rounded-lg text-base"
                  value={tempFilterAssignedTo}
                  onChange={(e) => setTempFilterAssignedTo(e.target.value)}
                >
                  <option value="all">Todos</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Oficina</label>
                <select
                  className="w-full p-3 border rounded-lg text-base"
                  value={tempFilterSupplier}
                  onChange={(e) => setTempFilterSupplier(e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="internal">Produção Interna</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">
                  Referência do Produto
                </label>
                <input
                  type="text"
                  placeholder="Buscar por ref..."
                  className="w-full p-3 border rounded-lg text-base"
                  value={tempFilterProductRef}
                  onChange={(e) => setTempFilterProductRef(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  className={`flex-1 py-3 rounded-lg font-medium transition-all touch-feedback ${
                    tempFilterOverdue
                      ? "bg-red-500 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                  onClick={toggleOverdueFilter}
                >
                  Atrasados
                </button>
                <button
                  className={`flex-1 py-3 rounded-lg font-medium transition-all touch-feedback ${
                    tempFilterUpcoming
                      ? "bg-orange-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                  onClick={toggleUpcomingFilter}
                >
                  Próximos ({notificationDays}d)
                </button>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold touch-feedback"
                  onClick={() => {
                    handleFilterClick();
                    setIsMobileFilterDrawerOpen(false);
                  }}
                >
                  Aplicar Filtros
                </button>
                {hasActiveFilters && (
                  <button
                    className="px-4 py-3 bg-slate-100 rounded-lg touch-feedback"
                    onClick={() => {
                      handleClearFilters();
                      setIsMobileFilterDrawerOpen(false);
                    }}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modais (mesmos do código original) */}
      <FlowItemModal
        isOpen={isItemModal}
        onClose={() => {
          setIsItemModal(false);
          setCurrentItemStages([]);
          setActiveStageId(null);
        }}
        onSubmit={handleItemSubmit}
        isLoading={isSubmitting || isModalLoading}
        users={users}
        suppliers={suppliers}
        stages={currentItemStages}
        flows={flows}
        initialStageId={activeStageId}
        currentUserRole={user?.professionalRole}
        currentUserSystemRole={user?.role}
        isReadOnly={false}
        hasMultipleFlows={selectedFlowIds.length > 1}
        selectedFlowIds={selectedFlowIds}
        fetchStagesForFlow={async (flowId) => {
          try {
            const response = await api.get(`/flow/${flowId}/stages`);
            return response.data;
          } catch (error) {
            console.error("Erro ao buscar stages:", error);
            return [];
          }
        }}
        onDeadlineUpdate={refreshBoardsAfterAction}
      />

      <FlowItemModal
        isOpen={isEditItemModal}
        onClose={() => {
          setIsEditItemModal(false);
          setEditingItem(null);
          setCurrentItemStages([]);
          setActiveStageId(null);
        }}
        initialData={editingItem}
        onSubmit={handleItemSubmit}
        isLoading={isSubmitting || isModalLoading}
        users={users}
        suppliers={suppliers}
        stages={currentItemStages}
        flows={flows}
        initialStageId={activeStageId}
        onAdvance={handleAdvanceItem}
        onDelete={(id) => {
          setIsEditItemModal(false);
          setItemToDelete({ type: "item", id });
          setDeleteModalOpen(true);
        }}
        currentUserRole={user?.professionalRole}
        currentUserSystemRole={user?.role}
        isReadOnly={isModalReadOnly}
        hasMultipleFlows={selectedFlowIds.length > 1}
        onFlowChange={async (flowId) => {
          try {
            const response = await api.get(`/flow/${flowId}/stages`);
            setCurrentItemStages(response.data);
            return response.data;
          } catch (error) {
            console.error("Erro ao buscar stages:", error);
            toast.error("Erro ao carregar etapas");
            return [];
          }
        }}
      />

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteExecute}
        loading={isDeleting}
        title={`Excluir ${itemToDelete?.type === "item" ? "produto" : itemToDelete?.type === "template" ? "template" : "etapa/fluxo"}?`}
      />

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
                handleEditItem(previewItem!);
              }}
            >
              Editar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Etapa */}
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

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar size={16} className="text-orange-500" />
                Dias Padrão para Conclusão
              </Label>
              <Input
                type="number"
                min="0"
                value={stageDefaultDays}
                onChange={(e) =>
                  setStageDefaultDays(parseInt(e.target.value) || 0)
                }
                placeholder="Ex: 3"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Quantos dias esta etapa normalmente leva para ser concluída?
              </p>
            </div>

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

      {/* Modal de Fluxo */}
      <Dialog open={isFlowModal} onOpenChange={setIsFlowModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Novo Fluxo</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 text-sm font-medium">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder="Ex: Coleção Verão 2024"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor do Fluxo</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={newFlowColor}
                  onChange={(e) => setNewFlowColor(e.target.value)}
                  className="h-10 w-12 p-1 cursor-pointer"
                />
                <Input
                  value={newFlowColor}
                  onChange={(e) => setNewFlowColor(e.target.value)}
                  className="flex-1 uppercase"
                  placeholder="#D35400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar size={16} className="text-orange-500" />
                Prazo Final da Coleção
              </Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full"
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground">
                Data limite para conclusão de todos os itens desta coleção
              </p>
            </div>

            {deadline && (
              <div className="mt-2 p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  Preview:
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: newFlowColor }}
                  />
                  <span className="text-sm font-medium">
                    {flowName || "Novo Fluxo"}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600">
                    Prazo: {new Date(deadline).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateFlow}
              className="bg-orange-600 text-white"
              disabled={isCreatingFlow}
            >
              {isCreatingFlow ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Fluxo */}
      <Dialog open={isEditFlowModalOpen} onOpenChange={setIsEditFlowModalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Editar Fluxo</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 text-sm font-medium">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editFlowName}
                onChange={(e) => setEditFlowName(e.target.value)}
                placeholder="Ex: Coleção Verão 2024"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor do Fluxo</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={editFlowColor}
                  onChange={(e) => setEditFlowColor(e.target.value)}
                  className="h-10 w-12 p-1 cursor-pointer"
                />
                <Input
                  value={editFlowColor}
                  onChange={(e) => setEditFlowColor(e.target.value)}
                  className="flex-1 uppercase"
                  placeholder="#D35400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar size={16} className="text-orange-500" />
                Prazo Final da Coleção
              </Label>
              <Input
                type="date"
                value={editFlowDeadline}
                onChange={(e) => setEditFlowDeadline(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para remover o prazo
              </p>
            </div>

            {editFlowDeadline && (
              <div className="mt-2 p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  Preview:
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: editFlowColor }}
                  />
                  <span className="text-sm font-medium">
                    {editFlowName || "Fluxo"}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600">
                    Prazo:{" "}
                    {new Date(editFlowDeadline).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditFlowModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateFlow}
              className="bg-orange-600 text-white"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Conclusão de Etapa */}
      <CompleteStageModal
        isOpen={isCompleteStageModalOpen}
        onClose={() => {
          setIsCompleteStageModalOpen(false);
          setCompletingItem(null);
          setNextStageForCompletion(null);
        }}
        onConfirm={handleCompleteWithResponsible}
        itemTitle={completingItem?.title || ""}
        currentStage={
          unifiedStages.find((s) => s.id === completingItem?.stageId)?.name ||
          ""
        }
        nextStage={nextStageForCompletion}
        isLoading={isSubmitting}
        currentQuantity={completingItem?.quantity}
        hasQuantity={
          completingItem?.quantity ? completingItem.quantity > 0 : false
        }
      />

      {/* Modal de Drag com Responsável */}
      <CompleteStageModal
        isOpen={isDragModalOpen}
        onClose={() => {
          setIsDragModalOpen(false);
          setDragItemId(null);
          setDragTargetStage(null);
        }}
        onConfirm={handleDragWithResponsible}
        itemTitle={
          unifiedStages.flatMap((s) => s.items).find((i) => i.id === dragItemId)
            ?.title || ""
        }
        currentStage={
          unifiedStages.find((s) => s.items.some((i) => i.id === dragItemId))
            ?.name || ""
        }
        nextStage={dragTargetStage}
        isLoading={isSubmitting}
        currentQuantity={
          unifiedStages.flatMap((s) => s.items).find((i) => i.id === dragItemId)
            ?.quantity
        }
        hasQuantity={
          dragItemId
            ? (unifiedStages
                .flatMap((s) => s.items)
                .find((i) => i.id === dragItemId)?.quantity ?? 0) > 0
            : false
        }
      />

      {/* Alert Dialog para Template */}
      <AlertDialog
        open={isTemplateAlertOpen}
        onOpenChange={setIsTemplateAlertOpen}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              Nome do Template
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#718096]">
              Dê um nome para identificar esta estrutura de etapas.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ex: Estrutura Padrão"
              className="w-full"
              autoFocus
              disabled={isSavingTemplate}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setTemplateName("")}
              disabled={isSavingTemplate}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeSaveTemplate}
              disabled={isSavingTemplate || !templateName.trim()}
              className="bg-[#D35400] hover:bg-[#A04000] text-white"
            >
              {isSavingTemplate ? "Salvando..." : "Salvar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </KanbanLayout>
  );
}

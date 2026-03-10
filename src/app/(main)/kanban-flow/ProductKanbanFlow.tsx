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
  Filter as FilterIcon,
  AlertTriangle,
  Clock,
  Loader2,
  Edit,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

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
import { KanbanFilter } from "@/components/kanban/kanban-filter";

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
import { CompleteStageModal } from "@/components/modals/complete-stage-modal";
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
  items: FlowItem[];
  flowId: string;
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

  // ===========================================================================
  // 🔥 REF PARA CONTROLAR PRIMEIRA RENDERIZAÇÃO
  // ===========================================================================
  const isFirstRender = useRef(true);

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

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    console.log("📊 Boards atualizados:", {
      quantidade: boards.length,
      flows: boards.map((b) => ({
        id: b.id,
        name: b.name,
        stages: b.stages.length,
        items: b.stages.reduce((acc, s) => acc + s.items.length, 0),
      })),
    });

    // Log dos itens para verificar cores
    boards.forEach((board) => {
      board.stages.forEach((stage) => {
        stage.items.forEach((item) => {
          console.log(`🎨 Item ${item.id} - ${item.title}:`, {
            flowColor: item.flowColor,
            flowName: item.flowName,
            stage: stage.name,
          });
        });
      });
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

  // ===========================================================================
  // 🎯 FUNÇÃO DE EDIÇÃO DE ITEM
  // ===========================================================================
  const handleEditItem = async (item: FlowItem) => {
    console.log("📝 Abrindo modal de edição para item:", item.id);

    setIsModalLoading(true);
    setEditingItem(item);

    try {
      let itemBoard = boards.find((b) => b.id === item.flowId);

      if (!itemBoard) {
        console.log("🔄 Board não encontrado localmente, buscando da API...");
        const response = await api.get(`/flow/${item.flowId}/board`);
        itemBoard = response.data;
      }

      if (!itemBoard) {
        throw new Error("Board não encontrado");
      }

      setCurrentItemStages(itemBoard.stages);

      const stage = itemBoard.stages.find((s) => s.id === item.stageId);
      setIsModalReadOnly(stage ? !canUserEditStage(stage) : true);

      setTimeout(() => {
        setIsEditItemModal(true);
        setIsModalLoading(false);
      }, 50);
    } catch (error) {
      console.error("❌ Erro ao carregar board:", error);
      toast.error("Erro ao carregar dados do fluxo");
      setIsModalLoading(false);
    }
  };

  // ===========================================================================
  // 🎯 FUNÇÃO DE CRIAÇÃO DE ITEM - CORRIGIDA
  // ===========================================================================
  const handleCreateItem = (stageId: string) => {
    console.log("\n");
    console.log("=".repeat(80));
    console.log("🎯 [handleCreateItem] INÍCIO - Stage clicada:", stageId);
    console.log("=".repeat(80));

    // 🔥 LOG IMPORTANTE 1: Verificar fluxos selecionados
    console.log("📊 Fluxos selecionados:", {
      quantidade: selectedFlowIds.length,
      ids: selectedFlowIds,
      hasMultipleFlows: selectedFlowIds.length > 1,
    });

    const itemBoard = boards.find((b) =>
      b.stages.some((s) => s.id === stageId),
    );

    if (!itemBoard) {
      console.error("❌ Board não encontrado para stage:", stageId);
      console.log(
        "📋 Boards disponíveis:",
        boards.map((b) => ({
          id: b.id,
          name: b.name,
          stages: b.stages.map((s) => ({ id: s.id, name: s.name })),
        })),
      );
      toast.error("Erro ao carregar dados do fluxo");
      return;
    }

    console.log("✅ Board encontrado:", {
      boardId: itemBoard.id,
      boardName: itemBoard.name,
      flowId: itemBoard.id,
      flowName: itemBoard.name,
    });

    console.log(
      "📋 Stages disponíveis no board:",
      itemBoard.stages.map((s) => ({
        id: s.id,
        name: s.name,
        flowId: s.flowId,
      })),
    );

    console.log("🎯 Stage clicada:", {
      stageId: stageId,
      stageInfo: itemBoard.stages.find((s) => s.id === stageId),
    });

    // 🔥 Guarda o stageId que veio do clique
    setActiveStageId(stageId);
    console.log("💾 activeStageId setado para:", stageId);

    // Guarda as stages do board para referência
    setCurrentItemStages(itemBoard.stages);
    console.log(
      "💾 currentItemStages setado com",
      itemBoard.stages.length,
      "stages",
    );

    console.log("🔄 Abrindo modal em 50ms...");

    setTimeout(() => {
      console.log("⏰ Timeout executado - abrindo modal");
      setIsModalReadOnly(false);
      setIsItemModal(true);
      console.log("✅ Modal aberto");
    }, 50);
  };

  // ===========================================================================
  // 🎯 FUNÇÃO PARA ABRIR MODAL DE CONCLUSÃO
  // ===========================================================================
  const handleOpenCompleteModal = (item: FlowItem) => {
    const currentBoard = boards.find((b) => b.id === item.flowId);
    if (!currentBoard) return;

    const allStages = [...currentBoard.stages].sort(
      (a, b) => a.order - b.order,
    );
    const currentIndex = allStages.findIndex((s) => s.id === item.stageId);
    const nextStage = allStages[currentIndex + 1];

    if (!nextStage) {
      handleAdvanceItem(item);
      return;
    }

    if (
      nextStage.allowedRole &&
      nextStage.allowedRole !== "all" &&
      nextStage.allowedRole !== "null" &&
      nextStage.allowedRole.trim() !== ""
    ) {
      setCompletingItem(item);
      setNextStageForCompletion({
        id: nextStage.id,
        name: nextStage.name,
        allowedRole: nextStage.allowedRole,
      });
      setIsCompleteStageModalOpen(true);
    } else {
      handleAdvanceItem(item);
    }
  };

  // ===========================================================================
  // 🎯 FUNÇÃO PARA CONCLUIR COM RESPONSÁVEL
  // ===========================================================================
  const handleCompleteWithResponsible = async (
    responsibleId: string,
    type: "user" | "supplier",
  ) => {
    if (!completingItem || !nextStageForCompletion) return;

    toast.loading("Concluindo etapa...", { id: "complete-stage" });

    try {
      const payload: any = { newStageId: nextStageForCompletion.id };

      if (type === "user") {
        payload.assignedToId = responsibleId;
      } else {
        payload.supplierId = responsibleId;
      }

      await api.put(`/flow/items/${completingItem.id}/move`, payload);

      // toast.success(`Item movido para "${nextStageForCompletion.name}"!`, {
      //   id: "complete-stage",
      // });

      const hasFilters =
        activeFilterStartDate ||
        activeFilterEndDate ||
        activeFilterOverdue ||
        activeFilterUpcoming ||
        activeColumnNameFilter;

      if (hasFilters) {
        await fetchFilteredBoards();
      } else {
        await fetchSelectedBoards();
      }

      setIsCompleteStageModalOpen(false);
      setCompletingItem(null);
      setNextStageForCompletion(null);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || "Erro ao concluir etapa.";
      console.log(errorMsg);
      // toast.error(errorMsg, { id: "complete-stage" });
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

      console.log("🔍 [FRONTEND] Comparação de cargo:", {
        userProfessionalRole: user.professionalRole,
        stageAllowedRole: stage.allowedRole,
        match: user.professionalRole === stage.allowedRole,
      });

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
    if (
      activeColumnFilter.columnId !== stage.id ||
      !activeColumnFilter.filterType
    ) {
      return stage.items;
    }

    const todayUTC = new Date();
    const year = todayUTC.getUTCFullYear();
    const month = String(todayUTC.getUTCMonth() + 1).padStart(2, "0");
    const day = String(todayUTC.getUTCDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    // Calcula a data daqui a 7 dias
    const sevenDaysFromNow = new Date(todayUTC);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split("T")[0];

    const filtered = stage.items.filter((item) => {
      if (activeColumnFilter.filterType === "overdue") {
        const dueDate = item.dueDate?.split("T")[0];
        if (!dueDate) return false;
        return dueDate < todayStr;
      } else if (activeColumnFilter.filterType === "upcoming") {
        const dueDate = item.dueDate?.split("T")[0];
        if (!dueDate) return false;

        // Item vence em até 7 dias (incluindo hoje)
        return dueDate >= todayStr && dueDate <= sevenDaysFromNowStr;
      }
      return true;
    });

    return filtered;
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

    if (filterParam === "overdue") {
      setTempFilterOverdue(true);
      setTempFilterUpcoming(false);
    } else if (filterParam === "upcoming") {
      setTempFilterUpcoming(true);
      setTempFilterOverdue(false);
    }
    

    // 🔥 Se for filtro upcoming, sempre usa dueDate
  if (filterParam === "upcoming") {
    setTempFilterDateType("dueDate");
  } else if (typeParam === "productionStartedAt" || typeParam === "dueDate") {
    setTempFilterDateType(typeParam);
  }

    if (startDateParam) {
      setTempFilterStartDate(startDateParam.split("T")[0]);
    }

    if (endDateParam) {
      setTempFilterEndDate(endDateParam.split("T")[0]);
    }

    if (assignedParam) {
      setTempFilterAssignedTo(assignedParam);
    }

    if (supplierParam) {
      setTempFilterSupplier(supplierParam);
    }

    if (productRefParam) {
      setTempFilterProductRef(productRefParam);
    }

    if (stageNameParam) {
      setColumnNameFilter(stageNameParam);
    }

     // 🔥 Atualiza os filtros ativos
  setActiveFilterDateType(
    filterParam === "upcoming" ? "dueDate" : 
    (typeParam === "productionStartedAt" || typeParam === "dueDate")
      ? typeParam
      : "dueDate" // 🔥 Muda o padrão para dueDate
  );
    setActiveFilterStartDate(
      startDateParam ? startDateParam.split("T")[0] : "",
    );
    setActiveFilterEndDate(endDateParam ? endDateParam.split("T")[0] : "");
    setActiveFilterOverdue(filterParam === "overdue");
    setActiveFilterUpcoming(filterParam === "upcoming");
    setActiveFilterAssignedTo(assignedParam || "all");
    setActiveFilterSupplier(supplierParam || "all");
    setActiveFilterProductRef(productRefParam || "");
    setActiveColumnNameFilter(stageNameParam || "");
  }, [searchParams]);

  // ===========================================================================
  // 🔥 FUNÇÃO fetchFilteredBoards
  // ===========================================================================
  const fetchFilteredBoards = useCallback(
    async (paramsFromUrl?: URLSearchParams) => {
      if (selectedFlowIds.length === 0) {
        setBoards([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setIsFiltering(true);

      try {
        const params =
          paramsFromUrl || new URLSearchParams(window.location.search);

        const startDate = params.get("startDate");
        const endDate = params.get("endDate");
        const dateType = params.get("dateType");
        const filter = params.get("filter");
        const assignedToId = params.get("assignedToId");
        const supplierId = params.get("supplierId");
        const productRef = params.get("productRef");
        const stageName = params.get("stageName");

        console.log("🔍 fetchFilteredBoards - Parâmetros:", {
          startDate,
          endDate,
          dateType,
          filter,
          assignedToId,
          supplierId,
          productRef,
          stageName,
          selectedFlowIds,
        });

        setActiveFilterStartDate(startDate?.split("T")[0] || "");
        setActiveFilterEndDate(endDate?.split("T")[0] || "");
        setActiveFilterDateType(
          (dateType as "productionStartedAt" | "dueDate") ||
            "productionStartedAt",
        );
        setActiveFilterOverdue(filter === "overdue");
        setActiveFilterUpcoming(filter === "upcoming");
        setActiveFilterAssignedTo(assignedToId || "all");
        setActiveFilterSupplier(supplierId || "all");
        setActiveFilterProductRef(productRef || "");
        setActiveColumnNameFilter(stageName || "");
        setColumnNameFilter(stageName || "");

        const baseQueryParams = new URLSearchParams();

        if (startDate) {
          const startDateTime = new Date(startDate);
          startDateTime.setUTCHours(0, 0, 0, 0);
          baseQueryParams.set("startDate", startDateTime.toISOString());
        }

        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setUTCHours(23, 59, 59, 999);
          baseQueryParams.set("endDate", endDateTime.toISOString());
        }

        if (dateType) {
          baseQueryParams.set("dateType", dateType);
        }

        if (filter === "overdue") {
          baseQueryParams.set("isOverdue", "true");
        }
        if (filter === "upcoming") {
          baseQueryParams.set("isUpcoming", "true");
        }

        if (assignedToId && assignedToId !== "all") {
          baseQueryParams.set("assignedToId", assignedToId);
        }

        if (supplierId && supplierId !== "all") {
          baseQueryParams.set("supplierId", supplierId);
        }

        if (productRef && productRef.trim() !== "") {
          baseQueryParams.set("productRef", productRef.trim());
        }

        if (stageName && stageName.trim() !== "") {
          console.log(`🎯 Filtrando por nome da coluna: "${stageName}"`);
          baseQueryParams.set("stageName", stageName.trim());

          const boardsPromises = selectedFlowIds.map(async (flowId) => {
            try {
              const response = await api.get(
                `/flow/${flowId}/filtered-board?${baseQueryParams.toString()}`,
              );

              console.log(`✅ Board ${flowId} filtrado com sucesso:`, {
                flowName: response.data.name,
                stagesCount: response.data.stages?.length || 0,
              });

              return response.data;
            } catch (error) {
              console.error(`❌ Erro ao filtrar board ${flowId}:`, error);
              const emptyBoard = await api.get(`/flow/${flowId}/board`);
              return {
                ...emptyBoard.data,
                stages: [],
              };
            }
          });

          const filteredBoards = await Promise.all(boardsPromises);
          setBoards(filteredBoards);

          toast.success(`Filtrando apenas itens da coluna: "${stageName}"`);
        } else {
          console.log("🌐 Filtrando itens globalmente");

          const itemsResponse = await api.get(
            `/flow/filter/items?${baseQueryParams.toString()}`,
          );

          const filteredItems = itemsResponse.data;

          const boardsPromises = selectedFlowIds.map(async (flowId) => {
            try {
              const boardRes = await api.get(`/flow/${flowId}/board`);
              const board = boardRes.data;

              const filteredBoard = {
                ...board,
                stages: board.stages.map((stage: FlowStage) => ({
                  ...stage,
                  items: stage.items.filter((item: FlowItem) =>
                    filteredItems.some(
                      (filteredItem: FlowItem) => filteredItem.id === item.id,
                    ),
                  ),
                })),
              };

              return filteredBoard;
            } catch (error) {
              console.error(`❌ Erro ao carregar board ${flowId}:`, error);
              return null;
            }
          });

          const filteredBoards = (await Promise.all(boardsPromises)).filter(
            (board) => board !== null,
          );

          setBoards(filteredBoards);
        }
      } catch (error: any) {
        console.error("❌ Erro ao aplicar filtros:", error);
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Erro ao aplicar filtros";
        toast.error(errorMessage);
        await fetchSelectedBoards();
      } finally {
        setLoading(false);
        setIsFiltering(false);
      }
    },
    [selectedFlowIds],
  );

  // ===========================================================================
  // 🔥 FUNÇÃO fetchSelectedBoards
  // ===========================================================================
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

  // ===========================================================================
  // 🔥 FUNÇÃO handleFilterClick
  // ===========================================================================
  const handleFilterClick = async () => {
    setIsFiltering(true);

    const params = new URLSearchParams();

    if (columnNameFilter && columnNameFilter.trim() !== "") {
      params.set("stageName", columnNameFilter.trim());
    }

    // Se o filtro de próximos 7 dias estiver ativo, sempre usa dueDate
  if (tempFilterUpcoming) {
    params.set("dateType", "dueDate");
    setTempFilterDateType("dueDate");
  } else if (tempFilterDateType) {
    params.set("dateType", tempFilterDateType);
  }

     if (tempFilterStartDate) params.set("startDate", tempFilterStartDate);
  if (tempFilterEndDate) params.set("endDate", tempFilterEndDate);
  
  if (tempFilterOverdue) params.set("filter", "overdue");
  if (tempFilterUpcoming) params.set("filter", "upcoming");
    
    if (tempFilterAssignedTo !== "all")
      params.set("assignedToId", tempFilterAssignedTo);
    if (tempFilterSupplier !== "all")
      params.set("supplierId", tempFilterSupplier);
    if (tempFilterProductRef && tempFilterProductRef.trim() !== "") {
      params.set("productRef", tempFilterProductRef.trim());
    }
 console.log("🔍 Parâmetros do filtro:", params.toString());
    router.push(`?${params.toString()}`);
  };

  // ===========================================================================
  // 🔥 FUNÇÃO handleClearFilters
  // ===========================================================================
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
    await fetchSelectedBoards();
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

       // 🔥 FORÇA O TIPO DE DATA PARA dueDate
    setTempFilterDateType("dueDate");

      // Calcula as datas para os próximos 7 dias
      const today = new Date();
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Formata as datas no formato ISO (YYYY-MM-DD)
      const todayStr = today.toISOString().split("T")[0];
      const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];

       console.log("📅 Filtro Próximos 7 dias:", {
      hoje: todayStr,
      daqui7dias: sevenDaysStr,
      dateType: "dueDate"
    });

      setTempFilterStartDate(todayStr);
      setTempFilterEndDate(sevenDaysStr);
    }
  };

  // ===========================================================================
  // 🔄 FUNÇÕES DE DADOS INICIAIS
  // ===========================================================================
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
  }, [user?.company?.id, selectedFlowIds.length]);

  // ===========================================================================
  // 🎯 EFEITO PRINCIPAL
  // ===========================================================================
  useEffect(() => {
    if (selectedFlowIds.length === 0) {
      setBoards([]);
      setLoading(false);
      return;
    }

    const hasFilters =
      activeFilterStartDate ||
      activeFilterEndDate ||
      activeFilterOverdue ||
      activeFilterUpcoming ||
      activeFilterAssignedTo !== "all" ||
      activeFilterSupplier !== "all" ||
      activeFilterProductRef ||
      activeColumnNameFilter;

    console.log("🔄 useEffect executado", {
      isFirstRender: isFirstRender.current,
      hasFilters,
      selectedFlowIds,
    });

    if (isFirstRender.current) {
      isFirstRender.current = false;
      console.log("🚀 Primeira renderização - ignorando");

      if (hasFilters) {
        const params = new URLSearchParams(window.location.search);
        fetchFilteredBoards(params);
      } else {
        fetchSelectedBoards();
      }
      return;
    }

    if (hasFilters) {
      const params = new URLSearchParams(window.location.search);
      fetchFilteredBoards(params);
    } else {
      fetchSelectedBoards();
    }
  }, [
    activeFilterStartDate,
    activeFilterEndDate,
    activeFilterOverdue,
    activeFilterUpcoming,
    activeFilterAssignedTo,
    activeFilterSupplier,
    activeFilterProductRef,
    activeColumnNameFilter,
    selectedFlowIds,
    fetchFilteredBoards,
    fetchSelectedBoards,
  ]);

  // ===========================================================================
  // 🎯 EFEITO INICIAL
  // ===========================================================================
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // ===========================================================================
  // 🎯 FUNÇÃO DE AVANÇAR ITEM
  // ===========================================================================
  const handleAdvanceItem = async (item: FlowItem) => {
    // toast.loading("Avançando item...", { id: "advance-toast" });

    try {
      await api.post(`/flow/items/${item.id}/advance`);

      // toast.success(`Item "${item.title}" movido para próxima etapa!`, {
      //   id: "advance-toast",
      // });

      setIsPreviewModal(false);
      setIsEditItemModal(false);

      const hasFilters =
        activeFilterStartDate ||
        activeFilterEndDate ||
        activeFilterOverdue ||
        activeFilterUpcoming ||
        activeColumnNameFilter;

      if (hasFilters) {
        await fetchFilteredBoards();
      } else {
        await fetchSelectedBoards();
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Erro ao mover item.";
      // toast.error(errorMsg, { id: "advance-toast" });
      console.log(errorMsg);
    }
  };

  const handleCreateFlow = async () => {
    if (!flowName.trim()) return toast.error("Nome obrigatório");

    try {
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
    } catch {
      toast.error("Erro ao criar fluxo");
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
      fetchSelectedBoards();
    } catch {
      toast.error("Erro ao aplicar template");
    }
  };

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

      const hasFilters =
        activeFilterStartDate ||
        activeFilterEndDate ||
        activeFilterOverdue ||
        activeFilterUpcoming ||
        activeColumnNameFilter;
      if (hasFilters) {
        await fetchFilteredBoards();
      } else {
        await fetchSelectedBoards();
      }
    } catch {
      toast.error("Erro ao excluir");
    } finally {
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

  // ===========================================================================
  // 🎯 FUNÇÃO DE SUBMIT DO ITEM (CRIAÇÃO/EDIÇÃO) - CORRIGIDA
  // ===========================================================================
  // ===========================================================================
  // 🎯 FUNÇÃO DE SUBMIT DO ITEM (CRIAÇÃO/EDIÇÃO) - CORRIGIDA
  // ===========================================================================
  const handleItemSubmit = async (
    values: any,
    files: any,
    removedMedia: any,
  ): Promise<void> => {
    // ===========================================================================
    // 🔥 LOG 1: INÍCIO DO PROCESSO
    // ===========================================================================
    console.log("\n");
    console.log("=".repeat(80));
    console.log("🎯 [handleItemSubmit] INICIANDO SUBMIT DO ITEM");
    console.log("=".repeat(80));
    console.log("📦 Modo:", editingItem ? "EDIÇÃO" : "CRIAÇÃO");
    console.log("📦 Values recebidos:", {
      title: values.title,
      description: values.description,
      productRef: values.productRef,
      quantity: values.quantity,
      status: values.status,
      flowId: values.flowId,
      stageId: values.stageId,
      assignedToId: values.assignedToId,
      supplierId: values.supplierId,
      dueDate: values.dueDate,
      productionStartedAt: values.productionStartedAt,
      deliveryAt: values.deliveryAt,
      orderNumber: values.orderNumber,
      priority: values.priority,
    });
    console.log("📦 Files:", {
      images: files.images?.length || 0,
      audios: files.audios?.length || 0,
      videos: files.videos?.length || 0,
    });
    console.log("📦 Removed Media:", removedMedia);
    console.log("📌 activeStageId:", activeStageId);

    if (selectedFlowIds.length === 0) {
      console.error("❌ Nenhum fluxo selecionado");
      toast.error("Selecione um fluxo");
      return;
    }

    setIsSubmitting(true);

    try {
      // ===========================================================================
      // 🔥 FUNÇÃO DE UPLOAD DE MÍDIA
      // ===========================================================================
      const uploadMedia = async (itemId: string, files: any) => {
        console.log("\n📤 Iniciando upload de mídias para item:", itemId);

        const upload = async (file: File, type: string) => {
          console.log(`📤 Fazendo upload de ${type}:`, {
            nome: file.name,
            tamanho: file.size,
            tipo: file.type,
          });

          const fd = new FormData();
          fd.append("file", file);

          try {
            const response = await api.post(
              `/flow/items/${itemId}/media/${type}`,
              fd,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            );
            console.log(`✅ Upload de ${type} concluído:`, response.data);
            return response.data;
          } catch (error) {
            console.error(`❌ Erro no upload de ${type}:`, error);
            throw error;
          }
        };

        const promises = [];

        if (files.images?.length > 0) {
          console.log(`📸 ${files.images.length} imagem(ns) para upload`);
          for (const f of files.images) {
            promises.push(upload(f, "image"));
          }
        }

        if (files.audios?.length > 0) {
          console.log(`🎵 ${files.audios.length} áudio(s) para upload`);
          for (const f of files.audios) {
            promises.push(upload(f, "audio"));
          }
        }

        if (files.videos?.length > 0) {
          console.log(`🎬 ${files.videos.length} vídeo(s) para upload`);
          for (const f of files.videos) {
            promises.push(upload(f, "video"));
          }
        }

        if (promises.length > 0) {
          console.log(`⏳ Aguardando ${promises.length} upload(s)...`);
          const results = await Promise.all(promises);
          console.log("✅ Todos os uploads concluídos:", results.length);
          return results;
        }

        console.log("📭 Nenhuma mídia para upload");
        return [];
      };

      // ===========================================================================
      // 🔥 MODO EDIÇÃO
      // ===========================================================================
      if (editingItem) {
        console.log("\n✏️ Modo EDIÇÃO - Item:", editingItem.id);

        // Prepara payload para edição
        const updatePayload = {
          ...values,
          removeImageIds: removedMedia.images,
          removeVideoIds: removedMedia.videos,
          removeAudioIds: removedMedia.audios,
        };

        console.log("📦 Payload de edição:", {
          ...updatePayload,
          removeImageIds: updatePayload.removeImageIds?.length || 0,
          removeVideoIds: updatePayload.removeVideoIds?.length || 0,
          removeAudioIds: updatePayload.removeAudioIds?.length || 0,
        });

        console.log("📡 Enviando PUT para:", `/flow/items/${editingItem.id}`);

        const startTime = Date.now();
        await api.put(`/flow/items/${editingItem.id}`, updatePayload);
        const endTime = Date.now();

        console.log(`✅ Item atualizado em ${endTime - startTime}ms`);

        if (
          files &&
          (files.images?.length > 0 ||
            files.audios?.length > 0 ||
            files.videos?.length > 0)
        ) {
          console.log(
            "\n📤 Fazendo upload de novas mídias para o item editado...",
          );
          await uploadMedia(editingItem.id, files);
        }

        toast.success("Item atualizado com sucesso!");
      }

      // ===========================================================================
      // 🔥 MODO CRIAÇÃO - CORRIGIDO (SEM VALIDAÇÃO COM currentItemStages)
      // ===========================================================================
      else {
        console.log("\n🆕 Modo CRIAÇÃO - Novo Item");

        // 🔥 VALIDAÇÕES MÍNIMAS
        if (!values.flowId) {
          console.error("❌ flowId não informado");
          toast.error("Selecione uma coleção");
          setIsSubmitting(false);
          return;
        }

        if (!values.stageId) {
          console.error("❌ stageId não informado nos values");
          toast.error("Selecione uma etapa");
          setIsSubmitting(false);
          return;
        }

        // 🔥 IMPORTANTE: REMOVIDA a validação com currentItemStages
        // O modal já validou que a stage existe no flow selecionado
        // e buscou o ID correto

        console.log("🔍 VERIFICAÇÃO DE STAGE (validação pelo modal):");
        console.log("   flowId enviado:", values.flowId);
        console.log("   stageId enviado:", values.stageId);
        console.log("   activeStageId (ignorado):", activeStageId);
        console.log(
          "   ⚠️ Validação com currentItemStages foi REMOVIDA - confiamos no modal",
        );

        // 🔥 Prepara payload para criação
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

        console.log("\n📡 Enviando POST para /flow/items");
        console.log("📦 Payload completo:", createPayload);

        const startTime = Date.now();

        let response;
        try {
          response = await api.post(`/flow/items`, createPayload);
          console.log("✅ Resposta da API:", response.data);
        } catch (apiError: any) {
          console.error("❌ Erro na requisição:", {
            status: apiError.response?.status,
            statusText: apiError.response?.statusText,
            data: apiError.response?.data,
            message: apiError.message,
          });
          throw apiError;
        }

        const endTime = Date.now();
        const newItem = response.data;

        console.log(`✅ Item criado em ${endTime - startTime}ms:`, {
          id: newItem.id,
          title: newItem.title,
          stageId: newItem.stageId,
          flowId: newItem.flowId,
        });

        // Upload de mídias se houver
        if (
          newItem?.id &&
          files &&
          (files.images?.length > 0 ||
            files.audios?.length > 0 ||
            files.videos?.length > 0)
        ) {
          console.log("\n📤 Fazendo upload de mídias para o novo item...");
          await uploadMedia(newItem.id, files);
        }

        toast.success("Item criado com sucesso!");
      }

      // ===========================================================================
      // 🔥 LIMPEZA DE ESTADOS
      // ===========================================================================
      console.log("\n🧹 Limpando estados e fechando modais...");

      setIsItemModal(false);
      setIsEditItemModal(false);
      setEditingItem(null);
      setCurrentItemStages([]);
      setActiveStageId(null);

      // ===========================================================================
      // 🔥 ATUALIZAÇÃO DO BOARD
      // ===========================================================================
      const hasFilters =
        activeFilterStartDate ||
        activeFilterEndDate ||
        activeFilterOverdue ||
        activeFilterUpcoming ||
        activeColumnNameFilter;

      console.log("🔍 Verificando filtros ativos:", {
        activeFilterStartDate,
        activeFilterEndDate,
        activeFilterOverdue,
        activeFilterUpcoming,
        activeColumnNameFilter,
        hasFilters,
      });

      console.log("🔄 Atualizando board...");

      const boardStartTime = Date.now();

      if (hasFilters) {
        console.log("📊 Aplicando filtros antes de atualizar...");
        await fetchFilteredBoards();
      } else {
        console.log("📊 Buscando boards selecionados...");
        await fetchSelectedBoards();
      }

      const boardEndTime = Date.now();
      console.log(`✅ Board atualizado em ${boardEndTime - boardStartTime}ms`);

      console.log("\n🎯 [handleItemSubmit] FINALIZADO COM SUCESSO");
      console.log("=".repeat(80));
      console.log("\n");
    } catch (error: any) {
      // ===========================================================================
      // 🔥 TRATAMENTO DE ERROS
      // ===========================================================================
      console.error("\n");
      console.error("=".repeat(80));
      console.error("❌ [handleItemSubmit] ERRO");
      console.error("=".repeat(80));
      console.error("Detalhes do erro:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data ? JSON.parse(error.config.data) : null,
        },
      });

      // Mensagens de erro amigáveis
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
      } else if (error.response?.status === 404) {
        errorMessage = "Recurso não encontrado.";
      } else if (error.response?.status === 500) {
        errorMessage = "Erro interno do servidor. Tente novamente mais tarde.";
      }

      // 🔥 LOG DO ERRO MAS NÃO BLOQUEIA COM MENSAGEM ESPECÍFICA
      if (error.response?.data?.message?.includes("Etapa inválida")) {
        console.error("🔍 ERRO DO BACKEND: Etapa inválida");
        console.error("   - flowId enviado:", values?.flowId);
        console.error("   - stageId enviado:", values?.stageId);
        console.error("   - activeStageId:", activeStageId);
        console.error(
          "   ⚠️ Isso indica que o modal não encontrou o ID correto",
        );
      }

      // toast.error(errorMessage);

      console.error("=".repeat(80));
      console.error("\n");
    } finally {
      setIsSubmitting(false);
      console.log("🏁 isSubmitting set to false");
    }
  };

  // E modifique o useMemo do unifiedStages para incluir refreshKey
  const unifiedStages = useMemo(() => {
    console.log("🔄 Recalculando unifiedStages com refreshKey:", refreshKey);

    // 🔥 Agrupa por nome da coluna, mas preserva os items com suas cores originais
    const stageGroups: Record<string, FlowStage> = {};

    boards.forEach((board) => {
      const flowColor = board.color || "#D35400";
      const flowName = board.name;

      board.stages.forEach((stage) => {
        const key = stage.name.toUpperCase(); // Agrupa por nome maiúsculo

        // Se o grupo ainda não existe, cria com os dados da primeira stage
        if (!stageGroups[key]) {
          stageGroups[key] = {
            id: stage.id, // Usa o ID da primeira stage (pode ser qualquer um)
            name: stage.name,
            order: stage.order,
            color: stage.color,
            allowedRole: stage.allowedRole,
            flowId: board.id,
            items: [], // Começa vazio
          };
        }

        // 🔥 Adiciona os itens deste flow ao grupo, com a cor do flow preservada
        const itemsWithMetadata = stage.items.map((item) => ({
          ...item,
          flowColor, // 🔥 COR DA COLEÇÃO ORIGINAL
          flowName, // 🔥 NOME DA COLEÇÃO ORIGINAL
          _originalStageId: item.stageId,
          _originalFlowId: board.id,
        }));

        stageGroups[key].items.push(...itemsWithMetadata);
      });
    });

    // Ordena as stages por ordem
    const result = Object.values(stageGroups).sort((a, b) => a.order - b.order);

    console.log("✅ unifiedStages calculado:", result.length, "colunas");

    // Log para verificar as cores dos itens
    result.forEach((stage) => {
      stage.items.forEach((item) => {
        console.log(`📦 Item ${item.id} - ${item.title}:`, {
          flowColor: item.flowColor,
          flowName: item.flowName,
          stage: stage.name,
        });
      });
    });

    return result;
  }, [boards, refreshKey]);

  // ===========================================================================
  // 🔥 HOOK DE DRAG
  // ===========================================================================
  const { moveItem, onDragStart, executeMove } = useKanbanDrag({
    items: unifiedStages.flatMap((s) => s.items),
    setItems: () => {},
    idField: "stageId",

    // 🔥 Callback de movimento simplificado
    moveCallback: async (itemId, newStageId, responsibleId, type) => {
      console.log("🎯 [moveCallback] Iniciando movimento:", {
        itemId,
        newStageId,
        responsibleId,
        type,
      });

      const payload: any = { newStageId };

      if (type === "supplier") {
        payload.supplierId = responsibleId;
      } else if (type === "user") {
        payload.assignedToId = responsibleId;
      }

      try {
        const response = await api.put(`/flow/items/${itemId}/move`, payload);
        console.log("✅ [moveCallback] Resposta do servidor:", response.data);
        return response.data;
      } catch (error: any) {
        console.error("❌ [moveCallback] Erro:", error);

        console.error("Detalhes do erro:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });

        if (error.response?.status === 500) {
          console.warn(
            "⚠️ [moveCallback] Erro 500 detectado - pode ter sido sucesso no backend",
          );
          return { success: true, warning: "Erro 500 ignorado" };
        }
        throw error;
      }
    },

    onRequireResponsible: (itemId, targetStageId, targetStageName) => {
      console.log("👤 [onRequireResponsible] Requer responsável:", {
        itemId,
        targetStageId,
        targetStageName,
      });

      const targetStage = unifiedStages.find(
        (s) => s.name.toLowerCase() === targetStageName.toLowerCase(),
      );

      if (!targetStage) {
        console.error(
          "❌ [onRequireResponsible] Stage não encontrada:",
          targetStageName,
        );
        return;
      }

      const isOficina = targetStage.name?.trim().toLowerCase() === "oficina";

      if (isOficina) {
        console.log(
          "🏭 [onRequireResponsible] É coluna OFICINA, requer fornecedor",
        );
        setDragItemId(itemId);
        setDragTargetStage({
          id: targetStageId,
          name: targetStage.name,
          allowedRole: targetStage.allowedRole,
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
        console.log(
          `👤 [onRequireResponsible] Requer cargo: ${targetStage.allowedRole}`,
        );
        setDragItemId(itemId);
        setDragTargetStage({
          id: targetStageId,
          name: targetStage.name,
          allowedRole: targetStage.allowedRole,
        });
        setIsDragModalOpen(true);
      } else {
        console.log(
          "✅ [onRequireResponsible] Sem restrição, movendo diretamente",
        );
        executeMove(itemId, targetStageId);
      }
    },

    onMoveSuccess: async () => {
      console.log("🔄 [onMoveSuccess] Movimento concluído com sucesso!");

      const hasFilters =
        activeFilterStartDate ||
        activeFilterEndDate ||
        activeFilterOverdue ||
        activeFilterUpcoming ||
        activeColumnNameFilter;

      console.log("📊 [onMoveSuccess] Verificando filtros:", { hasFilters });

      try {
        if (hasFilters) {
          console.log(
            "📊 [onMoveSuccess] Aplicando filtros antes de atualizar...",
          );
          await fetchFilteredBoards();
        } else {
          console.log("📊 [onMoveSuccess] Buscando boards selecionados...");
          await fetchSelectedBoards();
        }

        setRefreshKey((prev) => prev + 1);
        console.log("✅ [onMoveSuccess] Boards recarregados com sucesso!");
      } catch (error) {
        console.error("❌ [onMoveSuccess] Erro ao recarregar boards:", error);
      }
    },

    onMoveError: (error) => {
      console.error("❌ [onMoveError] Erro no movimento:", error);

      let errorMessage = "Erro ao mover item";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // toast.error(errorMessage, {
      //   description: "Tente novamente ou atualize a página",
      // });
    },
  });

  const handleDragWithResponsible = async (
    responsibleId: string,
    type: "user" | "supplier",
    quantity?: number, // 🔥 RECEBE QUANTIDADE DO MODAL
  ) => {
    if (!dragItemId || !dragTargetStage) return;

    // toast.loading("Movendo item...", { id: "drag-move" });

    try {
      // 🔥 PASSO 1: Se tiver quantidade, atualizar o item primeiro
      if (quantity !== undefined) {
        console.log(`📝 [DRAG] Atualizando quantidade para: ${quantity}`);
        await api.put(`/flow/items/${dragItemId}`, {
          quantity: quantity,
        });
      }

      // 🔥 PASSO 2: Mover o item com os parâmetros
      console.log(`🎯 [DRAG] Movendo item para: ${dragTargetStage.name}`, {
        responsibleId,
        type,
      });

      await executeMove(dragItemId, dragTargetStage.id, responsibleId, type);

      // toast.success(`Item movido para "${dragTargetStage.name}"!`, {
      //   id: "drag-move",
      // });

      setIsDragModalOpen(false);
      setDragItemId(null);
      setDragTargetStage(null);

      // 🔥 PASSO 3: Recarregar boards
      const hasFilters =
        activeFilterStartDate ||
        activeFilterEndDate ||
        activeFilterOverdue ||
        activeFilterUpcoming ||
        activeColumnNameFilter;

      if (hasFilters) {
        await fetchFilteredBoards();
      } else {
        await fetchSelectedBoards();
      }
    } catch (error: any) {
      console.error("❌ [DRAG] Erro ao mover item:", error);

      let errorMsg = "Erro ao mover item.";

      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }

      // toast.error(errorMsg, { id: "drag-move" });
    }
  };

  const toggleFlow = (id: string) =>
    setSelectedFlowIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );

  if (loading && boards.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F0E6]">
        <Loader2 className="animate-spin text-[#D35400]" size={32} />
      </div>
    );
  }

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

  return (
    <KanbanLayout>
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
        // Novas props para o seletor de fluxos
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
      <KanbanFilter>
  <div className="grid gap-1 min-w-[180px]">
    <label className="text-[10px] uppercase font-bold text-slate-400">
      Filtrar por Coluna
    </label>
    <div className="relative">
      <Input
        type="text"
        placeholder="Nome da coluna (ex: Corte)"
        className="h-8 text-xs pl-8"
        value={columnNameFilter}
        onChange={(e) => setColumnNameFilter(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleFilterClick();
          }
        }}
      />
      <Layers className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
    </div>
  </div>

  <div className="grid gap-1 min-w-[140px]">
    <label className="text-[10px] uppercase font-bold text-slate-400">
      Responsável
    </label>
    <select
      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
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
    <label className="text-[10px] uppercase font-bold text-slate-400">
      Oficina
    </label>
    <select
      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
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
    <label className="text-[10px] uppercase font-bold text-slate-400">
      Referência do Produto
    </label>
    <div className="relative">
      <Input
        type="text"
        placeholder="Buscar por ref..."
        className="h-8 text-xs pl-8"
        value={tempFilterProductRef}
        onChange={(e) => setTempFilterProductRef(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleFilterClick();
          }
        }}
      />
      <Package className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
    </div>
  </div>

  <div className="flex items-end gap-2">
    <Button
      size="sm"
      variant={tempFilterOverdue ? "destructive" : "outline"}
      className={`h-8 text-xs ${
        tempFilterOverdue ? "bg-red-500 text-white hover:bg-red-600" : ""
      }`}
      onClick={toggleOverdueFilter}
    >
      <AlertTriangle className="w-3 h-3 mr-2" />
      Atrasados
    </Button>

    <Button
      size="sm"
      variant={tempFilterUpcoming ? "default" : "outline"}
      className={`h-8 text-xs ${
        tempFilterUpcoming 
          ? "bg-orange-600 text-white hover:bg-orange-700" 
          : ""
      }`}
      onClick={toggleUpcomingFilter}
    >
      <Clock className="w-3 h-3 mr-2" />
      Próximos a vencer ( 7 dias )
    </Button>
  </div>

  <div className="flex items-center gap-2">
    <Button
      size="sm"
      variant="default"
      className="h-8 text-xs min-w-[100px] bg-orange-600 hover:bg-orange-700"
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
        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
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
      className="h-8 text-xs text-slate-400 hover:text-red-500"
      onClick={() =>
        setActiveColumnFilter({ columnId: null, filterType: null })
      }
    >
      <X className="w-3 h-3 mr-1" />
      Limpar Filtro da Coluna
    </Button>
  )}
</KanbanFilter>
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
              onDropItem={(itemId) => {
                const allItems = unifiedStages.flatMap((s) => s.items);
                const draggingItem = allItems.find((i) => i.id === itemId);

                if (!draggingItem) {
                  console.error("❌ Item não encontrado:", itemId);
                  return;
                }

                console.log("🎯 Drop - Item sendo movido:", {
                  itemId: draggingItem.id,
                  title: draggingItem.title,
                  flowName: draggingItem.flowName,
                  flowColor: draggingItem.flowColor,
                  currentStage: draggingItem.stageId,
                  targetStageName: stage.name,
                });

                // 🔥 Busca o board do flow ORIGINAL do item
                const itemBoard = boards.find(
                  (b) => b.id === draggingItem.flowId,
                );

                if (!itemBoard) {
                  console.error(
                    "❌ Board do item não encontrado:",
                    draggingItem.flowId,
                  );
                  return;
                }

                // Encontra a stage com o mesmo nome no flow original
                const correctStage = itemBoard.stages.find(
                  (s) => s.name.toUpperCase() === stage.name.toUpperCase(),
                );

                if (!correctStage) {
                  console.error("❌ Stage não encontrada no flow original:", {
                    stageName: stage.name,
                    flowName: itemBoard.name,
                    availableStages: itemBoard.stages.map((s) => s.name),
                  });
                  return;
                }

                const targetStageId = correctStage.id;

                console.log("✅ Drop - Stage encontrada:", {
                  targetStageId,
                  targetStageName: correctStage.name,
                  flowName: itemBoard.name,
                });

                moveItem(itemId, targetStageId, stage.name);
              }}
              onAddItem={
                hasPermission ? () => handleCreateItem(stage.id) : undefined
              }
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
                      Filtrando: Atrasados (dueDate &lt; hoje)
                    </>
                  ) : (
                    <>
                      <Clock size={10} />
                      Filtrando: Iniciam hoje (productionStartedAt = hoje)
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

              {filteredItems.map((item) => {
                console.log("Renderizando card:", {
                  id: item.id,
                  title: item.title,
                  flowColor: item.flowColor,
                  flowName: item.flowName,
                  stageId: item.stageId,
                });
                return (
                  <KanbanCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    subtitle={item.productRef}
                    // 🔥 CORRIGIDO: Usar a cor da coleção do item, não da coluna
                    priorityColor={item.flowColor}
                    coverImage={item.images[0]?.url}
                    onDragStart={
                      hasPermission
                        ? (e) => {
                            onDragStart(e, item.id);
                          }
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
                        {/* 🔥 AQUI TAMBÉM ESTÁ CORRETO - usa item.flowColor */}
                        <div
                          className="px-2 py-0.5 rounded-full text-[8px] font-bold text-white uppercase"
                          style={{ backgroundColor: item.flowColor }}
                        >
                          {item.flowName}
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </KanbanColumn>
          );
        })}
      </KanbanBoard>
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
        // 🔥 Passa a função de busca
        fetchStagesForFlow={async (flowId) => {
          try {
            const response = await api.get(`/flow/${flowId}/stages`);
            return response.data;
          } catch (error) {
            console.error("Erro ao buscar stages:", error);
            return [];
          }
        }}
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
        // 🔥 NOVA PROP: indica se tem múltiplos fluxos selecionados
        hasMultipleFlows={selectedFlowIds.length > 1}
        onFlowChange={async (flowId) => {
          try {
            console.log("🔄 Buscando stages para flow:", flowId);

            setActiveStageId(null);

            const response = await api.get(`/flow/${flowId}/stages`);
            console.log("✅ Stages carregadas:", response.data.length);

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
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      />
      <CompleteStageModal
        isOpen={isDragModalOpen}
        onClose={() => {
          setIsDragModalOpen(false);
          setDragItemId(null);
          setDragTargetStage(null);
        }}
        onConfirm={handleDragWithResponsible} // 🔥 Agora passa quantity
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
          // 🔥 Passa a quantidade atual do item
          unifiedStages.flatMap((s) => s.items).find((i) => i.id === dragItemId)
            ?.quantity
        }
      />
      {/* 🔥 ALERT DIALOG SIMPLES */}
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

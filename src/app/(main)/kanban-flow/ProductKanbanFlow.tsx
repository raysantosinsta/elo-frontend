/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useCompanySettings } from "@/hooks/use-company-settings"; // 🔥 NOVO

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
// import { useProductRefPermission } from "@/hooks/use-product-ref-permission";

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
  flowId: string; // 🔥 ADICIONAR ESTE CAMPO
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
  // const { canManageRef, canViewRef } = useProductRefPermission();

  // 🔥 NOVO: Buscar configuração da empresa
  const {
    data: companySettings,
    isLoading: loadingSettings,
    refetch: refetchSettings,
  } = useCompanySettings(user?.company?.id || "");

  // 🔥 ADICIONE ESTE LOG
  console.log("🔍 [ProductFlowKanban] Company Settings:", {
    companyId: user?.company?.id,
    companySettings,
    notificationDays: companySettings?.notificationDays ?? 7,
    loadingSettings,
  });

  const notificationDays = companySettings?.notificationDays ?? 7; // fallback 7

  // 🔥 EFEITO PARA LOGAR QUANDO O VALOR MUDAR
  useEffect(() => {
    console.log(
      "🔍 [ProductFlowKanban] notificationDays mudou para:",
      notificationDays,
    );
  }, [notificationDays]);

  // 🔥 FORÇAR ATUALIZAÇÃO DOS FILTROS QUANDO notificationDays MUDAR
  useEffect(() => {
    if (tempFilterUpcoming && notificationDays) {
      // Se o filtro upcoming estiver ativo, recalcular as datas
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

      // Reaplicar o filtro
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
    isAfterCorte: boolean; // 🔥 MUDOU DE isAfterDistribuicao PARA isAfterCorte
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
    isAfterCorte?: boolean; // 🔥 MUDOU DE isAfterDistribuicao PARA isAfterCorte
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

  const [refreshKey, setRefreshKey] = useState(0);

  // Verifica se a condição para mostrar o toast já foi disparada
  const [hasShownEmptyRefToast, setHasShownEmptyRefToast] = useState(false);
  // Adicione este useState no início do seu componente (antes do handleCreateFlow)
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  // Adicione este useState para armazenar as opções de colunas
  const [columnOptions, setColumnOptions] = useState<string[]>([]);

  // ===========================================================================
  // 🎯 ESTADO PARA ITENS AGUARDANDO REMOÇÃO (3 segundos)
  // ===========================================================================
  const [itemsPendingRemoval, setItemsPendingRemoval] = useState<Set<string>>(
    new Set(),
  );

  const [stageDefaultDays, setStageDefaultDays] = useState<number>(1); // 🔥 NOVO ESTADO

  const [openColumnSelector, setOpenColumnSelector] = useState(false);

  // ===========================================================================
  // 🔥 FUNÇÃO AUXILIAR PARA VERIFICAR SE ESTÁ APÓS CORTE
  // ===========================================================================
  const checkIfIsAfterCorte = (stageId: string, flowId: string): boolean => {
    // 1. Encontra o board do fluxo específico
    const board = boards.find((b) => b.id === flowId);
    if (!board) {
      console.warn(`⚠️ Board não encontrado para flowId: ${flowId}`);
      return false;
    }

    // 2. Ordena todas as etapas do fluxo
    const sortedStages = [...board.stages].sort((a, b) => a.order - b.order);

    console.log(
      `📊 [checkIfIsAfterCorte] Stages do fluxo ${flowId}:`,
      sortedStages.map((s) => ({ id: s.id, name: s.name, order: s.order })),
    );

    // 3. Palavras-chave para identificar a etapa de Corte
    const CORTE_KEYWORDS = ["corte", "cortador", "cortar", "cut"];

    // 4. Encontra o índice da etapa de Corte
    const corteIndex = sortedStages.findIndex((stage) =>
      CORTE_KEYWORDS.some((keyword) =>
        stage.name.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );

    // Se não encontrar etapa de Corte, retorna false
    if (corteIndex === -1) {
      console.log(`ℹ️ Nenhuma etapa de Corte encontrada no fluxo ${flowId}`);
      return false;
    }

    // 5. Encontra o índice da etapa que estamos verificando
    const stageIndex = sortedStages.findIndex((s) => s.id === stageId);

    // Se não encontrar a etapa, retorna false
    if (stageIndex === -1) {
      console.warn(`⚠️ Stage ${stageId} não encontrada no fluxo ${flowId}`);
      return false;
    }

    const isAfter = stageIndex > corteIndex;

    console.log(`📊 [checkIfIsAfterCorte] Resultado:`, {
      stageName: sortedStages[stageIndex].name,
      corteName: sortedStages[corteIndex].name,
      stageIndex,
      corteIndex,
      isAfter,
    });

    return isAfter;
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

    // 🔥 Não precisa mais forçar refresh aqui
    // O unifiedStages já depende de itemsPendingRemoval
  }, [itemsPendingRemoval]); // Apenas log, sem setRefreshKey

  const startItemRemovalTimer = (itemId: string) => {
    console.log(
      `⏰ [${new Date().toISOString()}] Iniciando contagem de 3 segundos para remover item ${itemId}`,
    );

    // 🔥 Salva o status atual do item para debug
    const currentItem = unifiedStages
      .flatMap((s) => s.items)
      .find((i) => i.id === itemId);
    console.log(`📊 Status atual do item:`, {
      id: currentItem?.id,
      title: currentItem?.title,
      status: currentItem?.status,
      stageId: currentItem?.stageId,
    });

    // 🔥 Adiciona item ao set de pendentes
    setItemsPendingRemoval((prev) => {
      console.log(
        `📋 [${new Date().toISOString()}] itemsPendingRemoval ANTES:`,
        Array.from(prev),
      );
      const newSet = new Set(prev);
      newSet.add(itemId);
      console.log(
        `📋 [${new Date().toISOString()}] itemsPendingRemoval DEPOIS:`,
        Array.from(newSet),
      );
      return newSet;
    });

    // Timer para remover após 3 segundos
    setTimeout(() => {
      console.log(
        `✅ [${new Date().toISOString()}] Removendo item ${itemId} da tela após 3 segundos`,
      );

      // 🔥 Verifica o status do item novamente
      const itemAfterDelay = unifiedStages
        .flatMap((s) => s.items)
        .find((i) => i.id === itemId);
      console.log(`📊 Status do item após 3s:`, {
        id: itemAfterDelay?.id,
        title: itemAfterDelay?.title,
        status: itemAfterDelay?.status,
        stageId: itemAfterDelay?.stageId,
      });

      // 🔥 Remove do set
      setItemsPendingRemoval((prev) => {
        console.log(
          `📋 [${new Date().toISOString()}] itemsPendingRemoval ANTES da remoção:`,
          Array.from(prev),
        );
        const newSet = new Set(prev);
        newSet.delete(itemId);
        console.log(
          `📋 [${new Date().toISOString()}] itemsPendingRemoval DEPOIS da remoção:`,
          Array.from(newSet),
        );
        return newSet;
      });
    }, 3000);
  };

  // useEffect para atualizar as opções de coluna quando os boards mudarem
  useEffect(() => {
    // Extrai nomes únicos de colunas de todos os boards
    const uniqueColumnNames = new Set<string>();

    boards.forEach((board) => {
      board.stages.forEach((stage) => {
        uniqueColumnNames.add(stage.name);
      });
    });

    // Converte para array e ordena
    const sortedColumns = Array.from(uniqueColumnNames).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );

    setColumnOptions(sortedColumns);
  }, [boards]);

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

  const handleEditItem = async (item: FlowItem) => {
    console.log("📝 Buscando detalhes completos do item:", item.id);

    setIsModalLoading(true);
    
    try {
      // 1. Busca o item completo no banco para garantir que arrays de vídeos/áudios venham preenchidos
      const response = await api.get(`/flow/items/${item.id}`);
      const fullItemData = response.data;

      // 2. Define o item que será editado com os dados completos (agora com mídias)
      setEditingItem(fullItemData);

      // 3. Busca o board (coleção) correspondente para carregar as etapas
      let itemBoard = boards.find((b) => b.id === fullItemData.flowId);

      if (!itemBoard) {
        console.log("🔄 Board não encontrado localmente, buscando da API...");
        const boardResponse = await api.get(`/flow/${fullItemData.flowId}/board`);
        itemBoard = boardResponse.data;
      }

      if (!itemBoard) {
        throw new Error("Não foi possível encontrar a coleção deste item.");
      }

      // 4. Mapeia as etapas com os dias padrão (defaultDays)
      const stagesWithDefaults = itemBoard.stages.map((stage: any) => ({
        ...stage,
        defaultDays: stage.defaultDays,
      }));

      setCurrentItemStages(stagesWithDefaults);

      // 5. Verifica permissões de edição para a etapa atual
      const currentStage = stagesWithDefaults.find((s) => s.id === fullItemData.stageId);
      setIsModalReadOnly(currentStage ? !canUserEditStage(currentStage) : true);

      // 6. Abre o modal após garantir que todos os dados foram carregados
      setTimeout(() => {
        setIsEditItemModal(true);
        setIsModalLoading(false);
      }, 50);

      console.log("✅ Detalhes carregados. Vídeos encontrados:", fullItemData.videos?.length || 0);

    } catch (error: any) {
      console.error("❌ Erro ao carregar detalhes do item:", error);
      toast.error("Erro ao carregar mídias e detalhes do item.");
      setIsModalLoading(false);
    }
  };

  const handleCreateItem = (stageId: string) => {
    console.log("\n");
    console.log("=".repeat(80));
    console.log("🎯 [handleCreateItem] INÍCIO - Stage clicada:", stageId);
    console.log("=".repeat(80));

    const itemBoard = boards.find((b) =>
      b.stages.some((s) => s.id === stageId),
    );

    if (!itemBoard) {
      console.error("❌ Board não encontrado para stage:", stageId);
      toast.error("Erro ao carregar dados do fluxo");
      return;
    }

    // 🔥 ADICIONA O flowId E defaultDays EM CADA STAGE
    const stagesWithFlowId = itemBoard.stages.map((stage) => ({
      ...stage,
      flowId: itemBoard.id,
      defaultDays: stage.defaultDays, // 🔥 GARANTA QUE ESTÁ AQUI
    }));

    console.log(
      "📋 Stages disponíveis no board:",
      stagesWithFlowId.map((s) => ({
        id: s.id,
        name: s.name,
        flowId: s.flowId,
        defaultDays: s.defaultDays,
      })),
    );

    const clickedStage = stagesWithFlowId.find((s) => s.id === stageId);
    console.log("🎯 Stage clicada:", {
      stageId,
      stageInfo: clickedStage,
      flowId: clickedStage?.flowId,
      defaultDays: clickedStage?.defaultDays,
    });

    setActiveStageId(stageId);
    setCurrentItemStages(stagesWithFlowId);

    setTimeout(() => {
      console.log("⏰ Timeout executado - abrindo modal");
      setIsModalReadOnly(false);
      setIsItemModal(true);
      console.log("✅ Modal aberto");
    }, 50);
  };

  const handleOpenCompleteModal = (item: FlowItem) => {
    const currentBoard = boards.find((b) => b.id === item.flowId);
    if (!currentBoard) {
      toast.error("Fluxo não encontrado.");
      return;
    }

    // 1. Ordena todas as etapas do fluxo para verificar a posição atual
    const allStages = [...currentBoard.stages].sort(
      (a, b) => a.order - b.order,
    );

    const currentIndex = allStages.findIndex((s) => s.id === item.stageId);
    const nextStage = allStages[currentIndex + 1];

    // ===========================================================================
    // 🏁 AJUSTE: LÓGICA PARA A ÚLTIMA ETAPA
    // ===========================================================================
    if (!nextStage) {
      console.log("🏁 Última etapa detectada. Finalizando item...");

      // Chamamos o handleAdvanceItem que agora dispara a conclusão no backend
      // Usamos toast.promise para dar um feedback visual elegante de finalização
      toast.promise(handleAdvanceItem(item), {
        loading: `Finalizando "${item.title}"...`,
        success: () => {
          return `Item "${item.title}" concluído com sucesso!`;
        },
        error: (err) => {
          return err?.response?.data?.message || "Erro ao finalizar item.";
        },
      });
      return; // Encerra aqui, sem abrir o modal de próxima etapa
    }

    // ===========================================================================
    // 🚀 LÓGICA PARA QUANDO EXISTE UMA PRÓXIMA ETAPA (ABRE MODAL)
    // ===========================================================================

    // Palavras-chave para identificação de regras especiais
    const CORTE_KEYWORDS = ["corte", "cortador", "cortar", "cut"];
    const DISTRIBUICAO_KEYWORDS = [
      "distribuição",
      "distribuicao",
      "expedição",
      "expedicao",
    ];

    // Encontra o índice da etapa de CORTE no fluxo
    const corteIndex = allStages.findIndex((s) =>
      CORTE_KEYWORDS.some((keyword) =>
        s.name.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );

    // Verifica se a próxima etapa é Distribuição
    const isDistribuicao = DISTRIBUICAO_KEYWORDS.some((keyword) =>
      nextStage.name.toLowerCase().includes(keyword.toLowerCase()),
    );

    // Regra: Está depois do CORTE? (Usado para validar quantidades/responsáveis)
    const isAfterCorte = corteIndex !== -1 && currentIndex + 1 > corteIndex;

    console.log("🔍 [handleOpenCompleteModal] Preparando modal de avanço:", {
      item: item.title,
      nextStage: nextStage.name,
      isAfterCorte,
      isDistribuicao,
    });

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

  // ===========================================================================
  // 🎯 FUNÇÃO PARA CONCLUIR COM RESPONSÁVEL - CORRIGIDA (ADICIONA QUANTIDADE)
  // ===========================================================================
  const handleCompleteWithResponsible = async (
    responsibleId: string,
    type: "user" | "supplier",
    quantity?: number, // 🔥 ADICIONA O PARÂMETRO QUANTIDADE (OPCIONAL)
  ) => {
    if (!completingItem || !nextStageForCompletion) return;

    const toastId = toast.loading("Concluindo etapa...");

    try {
      // 🔥 PASSO 1: Se tiver quantidade, atualizar o item primeiro
      if (quantity !== undefined) {
        console.log(`📝 [COMPLETE] Atualizando quantidade para: ${quantity}`);
        await api.put(`/flow/items/${completingItem.id}`, {
          quantity: quantity,
        });
      }

      // 🔥 PASSO 2: Mover o item
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
      toast.error(errorMsg, {
        id: toastId,
        duration: 4000,
      });
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

  // ===========================================================================
  // 🔄 FUNÇÕES DE FILTRO POR COLUNA
  // ===========================================================================
  const filterColumnItems = (stage: FlowStage) => {
    // 🔥 O stage já vem filtrado do unifiedStages!
    let items = stage.items;

    // 🔥 FILTRO 2: Se tiver filtro ativo na coluna (overdue/upcoming)
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
  // 🔄 FUNÇÕES DE FILTRO GLOBAL (AJUSTADO PARA MÚLTIPLOS FLUXOS)
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

    // Parâmetros de Fluxo
    const flowIdParam = searchParams.get("flowId");
    const flowIdsParam = searchParams.get("flowIds");

    // 1. Resolve os IDs da URL
    let idsFromUrl: string[] = [];
    if (flowIdsParam) {
      idsFromUrl = flowIdsParam.split(",").filter(Boolean);
    } else if (flowIdParam) {
      idsFromUrl = [flowIdParam];
    }

    console.log("🔍 [useEffect URL] Parâmetros detectados:", {
      filter: filterParam,
      flowIds: idsFromUrl,
      stage: stageNameParam,
    });

    // --- 1. Lógica de Seleção de Fluxos (Com trava de comparação profunda para evitar loops) ---
    if (idsFromUrl.length > 0) {
      setSelectedFlowIds((prev) => {
        // Verifica se os arrays são iguais para evitar re-render desnecessário e loop
        const isSame =
          prev.length === idsFromUrl.length &&
          prev.every((id, idx) => id === idsFromUrl[idx]);

        if (isSame) return prev;

        console.log(
          "✅ [useEffect URL] Atualizando selectedFlowIds para:",
          idsFromUrl,
        );
        return idsFromUrl;
      });
    }

    // --- 2. Sincronização de Filtros de Status (Overdue/Upcoming) ---
    const isOverdue = filterParam === "overdue";
    const isUpcoming = filterParam === "upcoming";

    setTempFilterOverdue(isOverdue);
    setActiveFilterOverdue(isOverdue);
    setTempFilterUpcoming(isUpcoming);
    setActiveFilterUpcoming(isUpcoming);

    // --- 3. Configuração de Datas e Tipos ---
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

    // --- 4. Filtros de Entidades e Referências ---
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

    console.log("✅ [useEffect URL] Estados sincronizados com a URL.");
  }, [searchParams, setSelectedFlowIds]);

  const fetchSelectedBoards = useCallback(async () => {
    console.log(
      `📡 [${new Date().toISOString()}] fetchSelectedBoards INICIADO`,
    );

    if (selectedFlowIds.length === 0) {
      console.log("⚠️ Nenhum fluxo selecionado");
      setBoards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const validFlowIds = selectedFlowIds.filter((id) =>
        flows.some((flow) => flow.id === id),
      );

      if (validFlowIds.length === 0) {
        console.log("⚠️ Nenhum fluxo válido");
        setBoards([]);
        setLoading(false);
        return;
      }

      console.log("📡 Buscando boards:", validFlowIds);
      const promises = validFlowIds.map((id) => api.get(`/flow/${id}/board`));

      const results = await Promise.all(promises);
      const newBoards = results.map((r) => r.data);

      // 🔥 ADICIONE ESTE LOG DETALHADO
      console.log("🔍 DEBUG - DETALHES DOS BOARDS:");
      newBoards.forEach((board) => {
        console.log(`Board: ${board.name}`);
        board.stages.forEach((stage: any) => {
          console.log(
            `  Stage: ${stage.name} - defaultDays: ${stage.defaultDays}`,
          );
        });
      });

      // 🔥 Log detalhado dos itens
      console.log(`📊 [${new Date().toISOString()}] NOVOS BOARDS CARREGADOS:`);
      newBoards.forEach((board) => {
        console.log(`  Board: ${board.name}`);
        board.stages.forEach((stage: any) => {
          console.log(`    Stage: ${stage.name} (${stage.items.length} itens)`);
          stage.items.forEach((item: any) => {
            console.log(
              `      - Item ${item.id}: ${item.title} | status: ${item.status}`,
            );
          });
        });
      });

      setBoards(newBoards);
      console.log(
        `✅ [${new Date().toISOString()}] fetchSelectedBoards CONCLUÍDO`,
      );
    } catch (error: any) {
      console.error("❌ Erro ao carregar quadros:", error);
      toast.error("Erro ao carregar quadros");
    } finally {
      setLoading(false);
    }
  }, [selectedFlowIds, flows]);

  const fetchFilteredBoards = useCallback(
    async (paramsFromUrl?: URLSearchParams) => {
      console.log("\n" + "=".repeat(80));
      console.log("🚀 [fetchFilteredBoards] INICIANDO");
      console.log("=".repeat(80));

      if (selectedFlowIds.length === 0) {
        console.log("⚠️ Nenhum fluxo selecionado");
        setBoards([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setIsFiltering(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error("❌ Timeout após 15 segundos");
        controller.abort();
      }, 15000);

      try {
        const params =
          paramsFromUrl || new URLSearchParams(window.location.search);

        // Sincronização de estados de filtro (UI)
        const startDate = params.get("startDate");
        const endDate = params.get("endDate");
        const filter = params.get("filter");
        const stageName = params.get("stageName");

        setActiveFilterOverdue(filter === "overdue");
        setActiveFilterUpcoming(filter === "upcoming");
        setActiveColumnNameFilter(stageName || "");

        // Preparação da Query API
        const baseQueryParams = new URLSearchParams();
        if (startDate)
          baseQueryParams.set("startDate", new Date(startDate).toISOString());
        if (endDate)
          baseQueryParams.set("endDate", new Date(endDate).toISOString());
        if (params.get("dateType"))
          baseQueryParams.set("dateType", params.get("dateType")!);
        if (filter === "overdue") baseQueryParams.set("isOverdue", "true");
        if (filter === "upcoming") baseQueryParams.set("isUpcoming", "true");
        if (params.get("assignedToId") && params.get("assignedToId") !== "all")
          baseQueryParams.set("assignedToId", params.get("assignedToId")!);
        if (params.get("supplierId") && params.get("supplierId") !== "all")
          baseQueryParams.set("supplierId", params.get("supplierId")!);
        if (params.get("productRef"))
          baseQueryParams.set("productRef", params.get("productRef")!);
        if (stageName) baseQueryParams.set("stageName", stageName.trim());

        console.log("📡 Buscando dados para IDs:", selectedFlowIds);

        // Criamos as promises para TODOS os fluxos selecionados
        const boardsPromises = selectedFlowIds.map(async (flowId) => {
          try {
            const url = `/flow/${flowId}/filtered-board?${baseQueryParams.toString()}`;
            const response = await api.get(url, { signal: controller.signal });
            return response.data;
          } catch (error: any) {
            console.error(
              `❌ Erro no board ${flowId}, buscando board original como fallback.`,
            );
            // Fallback: busca o board limpo para garantir que a coluna apareça
            const fallback = await api.get(`/flow/${flowId}/board`);
            return {
              ...fallback.data,
              stages: fallback.data.stages.map((s: any) => ({
                ...s,
                items: [],
              })),
            };
          }
        });

        const results = await Promise.all(boardsPromises);
        const finalBoards = results.filter(Boolean);

        console.log(
          `✅ [fetchFilteredBoards] Finalizado. Processados ${finalBoards.length} de ${selectedFlowIds.length}`,
        );
        setBoards(finalBoards);
      } catch (error: any) {
        console.error("❌ Erro crítico no fetchFilteredBoards:", error);
        toast.error("Erro ao aplicar filtros");
        await fetchSelectedBoards(); // Fallback para visualização sem filtros
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        setIsFiltering(false);
      }
    },
    [selectedFlowIds, fetchSelectedBoards],
  );

  // ===========================================================================
  // 🔥 FUNÇÃO PARA ATUALIZAR BOARDS APÓS ALTERAÇÃO DE PRAZOS
  // ===========================================================================
  const refreshBoardsAfterDeadlineUpdate = useCallback(async () => {
    console.log("🔄 [refreshBoardsAfterDeadlineUpdate] Atualizando boards...");

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

    setRefreshKey((prev) => prev + 1);
  }, [
    activeFilterStartDate,
    activeFilterEndDate,
    activeFilterOverdue,
    activeFilterUpcoming,
    activeColumnNameFilter,
    fetchFilteredBoards,
    fetchSelectedBoards,
  ]);

  // ===========================================================================
  // 🔥 FUNÇÃO handleFilterClick
  // ===========================================================================
  const handleFilterClick = async () => {
    console.log("🔍 [handleFilterClick] INICIADO", {
      tempFilterUpcoming,
      notificationDays,
      // tempFilterExactDate,
      tempFilterStartDate,
      tempFilterEndDate,
    });

    setIsFiltering(true);

    const params = new URLSearchParams();

    if (columnNameFilter && columnNameFilter.trim() !== "") {
      params.set("stageName", columnNameFilter.trim());
    }

    // Se o filtro de próximos 7 dias estiver ativo, sempre usa dueDate
    if (tempFilterUpcoming) {
      const today = new Date();
      const notificationLimit = new Date(today);
      notificationLimit.setDate(today.getDate() + notificationDays);

      const todayStr = today.toISOString().split("T")[0];
      const limitStr = notificationLimit.toISOString().split("T")[0];

      console.log("📅 [handleFilterClick] FILTRO UPCOMING:", {
        notificationDays,
        todayStr,
        limitStr,
      });

      params.set("startDate", todayStr);
      params.set("endDate", limitStr);
      params.set("filter", "upcoming");

      console.log("🔍 Parâmetros do filtro:", params.toString());
      router.push(`?${params.toString()}`);
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
      setTempFilterDateType("dueDate");

      // 🔥 USAR UTC para evitar problemas de fuso
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

      console.log("📅 [toggleUpcomingFilter] DATAS UTC:", {
        notificationDays,
        todayStr,
        limitStr,
      });

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

      // 🔥 TRAVA AQUI: Só seleciona o padrão se NÃO houver nada na URL
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
  }, [user?.company?.id, searchParams]); // Adicione searchParams aqui

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

      // 🔥 FORÇAR RECARREGAMENTO COMPLETO
      await fetchSelectedBoards(); // Isso vai buscar os novos IDs das etapas criadas
    } catch {
      toast.error("Erro ao aplicar template");
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    try {
      await api.delete(`/flow/${flowId}`);

      // 1. Remove da lista de fluxos
      setFlows((prev) => prev.filter((f) => f.id !== flowId));

      // 2. Remove dos selecionados
      setSelectedFlowIds((prev) => {
        const newSelectedIds = prev.filter((id) => id !== flowId);

        // 3. Se não houver mais fluxos, limpa os boards
        if (newSelectedIds.length === 0) {
          setBoards([]);
          setLoading(false);
        }

        return newSelectedIds;
      });

      toast.success("Fluxo removido");
    } catch (error) {
      toast.error("Erro ao excluir fluxo");
      console.error(error);
      throw error;
    }
  };

  // E no handleDeleteExecute:
  const handleDeleteExecute = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    try {
      const { type, id } = itemToDelete;

      if (type === "stage" && flows.some((f) => f.id === id)) {
        // É um fluxo
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

        // Recarrega os boards após excluir item/stage
        const hasFilters =
          activeFilterStartDate ||
          activeFilterEndDate ||
          activeFilterOverdue ||
          activeFilterUpcoming ||
          activeColumnNameFilter;

        if (selectedFlowIds.length > 0) {
          if (hasFilters) {
            await fetchFilteredBoards();
          } else {
            await fetchSelectedBoards();
          }
        }
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
      defaultDays: stageDefaultDays, // 🔥 ENVIA O CAMPO
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
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Erro ao salvar etapa";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

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

        // 🔥 VERIFICAÇÃO ANTES DE ENVIAR
        console.log("🔍 ===== VERIFICAÇÃO FINAL (EDIÇÃO) =====");
        console.log("📦 FlowId:", updatePayload.flowId);
        console.log("📦 StageId:", updatePayload.stageId);
        console.log("📦 Title:", updatePayload.title);
        console.log("📦 DueDate:", updatePayload.dueDate);
        console.log("📦 Quantity:", updatePayload.quantity);
        console.log("========================================\n");

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
      // 🔥 MODO CRIAÇÃO
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

        console.log("🔍 VERIFICAÇÃO DE STAGE (validação pelo modal):");
        console.log("   flowId enviado:", values.flowId);
        console.log("   stageId enviado:", values.stageId);
        console.log("   activeStageId (ignorado):", activeStageId);

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

        // 🔥 VERIFICAÇÃO ANTES DE ENVIAR
        console.log("🔍 ===== VERIFICAÇÃO FINAL (CRIAÇÃO) =====");
        console.log("📦 FlowId:", createPayload.flowId);
        console.log("📦 StageId:", createPayload.stageId);
        console.log("📦 Title:", createPayload.title);
        console.log("📦 DueDate:", createPayload.dueDate);
        console.log("📦 Quantity:", createPayload.quantity);
        console.log("========================================\n");

        const startTime = Date.now();

        let response;
        try {
          response = await api.post(`/flow/items`, createPayload);
          console.log("✅ Resposta da API:", response.data);
        } catch (apiError: any) {
          console.error("❌ ERRO COMPLETO:", {
            message: apiError.message,
            status: apiError.response?.status,
            statusText: apiError.response?.statusText,
            data: apiError.response?.data,
            config: {
              url: apiError.config?.url,
              method: apiError.config?.method,
              data: apiError.config?.data
                ? JSON.parse(apiError.config.data)
                : null,
            },
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

      // 🔥 LOG DO ERRO COM DETALHES
      if (error.response?.data?.message?.includes("Etapa inválida")) {
        console.error("🔍 ERRO DO BACKEND: Etapa inválida");
        console.error("   - flowId enviado:", values?.flowId);
        console.error("   - stageId enviado:", values?.stageId);
        console.error("   - activeStageId:", activeStageId);
      }

      toast.error(errorMessage);
      console.error("=".repeat(80));
      console.error("\n");
    } finally {
      setIsSubmitting(false);
      console.log("🏁 isSubmitting set to false");
    }
  };

  const shouldShowItem = useCallback(
    (item: FlowItem): boolean => {
      if (item.status === "CONCLUIDO") {
        const show = itemsPendingRemoval.has(item.id);
        if (show) {
          console.log(
            `⏰ [${new Date().toISOString()}] Item ${item.id} (${item.title}) concluído MAS em contagem - MOSTRANDO`,
          );
        } else {
          console.log(
            `✅ [${new Date().toISOString()}] Item ${item.id} (${item.title}) concluído - OCULTANDO - itemsPendingRemoval:`,
            Array.from(itemsPendingRemoval),
          );
        }
        return show;
      }
      return true;
    },
    [itemsPendingRemoval],
  );

  // ===========================================================================
  // 🎯 UNIFIED STAGES - Agrupa stages por nome
  // ===========================================================================
  const unifiedStages = useMemo(() => {
    console.log("🔄 Recalculando unifiedStages com refreshKey:", refreshKey);
    console.log("📋 itemsPendingRemoval:", Array.from(itemsPendingRemoval));

    const stageGroups: Record<string, FlowStage> = {};

    boards.forEach((board) => {
      const flowColor = board.color || "#D35400";
      const flowName = board.name;

      console.log(`📊 Processando board: ${board.name}`); // 🔥 ADICIONE

      board.stages.forEach((stage) => {
        console.log(
          `  Stage: ${stage.name} - defaultDays: ${stage.defaultDays}`,
        ); // 🔥 ADICIONE

        const key = stage.name.toUpperCase();

        if (!stageGroups[key]) {
          stageGroups[key] = {
            id: stage.id,
            name: stage.name,
            order: stage.order,
            color: stage.color,
            allowedRole: stage.allowedRole,
            defaultDays: stage.defaultDays, // 🔥 GARANTA QUE ESTÁ AQUI

            flowId: board.id,
            items: [],
          };
        }

        // 🔥 Log de quantos itens tinha antes
        console.log(`Stage ${stage.name} tinha ${stage.items.length} itens`);

        // 🔥 USA A MESMA FUNÇÃO shouldShowItem
        const itemsWithMetadata = stage.items
          .filter((item) => {
            const show = shouldShowItem(item);
            if (!show && item.status === "CONCLUIDO") {
              console.log(
                `❌ Filtrando item ${item.id} (${item.title}) - CONCLUIDO e não está no pending`,
              );
            }
            return show;
          })
          .map((item) => ({
            ...item,
            flowColor,
            flowName,
            _originalStageId: item.stageId,
            _originalFlowId: board.id,
          }));

        console.log(
          `Stage ${stage.name} ficou com ${itemsWithMetadata.length} itens`,
        );

        stageGroups[key].items.push(...itemsWithMetadata);
      });
    });

    const result = Object.values(stageGroups).sort((a, b) => a.order - b.order);

    return result;
  }, [boards, refreshKey, itemsPendingRemoval, shouldShowItem]);

  // ===========================================================================
  // 🔥 HOOK DE DRAG
  // ===========================================================================
  const { moveItem, onDragStart, executeMove } = useKanbanDrag({
    items: unifiedStages.flatMap((s) => s.items),
    setItems: () => {},
    idField: "stageId",

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

        // 🔥 IMPORTANTE: Buscar o nome da stage destino no board original
        const movedItem = response.data;

        // Buscar o board do item
        const itemBoard = boards.find((b) => b.id === movedItem.flowId);

        if (itemBoard) {
          // Buscar a stage pelo ID no board original
          const targetStage = itemBoard.stages.find((s) => s.id === newStageId);

          if (targetStage) {
            lastMovedItemRef.current = {
              id: itemId,
              targetStageId: newStageId,
              targetStageName: targetStage.name, // 🔥 Guarda o NOME, não o ID
            };
            console.log(
              "📦 Informações salvas no ref:",
              lastMovedItemRef.current,
            );
          } else {
            console.error(
              "❌ Stage destino não encontrada no board original:",
              {
                boardId: itemBoard.id,
                boardName: itemBoard.name,
                newStageId,
                availableStages: itemBoard.stages.map((s) => ({
                  id: s.id,
                  name: s.name,
                })),
              },
            );
          }
        } else {
          console.error(
            "❌ Board não encontrado para o fluxo:",
            movedItem.flowId,
          );
        }

        return response.data;
      } catch (error: any) {
        console.error("❌ [moveCallback] Erro:", error);
        throw error;
      }
    },

    onRequireResponsible: (itemId, targetStageId, targetStageName) => {
      console.log("👤 [onRequireResponsible] Requer responsável:", {
        itemId,
        targetStageId,
        targetStageName,
      });

      // 🔥 ENCONTRA O ITEM PARA PEGAR O FLOW ID
      const item = unifiedStages
        .flatMap((s) => s.items)
        .find((i) => i.id === itemId);

      if (!item) {
        console.error("❌ Item não encontrado:", itemId);
        return;
      }

      console.log("📦 Item encontrado:", {
        id: item.id,
        title: item.title,
        flowId: item.flowId,
        currentStageId: item.stageId,
        quantity: item.quantity,
      });

      // 🔥 ENCONTRA A STAGE DESTINO
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

      // ===========================================================================
      // 🔥 CALCULA AS FLAGS - USA isAfterCorte
      // ===========================================================================
      const isDistribuicao = checkIfIsDistribuicao(targetStage.name);
      const isAfterCorte = checkIfIsAfterCorte(
        // ← FUNÇÃO QUE VERIFICA CORTE
        targetStageId,
        item.flowId,
      );

      console.log("📊 [onRequireResponsible] Flags calculadas:", {
        itemId: item.id,
        itemTitle: item.title,
        flowId: item.flowId,
        targetStageName: targetStage.name,
        targetStageId,
        isAfterCorte, // ← AGORA USA isAfterCorte
        isDistribuicao,
      });

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
          isAfterCorte, // ← PASSA isAfterCorte (agora o tipo aceita)
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
        console.log(
          `👤 [onRequireResponsible] Requer cargo: ${targetStage.allowedRole}`,
        );
        setDragItemId(itemId);
        setDragTargetStage({
          id: targetStageId,
          name: targetStage.name,
          allowedRole: targetStage.allowedRole,
          isAfterCorte, // ← PASSA isAfterCorte
          isDistribuicao,
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
      console.log(
        "🔄 [onMoveSuccess] ========================================",
      );
      console.log("🔄 [onMoveSuccess] Movimento concluído com sucesso!");
      console.log("📌 Timestamp:", new Date().toISOString());

      // ===========================================================================
      // 🧹 LIMPEZA E SINCRONIZAÇÃO IMEDIATA
      // ===========================================================================

      // Limpamos a referência do último item movido, pois não haverá conclusão automática
      if (lastMovedItemRef.current) {
        console.log(
          "🧹 Limpando lastMovedItemRef:",
          lastMovedItemRef.current.id,
        );
        lastMovedItemRef.current = null;
      }

      // Verificamos se existem filtros ativos para saber qual método de busca chamar
      const hasFilters =
        activeFilterStartDate ||
        activeFilterEndDate ||
        activeFilterOverdue ||
        activeFilterUpcoming ||
        activeFilterAssignedTo !== "all" ||
        activeFilterSupplier !== "all" ||
        activeFilterProductRef ||
        activeColumnNameFilter;

      console.log("📊 Atualizando board. Filtros ativos:", !!hasFilters);

      try {
        if (hasFilters) {
          await fetchFilteredBoards();
        } else {
          await fetchSelectedBoards();
        }

        // Forçamos a atualização da chave de renderização para garantir que a UI reflita o banco
        setRefreshKey((prev) => prev + 1);

        console.log("✅ [onMoveSuccess] Boards atualizados com sucesso!");
      } catch (error) {
        console.error(
          "❌ [onMoveSuccess] Erro ao atualizar boards após movimento:",
          error,
        );
      }

      console.log(
        "🔄 [onMoveSuccess] ========================================\n",
      );
    },

    onMoveError: (error) => {
      console.error("❌ [onMoveError] Erro no movimento:", error);
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

  // Verifica se há filtro de referência ativo
  const hasActiveProductRefFilter =
    activeFilterProductRef && activeFilterProductRef.trim() !== "";

  // Verifica se não há itens no board filtrado
  const hasNoItemsAfterFilter = boards.every((board) =>
    board.stages.every((stage) => stage.items.length === 0),
  );

  // Efeito para mostrar o toast quando a condição for atendida
  useEffect(() => {
    if (
      hasActiveProductRefFilter &&
      hasNoItemsAfterFilter &&
      !loading &&
      !hasShownEmptyRefToast
    ) {
      toast.info(
        "Nenhum item encontrado. A referência pode ainda não ter sido criada ou já foi finalizada.",
        {
          duration: 5000, // 5 segundos
          icon: <Package className="h-4 w-4" />,
        },
      );
      setHasShownEmptyRefToast(true);
    }

    // Reseta o estado quando o filtro muda ou quando há itens
    if (!hasActiveProductRefFilter || !hasNoItemsAfterFilter) {
      setHasShownEmptyRefToast(false);
    }
  }, [hasActiveProductRefFilter, hasNoItemsAfterFilter, loading]);

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

  // ===========================================================================
  // 🔥 FUNÇÃO AUXILIAR PARA VERIFICAR SE É DISTRIBUIÇÃO
  // ===========================================================================
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

  // ===========================================================================
  // 🔥 FUNÇÃO AUXILIAR PARA VERIFICAR SE ESTÁ APÓS DISTRIBUIÇÃO
  // ===========================================================================
  const checkIfIsAfterDistribuicao = (
    stageId: string,
    flowId: string,
  ): boolean => {
    // 1. Encontra o board do fluxo específico
    const board = boards.find((b) => b.id === flowId);
    if (!board) {
      console.warn(`⚠️ Board não encontrado para flowId: ${flowId}`);
      return false;
    }

    // 2. Ordena todas as etapas do fluxo
    const sortedStages = [...board.stages].sort((a, b) => a.order - b.order);

    console.log(
      `📊 [checkIfIsAfterDistribuicao] Stages do fluxo ${flowId}:`,
      sortedStages.map((s) => ({ id: s.id, name: s.name, order: s.order })),
    );

    // 3. Palavras-chave para identificar a etapa de Distribuição
    const DISTRIBUICAO_KEYWORDS = [
      "distribuição",
      "distribuicao",
      "expedição",
      "expedicao",
    ];

    // 4. Encontra o índice da etapa de Distribuição
    const distribuicaoIndex = sortedStages.findIndex((stage) =>
      DISTRIBUICAO_KEYWORDS.some((keyword) =>
        stage.name.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );

    // Se não encontrar etapa de Distribuição, retorna false
    if (distribuicaoIndex === -1) {
      console.log(
        `ℹ️ Nenhuma etapa de Distribuição encontrada no fluxo ${flowId}`,
      );
      return false;
    }

    // 5. Encontra o índice da etapa que estamos verificando
    const stageIndex = sortedStages.findIndex((s) => s.id === stageId);

    // Se não encontrar a etapa, retorna false
    if (stageIndex === -1) {
      console.warn(`⚠️ Stage ${stageId} não encontrada no fluxo ${flowId}`);
      return false;
    }

    const isAfter = stageIndex > distribuicaoIndex;

    console.log(`📊 [checkIfIsAfterDistribuicao] Resultado:`, {
      stageName: sortedStages[stageIndex].name,
      distribuicaoName: sortedStages[distribuicaoIndex].name,
      stageIndex,
      distribuicaoIndex,
      isAfter,
    });

    return isAfter;
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
        // rightContent={
        //   !canManageRef ? (
        //     <div className="flex items-center gap-2">
        //       <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-center gap-1">
        //         <Lock size={10} />
        //         Referências: apenas leitura
        //       </div>
        //     </div>
        //   ) : undefined
        // }
      />
      {/* {!canManageRef && (
        <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
          <Lock size={10} className="inline mr-1" />
          Referências: apenas leitura
        </div>
      )} */}

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
                <div className="flex items-center gap-2 truncate">
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
                    {/* Opção para limpar/ver todas */}
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

                    {/* Lista dinâmica de colunas */}
                    {columnOptions.map((option) => (
                      <CommandItem
                        key={option}
                        value={option}
                        onSelect={(currentValue) => {
                          // currentValue vem em lowercase do Command
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
            className={`h-8 text-xs font-medium ${
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
            className={`h-8 text-xs font-medium ${
              tempFilterUpcoming
                ? "bg-orange-600 text-white hover:bg-orange-700"
                : "text-foreground"
            }`}
            onClick={toggleUpcomingFilter}
          >
            <Clock className="w-3 h-3 mr-2" />
            Próximos a vencer ({notificationDays} dias) {/* 🔥 DINÂMICO */}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs font-medium min-w-[100px] bg-orange-600 hover:bg-orange-700 text-white"
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
          // Seu código existente do KanbanBoard
          unifiedStages.map((stage, index) => {
            const hasPermission = canUserEditStage(stage);
            // const filteredItems = filterColumnItems(stage);

            const filteredItems = filterColumnItems(stage); // ✅ USA O FILTRO

            const isOverdueActive =
              activeColumnFilter.columnId === stage.id &&
              activeColumnFilter.filterType === "overdue";

            const isUpcomingActive =
              activeColumnFilter.columnId === stage.id &&
              activeColumnFilter.filterType === "upcoming";

            return (
              <KanbanColumn
                key={`${stage.id}-${refreshKey}-${itemsPendingRemoval.size}`} // 🔥 CHAVE DINÂMICA
                id={stage.id}
                title={stage.name}
                count={filteredItems.length} // ✅ USA filteredItems (já inclui todos os filtros)
                color={stage.color}
                isFirstColumn={index === 0}
                defaultDays={stage.defaultDays} // 🔥 PASSA OS DIAS PADRÃO
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
                  setStageDefaultDays(stage.defaultDays ?? 1); // 🔥 CARREGA O VALOR
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

                {filteredItems.map((item) => {
                  // ✅ USA stage.items (já filtrado)
                  console.log("Renderizando card:", {
                    id: item.id,
                    title: item.title,
                    status: item.status,
                    shouldShow: shouldShowItem(item),
                    itemsPendingRemoval: Array.from(itemsPendingRemoval),
                  });

                  return (
                    <KanbanCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      subtitle={item.productRef}
                      priorityColor={item.flowColor}
                      dueDate={item.dueDate} // 🔥 ESSENCIAL: Passar a data para o card aqui
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
          })
        )}
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
        selectedFlowIds={selectedFlowIds} // 🔥 PASSA O selectedFlowIds
        fetchStagesForFlow={async (flowId) => {
          try {
            const response = await api.get(`/flow/${flowId}/stages`);
            return response.data;
          } catch (error) {
            console.error("Erro ao buscar stages:", error);
            return [];
          }
        }}
        onDeadlineUpdate={refreshBoardsAfterDeadlineUpdate}
      />

      <FlowItemModal
        isOpen={isEditItemModal}
        onClose={() => {
          setIsEditItemModal(false);
          setEditingItem(null);
          setCurrentItemStages([]); // 🔥 Limpa as stages
          setActiveStageId(null);
        }}
        initialData={editingItem}
        onSubmit={handleItemSubmit}
        isLoading={isSubmitting || isModalLoading}
        users={users}
        suppliers={suppliers}
        stages={currentItemStages} // 🔥 PASSA AS STAGES ATUAIS
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
        // 🔥 FUNÇÃO PARA BUSCAR STAGES DE UM FLOW (USADA QUANDO MUDA O FLUXO)
        onFlowChange={async (flowId) => {
          try {
            console.log("🔄 Buscando stages para flow:", flowId);

            setActiveStageId(null);

            const response = await api.get(`/flow/${flowId}/stages`);
            console.log("✅ Stages carregadas:", response.data.length);

            setCurrentItemStages(response.data); // 🔥 ATUALIZA O ESTADO

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
        loading={isDeleting} // 🔥 AGORA PASSA O ESTADO DE LOADING
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
            {/* Nome da Etapa */}
            <div className="space-y-2">
              <Label>Nome da Etapa</Label>
              <Input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Ex: Pilotagem"
              />
            </div>

            {/* 🔥 NOVO CAMPO: Dias Padrão para Conclusão */}
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
                Este valor será usado como padrão para novos itens.
              </p>
            </div>

            {/* Cargo Permitido */}
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

            {/* Cor da Etapa */}
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
        currentQuantity={completingItem?.quantity}
        hasQuantity={
          completingItem?.quantity ? completingItem.quantity > 0 : false
        }
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
        nextStage={dragTargetStage} // 🔥 AGORA JÁ VEM COM AS FLAGS!
        isLoading={isSubmitting}
        currentQuantity={
          // 🔥 Passa a quantidade atual do item
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

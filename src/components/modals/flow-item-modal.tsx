/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  AlertTriangle,
  Edit,
  EyeOff,
  Factory,
  Layers,
  Loader2,
  Lock,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";

// Import do componente de histórico
import { AuditLogEntry, FlowHistoryModal } from "./flow-history-modal";
import { useProductRefPermission } from "@/hooks/use-product-ref-permission";

// --- INTERFACES ---

interface FlowMedia {
  id: string;
  url: string;
  filename: string;
}

export interface FlowItem {
  id: string;
  title: string;
  description?: string;
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

  dueDate?: string;
  productionStartedAt?: string;
  deliveryAt?: string;

  images: FlowMedia[];
  audios: FlowMedia[];
  videos: FlowMedia[];
}

interface FlowStage {
  id: string;
  name: string;
  order: number;
  color?: string;
  allowedRole?: string;
  flowId: string;
}

interface FlowItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: FlowItem | null;
  initialStageId?: string | null;
  onSubmit: (
    values: any,
    files: { images: File[]; audios: File[]; videos: File[] },
    removedMedia: { images: string[]; audios: string[]; videos: string[] },
  ) => Promise<void>;
  isLoading: boolean;
  users: { id: string; name: string }[];
  suppliers: { id: string; name: string; category?: string }[];
  stages: FlowStage[];
  flows?: { id: string; name: string; color?: string }[];
  currentUserRole?: string;
  currentUserSystemRole?: string;
  isReadOnly?: boolean;
  hasMultipleFlows?: boolean;
  onDelete?: (id: string) => void;
  onAdvance?: (item: FlowItem) => Promise<void>;
  onFlowChange?: (flowId: string) => Promise<FlowStage[]>;
  fetchStagesForFlow?: (flowId: string) => Promise<FlowStage[]>;
}

// --- SCHEMA DE VALIDAÇÃO ---

const itemSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  productRef: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantidade mínima").default(1),
  status: z.string().default("PENDENTE"),
  flowId: z.string().optional(),
  stageId: z.string().optional(),
  assignedToId: z.string().optional(),
  supplierId: z.string().optional(),
  dueDate: z.string().optional(),
  productionStartedAt: z.string().optional(),
  deliveryAt: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

// --- CONSTANTES ---
const CORTE_KEYWORDS = ["corte", "cortador", "cortar", "cut"];
const ADMIN_ROLES = ["MASTER", "ADMIN", "MANAGER"];

export function FlowItemModal({
  isOpen,
  onClose,
  initialData,
  initialStageId,
  onSubmit,
  isLoading,
  users,
  suppliers,
  stages,
  flows = [],
  currentUserRole,
  currentUserSystemRole,
  onDelete,
  onAdvance,
  onFlowChange,
  fetchStagesForFlow,
  isReadOnly = false,
  hasMultipleFlows = false,
}: FlowItemModalProps) {
  const isEditing = !!initialData;

  // --- Estados de Mídia ---
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [audios, setAudios] = useState<File[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [removedVideoIds, setRemovedVideoIds] = useState<string[]>([]);
  const [removedAudioIds, setRemovedAudioIds] = useState<string[]>([]);

  // --- Estados de Gravação de Áudio ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Estados para validação da quantidade ---
  const [showQuantityWarning, setShowQuantityWarning] = useState(false);
  const [hasPassedCorte, setHasPassedCorte] = useState(false);
  const [isInCorte, setIsInCorte] = useState(false);

  // --- Estados para Histórico ---
  const [historyLogs, setHistoryLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- Estados para Stages ---
  const [availableStages, setAvailableStages] = useState<FlowStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);

  // --- Hook Form ---
  const form = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: "",
      description: "",
      productRef: "",
      quantity: 0,
      status: "PENDENTE",
      flowId: "",
      stageId: "",
      assignedToId: "",
      supplierId: "",
      dueDate: "",
      productionStartedAt: "",
      deliveryAt: "",
    },
  });

  const selectedFlowId = form.watch("flowId");

  // ===========================================================================
  // 🔥 VERIFICA SE VEIO DO CLIQUE NO + (TEM INITIALSTAGEID E NÃO É EDIÇÃO)
  // ===========================================================================
  const veioDoClique = !isEditing && !!initialStageId;

  // ===========================================================================
  // 🔥 FUNÇÃO PARA BUSCAR HISTÓRICO
  // ===========================================================================
  const fetchItemHistory = useCallback(async (itemId: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await api.get(`/audit/item/${itemId}`);
      setHistoryLogs(response.data);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // ===========================================================================
  // 🔥 FUNÇÃO PARA BUSCAR STAGES
  // ===========================================================================
  const handleFlowChange = useCallback(
    async (flowId: string) => {
      if (!hasMultipleFlows || !flowId) return;

      setIsLoadingStages(true);

      try {
        if (onFlowChange) {
          const stagesFromParent = await onFlowChange(flowId);
          setAvailableStages(stagesFromParent);
        }
      } catch (error) {
        console.error("Erro ao buscar stages:", error);
        setAvailableStages([]);
      } finally {
        setIsLoadingStages(false);
      }
    },
    [onFlowChange, hasMultipleFlows],
  );

  // ===========================================================================
  // 🔥 EFEITO PARA POPULAR DADOS AO ABRIR
  // ===========================================================================
  useEffect(() => {
    if (!isOpen) return;

    console.log("\n📂 [FlowItemModal] Abrindo modal");
    console.log("initialStageId:", initialStageId);
    console.log("hasMultipleFlows:", hasMultipleFlows);
    console.log("stages recebidas:", stages.length);
    console.log("veioDoClique:", !isEditing && !!initialStageId);

    // Resetar estados
    setImages([]);
    setVideos([]);
    setAudios([]);
    setRemovedImageIds([]);
    setRemovedVideoIds([]);
    setRemovedAudioIds([]);
    setIsRecording(false);
    setShowQuantityWarning(false);
    setHasPassedCorte(false);
    setIsInCorte(false);
    setAvailableStages([]);

    if (initialData?.id) {
      fetchItemHistory(initialData.id);
    } else {
      setHistoryLogs([]);
    }

    // =========================================================================
    // MODO EDIÇÃO
    // =========================================================================
    if (initialData) {
      console.log("📝 Modo edição");
      form.reset({
        title: initialData.title,
        description: initialData.description || "",
        productRef: initialData.productRef || "",
        quantity: initialData.quantity,
        status: initialData.status,
        flowId: initialData.flowId,
        stageId: initialData.stageId || "",
        assignedToId: initialData.assignedToId || "unassigned",
        supplierId: initialData.supplierId || "internal",
        dueDate: initialData.dueDate?.substring(0, 10) || "",
        productionStartedAt:
          initialData.productionStartedAt?.substring(0, 10) || "",
        deliveryAt: initialData.deliveryAt?.substring(0, 10) || "",
      });

      if (initialData.flowId && !veioDoClique) {
        setTimeout(() => handleFlowChange(initialData.flowId), 100);
      }
    }
    // =========================================================================
    // MODO CRIAÇÃO
    // =========================================================================
    else {
      // 🔥 CASO 1: VEIO DO CLIQUE NO + (TEM INITIALSTAGEID)
      if (initialStageId) {
        console.log("✅ VEIO DO CLIQUE - stageId:", initialStageId);

        const stage = stages.find((s) => s.id === initialStageId);

        if (stage) {
          console.log(
            "✅ Stage encontrada:",
            stage.name,
            "flowId:",
            stage.flowId,
          );

          const initialFlowId = hasMultipleFlows ? "" : stage.flowId;

          form.reset({
            title: "",
            description: "",
            productRef: "",
            quantity: 0,
            status: "PENDENTE",
            flowId: initialFlowId,
            stageId: initialStageId,
            assignedToId: "unassigned",
            supplierId: "internal",
            dueDate: "",
            productionStartedAt: "",
            deliveryAt: "",
          });
        } else {
          console.error("❌ Stage não encontrada");
        }
      }
      // 🔥 CASO 2: NÃO VEIO DO CLIQUE - MÚLTIPLOS FLUXOS
      else if (hasMultipleFlows) {
        console.log("📌 Múltiplos fluxos SEM clique");

        const defaultFlowId = flows.length > 0 ? flows[0].id : "";

        form.reset({
          title: "",
          description: "",
          productRef: "",
          quantity: 0,
          status: "PENDENTE",
          flowId: defaultFlowId,
          stageId: "",
          assignedToId: "unassigned",
          supplierId: "internal",
          dueDate: "",
          productionStartedAt: "",
          deliveryAt: "",
        });

        if (defaultFlowId) {
          setTimeout(() => handleFlowChange(defaultFlowId), 100);
        }
      }
      // 🔥 CASO 3: ÚNICO FLUXO
      else {
        console.log("📌 Único fluxo");

        const singleFlowId = flows.length > 0 ? flows[0].id : "";

        form.reset({
          title: "",
          description: "",
          productRef: "",
          quantity: 0,
          status: "PENDENTE",
          flowId: singleFlowId,
          stageId: "",
          assignedToId: "unassigned",
          supplierId: "internal",
          dueDate: "",
          productionStartedAt: "",
          deliveryAt: "",
        });

        setTimeout(() => handleFlowChange(singleFlowId), 100);
      }
    }
  }, [isOpen]);

  // ===========================================================================
  // 🔥 FUNÇÕES DE ÁUDIO
  // ===========================================================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `gravacao-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setAudios((prev) => [...prev, file]);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Erro ao acessar microfone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // ===========================================================================
  // 🔥 MANIPULAÇÃO DE ARQUIVOS
  // ===========================================================================
  const handleRemoveNewFile = (
    index: number,
    type: "image" | "video" | "audio",
  ) => {
    if (type === "image")
      setImages((prev) => prev.filter((_, i) => i !== index));
    if (type === "video")
      setVideos((prev) => prev.filter((_, i) => i !== index));
    if (type === "audio")
      setAudios((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingMedia = (
    mediaId: string,
    type: "image" | "video" | "audio",
  ) => {
    if (type === "image") setRemovedImageIds((prev) => [...prev, mediaId]);
    else if (type === "video") setRemovedVideoIds((prev) => [...prev, mediaId]);
    else if (type === "audio") setRemovedAudioIds((prev) => [...prev, mediaId]);
  };

  // ===========================================================================
  // 🔥 VALIDAÇÕES DE CORTE - CORREÇÃO FINAL
  // ===========================================================================
  const isCorteStage = useCallback((stageName: string): boolean => {
    const name = stageName?.toLowerCase().trim() || "";
    const result = CORTE_KEYWORDS.some((keyword) => name.includes(keyword));
    console.log(
      `📌 [isCorteStage] "${stageName}" -> ${result ? "É CORTE" : "NÃO É CORTE"}`,
    );
    return result;
  }, []);

  const isUserAdmin = useCallback((): boolean => {
    const systemRole = currentUserSystemRole;
    const isAdmin = systemRole ? ADMIN_ROLES.includes(systemRole) : false;
    console.log(`👑 [isUserAdmin] role: ${systemRole}, isAdmin: ${isAdmin}`);
    return isAdmin;
  }, [currentUserSystemRole]);

  const userHasCortePermission = useCallback((): boolean => {
    const role = currentUserRole?.toLowerCase() || "";
    const hasPermission = CORTE_KEYWORDS.some((keyword) =>
      role.includes(keyword),
    );
    console.log(
      `✂️ [userHasCortePermission] role: ${currentUserRole}, hasPermission: ${hasPermission}`,
    );
    return hasPermission;
  }, [currentUserRole]);

  // Watch da stage selecionada
  const selectedStageId = form.watch("stageId");

  // ===========================================================================
  // 🔥 CORREÇÃO 1: Popula availableStages quando recebe stages via prop
  // ===========================================================================
  useEffect(() => {
    if (stages.length > 0) {
      console.log(
        "📥 [CORREÇÃO] Populando availableStages com",
        stages.length,
        "stages",
      );
      setAvailableStages(stages);
    }
  }, [stages]);

  // ===========================================================================
  // 🔥 CORREÇÃO 2: Para modo edição, busca stages do flow específico
  // ===========================================================================
  useEffect(() => {
    if (isEditing && initialData?.flowId && fetchStagesForFlow) {
      const loadStages = async () => {
        console.log("🔄 Buscando stages para flow:", initialData.flowId);
        try {
          const stagesFromFlow = await fetchStagesForFlow(initialData.flowId);
          console.log("✅ Stages carregadas:", stagesFromFlow.length);
          setAvailableStages(stagesFromFlow);
        } catch (error) {
          console.error("❌ Erro ao carregar stages do flow:", error);
          // Fallback para stages recebidas via prop
          if (stages.length > 0) {
            console.log("📥 Usando stages do fallback");
            setAvailableStages(stages);
          }
        }
      };
      loadStages();
    }
  }, [isEditing, initialData?.flowId, fetchStagesForFlow, stages]);

  // ===========================================================================
  // 🔥 LOG PARA DEBUG - Mostra quando availableStages muda
  // ===========================================================================
  useEffect(() => {
    console.log("📊 availableStages atualizado:", {
      quantidade: availableStages.length,
      stages: availableStages.map((s) => ({ id: s.id, name: s.name })),
    });
  }, [availableStages]);

  // 🔥 Só calcula posição no corte se NÃO veio do clique
  useEffect(() => {
    console.log("\n🔄 [useEffect CORTE] INICIANDO CÁLCULO");
    console.log("📊 Condições:", {
      veioDoClique,
      availableStagesLength: availableStages.length,
      isOpen,
      selectedStageId,
      isEditing,
    });

    if (veioDoClique) {
      console.log("⏭️ [useEffect CORTE] Ignorando porque veio do clique");
      return;
    }

    if (!availableStages.length || !isOpen) {
      console.log(
        "⏭️ [useEffect CORTE] Ignorando: sem stages ou modal fechado",
      );
      return;
    }

    console.log(
      "📋 Stages disponíveis:",
      availableStages.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
      })),
    );

    const sortedStages = [...availableStages].sort((a, b) => a.order - b.order);
    const corteIndex = sortedStages.findIndex((s) => isCorteStage(s.name));

    console.log("📍 Índices:", {
      corteIndex,
      totalStages: sortedStages.length,
      stagesOrdenadas: sortedStages.map((s) => s.name),
    });

    if (corteIndex === -1) {
      console.log("❌ Nenhuma coluna Corte encontrada");
      setHasPassedCorte(false);
      setIsInCorte(false);
      return;
    }

    if (!isEditing) {
      // Modo criação
      console.log("🆕 Modo CRIAÇÃO");
      const currentStage = availableStages.find(
        (s) => s.id === selectedStageId,
      );

      console.log("🎯 Stage selecionada:", {
        id: selectedStageId,
        encontrada: currentStage
          ? {
              name: currentStage.name,
              isCorte: currentStage ? isCorteStage(currentStage.name) : false,
            }
          : "NÃO ENCONTRADA",
      });

      setIsInCorte(currentStage ? isCorteStage(currentStage.name) : false);
      setHasPassedCorte(false);
      return;
    }

    if (initialData) {
      // Modo edição
      console.log("📝 Modo EDIÇÃO");
      const currentItemStageIndex = sortedStages.findIndex(
        (s) => s.id === initialData.stageId,
      );

      console.log("📍 Posição do item:", {
        stageId: initialData.stageId,
        stageName: sortedStages[currentItemStageIndex]?.name,
        index: currentItemStageIndex,
        corteIndex,
        isInCorte: currentItemStageIndex === corteIndex,
        hasPassedCorte: currentItemStageIndex > corteIndex,
      });

      setIsInCorte(currentItemStageIndex === corteIndex);
      setHasPassedCorte(currentItemStageIndex > corteIndex);
    }
  }, [
    availableStages,
    initialData,
    isEditing,
    isCorteStage,
    isOpen,
    veioDoClique,
    selectedStageId, // 🔥 ESSENCIAL
  ]);

  // ===========================================================================
  // 🔥 Cálculo das permissões
  // ===========================================================================
  const canEditQuantity = useMemo(() => {
    console.log("\n🧮 [canEditQuantity] CALCULANDO PERMISSÃO");
    console.log("📊 Valores atuais:", {
      isUserAdmin: isUserAdmin(),
      isInCorte,
      userHasCortePermission: userHasCortePermission(),
      currentUserRole,
      currentUserSystemRole,
      selectedStageId,
    });

    if (isUserAdmin()) {
      console.log("✅ [canEditQuantity] ADMIN - Pode editar");
      return true;
    }

    if (!isInCorte) {
      console.log("❌ [canEditQuantity] Não está na coluna Corte - BLOQUEADO");
      return false;
    }

    const hasCorteRole = userHasCortePermission();
    const canEdit = hasCorteRole;

    console.log(`🔍 [canEditQuantity] Na coluna Corte:`, {
      hasCorteRole,
      canEdit,
      userRole: currentUserRole,
    });

    return canEdit;
  }, [
    isInCorte,
    isUserAdmin,
    userHasCortePermission,
    currentUserRole,
    currentUserSystemRole,
    selectedStageId,
  ]);

  const isQuantityDisabled = useMemo(() => {
    const disabled = isReadOnly || !canEditQuantity;
    console.log("🔒 [isQuantityDisabled]", {
      isReadOnly,
      canEditQuantity,
      disabled,
      final: disabled ? "BLOQUEADO" : "LIBERADO",
    });
    return disabled;
  }, [isReadOnly, canEditQuantity]);

  const isQuantityRequired = useMemo(() => {
    const required = !isUserAdmin() && isInCorte;
    console.log("⚠️ [isQuantityRequired]", {
      isUserAdmin: isUserAdmin(),
      isInCorte,
      required: required ? "OBRIGATÓRIO" : "OPCIONAL",
    });
    return required;
  }, [isInCorte, isUserAdmin]);

  // ===========================================================================
  // 🔥 Obtém informações da stage clicada
  // ===========================================================================
  const stageClicada = useMemo(() => {
    if (!initialStageId) return null;
    return stages.find((s) => s.id === initialStageId);
  }, [initialStageId, stages]);

  // ===========================================================================
  // 🔥 Cache para stages de cada flow
  // ===========================================================================
  const [stagesCache, setStagesCache] = useState<Record<string, FlowStage[]>>(
    {},
  );

  // ===========================================================================
  // 🔥 Função para buscar stages de um flow (com cache)
  // ===========================================================================
  const getStagesForFlow = useCallback(
    async (flowId: string): Promise<FlowStage[]> => {
      if (stagesCache[flowId]) {
        return stagesCache[flowId];
      }

      if (fetchStagesForFlow) {
        try {
          const stagesData = await fetchStagesForFlow(flowId);
          setStagesCache((prev) => ({ ...prev, [flowId]: stagesData }));
          return stagesData;
        } catch (error) {
          console.error("Erro ao buscar stages:", error);
          return [];
        }
      }
      return [];
    },
    [fetchStagesForFlow, stagesCache],
  );

  // ===========================================================================
  // 🔥 HANDLE SUBMIT - VERSÃO QUE ESTAVA FUNCIONANDO
  // ===========================================================================
  const handleSubmit = async (values: ItemFormValues) => {
    console.log("\n📤 [handleSubmit] Valores:", values);
    console.log("veioDoClique:", veioDoClique);
    console.log("initialStageId:", initialStageId);
    console.log("stageClicada:", stageClicada);

    // 🔥 CASO ESPECIAL: VEIO DO CLIQUE NO +
    if (veioDoClique) {
      if (!stageClicada) {
        console.error("❌ Stage não encontrada");
        toast.error("Erro: etapa não encontrada");
        return;
      }

      if (!values.title || values.title.trim() === "") {
        toast.error("Título é obrigatório");
        return;
      }

      // 🔥 Se tem múltiplos fluxos, USA O FLOWID SELECIONADO NO FORM
      const finalFlowId = hasMultipleFlows
        ? values.flowId
        : stageClicada.flowId;

      if (!finalFlowId) {
        if (hasMultipleFlows) {
          toast.error("Selecione uma coleção");
        }
        return;
      }

      // 🔥 Busca as stages do flow selecionado
      const stagesOfSelectedFlow = await getStagesForFlow(finalFlowId);

      console.log(
        `Stages do flow ${finalFlowId}:`,
        stagesOfSelectedFlow.map((s) => s.name),
      );

      // 🔥 Verifica se existe uma stage com o mesmo NOME no flow selecionado
      const targetStage = stagesOfSelectedFlow.find(
        (s) =>
          s.name.toLowerCase().trim() ===
          stageClicada.name.toLowerCase().trim(),
      );

      if (!targetStage) {
        console.error("❌ Stage não encontrada no flow selecionado");
        console.log("Nome da etapa procurada:", stageClicada.name);
        console.log(
          "Stages disponíveis:",
          stagesOfSelectedFlow.map((s) => s.name),
        );

        const selectedFlow = flows.find((f) => f.id === finalFlowId);

        toast.error("Esta etapa não existe na coleção escolhida", {
          description: `A etapa "${stageClicada.name}" não está presente na coleção "${selectedFlow?.name || finalFlowId}".`,
        });
        return;
      }

      const finalPayload = {
        title: values.title,
        description: values.description || null,
        productRef: values.productRef || null,
        quantity: Number(values.quantity) || 0,
        status: values.status || "PENDENTE",
        flowId: finalFlowId,
        stageId: targetStage.id, // 🔥 Usa o ID da stage do fluxo selecionado
        assignedToId:
          values.assignedToId === "unassigned" ? null : values.assignedToId,
        supplierId: values.supplierId === "internal" ? null : values.supplierId,
        dueDate: values.dueDate || null,
        productionStartedAt: values.productionStartedAt || null,
        deliveryAt: values.deliveryAt || null,
        // orderNumber: values.orderNumber || "",
        // priority: values.priority || 3,
      };

      console.log("🚀 Payload final:", finalPayload);

      try {
        await onSubmit(
          finalPayload,
          { images, audios, videos },
          {
            images: removedImageIds,
            audios: removedAudioIds,
            videos: removedVideoIds,
          },
        );
      } catch (error) {
        console.error("Erro no submit:", error);
      }
      return;
    }

    // 🔥 CASO NORMAL (SEM INITIALSTAGEID)
    if (hasMultipleFlows && !values.flowId) {
      toast.error("Selecione uma coleção");
      return;
    }

    if (!values.stageId) {
      toast.error("Selecione uma etapa");
      return;
    }

    const quantityNum = Number(values.quantity) || 0;
    const isAdmin = isUserAdmin();

    if (!isAdmin) {
      if (isInCorte && (!quantityNum || quantityNum < 1)) {
        setShowQuantityWarning(true);
        toast.error("Quantidade é obrigatória na coluna Corte");
        return;
      }
    }

    const finalPayload = {
      title: values.title,
      description: values.description || null,
      productRef: values.productRef || null,
      quantity: quantityNum,
      status: values.status || "PENDENTE",
      flowId: values.flowId || (flows.length > 0 ? flows[0].id : ""),
      stageId: values.stageId,
      assignedToId:
        values.assignedToId === "unassigned" ? null : values.assignedToId,
      supplierId: values.supplierId === "internal" ? null : values.supplierId,
      dueDate: values.dueDate || null,
      productionStartedAt: values.productionStartedAt || null,
      deliveryAt: values.deliveryAt || null,
      // orderNumber: values.orderNumber || "",
      // priority: values.priority || 3,
    };

    try {
      await onSubmit(
        finalPayload,
        { images, audios, videos },
        {
          images: removedImageIds,
          audios: removedAudioIds,
          videos: removedVideoIds,
        },
      );
    } catch (error) {
      console.error("Erro no submit:", error);
    }
  };

  // ===========================================================================
  // 🔥 Verifica se o flow selecionado tem a stage (para o select)
  // ===========================================================================
  const [flowStagesMap, setFlowStagesMap] = useState<Record<string, boolean>>(
    {},
  );

  // Carrega informações de todos os flows quando necessário
  useEffect(() => {
    if (!veioDoClique || !stageClicada || !fetchStagesForFlow) return;

    const loadAllFlowsInfo = async () => {
      const newMap: Record<string, boolean> = {};

      for (const flow of flows) {
        const stagesOfFlow = await getStagesForFlow(flow.id);
        const hasStage = stagesOfFlow.some(
          (s) =>
            s.name.toLowerCase().trim() ===
            stageClicada.name.toLowerCase().trim(),
        );
        newMap[flow.id] = hasStage;
      }

      setFlowStagesMap(newMap);
    };

    loadAllFlowsInfo();
  }, [veioDoClique, stageClicada, flows, fetchStagesForFlow, getStagesForFlow]);

  // ===========================================================================
  // 🔥 RENDER
  // ===========================================================================
  const truncateFileName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    const extIndex = name.lastIndexOf(".");
    const ext = extIndex !== -1 ? name.substring(extIndex) : "";
    const nameWithoutExt = extIndex !== -1 ? name.substring(0, extIndex) : name;
    const keepChars = Math.floor((maxLength - ext.length - 3) / 2);
    return `${nameWithoutExt.substring(0, keepChars)}...${nameWithoutExt.substring(nameWithoutExt.length - keepChars)}${ext}`;
  };

  const { canManageRef, canViewRef } = useProductRefPermission();

  // Determine se o campo deve ser editável
  const isRefEditable = !isReadOnly && canManageRef;
  const canSeeRef = !isReadOnly || canViewRef;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[95vh] md:h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "p-2 rounded",
                isReadOnly
                  ? "bg-slate-200 text-slate-500"
                  : "bg-orange-100 text-orange-600",
              )}
            >
              {isReadOnly ? (
                <Lock size={20} />
              ) : isEditing ? (
                <Edit size={20} />
              ) : (
                <Plus size={20} />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl text-[#2D3436]">
                {isEditing
                  ? "Editar Item de Produção"
                  : "Novo Item de Produção"}
              </DialogTitle>
              {veioDoClique && stageClicada && (
                <p className="text-xs text-green-600 font-medium mt-1">
                  ➕ Criando na coluna: <strong>{stageClicada.name}</strong>
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 py-6">
              <Form {...form}>
                <form
                  id="flow-item-form"
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
                >
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 p-1">
                      <TabsTrigger value="details">
                        Detalhes & Datas
                      </TabsTrigger>
                      <TabsTrigger value="media">Mídias & Anexos</TabsTrigger>
                      <TabsTrigger value="history">Histórico</TabsTrigger>
                    </TabsList>

                    {/* TAB DETALHES */}
                    <TabsContent value="details" className="space-y-4">
                      {/* ====================================================== */}
                      {/* 🔥 SEÇÃO 1: QUANDO VEIO DO CLIQUE */}
                      {/* ====================================================== */}
                      {veioDoClique && (
                        <>
                          {/* 🔥 CAMPO COLEÇÃO - aparece quando tem múltiplos fluxos */}
                          {hasMultipleFlows && stageClicada && (
                            <FormField
                              control={form.control}
                              name="flowId"
                              render={({ field }) => {
                                const selectedFlowHasStage = field.value
                                  ? flowStagesMap[field.value]
                                  : false;

                                return (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                      <Factory size={14} /> Coleção *
                                    </FormLabel>
                                    <Select
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        console.log(
                                          "🎯 Coleção selecionada:",
                                          value,
                                        );
                                      }}
                                      value={field.value}
                                      disabled={isReadOnly}
                                    >
                                      <FormControl>
                                        <SelectTrigger
                                          className={cn(
                                            field.value &&
                                              !selectedFlowHasStage &&
                                              "border-amber-500 bg-amber-50",
                                          )}
                                        >
                                          <SelectValue placeholder="Selecione uma coleção..." />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {flows.map((flow) => {
                                          const hasStage =
                                            flowStagesMap[flow.id];

                                          return (
                                            <SelectItem
                                              key={flow.id}
                                              value={flow.id}
                                            >
                                              <div className="flex items-center gap-2">
                                                <div
                                                  className="w-3 h-3 rounded-full"
                                                  style={{
                                                    backgroundColor:
                                                      flow.color || "#D35400",
                                                  }}
                                                />
                                                {flow.name}
                                                {!hasStage && (
                                                  <span className="text-xs text-amber-600 ml-2">
                                                    (não contém esta etapa)
                                                  </span>
                                                )}
                                              </div>
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                    {field.value && !selectedFlowHasStage && (
                                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                        <AlertTriangle size={12} />A etapa
                                        &ldquo;{stageClicada.name}&ldquo; não
                                        existe nesta coleção
                                      </p>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                          )}
                        </>
                      )}

                      {/* ====================================================== */}
                      {/* 🔥 SEÇÃO 2: QUANDO NÃO VEIO DO CLIQUE */}
                      {/* ====================================================== */}
                      {!veioDoClique && (
                        <>
                          {/* 🔥 CAMPO COLEÇÃO - quando tem múltiplos fluxos */}
                          {hasMultipleFlows && (
                            <FormField
                              control={form.control}
                              name="flowId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    <Layers size={14} /> Coleção *
                                  </FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      handleFlowChange(value);
                                    }}
                                    value={field.value}
                                    disabled={isReadOnly || isLoadingStages}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma coleção..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {flows.map((flow) => (
                                        <SelectItem
                                          key={flow.id}
                                          value={flow.id}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="w-3 h-3 rounded-full"
                                              style={{
                                                backgroundColor:
                                                  flow.color || "#D35400",
                                              }}
                                            />
                                            {flow.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* 🔥 CAMPO ETAPA */}
                          {/* <FormField
                            control={form.control}
                            name="stageId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Layers size={14} /> Etapa *
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={
                                    isReadOnly ||
                                    isLoadingStages ||
                                    (hasMultipleFlows && !selectedFlowId) ||
                                    availableStages.length === 0
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue 
                                        placeholder={
                                          isLoadingStages
                                            ? "Carregando etapas..."
                                            : hasMultipleFlows && !selectedFlowId
                                              ? "Selecione uma coleção primeiro"
                                              : availableStages.length === 0
                                                ? "Nenhuma etapa disponível"
                                                : "Selecione uma etapa"
                                        }
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {availableStages.map((stage) => (
                                      <SelectItem key={stage.id} value={stage.id}>
                                        {stage.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          /> */}
                        </>
                      )}

                      {/* ====================================================== */}
                      {/* 🔥 CAMPOS COMUNS - SEMPRE APARECEM */}
                      {/* ====================================================== */}

                      {/* Título e Referência */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Título do Produto *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: Camisa Linho M"
                                  {...field}
                                  disabled={isReadOnly}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="productRef"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Referência do Produto
                                {!canManageRef && !isReadOnly && (
                                  <span className="text-xs text-amber-600 flex items-center gap-1">
                                    <Lock size={10} /> (apenas modelagem)
                                  </span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="REF-001"
                                    {...field}
                                    disabled={!isRefEditable}
                                    className={cn(
                                      !canSeeRef &&
                                        "bg-slate-100 text-slate-400",
                                    )}
                                  />
                                  {!canSeeRef && (
                                    <div className="absolute inset-0 bg-slate-50/80 flex items-center justify-center text-xs text-slate-400">
                                      <EyeOff size={12} className="mr-1" />
                                      Sem permissão para visualizar
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              {!canManageRef && !isReadOnly && (
                                <p className="text-[10px] text-amber-600 mt-1">
                                  ⚠️ Apenas usuários com cargo de modelagem
                                  podem editar este campo
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Descrição / Observações</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Detalhes técnicos..."
                                  className="resize-none h-20"
                                  {...field}
                                  disabled={isReadOnly}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Quantidade */}
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between mb-2">
                                <FormLabel className="text-base font-bold">
                                  Quantidade
                                  {isQuantityRequired && (
                                    <span className="ml-2 text-xs font-normal text-red-500">
                                      *
                                    </span>
                                  )}
                                </FormLabel>
                              </div>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  {...field}
                                  disabled={isQuantityDisabled}
                                  className={cn(
                                    "text-lg font-bold",
                                    isQuantityDisabled &&
                                      "bg-slate-100 text-slate-500 cursor-not-allowed opacity-50",
                                    showQuantityWarning &&
                                      isQuantityRequired &&
                                      "border-red-500 ring-red-500",
                                  )}
                                  value={field.value?.toString() ?? "0"}
                                  onChange={(e) => {
                                    field.onChange(e.target.value);
                                    setShowQuantityWarning(false);
                                  }}
                                  placeholder={
                                    isQuantityRequired
                                      ? "Obrigatório"
                                      : "Opcional"
                                  }
                                />
                              </FormControl>
                              {showQuantityWarning && isQuantityRequired && (
                                <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                                  <AlertCircle size={12} /> Quantidade
                                  obrigatória na coluna Corte
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Responsáveis */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dashed">
                        <FormField
                          control={form.control}
                          name="assignedToId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <User size={14} /> Responsável Interno
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={isReadOnly}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unassigned">
                                    Nenhum
                                  </SelectItem>
                                  {users.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="supplierId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Factory size={14} /> Oficina / Terceirizado
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={isReadOnly}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Produção Interna" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="internal">
                                    Produção Interna
                                  </SelectItem>
                                  {suppliers.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Datas */}
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dashed">
                        {/* <FormField
                          control={form.control}
                          name="productionStartedAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase">
                                Próximos a vencer
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value || ""}
                                  disabled={isReadOnly}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        /> */}

                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase">
                                Prazo Final
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value || ""}
                                  disabled={isReadOnly}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                    {/* TAB MÍDIA */}
                    <TabsContent value="media" className="space-y-6">
                      {/* IMAGENS */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold">Imagens</h3>
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              id="image-upload"
                              onChange={(e) => {
                                if (e.target.files) {
                                  setImages((prev) => [
                                    ...prev,
                                    ...Array.from(e.target.files!),
                                  ]);
                                }
                              }}
                              disabled={isReadOnly}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                document.getElementById("image-upload")?.click()
                              }
                              disabled={isReadOnly}
                            >
                              <Plus size={14} className="mr-1" /> Adicionar
                            </Button>
                          </div>
                        </div>

                        {/* Imagens existentes */}
                        {initialData?.images &&
                          initialData.images.length > 0 && (
                            <div className="grid grid-cols-4 gap-2">
                              {initialData.images
                                .filter(
                                  (img) => !removedImageIds.includes(img.id),
                                )
                                .map((img) => (
                                  <div
                                    key={img.id}
                                    className="relative group aspect-square rounded-lg overflow-hidden border"
                                  >
                                    <img
                                      src={img.url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveExistingMedia(
                                            img.id,
                                            "image",
                                          )
                                        }
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}

                        {/* Novas imagens */}
                        {images.length > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {images.map((file, index) => (
                              <div
                                key={index}
                                className="relative group aspect-square rounded-lg overflow-hidden border bg-slate-50"
                              >
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-xs text-center p-1">
                                    {truncateFileName(file.name, 15)}
                                  </span>
                                </div>
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveNewFile(index, "image")
                                    }
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* VÍDEOS */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold">Vídeos</h3>
                          <Input
                            type="file"
                            accept="video/*"
                            multiple
                            className="hidden"
                            id="video-upload"
                            onChange={(e) => {
                              if (e.target.files) {
                                setVideos((prev) => [
                                  ...prev,
                                  ...Array.from(e.target.files!),
                                ]);
                              }
                            }}
                            disabled={isReadOnly}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              document.getElementById("video-upload")?.click()
                            }
                            disabled={isReadOnly}
                          >
                            <Plus size={14} className="mr-1" /> Adicionar
                          </Button>
                        </div>

                        {/* Vídeos existentes */}
                        {initialData?.videos &&
                          initialData.videos.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {initialData.videos
                                .filter(
                                  (vid) => !removedVideoIds.includes(vid.id),
                                )
                                .map((vid) => (
                                  <div
                                    key={vid.id}
                                    className="relative group p-2 bg-slate-50 rounded-lg border flex items-center justify-between"
                                  >
                                    <span className="text-xs truncate">
                                      {truncateFileName(vid.filename, 25)}
                                    </span>
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveExistingMedia(
                                            vid.id,
                                            "video",
                                          )
                                        }
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}

                        {/* Novos vídeos */}
                        {videos.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {videos.map((file, index) => (
                              <div
                                key={index}
                                className="relative group p-2 bg-slate-50 rounded-lg border flex items-center justify-between"
                              >
                                <span className="text-xs truncate">
                                  {truncateFileName(file.name, 25)}
                                </span>
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveNewFile(index, "video")
                                    }
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ÁUDIOS */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold">Áudios</h3>
                          <div className="flex gap-2">
                            {!isRecording ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={startRecording}
                                disabled={isReadOnly}
                              >
                                <span className="text-red-500 mr-1">●</span>{" "}
                                Gravar
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={stopRecording}
                              >
                                Parar
                              </Button>
                            )}
                            <Input
                              type="file"
                              accept="audio/*"
                              multiple
                              className="hidden"
                              id="audio-upload"
                              onChange={(e) => {
                                if (e.target.files) {
                                  setAudios((prev) => [
                                    ...prev,
                                    ...Array.from(e.target.files!),
                                  ]);
                                }
                              }}
                              disabled={isReadOnly}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                document.getElementById("audio-upload")?.click()
                              }
                              disabled={isReadOnly}
                            >
                              <Plus size={14} className="mr-1" /> Upload
                            </Button>
                          </div>
                        </div>

                        {/* Áudios existentes */}
                        {initialData?.audios &&
                          initialData.audios.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {initialData.audios
                                .filter(
                                  (aud) => !removedAudioIds.includes(aud.id),
                                )
                                .map((aud) => (
                                  <div
                                    key={aud.id}
                                    className="relative group p-2 bg-slate-50 rounded-lg border flex items-center justify-between"
                                  >
                                    <span className="text-xs truncate">
                                      {truncateFileName(aud.filename, 25)}
                                    </span>
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveExistingMedia(
                                            aud.id,
                                            "audio",
                                          )
                                        }
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}

                        {/* Novos áudios */}
                        {audios.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {audios.map((file, index) => (
                              <div
                                key={index}
                                className="relative group p-2 bg-slate-50 rounded-lg border flex items-center justify-between"
                              >
                                <span className="text-xs truncate">
                                  {truncateFileName(file.name, 25)}
                                </span>
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveNewFile(index, "audio")
                                    }
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* TAB HISTÓRICO */}
                    <TabsContent value="history" className="space-y-4">
                      <FlowHistoryModal
                        logs={historyLogs}
                        isLoading={isLoadingHistory}
                        users={users}
                        suppliers={suppliers}
                        stages={stages}
                      />
                    </TabsContent>
                  </Tabs>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </div>

        {/* FOOTER */}
        <DialogFooter className="px-6 py-4 border-t bg-slate-50 shrink-0 flex items-center justify-between sm:justify-between">
          <div>
            {isEditing && onDelete && initialData && !isReadOnly && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => onDelete(initialData.id)}
                disabled={isLoading}
              >
                <Trash2 size={16} className="mr-2" /> Excluir
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {isReadOnly ? "Fechar" : "Cancelar"}
            </Button>

            {!isReadOnly && (
              <Button
                form="flow-item-form"
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white"
                disabled={isLoading || isLoadingStages}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

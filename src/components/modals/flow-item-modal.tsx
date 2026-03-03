/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  AlertTriangle,
  Edit,
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
  // 🔥 Lista de fluxos disponíveis
  flows?: { id: string; name: string; color?: string }[];

  // 🔥 Props de Permissão
  currentUserRole?: string;
  currentUserSystemRole?: string; // MASTER, ADMIN, MANAGER, etc
  isReadOnly?: boolean;

  // 🔥 Indica se há múltiplos fluxos selecionados
  hasMultipleFlows?: boolean;

  // Ações
  onDelete?: (id: string) => void;
  onAdvance?: (item: FlowItem) => Promise<void>;
  // 🔥 Callback quando o fluxo mudar para buscar stages
  onFlowChange?: (flowId: string) => Promise<FlowStage[]>;
}

// --- SCHEMA DE VALIDAÇÃO ---

const itemSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  productRef: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantidade mínima").default(1),
  status: z.string().default("PENDENTE"),
  // 🔥 Campo flowId opcional (quando tem múltiplos fluxos é obrigatório)
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

// --- COMPONENTE ---

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
  flows = [], // 🔥 VALOR PADRÃO: array vazio
  currentUserRole,
  currentUserSystemRole,
  onDelete,
  onAdvance,
  onFlowChange,
  isReadOnly = false,
  hasMultipleFlows = false, // 🔥 NOVA PROP
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

  // ===========================================================================
  // 🔥 ESTADOS PARA HISTÓRICO
  // ===========================================================================
  const [historyLogs, setHistoryLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ===========================================================================
  // 🔥 ESTADOS PARA SELEÇÃO DE FLUXO
  // ===========================================================================
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

  // Watch para monitorar o fluxo selecionado (quando aplicável)
  const selectedFlowId = form.watch("flowId");
  const selectedStageId = form.watch("stageId");

  // ===========================================================================
  // 🔥 FUNÇÃO PARA BUSCAR HISTÓRICO DO ITEM
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
  // 🔥 FUNÇÃO PARA BUSCAR STAGES QUANDO O FLUXO MUDAR - CORRIGIDA
  // ===========================================================================
  const handleFlowChange = useCallback(
    async (flowId: string) => {
      console.log("🔄 [FlowItemModal] Mudando para flow:", flowId);

      // 🔥 Se não tiver múltiplos fluxos, não deve mudar o fluxo
      if (!hasMultipleFlows) {
        console.log("⚠️ Ignorando mudança de fluxo - modo único fluxo");
        return;
      }

      if (!flowId) {
        setAvailableStages([]);
        return;
      }

      setIsLoadingStages(true);

      // 🔥 RESETA A STAGE SELECIONADA
      form.setValue("stageId", "");

      try {
        if (onFlowChange) {
          console.log("📡 Buscando stages do flow via callback...");
          const stagesFromParent = await onFlowChange(flowId);
          console.log("✅ Stages recebidas:", stagesFromParent.length);
          console.log(
            "📋 Lista de stages:",
            stagesFromParent.map((s) => ({ id: s.id, name: s.name })),
          );

          setAvailableStages(stagesFromParent);

          // ✅ NÃO SELECIONA AUTOMATICAMENTE - DEIXA O USUÁRIO ESCOLHER
        } else {
          // 🔥 Fallback - busca direto da API
          console.log("📡 Buscando stages via API direta...");
          try {
            const response = await api.get(`/flow/${flowId}/stages`);
            setAvailableStages(response.data);
          } catch (error) {
            console.error("Erro ao buscar stages:", error);
            setAvailableStages([]);
          }
        }
      } catch (error) {
        console.error("❌ Erro ao buscar stages:", error);
        toast.error("Erro ao carregar etapas do fluxo");
        setAvailableStages([]);
      } finally {
        setIsLoadingStages(false);
      }
    },
    [onFlowChange, form, hasMultipleFlows],
  ); // 🔥 Adiciona hasMultipleFlows nas dependências

  // ===========================================================================
  // 🔥 EFEITO PARA POPULAR DADOS AO ABRIR
  // ===========================================================================
  useEffect(() => {
    // Só executa quando o modal abre
    if (!isOpen) return;

    console.log("📂 [FlowItemModal] Abrindo modal");
    console.log("initialData:", initialData);
    console.log("initialStageId:", initialStageId);
    console.log("hasMultipleFlows:", hasMultipleFlows);
    console.log("flows disponíveis:", flows.length);
    console.log("stages disponíveis:", stages.length);

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

    // 🔥 Se for edição, busca o histórico
    if (initialData?.id) {
      fetchItemHistory(initialData.id);
    } else {
      setHistoryLogs([]);
    }

    // 🔥 Reset do formulário baseado nos dados
    if (initialData) {
      console.log("📝 Populando formulário com dados existentes");
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
        dueDate: initialData.dueDate
          ? initialData.dueDate.substring(0, 10)
          : "",
        productionStartedAt: initialData.productionStartedAt
          ? initialData.productionStartedAt.substring(0, 10)
          : "",
        deliveryAt: initialData.deliveryAt
          ? initialData.deliveryAt.substring(0, 10)
          : "",
      });

      // 🔥 Busca stages do fluxo selecionado
      if (initialData.flowId) {
        console.log(
          "🔄 Buscando stages para o flow do item:",
          initialData.flowId,
        );
        setTimeout(() => {
          handleFlowChange(initialData.flowId);
        }, 100);
      }
    } else {
      // 🔥 Para novo item
      console.log("🆕 Criando novo item");

      // 🔥 CASO 1: Múltiplos fluxos selecionados
      if (hasMultipleFlows) {
        console.log(
          "📌 Múltiplos fluxos detectados - usuário precisa escolher",
        );

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
          setTimeout(() => {
            handleFlowChange(defaultFlowId);
          }, 100);
        }
      }
      // 🔥 CASO 2: Único fluxo selecionado
      else {
        console.log("📌 Único fluxo detectado - usando fluxo selecionado");
        console.log("initialStageId:", initialStageId);

        // Pega o ID do único fluxo selecionado
        const singleFlowId = flows.length > 0 ? flows[0].id : "";

        if (!singleFlowId) {
          console.error("❌ Nenhum fluxo disponível");
          return;
        }

        // 🔥 VERIFICAÇÃO IMPORTANTE: Se tem initialStageId, usa ele
        if (initialStageId) {
          console.log("🎯 initialStageId presente:", initialStageId);

          // Busca a stage correspondente para confirmar
          const stage = stages.find((s) => s.id === initialStageId);

          if (stage) {
            console.log("✅ Stage encontrada:", stage);

            form.reset({
              title: "",
              description: "",
              productRef: "",
              quantity: 0,
              status: "PENDENTE",
              flowId: stage.flowId, // Usa o flowId da stage
              stageId: initialStageId, // 🔥 PRÉ-SELECIONA A STAGE
              assignedToId: "unassigned",
              supplierId: "internal",
              dueDate: "",
              productionStartedAt: "",
              deliveryAt: "",
            });

            // Busca as stages do flow (opcional, para referência)
            setTimeout(() => {
              handleFlowChange(stage.flowId);
            }, 100);
          } else {
            console.warn(
              "⚠️ Stage não encontrada para initialStageId:",
              initialStageId,
            );
            console.log(
              "Stages disponíveis:",
              stages.map((s) => ({ id: s.id, name: s.name })),
            );

            // Fallback: usa o fluxo padrão sem stage pré-selecionada
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

            setTimeout(() => {
              handleFlowChange(singleFlowId);
            }, 100);
          }
        } else {
          // Sem initialStageId (improvável, mas por segurança)
          console.warn("⚠️ Sem initialStageId mesmo com único fluxo");
          console.log(
            "Isso pode acontecer se o modal for aberto sem clicar em uma coluna",
          );

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

          setTimeout(() => {
            handleFlowChange(singleFlowId);
          }, 100);
        }
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // 🔥 Dependência apenas em isOpen

  // ===========================================================================
  // 🔥 EFEITO PARA LOGS DE DEBUG
  // ===========================================================================
  useEffect(() => {
    if (isOpen) {
      console.log("📍 Estado atual:", {
        selectedFlowId,
        availableStages: availableStages.length,
        selectedStageId,
        isLoadingStages,
        hasMultipleFlows,
      });
    }
  }, [
    selectedFlowId,
    availableStages,
    selectedStageId,
    isLoadingStages,
    hasMultipleFlows,
    isOpen,
  ]);

  // --- Funções de Gravação de Áudio ---
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

  // --- Manipulação de Arquivos Locais ---
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
    if (type === "image") {
      setRemovedImageIds((prev) => [...prev, mediaId]);
    } else if (type === "video") {
      setRemovedVideoIds((prev) => [...prev, mediaId]);
    } else if (type === "audio") {
      setRemovedAudioIds((prev) => [...prev, mediaId]);
    }
  };

  // 🔥 Verifica se uma etapa é de Corte
  const isCorteStage = useCallback((stageName: string): boolean => {
    const name = stageName?.toLowerCase().trim() || "";
    return CORTE_KEYWORDS.some((keyword) => name.includes(keyword));
  }, []);

  // 🔥 Verifica se o usuário é ADMIN (MASTER, ADMIN, MANAGER)
  const isUserAdmin = useCallback((): boolean => {
    const systemRole = currentUserSystemRole;
    if (!systemRole) return false;
    return ADMIN_ROLES.includes(systemRole);
  }, [currentUserSystemRole]);

  // 🔥 Verifica se o usuário tem permissão de Corte (cargo de corte)
  const userHasCortePermission = useCallback((): boolean => {
    const role = currentUserRole?.toLowerCase() || "";
    return CORTE_KEYWORDS.some((keyword) => role.includes(keyword));
  }, [currentUserRole]);

  // 🔥 VERIFICA SE O USUÁRIO PODE EDITAR A QUANTIDADE
  const canEditQuantity = useMemo(() => {
    const isAdmin = isUserAdmin();

    if (isAdmin) {
      return true;
    }

    return isInCorte && userHasCortePermission();
  }, [isInCorte, isUserAdmin, userHasCortePermission]);

  // 🔥 Monitora a etapa atual
  const currentStage = availableStages.find((s) => s.id === selectedStageId);
  const isCurrentStageCorte = currentStage
    ? isCorteStage(currentStage.name)
    : false;

  // 🔥 Efeito para determinar a posição do item em relação à coluna Corte
  useEffect(() => {
    if (!availableStages.length || !isOpen) {
      return;
    }

    const sortedStages = [...availableStages].sort((a, b) => a.order - b.order);
    const corteIndex = sortedStages.findIndex((s) => isCorteStage(s.name));

    if (corteIndex === -1) {
      setHasPassedCorte(false);
      setIsInCorte(false);
      return;
    }

    if (!isEditing) {
      setIsInCorte(isCurrentStageCorte);
      setHasPassedCorte(false);
      return;
    }

    if (initialData) {
      const stageExists = sortedStages.some(
        (s) => s.id === initialData.stageId,
      );

      if (!stageExists) {
        return;
      }

      const currentItemStageIndex = sortedStages.findIndex(
        (s) => s.id === initialData.stageId,
      );

      const inCorte = currentItemStageIndex === corteIndex;
      const passedCorte = currentItemStageIndex > corteIndex;

      setIsInCorte(inCorte);
      setHasPassedCorte(passedCorte);
    }
  }, [
    availableStages,
    initialData,
    isEditing,
    selectedStageId,
    isCurrentStageCorte,
    isCorteStage,
    isOpen,
  ]);

  // 🔥 Lógica principal do campo quantidade
  const isQuantityDisabled = useMemo(() => {
    if (isReadOnly) return true;
    if (!canEditQuantity) return true;
    return false;
  }, [isReadOnly, canEditQuantity]);

  // 🔥 Verifica se a quantidade é obrigatória
  const isQuantityRequired = useMemo(() => {
    if (isUserAdmin()) return false;
    if (isInCorte) return true;
    return false;
  }, [isInCorte, isUserAdmin]);

  // --- Submit do formulário ---
  const handleSubmit = async (values: ItemFormValues) => {
    console.log("\n");
    console.log("=".repeat(80));
    console.log("📤 [FlowItemModal] SUBMETENDO FORMULÁRIO");
    console.log("=".repeat(80));
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
    });
    console.log("📌 Contexto:", {
      hasMultipleFlows,
      initialStageId,
      isEditing,
      selectedFlowId: form.getValues("flowId"),
      selectedStageId: form.getValues("stageId"),
      flowsDisponiveis: flows.length,
      stagesDisponiveis: stages.length,
      availableStagesCount: availableStages.length,
    });

    // ===========================================================================
    // 🔥 PASSO 1: PREPARAR PAYLOAD BASEADO NO CONTEXTO
    // ===========================================================================
    let payload: any;

    if (hasMultipleFlows) {
      // =========================================================================
      // 🔥 CASO 1: MÚLTIPLOS FLUXOS - USUÁRIO ESCOLHEU TUDO
      // =========================================================================
      console.log("📌 Modo: Múltiplos fluxos - validando seleções do usuário");

      // Validar se fluxo foi selecionado
      if (!values.flowId) {
        console.error("❌ flowId não informado");
        toast.error("Selecione uma coleção");
        return;
      }

      // Validar se etapa foi selecionada
      if (!values.stageId) {
        console.error("❌ stageId não informado");
        toast.error("Selecione uma etapa");
        return;
      }

      // Verificar se a stage pertence ao flow selecionado
      console.log("🔍 Verificando se stage pertence ao flow:", {
        flowId: values.flowId,
        stageId: values.stageId,
        stagesDisponiveis: availableStages.map((s) => ({
          id: s.id,
          name: s.name,
        })),
      });

      const stageBelongsToFlow = availableStages.some(
        (s) => s.id === values.stageId,
      );
      if (!stageBelongsToFlow) {
        console.error("❌ Stage não pertence ao flow selecionado");
        toast.error("Etapa inválida para o fluxo selecionado");
        return;
      }

      console.log("✅ Stage pertence ao flow");

      payload = {
        ...values,
        flowId: values.flowId,
        stageId: values.stageId,
      };
    } else {
      // =========================================================================
      // 🔥 CASO 2: ÚNICO FLUXO - USA FLUXO SELECIONADO E STAGE DO CLIQUE
      // =========================================================================
      console.log(
        "📌 Modo: Único fluxo - usando fluxo padrão e stage do clique",
      );

      const singleFlowId = flows.length > 0 ? flows[0].id : "";

      if (!singleFlowId) {
        console.error("❌ Nenhum fluxo disponível");
        toast.error("Nenhum fluxo disponível");
        return;
      }

      console.log("📌 Fluxo único:", {
        singleFlowId,
        flowName: flows[0]?.name,
      });

      // =========================================================================
      // 🔥 VALIDAÇÃO PARA MODO CRIAÇÃO (NOVO ITEM)
      // =========================================================================
      if (!isEditing) {
        console.log("📌 Modo criação - validando stage");

        // Caso 1: Tem initialStageId (veio do clique no "+")
        if (initialStageId) {
          console.log("✅ initialStageId presente:", initialStageId);

          // Verifica se a stage existe no array de stages
          const stageExists = stages.some((s) => s.id === initialStageId);

          if (!stageExists) {
            console.error(
              "❌ Stage não encontrada no array de stages:",
              initialStageId,
            );
            console.log(
              "Stages disponíveis:",
              stages.map((s) => ({ id: s.id, name: s.name })),
            );

            // 🔥 TENTATIVA DE RECUPERAÇÃO: verifica se a stage está em availableStages
            const stageInAvailable = availableStages.some(
              (s) => s.id === initialStageId,
            );

            if (stageInAvailable) {
              console.log(
                "✅ Stage encontrada em availableStages, usando como fallback",
              );
              payload = {
                ...values,
                flowId: singleFlowId,
                stageId: initialStageId,
              };
            } else {
              toast.error("Etapa não encontrada");
              return;
            }
          } else {
            console.log("✅ Stage válida encontrada");
            payload = {
              ...values,
              flowId: singleFlowId,
              stageId: initialStageId,
            };
          }
        }
        // Caso 2: Não tem initialStageId (improvável, mas por segurança)
        else {
          console.warn(
            "⚠️ initialStageId não encontrado, tentando usar values.stageId",
          );

          if (values.stageId) {
            console.log(
              "✅ Usando values.stageId como fallback:",
              values.stageId,
            );

            // Verifica se a stage em values.stageId é válida
            const stageExists =
              stages.some((s) => s.id === values.stageId) ||
              availableStages.some((s) => s.id === values.stageId);

            if (stageExists) {
              payload = {
                ...values,
                flowId: singleFlowId,
                stageId: values.stageId,
              };
            } else {
              console.error("❌ Stage inválida em values.stageId");
              toast.error("Etapa inválida");
              return;
            }
          } else {
            console.error("❌ Nenhuma stage disponível para criar o item");
            toast.error(
              "Erro ao identificar etapa. Tente novamente ou selecione outro fluxo.",
            );
            return;
          }
        }
      }
      // =========================================================================
      // 🔥 MODO EDIÇÃO (EDITANDO ITEM EXISTENTE)
      // =========================================================================
      else {
        console.log("📌 Modo edição - usando stage do formulário");

        if (!values.stageId) {
          console.error("❌ stageId não informado no modo edição");
          toast.error("Selecione uma etapa");
          return;
        }

        // Verifica se a stage é válida
        const stageExists =
          stages.some((s) => s.id === values.stageId) ||
          availableStages.some((s) => s.id === values.stageId);

        if (!stageExists) {
          console.error("❌ Stage inválida no modo edição:", values.stageId);
          toast.error("Etapa inválida");
          return;
        }

        payload = {
          ...values,
          flowId: singleFlowId,
          stageId: values.stageId,
        };
      }
    }

    console.log("📦 Payload preparado:", {
      ...payload,
      flowId: payload.flowId,
      stageId: payload.stageId,
    });

    // ===========================================================================
    // 🔥 PASSO 2: VALIDAÇÃO DA QUANTIDADE
    // ===========================================================================
    const quantityNum = Number(payload.quantity);
    const isAdmin = isUserAdmin();

    console.log("🔍 Validando quantidade:", {
      quantity: quantityNum,
      isAdmin,
      isInCorte,
      isQuantityRequired,
    });

    if (!isAdmin) {
      if (isInCorte && (!quantityNum || quantityNum < 1)) {
        console.error("❌ Quantidade inválida para coluna Corte");
        setShowQuantityWarning(true);
        toast.error(
          "Você está na coluna Corte. A quantidade é obrigatória e deve ser maior que zero.",
        );
        return;
      }
    }

    // ===========================================================================
    // 🔥 PASSO 3: PREPARAR VALORES FINAIS (TRATAR NULLS E DADOS ESPECIAIS)
    // ===========================================================================
    const finalPayload = {
      title: payload.title,
      description: payload.description || null,
      productRef: payload.productRef || null,
      quantity: quantityNum,
      status: payload.status || "PENDENTE",
      flowId: payload.flowId,
      stageId: payload.stageId,
      assignedToId:
        payload.assignedToId === "unassigned" || !payload.assignedToId
          ? null
          : payload.assignedToId,
      supplierId:
        payload.supplierId === "internal" || !payload.supplierId
          ? null
          : payload.supplierId,
      dueDate: payload.dueDate || null,
      productionStartedAt: payload.productionStartedAt || null,
      deliveryAt: payload.deliveryAt || null,
      orderNumber: payload.orderNumber || "",
      priority: payload.priority || 3,
    };

    console.log("🚀 Payload final a ser enviado:", finalPayload);
    console.log("📦 Mídias:", {
      images: images.length,
      audios: audios.length,
      videos: videos.length,
    });
    console.log("🗑️ Mídias removidas:", {
      images: removedImageIds.length,
      audios: removedAudioIds.length,
      videos: removedVideoIds.length,
    });

    // ===========================================================================
    // 🔥 PASSO 4: ENVIAR PARA O COMPONENTE PAI
    // ===========================================================================
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

      console.log("✅ Submit concluído com sucesso");
    } catch (error) {
      console.error("❌ Erro no submit:", error);
      // O erro já será tratado no componente pai
    }
  };

  // --- Helper de Texto ---
  const truncateFileName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    const extIndex = name.lastIndexOf(".");
    const ext = extIndex !== -1 ? name.substring(extIndex) : "";
    const nameWithoutExt = extIndex !== -1 ? name.substring(0, extIndex) : name;

    const keepChars = Math.floor((maxLength - ext.length - 3) / 2);
    return `${nameWithoutExt.substring(0, keepChars)}...${nameWithoutExt.substring(nameWithoutExt.length - keepChars)}${ext}`;
  };

  // Encontra a stage atual para exibir no texto informativo
  const currentStageInfo = useMemo(() => {
    if (!initialStageId) return null;
    return stages.find((s) => s.id === initialStageId);
  }, [initialStageId, stages]);

  // Se não tiver múltiplos fluxos, não mostra o campo de seleção de fluxo
  const showFlowSelector = hasMultipleFlows;

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
              {isReadOnly && (
                <p className="text-[10px] text-red-500 font-medium flex items-center gap-1 mt-1">
                  <AlertTriangle size={10} />
                  Modo Leitura: Você não tem permissão para editar nesta coluna.
                </p>
              )}
              {isUserAdmin() && !isReadOnly && (
                <p className="text-[10px] text-purple-600 font-medium flex items-center gap-1 mt-1">
                  <User size={10} />
                  Modo Administrador: Você tem acesso total a todos os campos.
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* BODY (Scrollable) */}
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

                    {/* --- TAB DETALHES --- */}
                    <TabsContent value="details" className="space-y-4">
                      {/* 🔥 CAMPO COLEÇÃO/FLUXO - SÓ APARECE COM MÚLTIPLOS FLUXOS */}
                      {showFlowSelector && (
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={form.control}
                            name="flowId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Layers size={14} /> Coleção / Fluxo *
                                </FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    console.log("🎯 Flow selecionado:", value);
                                    field.onChange(value);
                                    // 🔥 Só chama handleFlowChange se tiver múltiplos fluxos
                                    if (hasMultipleFlows) {
                                      handleFlowChange(value);
                                    }
                                  }}
                                  value={field.value}
                                  disabled={
                                    isReadOnly ||
                                    isLoadingStages ||
                                    flows.length === 0 ||
                                    !hasMultipleFlows
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={
                                          flows.length === 0
                                            ? "Nenhuma coleção disponível"
                                            : "Selecione uma coleção..."
                                        }
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {flows.map((flow) => (
                                      <SelectItem key={flow.id} value={flow.id}>
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
                        </div>
                      )}

                      {/* 🔥 CAMPO ETAPA - CONDICIONAL */}
                      {hasMultipleFlows ? (
                        // Caso 1: Múltiplos fluxos - mostra select de etapa
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={form.control}
                            name="stageId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Layers size={14} /> Etapa *
                                </FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    console.log("📍 Stage selecionada:", value);
                                    field.onChange(value);
                                  }}
                                  value={field.value}
                                  disabled={
                                    isReadOnly ||
                                    !selectedFlowId ||
                                    isLoadingStages ||
                                    availableStages.length === 0
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={
                                          isLoadingStages
                                            ? "Carregando etapas..."
                                            : !selectedFlowId
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
                                      <SelectItem
                                        key={stage.id}
                                        value={stage.id}
                                      >
                                        {stage.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ) : (
                        // Caso 2: Único fluxo - mostra texto informativo com a etapa
                        !isEditing &&
                        initialStageId &&
                        currentStageInfo && (
                          <div className="grid grid-cols-1 gap-4">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <p className="text-sm text-slate-700">
                                <span className="font-medium">Etapa:</span>{" "}
                                {currentStageInfo.name}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Item será criado na etapa selecionada no kanban
                              </p>
                            </div>
                          </div>
                        )
                      )}

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
                              <FormLabel>Referência</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="REF-001"
                                  {...field}
                                  disabled={isReadOnly}
                                />
                              </FormControl>
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

                      {/* 🔥 CAMPO QUANTIDADE */}
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => {
                            return (
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
                                      isUserAdmin() &&
                                        !isQuantityDisabled &&
                                        "border-purple-300 focus:border-purple-500 bg-purple-50",
                                    )}
                                    value={field.value?.toString() ?? "0"}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      field.onChange(newValue);
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
                                    <AlertCircle size={12} />A quantidade é
                                    obrigatória e deve ser maior que zero na
                                    coluna Corte.
                                  </p>
                                )}

                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>

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

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dashed">
                        <FormField
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
                        />
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

                    {/* --- TAB MEDIA --- */}
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

                    {/* --- TAB HISTÓRICO --- */}
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
          {/* ESQUERDA: Botão de Excluir */}
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

          {/* DIREITA: Cancelar e Salvar */}
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
                className={cn(
                  "text-white",
                  isUserAdmin()
                    ? "bg-purple-700 hover:bg-purple-800"
                    : "bg-slate-800 hover:bg-slate-900",
                )}
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

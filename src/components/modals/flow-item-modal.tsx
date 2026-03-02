/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  AlertTriangle,
  Edit,
  Factory,
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

  // 🔥 Props de Permissão
  currentUserRole?: string;
  currentUserSystemRole?: string; // MASTER, ADMIN, MANAGER, etc
  isReadOnly?: boolean;

  // Ações
  onDelete?: (id: string) => void;
  onAdvance?: (item: FlowItem) => Promise<void>;
}

// --- SCHEMA DE VALIDAÇÃO ---

const itemSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  productRef: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantidade mínima").default(1),
  status: z.string().default("PENDENTE"),
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
  currentUserRole,
  currentUserSystemRole,
  onDelete,
  onAdvance,
  isReadOnly = false,
}: FlowItemModalProps) {
  const isEditing = !!initialData;

  // LOG INICIAL CRÍTICO
  console.log("🔴🔴🔴 [FlowItemModal] INÍCIO - Props recebidas:", {
    isOpen,
    isEditing,
    initialDataId: initialData?.id,
    initialDataQuantity: initialData?.quantity,
    stagesCount: stages.length,
    isReadOnly,
    currentUserSystemRole, // ← ISSO É CRÍTICO!
    currentUserRole,
    currentUserSystemRoleType: typeof currentUserSystemRole,
    currentUserSystemRoleValue: currentUserSystemRole,
    adminRolesEsperados: ADMIN_ROLES,
  });

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

  // --- Hook Form ---
  const form = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: "",
      description: "",
      productRef: "",
      quantity: 0,
      status: "PENDENTE",
      stageId: "",
      assignedToId: "",
      supplierId: "",
      dueDate: "",
      productionStartedAt: "",
      deliveryAt: "",
    },
  });

  useEffect(() => {
    if (initialData && stages.length > 0) {
      console.log("🔍 DEBUG - Verificando stages:", {
        itemStageId: initialData.stageId,
        stages: stages.map((s) => ({ id: s.id, name: s.name })),
        found: stages.some((s) => s.id === initialData.stageId),
      });
    }
  }, [initialData, stages]);

  // --- Efeito: Popular Dados ao Abrir ---
  useEffect(() => {
    if (isOpen) {
      console.log("📝 [FlowItemModal] Abrindo modal");

      setImages([]);
      setVideos([]);
      setAudios([]);
      setRemovedImageIds([]);
      setRemovedVideoIds([]);
      setRemovedAudioIds([]);
      setIsRecording(false);
      setShowQuantityWarning(false);

      // Resetar estados de validação
      setHasPassedCorte(false);
      setIsInCorte(false);

      if (initialData) {
        console.log("📝 [FlowItemModal] Populando com dados existentes:", {
          id: initialData.id,
          title: initialData.title,
          quantity: initialData.quantity,
          stageId: initialData.stageId,
        });

        form.reset({
          title: initialData.title,
          description: initialData.description || "",
          productRef: initialData.productRef || "",
          quantity: initialData.quantity,
          status: initialData.status,
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
      } else {
        console.log(
          "📝 [FlowItemModal] Criando novo item, stage inicial:",
          initialStageId,
        );

        form.reset({
          title: "",
          description: "",
          productRef: "",
          quantity: 0,
          status: "PENDENTE",
          stageId: initialStageId || (stages.length > 0 ? stages[0].id : ""),
          assignedToId: "unassigned",
          supplierId: "internal",
          dueDate: "",
          productionStartedAt: "",
          deliveryAt: "",
        });
      }
    }
  }, [isOpen, initialData, stages, form, initialStageId]);

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
      console.error(err);
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

  // 🔥 Verifica se uma etapa é de Corte
  const isCorteStage = useCallback((stageName: string): boolean => {
    const name = stageName?.toLowerCase().trim() || "";
    const result = CORTE_KEYWORDS.some((keyword) => name.includes(keyword));
    console.log(
      `🔍 [isCorteStage] "${stageName}" -> ${result ? "É CORTE" : "NÃO É CORTE"}`,
    );
    return result;
  }, []);

  // 🔥 Verifica se o usuário é ADMIN (MASTER, ADMIN, MANAGER) - COM LOG DETALHADO
  const isUserAdmin = useCallback((): boolean => {
    console.log("🔴🔴🔴 [isUserAdmin] VERIFICANDO ADMIN - INÍCIO");
    console.log(
      "[isUserAdmin] currentUserSystemRole recebido:",
      currentUserSystemRole,
    );
    console.log("[isUserAdmin] Tipo:", typeof currentUserSystemRole);

    // Pega da props
    const systemRole = currentUserSystemRole;

    if (!systemRole) {
      console.log("🔴 [isUserAdmin] systemRole é falsy:", systemRole);
      return false;
    }

    const adminRoles = ["MASTER", "ADMIN", "MANAGER"];
    const result = adminRoles.includes(systemRole);

    console.log(
      `🔍 [isUserAdmin] SystemRole: "${systemRole}" -> ${result ? "✅ É ADMIN" : "❌ NÃO É ADMIN"}`,
    );
    console.log(
      "🔴🔴🔴 [isUserAdmin] VERIFICANDO ADMIN - FIM, resultado:",
      result,
    );

    return result;
  }, [currentUserSystemRole]);

  // 🔥 Verifica se o usuário tem permissão de Corte (cargo de corte)
  const userHasCortePermission = useCallback((): boolean => {
    const role = currentUserRole?.toLowerCase() || "";
    const result = CORTE_KEYWORDS.some((keyword) => role.includes(keyword));
    console.log(
      `🔍 [userHasCortePermission] Role: "${currentUserRole}" -> ${result ? "TEM PERMISSÃO" : "NÃO TEM PERMISSÃO"}`,
    );
    return result;
  }, [currentUserRole]);

  // 🔥 VERIFICA SE O USUÁRIO PODE EDITAR A QUANTIDADE - COM LOG
  const canEditQuantity = useMemo(() => {
    console.log("🔴🔴🔴 [canEditQuantity] CALCULANDO - INÍCIO");

    const isAdmin = isUserAdmin();
    console.log("[canEditQuantity] isUserAdmin():", isAdmin);
    console.log("[canEditQuantity] isInCorte:", isInCorte);
    console.log(
      "[canEditQuantity] userHasCortePermission:",
      userHasCortePermission(),
    );

    // 👑 ADMIN PODE TUDO! (independente da coluna)
    if (isAdmin) {
      console.log(
        "👑👑👑 [canEditQuantity] ADMIN DETECTADO - PODE EDITAR EM QUALQUER COLUNA! 👑👑👑",
      );
      return true; // ADMIN SEMPRE PODE EDITAR
    }

    // Para não-admin: só pode editar se estiver na coluna Corte E tiver permissão
    const canEdit = isInCorte && userHasCortePermission();
    console.log(
      `🔑 [canEditQuantity] ${canEdit ? "PODE" : "NÃO PODE"} editar (não-admin)`,
    );

    console.log("🔴🔴🔴 [canEditQuantity] RESULTADO FINAL:", canEdit);
    return canEdit;
  }, [isInCorte, isUserAdmin, userHasCortePermission]);

  // 🔥 Monitora a etapa atual e calcula a posição em relação ao Corte
  const selectedStageId = form.watch("stageId");
  const currentStage = stages.find((s) => s.id === selectedStageId);
  const isCurrentStageCorte = currentStage
    ? isCorteStage(currentStage.name)
    : false;

  console.log("📍 [FlowItemModal] Estado atual:", {
    selectedStageId,
    currentStageName: currentStage?.name,
    isCurrentStageCorte,
    hasPassedCorte,
    isInCorte,
  });

  // 🔥 Efeito para determinar a posição do item em relação à coluna Corte
  useEffect(() => {
    console.log("🔄 [FlowItemModal] Calculando posição...", {
      hasStages: stages.length > 0,
      isEditing,
      hasInitialData: !!initialData,
    });

    if (!stages.length) {
      console.log("⚠️ [FlowItemModal] Sem stages para calcular posição");
      return;
    }

    console.log(
      "📊 Stages recebidas:",
      stages.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
      })),
    );

    // Ordena as etapas por ordem
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    console.log(
      "📊 Stages ordenadas:",
      sortedStages.map((s) => ({
        name: s.name,
        order: s.order,
      })),
    );

    // Encontra o índice da etapa de Corte
    const corteIndex = sortedStages.findIndex((s) => isCorteStage(s.name));
    console.log(
      `📍 Índice da etapa Corte: ${corteIndex}`,
      corteIndex !== -1
        ? `(${sortedStages[corteIndex]?.name})`
        : "(não encontrada)",
    );

    // Se não tem coluna Corte, não aplica a regra
    if (corteIndex === -1) {
      console.log("⚠️ Nenhuma etapa de Corte encontrada");
      setHasPassedCorte(false);
      setIsInCorte(false);
      return;
    }

    // Para criação de novo item
    if (!isEditing) {
      console.log("🆕 Criando novo item");
      console.log(`📍 Stage selecionada: ${selectedStageId}`);
      console.log(`📍 É etapa de Corte? ${isCurrentStageCorte}`);

      setIsInCorte(isCurrentStageCorte);
      setHasPassedCorte(false);
      return;
    }

    // Para edição de item existente
    if (initialData) {
      console.log("📝 Editando item existente");
      console.log(`📍 Stage atual do item: ${initialData.stageId}`);

      // Verifica se o stage do item existe nos stages atuais
      const stageExists = sortedStages.some(
        (s) => s.id === initialData.stageId,
      );
      console.log(`📍 Stage existe na lista? ${stageExists}`);

      if (!stageExists) {
        console.error("❌ ERRO CRÍTICO: Stage do item não encontrado!", {
          itemStageId: initialData.stageId,
          availableStages: sortedStages.map((s) => ({
            id: s.id,
            name: s.name,
          })),
        });
        return;
      }

      const currentItemStageIndex = sortedStages.findIndex(
        (s) => s.id === initialData.stageId,
      );
      console.log(`📍 Índice da etapa atual do item: ${currentItemStageIndex}`);

      // Está na coluna Corte
      const inCorte = currentItemStageIndex === corteIndex;
      console.log(`📍 Está na coluna Corte? ${inCorte}`);

      // Já passou da coluna Corte (está depois)
      const passedCorte = currentItemStageIndex > corteIndex;
      console.log(`📍 Já passou da coluna Corte? ${passedCorte}`);

      setIsInCorte(inCorte);
      setHasPassedCorte(passedCorte);
    }
  }, [
    stages,
    initialData,
    isEditing,
    selectedStageId,
    isCurrentStageCorte,
    isCorteStage,
  ]);

  // 🔥 Lógica principal do campo quantidade - COM LOG
  const isQuantityDisabled = useMemo(() => {
    console.log("🔴🔴🔴 [isQuantityDisabled] CALCULANDO - INÍCIO");
    console.log("[isQuantityDisabled] isReadOnly:", isReadOnly);
    console.log("[isQuantityDisabled] hasPassedCorte:", hasPassedCorte);
    console.log("[isQuantityDisabled] isInCorte:", isInCorte);
    console.log("[isQuantityDisabled] isEditing:", isEditing);
    console.log("[isQuantityDisabled] canEditQuantity:", canEditQuantity);
    console.log("[isQuantityDisabled] isUserAdmin:", isUserAdmin());

    // Se for modo leitura global, desabilita
    if (isReadOnly) {
      console.log("🧮 isQuantityDisabled = true (isReadOnly)");
      return true;
    }

    // Se NÃO pode editar quantidade, desabilita
    if (!canEditQuantity) {
      console.log("🧮 isQuantityDisabled = true (canEditQuantity = false)");
      return true;
    }

    console.log("🧮 isQuantityDisabled = false (pode editar!)");
    return false;
  }, [isReadOnly, hasPassedCorte, canEditQuantity]);

  // 🔥 Verifica se a quantidade é obrigatória
  const isQuantityRequired = useMemo(() => {
    console.log("⚠️ [isQuantityRequired] Calculando:", {
      hasPassedCorte,
      isInCorte,
      isUserAdmin: isUserAdmin(),
    });

    // Para ADMIN, quantidade nunca é obrigatória (pode gerenciar como quiser)
    if (isUserAdmin()) {
      console.log("⚠️ isQuantityRequired = false (ADMIN)");
      return false;
    }

    // Para não-admin, quantidade é obrigatória no Corte
    if (isInCorte) {
      console.log("⚠️ isQuantityRequired = true (no Corte)");
      return true;
    }

    console.log("⚠️ isQuantityRequired = false");
    return false;
  }, [hasPassedCorte, isInCorte, isUserAdmin]);

  // --- Submit do formulário com validação extra ---
  const handleSubmit = async (values: ItemFormValues) => {
    console.log("🚀 [handleSubmit] Iniciando submit com valores:", {
      ...values,
      hasPassedCorte,
      isInCorte,
      isQuantityRequired,
      canEditQuantity,
      isUserAdmin: isUserAdmin(),
    });

    // 🔥 VALIDAÇÃO CRÍTICA: Converte para número e verifica
    const quantityNum = Number(values.quantity);
    const isAdmin = isUserAdmin();

    console.log("[handleSubmit] isAdmin:", isAdmin);
    console.log("[handleSubmit] quantityNum:", quantityNum);
    console.log("[handleSubmit] isInCorte:", isInCorte);

    // ADMIN pode passar qualquer valor - PULA VALIDAÇÃO
    if (isAdmin) {
      console.log(
        "👑👑👑 [handleSubmit] ADMIN DETECTADO - Pulando TODAS as validações de quantidade! 👑👑👑",
      );
      // Continua mesmo com quantidade zero
    } else {
      // Para não-admin no Corte, quantidade é obrigatória e > 0
      if (isInCorte && (!quantityNum || quantityNum < 1)) {
        console.log("❌ [handleSubmit] VALIDAÇÃO FALHOU: quantidade inválida", {
          quantity: values.quantity,
          quantityNum,
          isInCorte,
        });

        setShowQuantityWarning(true);
        toast.error(
          "Você está na coluna Corte. A quantidade é obrigatória e deve ser maior que zero.",
        );
        return;
      }
    }

    console.log("✅ [handleSubmit] Validação OK, prosseguindo com submit");

    const payload = {
      ...values,
      quantity: quantityNum,
      supplierId:
        values.supplierId === "internal" || !values.supplierId
          ? null
          : values.supplierId,
      assignedToId:
        values.assignedToId === "unassigned" || !values.assignedToId
          ? null
          : values.assignedToId,
      dueDate: values.dueDate || null,
      productionStartedAt: values.productionStartedAt || null,
      deliveryAt: values.deliveryAt || null,
    };

    await onSubmit(
      payload,
      { images, audios, videos },
      {
        images: removedImageIds,
        audios: removedAudioIds,
        videos: removedVideoIds,
      },
    );
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

  // 🔥 Mensagem de contexto baseada no estado
  const quantityContextMessage = useMemo(() => {
    if (isReadOnly) return null;

    // 👑 ADMIN - Mensagem especial (APENAS ISSO)
    if (isUserAdmin()) {
      return {
        type: "admin",
        icon: <User size={14} />,
        title: "👑 ADMIN",
        message:
          "Você é administrador e pode editar a quantidade em qualquer etapa.",
      };
    }

    // Usuário comum - mensagens simples
    if (!canEditQuantity) {
      if (!isInCorte) {
        return {
          type: "info",
          icon: <Lock size={14} />,
          title: "🔒 Bloqueado",
          message: "A quantidade só pode ser editada na coluna Corte.",
        };
      }
    }

    if (isInCorte && userHasCortePermission()) {
      return {
        type: "warning",
        icon: <AlertCircle size={14} />,
        title: "⚠️ Quantidade obrigatória",
        message: "Você está na coluna Corte. A quantidade é obrigatória.",
      };
    }

    return null;
  }, [
    isReadOnly,
    canEditQuantity,
    isInCorte,
    isUserAdmin,
    userHasCortePermission,
  ]);

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
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1">
                      <TabsTrigger value="details">
                        Detalhes & Datas
                      </TabsTrigger>
                      <TabsTrigger value="media">Mídias & Anexos</TabsTrigger>
                    </TabsList>

                    {/* --- TAB DETALHES --- */}
                    <TabsContent value="details" className="space-y-4">
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

                      {/* 🔥 CAMPO QUANTIDADE COM NOVA LÓGICA DE PERMISSÕES */}
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

                                {/* 🔥 AVISO DE VALIDAÇÃO - APENAS QUANDO NECESSÁRIO */}
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
                      {/* ... código existente da aba de mídia ... */}
                    </TabsContent>
                  </Tabs>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </div>

        {/* FOOTER */}
        <DialogFooter className="px-6 py-4 border-t bg-slate-50 shrink-0 flex items-center justify-between sm:justify-between">
          {/* ESQUERDA: Botão de Excluir (Só se editando E tiver permissão) */}
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

            {/* 🔥 BOTÃO DE SALVAR (só aparece se não for readonly) */}
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
                disabled={isLoading}
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

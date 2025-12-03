/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  Image as ImageIcon,
  LogOut,
  Menu,
  Mic,
  MoreVertical,
  Music,
  Plus,
  RefreshCw,
  Settings,
  Square,
  Trash2,
  User,
  Video,
  X,
  Package,
  Truck,
  Scissors,
  Factory,
  CheckSquare,
  Warehouse,
  Layers,
  Tag,
  Download,
  Maximize2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "http://localhost:3000";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface FlowImage {
  id: string;
  url: string;
  filename: string;
}

interface FlowAudio {
  id: string;
  url: string;
  filename: string;
  duration?: number;
}

interface FlowVideo {
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

interface FlowItem {
  id: string;
  title: string;
  orderNumber: string;
  productRef: string;
  quantity: number;
  priority: number;
  status: string;
  dueDate?: string;
  enteredAt: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: UserProfile;
  stage?: FlowStage;
  stageId?: string;
  images: FlowImage[];
  audios: FlowAudio[];
  videos: FlowVideo[];
  flowId: string;
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

export default function ProductFlowKanban() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [flows, setFlows] = useState<ProductFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<string>("");
  const [currentFlow, setCurrentFlow] = useState<ProductFlow | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modais
  const [isFlowModal, setIsFlowModal] = useState(false);
  const [isStageModal, setIsStageModal] = useState(false);
  const [isItemModal, setIsItemModal] = useState(false);
  const [isEditItemModal, setIsEditItemModal] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);
  const [isDeleteStageModal, setIsDeleteStageModal] = useState(false);
  const [isDeleteFlowModal, setIsDeleteFlowModal] = useState(false); // NOVO: Estado para modal de exclusão de fluxo
  const [stageToDelete, setStageToDelete] = useState<FlowStage | null>(null);

  const [previewItem, setPreviewItem] = useState<FlowItem | null>(null);
  const [editingStage, setEditingStage] = useState<FlowStage | null>(null);
  const [editingItem, setEditingItem] = useState<FlowItem | null>(null);
  const [flowName, setFlowName] = useState("");
  const [flowDescription, setFlowDescription] = useState("");
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState("#3B82F6");

  // Formulário novo item
  const [itemTitle, setItemTitle] = useState("");
  const [itemOrderNumber, setItemOrderNumber] = useState("");
  const [itemProductRef, setItemProductRef] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemDescription, setItemDescription] = useState("");
  const [itemDueDate, setItemDueDate] = useState("");
  const [itemAssignedTo, setItemAssignedTo] = useState("");
  const [itemPriority, setItemPriority] = useState("3");
  const [itemImages, setItemImages] = useState<File[]>([]);
  const [itemAudios, setItemAudios] = useState<File[]>([]);
  const [itemVideos, setItemVideos] = useState<File[]>([]);

  // Formulário edição
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemOrderNumber, setEditItemOrderNumber] = useState("");
  const [editItemProductRef, setEditItemProductRef] = useState("");
  const [editItemQuantity, setEditItemQuantity] = useState("1");
  const [editItemDescription, setEditItemDescription] = useState("");
  const [editItemDueDate, setEditItemDueDate] = useState("");
  const [editItemAssignedTo, setEditItemAssignedTo] = useState("");
  const [editItemPriority, setEditItemPriority] = useState("3");
  const [editItemStatus, setEditItemStatus] = useState("PENDENTE");
  const [editItemStage, setEditItemStage] = useState("");
  const [editItemImages, setEditItemImages] = useState<File[]>([]);
  const [editItemAudios, setEditItemAudios] = useState<File[]>([]);
  const [editItemVideos, setEditItemVideos] = useState<File[]>([]);

  // Estados para IDs removidos na edição
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [removedAudioIds, setRemovedAudioIds] = useState<string[]>([]);
  const [removedVideoIds, setRemovedVideoIds] = useState<string[]>([]);

  // Gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==================================== AUTH E FETCH ====================================
  const getAuthToken = useCallback((): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  }, []);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = getAuthToken();
      if (!token) {
        logout();
        throw new Error("Sem token");
      }
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...((options.headers as Record<string, string>) || {}),
      };

      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) logout();
      return response;
    },
    [getAuthToken, logout]
  );

  const authFetchWithFiles = useCallback(
    async (url: string, formData: FormData, method: string = "POST") => {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(url, { method, headers, body: formData });
      if (response.status === 401) logout();
      return response;
    },
    [getAuthToken, logout]
  );

  // ==================================== CARREGAMENTO ====================================
  const fetchFlows = useCallback(async () => {
    if (!user?.company?.id) return;

    try {
      console.log("📥 Buscando fluxos de produção...");
      const res = await authFetch(
        `${API_BASE}/flow?companyId=${user.company.id}`
      );

      if (!res.ok) {
        throw new Error(`Erro ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("✅ Resposta dos fluxos:", data);

      let flowsArray = [];

      if (Array.isArray(data)) {
        flowsArray = data;
      } else if (data.flows && Array.isArray(data.flows)) {
        flowsArray = data.flows;
      } else {
        console.warn("⚠️ Formato de resposta inesperado:", data);
        flowsArray = [];
      }

      setFlows(flowsArray);

      // Se houver fluxos, seleciona o primeiro
      if (flowsArray.length > 0 && !selectedFlow) {
        setSelectedFlow(flowsArray[0].id);
        await fetchFlowBoard(flowsArray[0].id);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar fluxos:", err);
      setFlows([]);
    }
  }, [authFetch, user?.company?.id, selectedFlow]);

  const fetchFlowBoard = async (flowId: string) => {
    try {
      console.log("📥 Buscando board do fluxo...");
      const res = await authFetch(
        `${API_BASE}/flow/${flowId}/board?companyId=${user?.company?.id}`
      );

      if (!res.ok) {
        throw new Error(`Erro ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("✅ Resposta do board:", data);
      setCurrentFlow(data);
    } catch (err) {
      console.error("❌ Erro ao buscar board:", err);
      setCurrentFlow(null);
    }
  };

  const fetchUsers = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const res = await authFetch(
        `${API_BASE}/auth/professionals/${user.company.id}`
      );
      if (!res.ok) throw new Error("Erro users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setUsers([]);
    }
  }, [authFetch, user?.company?.id]);

  const loadInitialData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    console.log("🚀 Iniciando carregamento de dados...");

    try {
      await Promise.all([fetchFlows(), fetchUsers()]);
      console.log("✅ Todos os dados carregados com sucesso");
    } catch (error) {
      console.error("❌ Erro no carregamento inicial:", error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchFlows, fetchUsers]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user, loadInitialData]);

  useEffect(() => {
    if (selectedFlow) {
      fetchFlowBoard(selectedFlow);
    }
  }, [selectedFlow]);

  // ==================================== FUNÇÕES DE FLUXOS ====================================
  const createFlow = async () => {
    if (!flowName.trim()) return alert("Nome do fluxo é obrigatório");
    if (!user?.company?.id) return alert("Empresa não identificada");

    try {
      const res = await authFetch(`${API_BASE}/flow`, {
        method: "POST",
        body: JSON.stringify({
          name: flowName,
          description: flowDescription,
          companyId: user.company.id,
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar fluxo");

      const newFlow = await res.json();
      setFlows((prev) => [...prev, newFlow]);
      setFlowName("");
      setFlowDescription("");
      setIsFlowModal(false);
    } catch (err: any) {
      alert(err.message || "Erro ao criar fluxo");
    }
  };

  // NOVO: Função para excluir o fluxo atual
  const handleDeleteFlow = async () => {
    if (!selectedFlow) return;

    try {
      const res = await authFetch(`${API_BASE}/flow/${selectedFlow}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao excluir fluxo");

      // Atualiza a lista local removendo o fluxo excluído
      const updatedFlows = flows.filter((f) => f.id !== selectedFlow);
      setFlows(updatedFlows);

      // Fecha o modal
      setIsDeleteFlowModal(false);

      // Se sobraram fluxos, seleciona o primeiro, senão limpa tudo
      if (updatedFlows.length > 0) {
        setSelectedFlow(updatedFlows[0].id);
        await fetchFlowBoard(updatedFlows[0].id);
      } else {
        setSelectedFlow("");
        setCurrentFlow(null);
      }

      alert("Fluxo excluído com sucesso!");

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao excluir fluxo");
    }
  };

  // ==================================== FUNÇÕES DE ETAPAS ====================================
  const createStage = async () => {
    if (!selectedFlow) return alert("Selecione um fluxo primeiro");
    if (!stageName.trim()) return alert("Nome da etapa é obrigatório");

    try {
      const res = await authFetch(`${API_BASE}/flow/${selectedFlow}/stages`, {
        method: "POST",
        body: JSON.stringify({
          name: stageName,
          color: stageColor,
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar etapa");

      const newStage = await res.json();
      await fetchFlowBoard(selectedFlow);
      setStageName("");
      setStageColor("#3B82F6");
      setIsStageModal(false);
    } catch (err: any) {
      alert(err.message || "Erro ao criar etapa");
    }
  };

  // Função para abrir modal de edição de etapa
  const openEditStageModal = (stage: FlowStage) => {
    setEditingStage(stage);
    setStageName(stage.name);
    setStageColor(stage.color || "#3B82F6");
    setIsStageModal(true);
  };

  // Função para atualizar etapa
  const updateStage = async () => {
    if (!editingStage || !stageName.trim())
      return alert("Nome da etapa é obrigatório");

    try {
      const res = await authFetch(
        `${API_BASE}/flow/stages/${editingStage.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: stageName,
            color: stageColor,
            order: editingStage.order,
          }),
        }
      );

      if (!res.ok) throw new Error("Erro ao atualizar etapa");

      await fetchFlowBoard(selectedFlow);
      setEditingStage(null);
      setStageName("");
      setStageColor("#3B82F6");
      setIsStageModal(false);
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar etapa");
    }
  };

  // Função para abrir modal de confirmação de exclusão
  const openDeleteStageModal = (stage: FlowStage) => {
    setStageToDelete(stage);
    setIsDeleteStageModal(true);
  };

  // Função para excluir etapa
  const deleteStage = async () => {
    if (!stageToDelete) return;

    // Verifica se a etapa tem itens
    if (stageToDelete.items && stageToDelete.items.length > 0) {
      if (
        !confirm(
          `A etapa "${stageToDelete.name}" tem ${stageToDelete.items.length} item(s). Deseja excluir mesmo assim?`
        )
      ) {
        setIsDeleteStageModal(false);
        setStageToDelete(null);
        return;
      }
    }

    try {
      const res = await authFetch(
        `${API_BASE}/flow/stages/${stageToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) throw new Error("Erro ao excluir etapa");

      await fetchFlowBoard(selectedFlow);
      setIsDeleteStageModal(false);
      setStageToDelete(null);
    } catch (err: any) {
      alert(err.message || "Erro ao excluir etapa");
    }
  };

  // ==================================== FUNÇÕES DE ITENS ====================================
  const createFlowItem = async () => {
    if (!selectedFlow) return alert("Selecione um fluxo primeiro");
    if (!itemTitle.trim()) return alert("Título obrigatório");
    if (!user?.company?.id) return alert("Empresa não identificada");

    setIsSubmitting(true);

    // Formata a data corretamente
    let formattedDueDate = null;
    if (itemDueDate) {
      try {
        let dateString = itemDueDate;
        if (dateString && dateString.length === 16) {
          dateString += ":00";
        }
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          formattedDueDate = date.toISOString();
        }
      } catch (error) {
        console.warn("Erro ao formatar data:", error);
      }
    }

    // Prepara os dados
    const itemData = {
      title: itemTitle,
      orderNumber: itemOrderNumber || `PED-${Date.now()}`,
      productRef: itemProductRef || "SEM-REF",
      quantity: parseInt(itemQuantity) || 1,
      priority: parseInt(itemPriority) || 3,
      description: itemDescription || undefined,
      dueDate: itemDueDate || undefined,
      assignedToId: itemAssignedTo || undefined,
    };

    console.log("📤 Enviando dados para criar item:", itemData);

    try {
      // 1. Cria o item primeiro
      const res = await authFetch(`${API_BASE}/flow/${selectedFlow}/items`, {
        method: "POST",
        body: JSON.stringify(itemData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Erro na resposta:", errorText);
        throw new Error(
          `Erro ao criar item: ${res.status} - ${res.statusText}`
        );
      }

      const responseData = await res.json();
      console.log("✅ Item criado com sucesso:", responseData);

      const itemId = responseData.id;

      // 2. Upload de múltiplas imagens, áudios e vídeos
      await uploadAllMediaFiles(itemId);

      await fetchFlowBoard(selectedFlow);
      resetItemForm();
      setIsItemModal(false);
    } catch (err: any) {
      console.error("❌ Erro ao criar item:", err);
      alert(err.message || "Erro ao criar item");
    } finally {
      setIsSubmitting(false);
    }
  };

  // FUNÇÃO PARA UPLOAD DE TODOS OS TIPOS DE MÍDIA
  const uploadAllMediaFiles = async (itemId: string) => {
    try {
      // Upload de múltiplas imagens
      if (itemImages.length > 0) {
        console.log(`📤 Fazendo upload de ${itemImages.length} imagens...`);
        for (const image of itemImages) {
          await uploadSingleMedia(itemId, image, "image");
        }
      }

      // Upload de múltiplos áudios
      if (itemAudios.length > 0) {
        console.log(`📤 Fazendo upload de ${itemAudios.length} áudios...`);
        for (const audio of itemAudios) {
          await uploadSingleMedia(itemId, audio, "audio");
        }
      }

      // Upload de múltiplos vídeos
      if (itemVideos.length > 0) {
        console.log(`📤 Fazendo upload de ${itemVideos.length} vídeos...`);
        for (const video of itemVideos) {
          await uploadSingleMedia(itemId, video, "video");
        }
      }

      console.log("✅ Upload de todos os arquivos concluído");
    } catch (err) {
      console.error("❌ Erro ao fazer upload de arquivos:", err);
      // Não interrompe o fluxo principal
    }
  };

  // FUNÇÃO AUXILIAR PARA UPLOAD INDIVIDUAL
  const uploadSingleMedia = async (
    itemId: string,
    file: File,
    type: "image" | "audio" | "video"
  ) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await authFetchWithFiles(
        `${API_BASE}/flow/items/${itemId}/media/${type}`,
        formData,
        "POST"
      );

      if (!res.ok) {
        console.error(`❌ Erro no upload de ${type}:`, await res.text());
        throw new Error(`Falha no upload de ${type}`);
      }

      const responseData = await res.json();
      console.log(`✅ Upload de ${type} realizado:`, responseData);
      return responseData;

    } catch (err) {
      console.error(`❌ Erro ao fazer upload de ${type}:`, err);
      throw err;
    }
  };

  const moveItem = async (itemId: string, newStageId: string) => {
    try {
      await authFetch(`${API_BASE}/flow/items/${itemId}/move`, {
        method: "PUT",
        body: JSON.stringify({ newStageId }),
      });
      await fetchFlowBoard(selectedFlow);
    } catch (err) {
      alert("Erro ao mover item");
    }
  };

  const updateFlowItem = async () => {
    if (!editingItem || !editItemTitle.trim())
      return alert("Título obrigatório");

    setIsSubmitting(true);

    const itemData = {
      title: editItemTitle,
      orderNumber: editItemOrderNumber || "",
      productRef: editItemProductRef || "SEM-REF",
      quantity: parseInt(editItemQuantity) || 1,
      priority: parseInt(editItemPriority) || 3,
      description: editItemDescription || undefined,
      dueDate: editItemDueDate || undefined,
      assignedToId: editItemAssignedTo || undefined,
      stageId: editItemStage || undefined,
    };

    try {
      // 1. Atualiza dados básicos do item
      const res = await authFetch(`${API_BASE}/flow/items/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify(itemData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Erro na resposta:", errorText);
        throw new Error(`Erro ao atualizar: ${res.status} - ${res.statusText}`);
      }

      const responseData = await res.json();
      console.log("✅ Item atualizado com sucesso:", responseData);

      // 2. Remove mídias marcadas para exclusão
      await removeMarkedMedia();

      // 3. Adiciona NOVAS mídias (imagens, áudios, vídeos)
      if (editItemImages.length > 0) {
        console.log(`📤 Fazendo upload de ${editItemImages.length} novas imagens...`);
        for (const image of editItemImages) {
          await uploadSingleMedia(editingItem.id, image, "image");
        }
      }

      if (editItemAudios.length > 0) {
        console.log(`📤 Fazendo upload de ${editItemAudios.length} novos áudios...`);
        for (const audio of editItemAudios) {
          await uploadSingleMedia(editingItem.id, audio, "audio");
        }
      }

      if (editItemVideos.length > 0) {
        console.log(`📤 Fazendo upload de ${editItemVideos.length} novos vídeos...`);
        for (const video of editItemVideos) {
          await uploadSingleMedia(editingItem.id, video, "video");
        }
      }

      // 4. Atualiza a visualização
      await fetchFlowBoard(selectedFlow);

      // 5. Fecha o modal e reseta o formulário
      setIsEditItemModal(false);
      setEditingItem(null);
      resetEditItemForm();

      // 6. Feedback ao usuário
      alert("✅ Item atualizado com sucesso!");

      // Força uma atualização completa do board
      setTimeout(() => {
        fetchFlowBoard(selectedFlow).then(() => {
          console.log("✅ Board atualizado após upload de imagens");
        });
      }, 500);

    } catch (err: any) {
      console.error("❌ Erro ao atualizar:", err);
      alert(err.message || "Erro ao atualizar");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para adicionar novas imagens (não substitui as existentes)
  const handleAddNewImages = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const filesArray = Array.from(files);
        setEditItemImages(prev => [...prev, ...filesArray]);

        // Feedback visual
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        toast.textContent = `${filesArray.length} imagem(ns) adicionada(s) com sucesso`;
        document.body.appendChild(toast);

        setTimeout(() => {
          document.body.removeChild(toast);
        }, 3000);
      }
    };

    input.click();
  };

  // Função para remover mídias marcadas
  const removeMarkedMedia = async () => {
    if (!editingItem) return;

    console.log("🗑️ Removendo mídias marcadas:", {
      images: removedImageIds,
      audios: removedAudioIds,
      videos: removedVideoIds,
    });

    // Remove imagens marcadas
    if (removedImageIds.length > 0) {
      for (const imageId of removedImageIds) {
        try {
          await authFetch(
            `${API_BASE}/flow/items/${editingItem.id}/media/image/${imageId}`,
            { method: "DELETE" }
          );
          console.log(`✅ Imagem ${imageId} removida`);
        } catch (err) {
          console.error(`❌ Erro ao remover imagem ${imageId}:`, err);
        }
      }
    }

    // Remove áudios marcados
    if (removedAudioIds.length > 0) {
      for (const audioId of removedAudioIds) {
        try {
          await authFetch(
            `${API_BASE}/flow/items/${editingItem.id}/media/audio/${audioId}`,
            { method: "DELETE" }
          );
          console.log(`✅ Áudio ${audioId} removido`);
        } catch (err) {
          console.error(`❌ Erro ao remover áudio ${audioId}:`, err);
        }
      }
    }

    // Remove vídeos marcados
    if (removedVideoIds.length > 0) {
      for (const videoId of removedVideoIds) {
        try {
          await authFetch(
            `${API_BASE}/flow/items/${editingItem.id}/media/video/${videoId}`,
            { method: "DELETE" }
          );
          console.log(`✅ Vídeo ${videoId} removido`);
        } catch (err) {
          console.error(`❌ Erro ao remover vídeo ${videoId}:`, err);
        }
      }
    }
  };

  const deleteFlowItem = async (itemId: string) => {
    if (!confirm("Excluir item permanentemente?")) return;

    try {
      await authFetch(`${API_BASE}/flow/items/${itemId}`, {
        method: "DELETE",
      });
      await fetchFlowBoard(selectedFlow);
    } catch (err) {
      alert("Erro ao excluir item");
    }
  };

  // ==================================== FUNÇÕES DE MÍDIAS ====================================

  // Função para remover imagem existente (na edição)
  const removeImage = (imageId: string) => {
    // Adiciona o ID à lista de imagens removidas
    setRemovedImageIds((prev) => [...prev, imageId]);

    // Remove a imagem da lista de imagens do item em edição
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        images: editingItem.images.filter((img) => img.id !== imageId),
      });
    }
  };

  // Função para remover áudio existente (na edição)
  const removeAudio = (audioId: string) => {
    setRemovedAudioIds((prev) => [...prev, audioId]);

    if (editingItem) {
      setEditingItem({
        ...editingItem,
        audios: editingItem.audios.filter((audio) => audio.id !== audioId),
      });
    }
  };

  // Função para remover vídeo existente (na edição)
  const removeVideo = (videoId: string) => {
    setRemovedVideoIds((prev) => [...prev, videoId]);

    if (editingItem) {
      setEditingItem({
        ...editingItem,
        videos: editingItem.videos.filter((video) => video.id !== videoId),
      });
    }
  };

  // Função para remover imagem nova (ainda não salva)
  const removeNewImage = (index: number) => {
    setEditItemImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Função para remover áudio nova (ainda não salvo)
  const removeNewAudio = (index: number) => {
    setEditItemAudios((prev) => prev.filter((_, i) => i !== index));
  };

  // Função para remover vídeo novo (ainda não salvo)
  const removeNewVideo = (index: number) => {
    setEditItemVideos((prev) => prev.filter((_, i) => i !== index));
  };

  // Função para remover imagem da criação (ainda não salva)
  const removeImageFromCreation = (index: number) => {
    setItemImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Função para remover áudio da criação (ainda não salvo)
  const removeAudioFromCreation = (index: number) => {
    setItemAudios((prev) => prev.filter((_, i) => i !== index));
  };

  // Função para remover vídeo da criação (ainda não salvo)
  const removeVideoFromCreation = (index: number) => {
    setItemVideos((prev) => prev.filter((_, i) => i !== index));
  };

  // Função para visualizar imagem em tela cheia
  const viewImageFullscreen = (imageUrl: string) => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Imagem</title>
            <style>
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000; }
              img { max-width: 95vw; max-height: 95vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="Imagem em tela cheia" />
            <script>
              document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') window.close();
              });
            </script>
          </body>
          </html>
        `);
        newWindow.document.close();
      }
    };
  };

  // Função para remover todas as mídias de uma vez (útil para limpar formulário)
  const clearAllMedia = () => {
    if (editingItem) {
      // Marca todas as imagens existentes para remoção
      const allImageIds = editingItem.images.map((img) => img.id);
      const allAudioIds = editingItem.audios.map((audio) => audio.id);
      const allVideoIds = editingItem.videos.map((video) => video.id);

      setRemovedImageIds(allImageIds);
      setRemovedAudioIds(allAudioIds);
      setRemovedVideoIds(allVideoIds);

      // Limpa as mídias do item
      setEditingItem({
        ...editingItem,
        images: [],
        audios: [],
        videos: [],
      });
    }

    // Limpa as novas mídias carregadas
    setEditItemImages([]);
    setEditItemAudios([]);
    setEditItemVideos([]);
  };

  // Função para baixar uma imagem
  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "imagem.png";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erro ao baixar imagem:", error);
      alert("Não foi possível baixar a imagem");
    }
  };

  // Componente para exibir miniaturas das mídias no modal de edição
  const MediaThumbnails = ({ item }: { item: FlowItem }) => {
    // Função para substituir uma imagem específica
    const handleReplaceImage = async (oldImageId: string) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            setIsSubmitting(true);

            // Marca a imagem antiga para remoção
            setRemovedImageIds(prev => [...prev, oldImageId]);

            // Adiciona a nova imagem à lista de novas imagens
            setEditItemImages(prev => [...prev, file]);

            // Remove visualmente a imagem antiga da lista
            if (editingItem) {
              setEditingItem({
                ...editingItem,
                images: editingItem.images.filter(img => img.id !== oldImageId)
              });
            }

            // Feedback visual
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
            toast.textContent = 'Imagem será substituída ao salvar as alterações';
            document.body.appendChild(toast);

            setTimeout(() => {
              document.body.removeChild(toast);
            }, 3000);

          } catch (error) {
            console.error('❌ Erro ao substituir imagem:', error);
            alert('Erro ao substituir imagem. Tente novamente.');
          } finally {
            setIsSubmitting(false);
          }
        }
      };

      input.click();
    };

    return (
      <div className="space-y-4">
        {/* Seção de Imagens */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold">Imagens</Label>
            <Badge variant="outline" className="text-xs">
              {item.images.length} existente(s) + {editItemImages.length} nova(s)
            </Badge>
          </div>

          {/* Imagens existentes */}
          {item.images.length > 0 && (
            <div>
              <Label className="text-xs text-gray-600 mb-2 block">Existentes:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {item.images.map((img) => (
                  <div key={img.id} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                    <div className="relative aspect-square">
                      <img
                        src={img.url}
                        alt={img.filename}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => viewImageFullscreen(img.url)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="10" fill="%239ca3af">Imagem</text></svg>';
                        }}
                      />

                      {/* Overlay de ações */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2 p-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewImageFullscreen(img.url);
                            }}
                            title="Visualizar em tela cheia"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(img.url, img.filename);
                            }}
                            title="Baixar imagem"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReplaceImage(img.id);
                            }}
                            title="Substituir imagem"
                            disabled={isSubmitting}
                          >
                            <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 bg-red-500/90 hover:bg-red-500 shadow-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(img.id);
                            }}
                            title="Remover imagem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Informações da imagem */}
                    <div className="p-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" title={img.filename}>
                            {img.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(img as any).size ? `${Math.round((img as any).size / 1024)}KB` : 'Tamanho não disponível'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Novas imagens carregadas */}
          {editItemImages.length > 0 && (
            <div>
              <Label className="text-xs text-gray-600 mb-2 block">Novas a serem adicionadas:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {editItemImages.map((file, index) => (
                  <div key={index} className="relative group border rounded-lg overflow-hidden bg-blue-50">
                    <div className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 bg-red-500 hover:bg-red-600 shadow-md"
                          onClick={() => removeNewImage(index)}
                          title="Remover imagem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round(file.size / 1024)}KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão para adicionar mais imagens */}
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddNewImages}
              className="w-full"
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Novas Imagens
            </Button>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Clique para adicionar mais imagens (preservando as existentes)
            </p>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t my-4"></div>

        {/* Seção de Áudios */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold">Áudios</Label>
            <Badge variant="outline" className="text-xs">
              {item.audios.length} existente(s) + {editItemAudios.length} novo(s)
            </Badge>
          </div>

          {/* Áudios existentes */}
          {item.audios.length > 0 && (
            <div>
              <Label className="text-xs text-gray-600 mb-2 block">Existentes:</Label>
              <div className="space-y-2">
                {item.audios.map((audio) => (
                  <div
                    key={audio.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border group hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="bg-purple-100 p-2 rounded">
                        <Music className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={audio.filename}>
                          {audio.filename}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {audio.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.floor(audio.duration / 60)}:
                              {(audio.duration % 60).toString().padStart(2, "0")}
                            </span>
                          )}
                          {(audio as any).size && (
                            <span>• {Math.round((audio as any).size / 1024)}KB</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => window.open(audio.url, '_blank')}
                        title="Reproduzir áudio"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeAudio(audio.id)}
                        title="Remover áudio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Novos áudios carregados */}
          {editItemAudios.length > 0 && (
            <div>
              <Label className="text-xs text-gray-600 mb-2 block">Novos a serem adicionados:</Label>
              <div className="space-y-2">
                {editItemAudios.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="bg-blue-100 p-2 rounded">
                        <Music className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round(file.size / 1024)}KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 ml-2"
                      onClick={() => removeNewAudio(index)}
                      title="Remover áudio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão para adicionar mais áudios */}
          <div>
            <Label htmlFor="add-audios" className="text-xs text-gray-600 mb-1 block">
              Adicionar mais áudios:
            </Label>
            <Input
              id="add-audios"
              type="file"
              accept="audio/*"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  const filesArray = Array.from(e.target.files);
                  setEditItemAudios(prev => [...prev, ...filesArray]);
                }
              }}
              className="text-sm cursor-pointer"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos aceitos: MP3, WAV, OGG, AAC
            </p>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t my-4"></div>

        {/* Seção de Vídeos */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold">Vídeos</Label>
            <Badge variant="outline" className="text-xs">
              {item.videos.length} existente(s) + {editItemVideos.length} novo(s)
            </Badge>
          </div>

          {/* Vídeos existentes */}
          {item.videos.length > 0 && (
            <div>
              <Label className="text-xs text-gray-600 mb-2 block">Existentes:</Label>
              <div className="space-y-2">
                {item.videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border group hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="bg-red-100 p-2 rounded">
                        <Video className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={video.filename}>
                          {video.filename}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {video.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.floor(video.duration / 60)}:
                              {(video.duration % 60).toString().padStart(2, "0")}
                            </span>
                          )}
                          {(video as any).size && (
                            <span>• {Math.round((video as any).size / 1024)}KB</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => window.open(video.url, '_blank')}
                        title="Reproduzir vídeo"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeVideo(video.id)}
                        title="Remover vídeo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Novos vídeos carregados */}
          {editItemVideos.length > 0 && (
            <div>
              <Label className="text-xs text-gray-600 mb-2 block">Novos a serem adicionados:</Label>
              <div className="space-y-2">
                {editItemVideos.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="bg-blue-100 p-2 rounded">
                        <Video className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round(file.size / 1024)}KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 ml-2"
                      onClick={() => removeNewVideo(index)}
                      title="Remover vídeo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão para adicionar mais vídeos */}
          <div>
            <Label htmlFor="add-videos" className="text-xs text-gray-600 mb-1 block">
              Adicionar mais vídeos:
            </Label>
            <Input
              id="add-videos"
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  const filesArray = Array.from(e.target.files);
                  setEditItemVideos(prev => [...prev, ...filesArray]);
                }
              }}
              className="text-sm cursor-pointer"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos aceitos: MP4, WebM, AVI, MOV
            </p>
          </div>
        </div>

        {/* Botão para limpar todas as mídias */}
        {(item.images.length > 0 || item.audios.length > 0 || item.videos.length > 0 ||
          editItemImages.length > 0 || editItemAudios.length > 0 || editItemVideos.length > 0) && (
            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={clearAllMedia}
                disabled={isSubmitting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar todas as mídias
              </Button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Esta ação irá remover todas as mídias (existentes e novas) deste item
              </p>
            </div>
          )}
      </div>
    );
  };

  // ==================================== GRAVAÇÃO DE ÁUDIO ====================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) =>
        e.data.size > 0 && audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const file = new File(
          [blob],
          `gravação-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`,
          { type: "audio/webm" }
        );
        setItemAudios([file]);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      alert("Erro ao acessar microfone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    if (isRecording) {
      const i = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      return () => clearInterval(i);
    }
  }, [isRecording]);

  // ==================================== RESET DE FORMULÁRIOS ====================================
  const resetItemForm = () => {
    setItemTitle("");
    setItemOrderNumber("");
    setItemProductRef("");
    setItemQuantity("1");
    setItemDescription("");
    setItemDueDate("");
    setItemAssignedTo("");
    setItemPriority("3");
    setItemImages([]);
    setItemAudios([]);
    setItemVideos([]);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const resetEditItemForm = () => {
    setEditItemTitle("");
    setEditItemOrderNumber("");
    setEditItemProductRef("");
    setEditItemQuantity("1");
    setEditItemDescription("");
    setEditItemDueDate("");
    setEditItemAssignedTo("");
    setEditItemPriority("3");
    setEditItemStatus("PENDENTE");
    setEditItemStage("");
    setEditItemImages([]);
    setEditItemAudios([]);
    setEditItemVideos([]);
    setRemovedImageIds([]);
    setRemovedAudioIds([]);
    setRemovedVideoIds([]);
  };

  const resetStageForm = () => {
    setStageName("");
    setStageColor("#3B82F6");
    setEditingStage(null);
  };

  const openEditModal = (item: FlowItem) => {
    setEditingItem(item);
    setEditItemTitle(item.title);
    setEditItemOrderNumber(item.orderNumber);
    setEditItemProductRef(item.productRef);
    setEditItemQuantity(item.quantity.toString());
    setEditItemPriority(item.priority.toString());
    setEditItemStatus(item.status);
    setEditItemStage(item.stageId || "");
    setEditItemImages([]);
    setEditItemAudios([]);
    setEditItemVideos([]);
    setRemovedImageIds([]);
    setRemovedAudioIds([]);
    setRemovedVideoIds([]);
    setIsEditItemModal(true);
  };

  const openPreviewModal = (item: FlowItem) => {
    setPreviewItem(item);
    setIsPreviewModal(true);
  };

  // ==================================== FUNÇÕES AUXILIARES ====================================
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isOverdue = (d: string) => new Date(d) < new Date();

  const getPriorityColor = (p: number) => {
    if (p === 1) return "bg-red-100 text-red-800 border-red-200";
    if (p === 2) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "CONCLUIDO":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
      case "EM_PRODUCAO":
        return "bg-blue-100 text-blue-800";
      case "PENDENTE":
        return "bg-gray-100 text-gray-800";
      case "BLOQUEADO":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStageIcon = (stageName: string) => {
    const name = stageName.toLowerCase();
    if (name.includes("risco") || name.includes("modelo"))
      return <Edit className="w-4 h-4" />;
    if (name.includes("corte")) return <Scissors className="w-4 h-4" />;
    if (name.includes("benefício")) return <CheckSquare className="w-4 h-4" />;
    if (name.includes("distribuição")) return <Truck className="w-4 h-4" />;
    if (name.includes("oficina")) return <Factory className="w-4 h-4" />;
    if (name.includes("acabamento"))
      return <CheckCircle2 className="w-4 h-4" />;
    if (name.includes("dpa")) return <Warehouse className="w-4 h-4" />;
    if (name.includes("expedição")) return <Package className="w-4 h-4" />;
    return <Layers className="w-4 h-4" />;
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData("itemId", itemId);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    if (itemId) {
      moveItem(itemId, stageId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ==================================== RENDER STAGE HEADER ====================================
  const StageHeader = ({ stage }: { stage: FlowStage }) => {
    const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);

    return (
      <div
        className="rounded-t-lg px-3 py-2 flex justify-between items-center text-white"
        style={{ backgroundColor: stage.color || "#6B7280" }}
      >
        <div className="flex items-center gap-2">
          {getStageIcon(stage.name)}
          <h3 className="font-semibold text-sm truncate">{stage.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/30 text-xs">
            {stage.items?.length || 0}
          </Badge>
          <DropdownMenu
            open={isStageMenuOpen}
            onOpenChange={setIsStageMenuOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStageMenuOpen(!isStageMenuOpen);
                }}
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => openEditStageModal(stage)}>
                <Edit className="w-4 h-4 mr-2" /> Editar Etapa
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => openDeleteStageModal(stage)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir Etapa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  // ==================================== RENDER ITEM CARD ====================================
  const ItemCard = ({ item }: { item: FlowItem }) => (
    <Card
      draggable
      onDragStart={(e) => handleDragStart(e, item.id)}
      className="bg-white shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <Badge
              className={`${getPriorityColor(item.priority)} border text-xs`}
            >
              P{item.priority}
            </Badge>
            <Badge className={`${getStatusColor(item.status)} text-xs`}>
              {item.status}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openPreviewModal(item)}>
                <Eye className="w-4 h-4 mr-2" /> Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditModal(item)}>
                <Edit className="w-4 h-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => deleteFlowItem(item.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {item.images && item.images.length > 0 ? (
          <div className="mb-3 relative">
            <img
              src={item.images[0].url}
              alt="img"
              className="w-full h-32 object-cover rounded-md cursor-pointer"
              onClick={() => openPreviewModal(item)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
            {item.images.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                +{item.images.length - 1}
              </div>
            )}
          </div>
        ) : (
          <div
            className="bg-gray-100 border border-dashed h-32 rounded-md mb-3 flex items-center justify-center text-gray-400 cursor-pointer"
            onClick={() => openPreviewModal(item)}
          >
            <ImageIcon className="w-6 h-6" />
          </div>
        )}

        <h4
          className="font-semibold text-sm cursor-pointer hover:text-purple-600 line-clamp-2 mb-1"
          onClick={() => openPreviewModal(item)}
        >
          {item.title}
        </h4>

        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          <Tag className="w-3 h-3" />
          <span className="truncate">{item.productRef}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          <Package className="w-3 h-3" />
          <span>Qtd: {item.quantity}</span>
        </div>

        {item.dueDate && (
          <div className="flex items-center gap-1 text-xs mb-2">
            <Clock className="w-3 h-3" />
            <span className={isOverdue(item.dueDate) ? "text-red-600" : ""}>
              {new Date(item.dueDate).toLocaleDateString("pt-BR")}
            </span>
            {isOverdue(item.dueDate) && (
              <Badge variant="destructive" className="ml-1 text-xs px-1">
                !
              </Badge>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">{item.orderNumber}</div>
          {item.assignedTo && (
            <div className="flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded-full text-xs">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[60px]">
                {item.assignedTo.name.split(" ")[0]}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // ==================================== RENDER PRINCIPAL ====================================
  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando sua sessão...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-purple-600 text-white px-4 py-3 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-white/20"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
            <div>
              <h1 className="text-lg font-bold truncate">
                ESTEIRA DE PRODUÇÃO
              </h1>
              <p className="text-xs text-white/80 truncate">
                {user.company?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* --- SELECT DESKTOP CORRIGIDO --- */}
            <div className="hidden sm:block">
              <select
                className="bg-white/20 text-white border-none rounded text-sm p-1 cursor-pointer outline-none focus:ring-2 focus:ring-white/50"
                value={selectedFlow}
                onChange={(e) => setSelectedFlow(e.target.value)}
              >
                <option value="" className="text-gray-900 bg-white">Selecione um fluxo</option>
                {flows.map((flow) => (
                  <option key={flow.id} value={flow.id} className="text-gray-900 bg-white">
                    {flow.name}
                  </option>
                ))}
              </select>
            </div>
            {/* -------------------------------- */}

            {/* BOTÃO EXCLUIR FLUXO (DESKTOP) */}
            {selectedFlow && (
              <Button
                onClick={() => setIsDeleteFlowModal(true)}
                variant="destructive"
                className="hidden sm:flex bg-red-500 hover:bg-red-600 text-xs px-2 ml-1"
                size="sm"
                title="Excluir este fluxo"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}

            <Button
              onClick={() => setIsFlowModal(true)}
              variant="secondary"
              className="hidden sm:flex bg-white/20 hover:bg-white/30 text-xs px-2"
              size="sm"
            >
              <Settings className="w-3 h-3 mr-1" /> Novo Fluxo
            </Button>
            <Button
              onClick={() => {
                resetItemForm();
                setIsItemModal(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-xs px-2"
              size="sm"
              disabled={!selectedFlow}
            >
              <Plus className="w-3 h-3 mr-1" /> Novo Item
            </Button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {isMobileMenuOpen && (
          <div className="mt-4 p-4 bg-purple-700 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4" />
              <span className="text-sm">{user.name}</span>
            </div>

            {/* --- SELECT MOBILE CORRIGIDO --- */}
            <div>
              <select
                className="w-full bg-white/20 text-white border-none rounded text-sm p-2 outline-none"
                value={selectedFlow}
                onChange={(e) => setSelectedFlow(e.target.value)}
              >
                <option value="" className="text-gray-900 bg-white">Selecione um fluxo</option>
                {flows.map((flow) => (
                  <option key={flow.id} value={flow.id} className="text-gray-900 bg-white">
                    {flow.name}
                  </option>
                ))}
              </select>
            </div>
            {/* -------------------------------- */}

            <div className="grid grid-cols-2 gap-2">
              <Badge className="bg-white/20 text-xs">
                {currentFlow?.stages?.length || 0} etapas
              </Badge>
              <Badge className="bg-white/20 text-xs">
                {currentFlow?.items?.length || 0} itens
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={loadInitialData}
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-xs flex-1"
                disabled={loading}
                size="sm"
              >
                <RefreshCw
                  className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Carregando..." : "Atualizar"}
              </Button>
              <Button
                onClick={() => {
                  resetStageForm();
                  setIsStageModal(true);
                }}
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-xs flex-1"
                disabled={!selectedFlow}
                size="sm"
              >
                <Layers className="w-3 h-3 mr-1" /> Nova Etapa
              </Button>

              {/* BOTÃO EXCLUIR FLUXO (MOBILE) */}
              <Button
                onClick={() => setIsDeleteFlowModal(true)}
                variant="destructive"
                className="bg-red-500 hover:bg-red-600 text-xs flex-1"
                disabled={!selectedFlow}
                size="sm"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Excluir Fluxo
              </Button>

              <Button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-xs flex-1"
                size="sm"
              >
                <LogOut className="w-3 h-3 mr-1" /> Sair
              </Button>
            </div>
          </div>
        )}

        {/* DESKTOP INFO BAR */}
        <div className="hidden md:flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="text-sm">{user.name}</span>
          </div>
          <div className="flex gap-2">
            {currentFlow && (
              <>
                <Badge className="bg-white/20 text-xs">
                  {currentFlow.name}
                </Badge>
                <Badge className="bg-white/20 text-xs">
                  {currentFlow.stages?.length || 0} etapas
                </Badge>
                <Badge className="bg-white/20 text-xs">
                  {currentFlow.items?.length || 0} itens
                </Badge>
              </>
            )}
          </div>
          <Button
            onClick={loadInitialData}
            variant="secondary"
            className="bg-white/20 hover:bg-white/30 text-xs ml-auto"
            disabled={loading}
            size="sm"
          >
            <RefreshCw
              className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Carregando..." : "Recarregar"}
          </Button>
          <Button
            onClick={() => {
              resetStageForm();
              setIsStageModal(true);
            }}
            variant="secondary"
            className="bg-white/20 hover:bg-white/30 text-xs"
            disabled={!selectedFlow}
            size="sm"
          >
            <Layers className="w-3 h-3 mr-1" /> Nova Etapa
          </Button>
          <Button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-xs"
            size="sm"
          >
            <LogOut className="w-3 h-3 mr-1" /> Sair
          </Button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="p-2 md:p-4">
        {loading ? (
          <div className="flex justify-center h-64 items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-purple-600" />
          </div>
        ) : !selectedFlow ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Factory className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              Selecione ou crie um fluxo de produção
            </p>
            <Button onClick={() => setIsFlowModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Fluxo
            </Button>
          </div>
        ) : !currentFlow?.stages?.length ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Layers className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              Este fluxo não tem etapas configuradas
            </p>
            <Button
              onClick={() => {
                resetStageForm();
                setIsStageModal(true);
              }}
            >
              <Layers className="w-4 h-4 mr-2" /> Criar Primeira Etapa
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 md:gap-6 p-2 md:p-4 min-w-max">
              {currentFlow?.stages
                ?.sort((a, b) => a.order - b.order)
                .map((stage) => (
                  <div
                    key={stage.id}
                    className="w-72 md:w-80 flex-shrink-0"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    <StageHeader stage={stage} />
                    <div className="bg-gray-100 rounded-b-lg p-2 md:p-4 space-y-3 md:space-y-4 min-h-[500px] md:min-h-[600px]">
                      {stage.items
                        ?.sort((a, b) => a.priority - b.priority)
                        .map((item) => (
                          <ItemCard key={item.id} item={item} />
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ====================== MODAIS ====================== */}

      {/* ... (MODAIS EXISTENTES: PREVIEW, NOVO FLUXO, NOVA ETAPA, EXCLUIR ETAPA, NOVO ITEM, EDITAR ITEM) ... */}

      {/* MODAL PREVIEW */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        {/* ... (CONTEÚDO DO MODAL DE PREVIEW) ... */}
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {previewItem?.title}
            </DialogTitle>
            <DialogDescription>
              Pedido: {previewItem?.orderNumber} | Ref:{" "}
              {previewItem?.productRef}
            </DialogDescription>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4 md:space-y-6">
              {/* ... Resto do conteúdo do modal de preview ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 bg-gray-50 p-3 md:p-4 rounded">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getPriorityColor(previewItem.priority)}>
                      P{previewItem.priority}
                    </Badge>
                    <Badge className={getStatusColor(previewItem.status)}>
                      {previewItem.status}
                    </Badge>
                  </div>
                  <div className="text-xs md:text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="w-3 h-3 md:w-4 md:h-4" />
                      <strong>Quantidade:</strong> {previewItem.quantity}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                      <strong>Criado:</strong>{" "}
                      {formatDateTime(previewItem.createdAt)}
                    </div>
                  </div>
                </div>
                {/* ... resto dos detalhes ... */}
                <div className="text-xs md:text-sm space-y-1">
                  {previewItem.dueDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 md:w-4 md:h-4" />
                      <strong>Vence:</strong>{" "}
                      {formatDateTime(previewItem.dueDate)}
                      {isOverdue(previewItem.dueDate) && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Atrasado
                        </Badge>
                      )}
                    </div>
                  )}
                  {previewItem.assignedTo && (
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 md:w-4 md:h-4" />
                      <strong>Responsável:</strong>{" "}
                      {previewItem.assignedTo.name}
                    </div>
                  )}
                  {previewItem.stage && (
                    <div className="flex items-center gap-2">
                      <Layers className="w-3 h-3 md:w-4 md:h-4" />
                      <strong>Etapa:</strong> {previewItem.stage.name}
                    </div>
                  )}
                </div>
              </div>

              {/* imagens */}
              {previewItem.images && previewItem.images.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm md:text-base">
                    <ImageIcon className="w-4 h-4 md:w-5 md:h-5" /> Imagens
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {previewItem.images.map((img) => (
                      <div
                        key={img.id}
                        className="flex flex-col items-center group relative"
                      >
                        <img
                          src={img.url}
                          alt={img.filename}
                          className="w-full rounded-lg object-contain max-h-64 md:max-h-96 cursor-pointer hover:opacity-90"
                          onClick={() => viewImageFullscreen(img.url)}
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewImageFullscreen(img.url);
                            }}
                            title="Visualizar em tela cheia"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(img.url, img.filename);
                            }}
                            title="Baixar imagem"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 truncate max-w-full">
                          {img.filename}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* áudios e vídeos omitidos para brevidade, mas estão no código original */}
              {/* ... */}

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewModal(false)}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setIsPreviewModal(false);
                    openEditModal(previewItem);
                  }}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL NOVO FLUXO */}
      <Dialog open={isFlowModal} onOpenChange={setIsFlowModal}>
        <DialogContent className="max-w-[95vw] p-4">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Novo Fluxo de Produção
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Nome do Fluxo *</Label>
              <Input
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder="Ex: Esteira de Confecção Principal"
                className="text-sm"
              />
            </div>
            {/* CAMPO DESCRIÇÃO REMOVIDO DAQUI */}

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsFlowModal(false);
                  setFlowName("");
                  setFlowDescription(""); // Mantém o reset por segurança
                }}
                size="sm"
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={createFlow}
                disabled={!flowName.trim()}
                size="sm"
                className="w-full sm:w-auto"
              >
                Criar Fluxo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVA ETAPA */}
      <Dialog
        open={isStageModal}
        onOpenChange={(open) => {
          if (!open) {
            resetStageForm();
          }
          setIsStageModal(open);
        }}
      >
        <DialogContent className="max-w-[95vw] p-4">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingStage ? "Editar Etapa" : "Nova Etapa"}
            </DialogTitle>
            <DialogDescription>
              {editingStage
                ? `Editando etapa: ${editingStage.name}`
                : `Adicionar etapa ao fluxo: ${flows.find((f) => f.id === selectedFlow)?.name
                }`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Nome da Etapa *</Label>
              <Input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Ex: CORTE, OFICINA, ACABAMENTO"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-sm">Cor da Etapa</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="flex-1 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  resetStageForm();
                  setIsStageModal(false);
                }}
                size="sm"
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={editingStage ? updateStage : createStage}
                disabled={!stageName.trim() || !selectedFlow}
                size="sm"
                className="w-full sm:w-auto"
              >
                {editingStage ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAÇÃO EXCLUSÃO ETAPA */}
      <Dialog open={isDeleteStageModal} onOpenChange={setIsDeleteStageModal}>
        <DialogContent className="max-w-[95vw] p-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Excluir Etapa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a etapa {stageToDelete?.name}?
            </DialogDescription>
          </DialogHeader>
          {stageToDelete &&
            stageToDelete.items &&
            stageToDelete.items.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Esta etapa contém {stageToDelete.items.length} item(s).
                  Todos os itens serão movidos para a primeira etapa disponível.
                </p>
              </div>
            )}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteStageModal(false);
                setStageToDelete(null);
              }}
              size="sm"
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={deleteStage}
              variant="destructive"
              size="sm"
              className="w-full sm:w-auto"
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NOVO: MODAL CONFIRMAÇÃO EXCLUSÃO DE FLUXO */}
      <Dialog open={isDeleteFlowModal} onOpenChange={setIsDeleteFlowModal}>
        <DialogContent className="max-w-[95vw] p-4">
          <DialogHeader>
            <DialogTitle className="text-lg text-red-600">Excluir Fluxo de Produção</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o fluxo <strong>{currentFlow?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-sm text-red-800 font-semibold flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Atenção:
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside mt-1 space-y-1">
              <li>Todas as etapas serão excluídas.</li>
              <li>Todos os {currentFlow?.items?.length || 0} itens/pedidos serão apagados.</li>
              <li>Todas as fotos, áudios e vídeos deste fluxo serão perdidos.</li>
              <li>Esta ação <strong>não pode ser desfeita</strong>.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteFlowModal(false)}
              size="sm"
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteFlow}
              variant="destructive"
              size="sm"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              Sim, Excluir Tudo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVO ITEM */}
      <Dialog open={isItemModal} onOpenChange={setIsItemModal}>
        {/* ... CONTEÚDO DO MODAL DE NOVO ITEM (já existente no seu código) ... */}
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Novo Item na Esteira</DialogTitle>
            <DialogDescription>
              Adicionar novo pedido/produto ao fluxo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Título *</Label>
                <Input
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="text-sm"
                  placeholder="Ex: Camiseta Branca P"
                />
              </div>
              <div>
                <Label className="text-sm">Nº Pedido</Label>
                <Input
                  value={itemOrderNumber}
                  onChange={(e) => setItemOrderNumber(e.target.value)}
                  className="text-sm"
                  placeholder="Ex: PED-2024-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Referência *</Label>
                <Input
                  value={itemProductRef}
                  onChange={(e) => setItemProductRef(e.target.value)}
                  className="text-sm"
                  placeholder="Ex: CMBRANCA-P"
                />
              </div>
              <div>
                <Label className="text-sm">Quantidade</Label>
                <Input
                  type="number"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  className="text-sm"
                  min="1"
                />
              </div>
              <div>
                <Label className="text-sm">Prioridade</Label>
                <select
                  className="w-full border rounded p-2 text-sm"
                  value={itemPriority}
                  onChange={(e) => setItemPriority(e.target.value)}
                >
                  <option value="1">1 - Alta</option>
                  <option value="2">2 - Média</option>
                  <option value="3">3 - Baixa</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-sm">Descrição</Label>
              <Textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={2}
                className="text-sm resize-none"
                placeholder="Descrição detalhada do produto"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Vencimento</Label>
                <Input
                  type="datetime-local"
                  value={itemDueDate}
                  onChange={(e) => setItemDueDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">Responsável</Label>
                <select
                  className="w-full border rounded p-2 text-sm"
                  value={itemAssignedTo}
                  onChange={(e) => setItemAssignedTo(e.target.value)}
                >
                  <option value="">Ninguém</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Uploads */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Imagens
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const filesArray = Array.from(e.target.files);
                      setItemImages((prev) => [...prev, ...filesArray]);
                    }
                  }}
                  className="text-sm"
                />
                {itemImages.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2 mt-1">
                      {itemImages.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs"
                        >
                          <span className="truncate max-w-[100px]">
                            {file.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => removeImageFromCreation(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm flex items-center gap-2">
                  <Mic className="w-4 h-4" /> Áudio
                </Label>
                <div className="flex items-center gap-2 my-2">
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={isRecording ? stopRecording : startRecording}
                    size="sm"
                    className="text-xs"
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-3 h-3 mr-1" /> Parar
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3 mr-1" /> Gravar
                      </>
                    )}
                  </Button>
                  {isRecording && (
                    <span className="text-sm">
                      {String(Math.floor(recordingTime / 60)).padStart(2, "0")}:
                      {String(recordingTime % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
                <Input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const filesArray = Array.from(e.target.files);
                      setItemAudios((prev) => [...prev, ...filesArray]);
                    }
                  }}
                  className="text-sm"
                />
                {itemAudios.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2 mt-1">
                      {itemAudios.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs"
                        >
                          <span className="truncate max-w-[100px]">
                            {file.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => removeAudioFromCreation(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm flex items-center gap-2">
                  <Video className="w-4 h-4" /> Vídeos
                </Label>
                <Input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const filesArray = Array.from(e.target.files);
                      setItemVideos((prev) => [...prev, ...filesArray]);
                    }
                  }}
                  className="text-sm"
                />
                {itemVideos.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2 mt-1">
                      {itemVideos.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs"
                        >
                          <span className="truncate max-w-[100px]">
                            {file.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => removeVideoFromCreation(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsItemModal(false);
                  resetItemForm();
                }}
                size="sm"
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={createFlowItem}
                disabled={
                  isSubmitting || !itemTitle.trim() || !itemProductRef.trim()
                }
                size="sm"
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Criando..." : "Criar Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR ITEM */}
      <Dialog open={isEditItemModal} onOpenChange={setIsEditItemModal}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Editar Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Título *</Label>
                  <Input
                    value={editItemTitle}
                    onChange={(e) => setEditItemTitle(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">Nº Pedido</Label>
                  <Input
                    value={editItemOrderNumber}
                    onChange={(e) => setEditItemOrderNumber(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm">Referência *</Label>
                  <Input
                    value={editItemProductRef}
                    onChange={(e) => setEditItemProductRef(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">Quantidade</Label>
                  <Input
                    type="number"
                    value={editItemQuantity}
                    onChange={(e) => setEditItemQuantity(e.target.value)}
                    className="text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Prioridade</Label>
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={editItemPriority}
                    onChange={(e) => setEditItemPriority(e.target.value)}
                  >
                    <option value="1">1 - Alta</option>
                    <option value="2">2 - Média</option>
                    <option value="3">3 - Baixa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Status</Label>
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={editItemStatus}
                    onChange={(e) => setEditItemStatus(e.target.value)}
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="EM_PRODUCAO">Em Produção</option>
                    <option value="CONCLUIDO">Concluído</option>
                    <option value="BLOQUEADO">Bloqueado</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm">Etapa</Label>
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={editItemStage}
                    onChange={(e) => setEditItemStage(e.target.value)}
                  >
                    <option value="">Não definida</option>
                    {currentFlow?.stages?.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-sm">Descrição</Label>
                <Textarea
                  value={editItemDescription}
                  onChange={(e) => setEditItemDescription(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Vencimento</Label>
                  <Input
                    type="datetime-local"
                    value={editItemDueDate}
                    onChange={(e) => setEditItemDueDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">Responsável</Label>
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={editItemAssignedTo}
                    onChange={(e) => setEditItemAssignedTo(e.target.value)}
                  >
                    <option value="">Ninguém</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Seção de mídias */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-2 block">Mídias do Item</Label>
                  <MediaThumbnails item={editingItem} />
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Adicionar novas imagens:</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const filesArray = Array.from(e.target.files);
                          setEditItemImages((prev) => [...prev, ...filesArray]);
                        }
                      }}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Adicionar novos áudios:</Label>
                    <Input
                      type="file"
                      accept="audio/*"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const filesArray = Array.from(e.target.files);
                          setEditItemAudios((prev) => [...prev, ...filesArray]);
                        }
                      }}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Adicionar novos vídeos:</Label>
                    <Input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const filesArray = Array.from(e.target.files);
                          setEditItemVideos((prev) => [...prev, ...filesArray]);
                        }
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>

                {(editingItem.images.length > 0 ||
                  editingItem.audios.length > 0 ||
                  editingItem.videos.length > 0 ||
                  editItemImages.length > 0 ||
                  editItemAudios.length > 0 ||
                  editItemVideos.length > 0) && (
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={clearAllMedia}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Limpar todas as mídias
                      </Button>
                    </div>
                  )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditItemModal(false);
                    setEditingItem(null);
                    resetEditItemForm();
                  }}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={updateFlowItem}
                  disabled={isSubmitting || !editItemTitle.trim()}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
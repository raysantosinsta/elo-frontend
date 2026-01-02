/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/api"; 
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit,
  Eye,
  Factory,
  Image as ImageIcon,
  Layers,
  LogOut,
  Maximize2,
  Menu,
  Mic,
  MoreVertical,
  Music,
  Package,
  Plus,
  RefreshCw,
  Settings,
  Square,
  Tag,
  Trash2,
  User,
  Video,
  X,
  FileAudio,
  CalendarClock,
  Filter, 
  Search
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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

// Interfaces
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

const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div
      className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 transition-all ${type === "success" ? "bg-[#27AE60]" : "bg-[#E74C3C]"
        }`}
    >
      {type === "success" ? (
        <CheckCircle2 size={18} />
      ) : (
        <AlertCircle size={18} />
      )}
      <span className="font-medium">{message}</span>
    </div>
  );
};

// Função auxiliar para formatar data ignorando o timezone local (usa UTC)
const formatDateUTC = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

export default function ProductFlowKanban() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [flows, setFlows] = useState<ProductFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<string>("");
  const [currentFlow, setCurrentFlow] = useState<ProductFlow | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]); // Lista de fornecedores
  const [loading, setLoading] = useState(true);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDeleteItemModal, setIsDeleteItemModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FlowItem | null>(null);
  
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const showToast = (message: string, type: "success" | "error") =>
    setToast({ message, type });

  // Modais
  const [isFlowModal, setIsFlowModal] = useState(false);
  const [isStageModal, setIsStageModal] = useState(false);
  const [isItemModal, setIsItemModal] = useState(false);
  const [isEditItemModal, setIsEditItemModal] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);
  const [isDeleteStageModal, setIsDeleteStageModal] = useState(false);
  const [isDeleteFlowModal, setIsDeleteFlowModal] = useState(false);

  // Estados de Filtro Avançado
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterDateType, setFilterDateType] = useState("dueDate");
  const [filterOnlyOutsourced, setFilterOnlyOutsourced] = useState(false);
  const [filteredItems, setFilteredItems] = useState<FlowItem[] | null>(null); // Se != null, mostra lista ao invés de kanban

  // Seleções
  const [stageToDelete, setStageToDelete] = useState<FlowStage | null>(null);
  const [previewItem, setPreviewItem] = useState<FlowItem | null>(null);
  const [editingStage, setEditingStage] = useState<FlowStage | null>(null);
  const [editingItem, setEditingItem] = useState<FlowItem | null>(null);

  // Forms
  const [flowName, setFlowName] = useState("");
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState(THEME.colors.navigation);

  // Item Form (Criação)
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemOrderNumber, setItemOrderNumber] = useState("");
  const [itemProductRef, setItemProductRef] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemAssignedTo, setItemAssignedTo] = useState("");
  const [itemSupplier, setItemSupplier] = useState(""); // Novo campo
  const [itemPriority, setItemPriority] = useState("3");
  const [itemStage, setItemStage] = useState("");
  
  // Datas Criação
  const [itemDueDate, setItemDueDate] = useState("");
  const [itemProductionStart, setItemProductionStart] = useState("");
  const [itemProductionDelivery, setItemProductionDelivery] = useState("");

  const [itemImages, setItemImages] = useState<File[]>([]);
  const [itemAudios, setItemAudios] = useState<File[]>([]);
  const [itemVideos, setItemVideos] = useState<File[]>([]);

  // Edit Form
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemDescription, setEditItemDescription] = useState("");
  const [editItemOrderNumber, setEditItemOrderNumber] = useState("");
  const [editItemProductRef, setEditItemProductRef] = useState("");
  const [editItemQuantity, setEditItemQuantity] = useState("1");
  const [editItemAssignedTo, setEditItemAssignedTo] = useState("");
  const [editItemSupplier, setEditItemSupplier] = useState(""); // Novo campo
  const [editItemPriority, setEditItemPriority] = useState("3");
  const [editItemStatus, setEditItemStatus] = useState("PENDENTE");
  const [editItemStage, setEditItemStage] = useState("");
  
  // Datas Edição
  const [editItemDueDate, setEditItemDueDate] = useState("");
  const [editItemProductionStart, setEditItemProductionStart] = useState("");
  const [editItemProductionDelivery, setEditItemProductionDelivery] = useState("");

  const [editItemImages, setEditItemImages] = useState<File[]>([]);
  const [editItemAudios, setEditItemAudios] = useState<File[]>([]);
  const [editItemVideos, setEditItemVideos] = useState<File[]>([]);

  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [removedAudioIds, setRemovedAudioIds] = useState<string[]>([]);
  const [removedVideoIds, setRemovedVideoIds] = useState<string[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFlows = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const { data } = await api.get(`/flow?companyId=${user.company.id}`);
      
      const flowsArray = Array.isArray(data)
        ? data
        : data.flows || data.data || [];
      setFlows(flowsArray);
      if (flowsArray.length > 0 && !selectedFlow)
        setSelectedFlow(flowsArray[0].id);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar fluxos", "error");
    }
  }, [user?.company?.id, selectedFlow]);

  const fetchFlowBoard = useCallback(
    async (flowId: string) => {
      if (!flowId) return;
      try {
        const { data } = await api.get(`/flow/${flowId}/board?companyId=${user?.company?.id}`);
        setCurrentFlow(data);
      } catch (err) {
        console.error(err);
        showToast("Erro ao carregar quadro", "error");
      }
    },
    [user?.company?.id]
  );

  const fetchUsers = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const { data } = await api.get(`/users/company/${user.company.id}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar usuários", err);
    }
  }, [user?.company?.id]);

  const fetchSuppliers = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
        const { data } = await api.get(`/suppliers?companyId=${user.company.id}`);
        // Suporte a diferentes formatos de resposta
        setSuppliers(data.data || (Array.isArray(data) ? data : [])); 
    } catch (err) { 
        console.error("Erro ao buscar fornecedores", err); 
    }
  }, [user?.company?.id]);

  const applyFilter = async () => {
    if (!filterStartDate || !filterEndDate) {
      return showToast("Selecione data inicial e final", "error");
    }

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
      showToast(`${data.length} itens encontrados`, "success");
    } catch (err) {
      showToast("Erro ao filtrar itens", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await Promise.all([fetchFlows(), fetchUsers(), fetchSuppliers()]);
    setLoading(false);
  }, [user, fetchFlows, fetchUsers, fetchSuppliers]);

  useEffect(() => {
    if (user) loadInitialData();
  }, [user, loadInitialData]);
  
  useEffect(() => {
    if (selectedFlow) fetchFlowBoard(selectedFlow);
  }, [selectedFlow, fetchFlowBoard]);
  
  useEffect(() => {
    if (isRecording) {
      const i = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      return () => clearInterval(i);
    }
  }, [isRecording]);

  const openDeleteModal = (item: FlowItem) => {
    setItemToDelete(item);
    setIsDeleteItemModal(true);
  };
  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/flow/items/${itemToDelete.id}`);
      await fetchFlowBoard(selectedFlow);
      showToast("Item excluído com sucesso.", "success");
      setIsDeleteItemModal(false);
      setItemToDelete(null);
    } catch {
      showToast("Erro ao excluir item.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createFlow = async () => {
    if (!flowName || flowName.trim() === "")
      return showToast("Por favor, digite o nome do fluxo.", "error");
    try {
      const { data: newFlow } = await api.post(`/flow`, { name: flowName.trim() });
      
      setFlows((prev) => [...prev, newFlow]);
      setFlowName("");
      setIsFlowModal(false);
      setSelectedFlow(newFlow.id);
      showToast(`Fluxo "${newFlow.name}" criado com sucesso!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao criar fluxo", "error");
    }
  };

  const handleDeleteFlow = async () => {
    if (!selectedFlow) return;
    try {
      await api.delete(`/flow/${selectedFlow}`);
      
      const updatedFlows = flows.filter((f) => f.id !== selectedFlow);
      setFlows(updatedFlows);
      setIsDeleteFlowModal(false);
      if (updatedFlows.length > 0) setSelectedFlow(updatedFlows[0].id);
      else {
        setSelectedFlow("");
        setCurrentFlow(null);
      }
      showToast("Fluxo excluído.", "success");
    } catch {
      showToast("Erro ao excluir fluxo.", "error");
    }
  };

  const createStage = async () => {
    if (!selectedFlow || !stageName.trim())
      return showToast("Preencha o nome da etapa", "error");
    try {
      await api.post(`/flow/${selectedFlow}/stages`, { name: stageName, color: stageColor });
      
      await fetchFlowBoard(selectedFlow);
      resetStageForm();
      setIsStageModal(false);
      showToast("Etapa criada.", "success");
    } catch {
      showToast("Erro ao criar etapa.", "error");
    }
  };

  const updateStage = async () => {
    if (!editingStage || !stageName.trim()) return;
    try {
      await api.put(`/flow/stages/${editingStage.id}`, {
        name: stageName,
        color: stageColor,
        order: editingStage.order,
      });

      await fetchFlowBoard(selectedFlow);
      resetStageForm();
      setIsStageModal(false);
      showToast("Etapa atualizada.", "success");
    } catch {
      showToast("Erro ao atualizar etapa.", "error");
    }
  };

  const deleteStage = async () => {
    if (!stageToDelete) return;
    try {
      await api.delete(`/flow/stages/${stageToDelete.id}`);
      
      await fetchFlowBoard(selectedFlow);
      setIsDeleteStageModal(false);
      setStageToDelete(null);
      showToast("Etapa removida.", "success");
    } catch {
      showToast("Erro ao remover etapa.", "error");
    }
  };

  const createFlowItem = async () => {
    if (!selectedFlow || !itemTitle.trim())
      return showToast("Título é obrigatório", "error");
    
    if (isRecording) {
        return showToast("Pare a gravação antes de salvar.", "error");
    }

    setIsSubmitting(true);
    try {
      const itemData = {
        title: itemTitle,
        description: itemDescription,
        orderNumber: itemOrderNumber || `PED-${Date.now()}`,
        productRef: itemProductRef || "SEM-REF",
        quantity: parseInt(itemQuantity) || 1,
        priority: parseInt(itemPriority) || 3,
        assignedToId: itemAssignedTo || undefined,
        stageId: itemStage || undefined,
        
        // Novo campo
        supplierId: itemSupplier || null,
        
        // Datas
        dueDate: itemDueDate ? new Date(itemDueDate).toISOString() : undefined,
        productionStartedAt: itemProductionStart ? new Date(itemProductionStart).toISOString() : undefined,
        deliveryAt: itemProductionDelivery ? new Date(itemProductionDelivery).toISOString() : undefined,
      };
      
      const { data: responseData } = await api.post(`/flow/${selectedFlow}/items`, itemData);

      await uploadAllMediaFiles(responseData.id);
      
      await fetchFlowBoard(selectedFlow);
      resetItemForm();
      setIsItemModal(false);
      showToast("Item criado com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao criar item.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFlowItem = async () => {
    if (!editingItem || !editItemTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await api.put(`/flow/items/${editingItem.id}`, {
          title: editItemTitle,
          description: editItemDescription,
          orderNumber: editItemOrderNumber,
          productRef: editItemProductRef,
          quantity: parseInt(editItemQuantity),
          priority: parseInt(editItemPriority),
          assignedToId: editItemAssignedTo,
          stageId: editItemStage,
          
          // Novo campo
          supplierId: editItemSupplier || null,
          
          // Datas
          dueDate: editItemDueDate || undefined,
          productionStartedAt: editItemProductionStart ? new Date(editItemProductionStart).toISOString() : undefined,
          deliveryAt: editItemProductionDelivery ? new Date(editItemProductionDelivery).toISOString() : undefined,
      });

      await removeMarkedMedia();
      
      if (editItemImages.length)
        for (const f of editItemImages) await uploadSingleMedia(editingItem.id, f, "image");
      if (editItemAudios.length)
        for (const f of editItemAudios) await uploadSingleMedia(editingItem.id, f, "audio");
      if (editItemVideos.length)
        for (const f of editItemVideos) await uploadSingleMedia(editingItem.id, f, "video");
        
      await fetchFlowBoard(selectedFlow);
      setIsEditItemModal(false);
      resetEditItemForm();
      showToast("Item atualizado!", "success");
      
      // Se estiver no modo filtrado, atualiza o filtro também
      if(filteredItems) applyFilter();

    } catch {
      showToast("Erro na atualização.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveItem = async (itemId: string, newStageId: string) => {
    try {
      await api.put(`/flow/items/${itemId}/move`, { newStageId });
      await fetchFlowBoard(selectedFlow);
    } catch {
      showToast("Erro ao mover item.", "error");
    }
  };

  const uploadSingleMedia = async (
    itemId: string,
    file: File,
    type: "image" | "audio" | "video"
  ) => {
    const formData = new FormData();
    formData.append("file", file, file.name); 
    
    await api.post(`/flow/items/${itemId}/media/${type}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
  };

  const uploadAllMediaFiles = async (itemId: string) => {
    for (const f of itemImages) await uploadSingleMedia(itemId, f, "image");
    for (const f of itemAudios) await uploadSingleMedia(itemId, f, "audio");
    for (const f of itemVideos) await uploadSingleMedia(itemId, f, "video");
  };

  const removeMarkedMedia = async () => {
    if (!editingItem) return;
    for (const id of removedImageIds)
      await api.delete(`/flow/items/${editingItem.id}/media/image/${id}`);
    for (const id of removedAudioIds)
      await api.delete(`/flow/items/${editingItem.id}/media/audio/${id}`);
    for (const id of removedVideoIds)
      await api.delete(`/flow/items/${editingItem.id}/media/video/${id}`);
  };

  const removeImage = (id: string) => {
    setRemovedImageIds((p) => [...p, id]);
    if (editingItem)
      setEditingItem({
        ...editingItem,
        images: editingItem.images.filter((i) => i.id !== id),
      });
  };
  const removeAudio = (id: string) => {
    setRemovedAudioIds((p) => [...p, id]);
    if (editingItem)
      setEditingItem({
        ...editingItem,
        audios: editingItem.audios.filter((i) => i.id !== id),
      });
  };
  const removeVideo = (id: string) => {
    setRemovedVideoIds((p) => [...p, id]);
    if (editingItem)
      setEditingItem({
        ...editingItem,
        videos: editingItem.videos.filter((i) => i.id !== id),
      });
  };

  const clearAllMedia = () => {
    if (editingItem) {
      setRemovedImageIds(editingItem.images.map((i) => i.id));
      setRemovedAudioIds(editingItem.audios.map((i) => i.id));
      setRemovedVideoIds(editingItem.videos.map((i) => i.id));
      setEditingItem({ ...editingItem, images: [], audios: [], videos: [] });
    }
    setEditItemImages([]);
    setEditItemAudios([]);
    setEditItemVideos([]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
          if(e.data.size > 0) {
              audioChunksRef.current.push(e.data);
          }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        
        if (blob.size === 0) {
            showToast("Erro: Gravação vazia.", "error");
            return;
        }

        const fileName = `gravacao-${Date.now()}.webm`;
        const audioFile = new File([blob], fileName, { type: mimeType });

        setItemAudios((prev) => [
          ...prev,
          audioFile,
        ]);
        
        showToast("Áudio gravado com sucesso!", "success");
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100); 
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      showToast("Erro no microfone. Verifique permissões.", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  const removePendingAudio = (index: number) => {
    setItemAudios((prev) => prev.filter((_, i) => i !== index));
  };

  const resetItemForm = () => {
    setItemTitle("");
    setItemDescription("");
    setItemOrderNumber("");
    setItemProductRef("");
    setItemQuantity("1");
    if (currentFlow?.stages && currentFlow.stages.length > 0) {
      const sortedStages = [...currentFlow.stages].sort((a, b) => a.order - b.order);
      setItemStage(sortedStages[0].id);
    } else {
      setItemStage("");
    }
    // Reset datas
    setItemDueDate("");
    setItemProductionStart("");
    setItemProductionDelivery("");
    
    setItemAssignedTo("");
    setItemSupplier(""); // reset fornecedor
    setItemPriority("3");
    setItemImages([]);
    setItemAudios([]);
    setItemVideos([]);
    setAudioBlob(null);
  };

  const resetEditItemForm = () => {
    setEditItemTitle("");
    setEditItemDescription("");
    setEditItemOrderNumber("");
    setEditItemProductRef("");
    setEditItemQuantity("1");
    
    // Reset datas
    setEditItemDueDate("");
    setEditItemProductionStart("");
    setEditItemProductionDelivery("");
    
    setEditItemAssignedTo("");
    setEditItemSupplier(""); // reset fornecedor
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
    setStageColor(THEME.colors.navigation);
    setEditingStage(null);
  };

  const openEditModal = (item: FlowItem) => {
    setEditingItem(item);
    setEditItemTitle(item.title);
    setEditItemDescription(item.description || "");
    setEditItemOrderNumber(item.orderNumber);
    setEditItemProductRef(item.productRef);
    setEditItemQuantity(item.quantity.toString());
    setEditItemPriority(item.priority.toString());

    if (item.dueDate) {
      setEditItemDueDate(new Date(item.dueDate).toISOString().split('T')[0]);
    } else {
      setEditItemDueDate("");
    }

    if (item.productionStartedAt) {
      setEditItemProductionStart(new Date(item.productionStartedAt).toISOString().split('T')[0]);
    } else {
      setEditItemProductionStart("");
    }

    if (item.deliveryAt) {
      setEditItemProductionDelivery(new Date(item.deliveryAt).toISOString().split('T')[0]);
    } else {
      setEditItemProductionDelivery("");
    }

    setEditItemStatus(item.status);
    setEditItemStage(item.stageId || "");
    setEditItemSupplier(item.supplierId || ""); // Preenche fornecedor
    setIsEditItemModal(true);
  };

  const getPriorityStyles = (p: number) => {
    if (p === 1) return { bg: "#FDEDEC", text: "#C0392B", border: "#E6B0AA" };
    if (p === 2) return { bg: "#FEF9E7", text: "#B7950B", border: "#F9E79F" };
    return { bg: "#EAFAF1", text: "#1D8348", border: "#A9DFBF" };
  };

  const MediaThumbnails = ({ item }: { item: FlowItem }) => (
    <div className="space-y-4">
      {item.images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {item.images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-square rounded-md overflow-hidden group border"
              style={{ borderColor: THEME.colors.secondaryText }}
            >
              <img
                src={img.url}
                alt="thumbnail"
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => window.open(img.url, "_blank")}
                  className="text-white hover:scale-110 transition-transform"
                >
                  <Maximize2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="text-red-400 hover:text-red-500 hover:scale-110 transition-transform"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {item.videos.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Vídeos Salvos</Label>
          <div className="grid grid-cols-2 gap-2">
            {item.videos.map((vid) => (
              <div
                key={vid.id}
                className="flex items-center justify-between bg-gray-100 p-2 rounded text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <Video size={14} className="text-blue-500" />
                  <span className="truncate">{vid.filename}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => window.open(vid.url, "_blank")}
                    className="text-gray-600 hover:text-blue-600"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeVideo(vid.id)}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.audios.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Áudios Salvos</Label>
          <div className="grid grid-cols-1 gap-2">
            {item.audios.map((aud) => (
              <div
                key={aud.id}
                className="flex flex-col bg-gray-50 p-2 rounded text-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 truncate">
                        <Music size={14} className="text-purple-500" />
                        <span className="truncate text-xs font-medium">{aud.filename}</span>
                    </div>
                    <div className="flex gap-1">
                        <button
                            type="button"
                            onClick={() => window.open(aud.url, "_blank")}
                            className="text-gray-400 hover:text-purple-600"
                            title="Abrir em nova aba"
                        >
                            <Download size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => removeAudio(aud.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Excluir"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
                <audio controls src={aud.url} className="w-full h-8 mt-1" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const KanbanCard = ({ item }: { item: FlowItem }) => {
    const priorityStyle = getPriorityStyles(item.priority);

    return (
      <Card
        draggable
        onDragStart={(e) => e.dataTransfer.setData("itemId", item.id)}
        className="cursor-grab active:cursor-grabbing group transition-all duration-200 border-l-4 bg-white"
        style={{
          borderLeftColor: priorityStyle.text,
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div className="p-3 hover:bg-gray-50/50 transition-colors rounded-r-lg">
          <div className="flex justify-between items-start mb-2">

            <strong
              className="text-xs px-2 py-1 rounded-full font-medium"
            >
              {item.description || "Sem descrição"}
            </strong>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setPreviewItem(item);
                    setIsPreviewModal(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" /> Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditModal(item)}>
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => openDeleteModal(item)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {item.images?.length > 0 && (
            <div className="mb-3 relative rounded-md overflow-hidden h-32 bg-gray-100">
              <img
                src={item.images[0].url}
                alt="preview"
                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
              />
              {item.images.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                  <ImageIcon size={10} /> +{item.images.length - 1}
                </div>
              )}
            </div>
          )}

          <h4
            className="font-bold text-sm mb-1 leading-tight line-clamp-2"
            style={{ color: THEME.colors.textMain }}
          >
            {item.title}
          </h4>

          <div className="flex flex-col gap-1 mb-2">
            <span
              className="text-xs flex  items-center gap-1"
              style={{ color: THEME.colors.secondaryText }}
            >
              <Tag size={12} /> {item.productRef}
            </span>
            <span
              className="text-xs flex items-center gap-1"
              style={{ color: THEME.colors.secondaryText }}
            >
              <Package size={12} /> Qtd: {item.quantity}
            </span>
            {item.supplier && (
                <span
                className="text-xs flex items-center gap-1 text-orange-700 bg-orange-50 px-1 py-0.5 rounded w-fit"
                >
                <Factory size={12} /> {item.supplier.name}
                </span>
            )}
            {item.dueDate && (
              <span
                className="text-xs flex items-center gap-1"
                style={{ color: THEME.colors.secondaryText }}
              >
                <CalendarClock size={12} /> Meta:{" "}
                {formatDateUTC(item.dueDate)}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
            <div className="flex gap-2">
              {item.videos?.length > 0 && <Video size={14} className="text-blue-400" />}
              {item.audios?.length > 0 && <Music size={14} className="text-purple-400" />}
            </div>
            {item.assignedTo ? (
              <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-purple-100">
                <User size={10} /> {item.assignedTo.name.split(" ")[0]}
              </div>
            ) : (
                <div /> 
            )}
          </div>
        </div>
      </Card>
    );
  };

  if (authLoading || loading)
    return (
      <div
        className="flex h-screen items-center justify-center flex-col gap-4"
        style={{ backgroundColor: THEME.colors.background }}
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-4"
          style={{ borderColor: THEME.colors.primary }}
        />
        <p
          className="font-medium animate-pulse"
          style={{ color: THEME.colors.textMain }}
        >
          Carregando esteira...
        </p>
      </div>
    );
  if (!user) return null;

  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{ backgroundColor: THEME.colors.background }}
    >
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <header
        className="px-4 py-3 shadow-md sticky top-0 z-40 transition-colors"
        style={{ backgroundColor: THEME.colors.navigation }}
      >
        <div className="flex justify-between items-center max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-white/10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Factory size={18} className="text-orange-400" /> ESTEIRA DE
                PRODUÇÃO
              </h1>
              <p className="text-xs text-blue-200 font-medium">
                {user.company?.name || "Empresa"}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <select
              className="bg-black/20 text-white text-sm rounded-md px-3 py-1.5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all cursor-pointer hover:bg-black/30"
              value={selectedFlow}
              onChange={(e) => setSelectedFlow(e.target.value)}
            >
              <option value="" className="text-gray-900">
                Selecione um fluxo
              </option>
              {flows.map((f) => (
                <option key={f.id} value={f.id} className="text-gray-900">
                  {f.name}
                </option>
              ))}
            </select>
            {selectedFlow && (
              <>
                <Button
                  onClick={() => setIsDeleteFlowModal(true)}
                  size="sm"
                  className="bg-red-500/80 hover:bg-red-600 text-white border-0"
                  title="Excluir Fluxo Atual"
                >
                  <Trash2 size={14} />
                </Button>
                <div className="h-6 w-px bg-white/20 mx-1" />
                <Button
                  onClick={() => {
                    resetStageForm();
                    setIsStageModal(true);
                  }}
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-0"
                >
                  <Layers size={14} className="mr-2" /> Nova Etapa
                </Button>
                <Button
                  onClick={() => {
                    resetItemForm();
                    setIsItemModal(true);
                  }}
                  size="sm"
                  className="text-white border-0 shadow-md hover:brightness-110 transition-all"
                  style={{ backgroundColor: THEME.colors.primary }}
                >
                  <Plus size={16} className="mr-2" /> Novo Item
                </Button>
              </>
            )}
            <Button
              onClick={() => setIsFlowModal(true)}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              <Settings size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#34495E] p-4 space-y-4 shadow-inner border-t border-white/10 text-white">
          <select
            className="w-full bg-black/20 text-white text-sm rounded-md p-2"
            value={selectedFlow}
            onChange={(e) => {
              setSelectedFlow(e.target.value);
              setIsMobileMenuOpen(false);
            }}
          >
            <option value="" className="text-gray-900">
              Selecione um fluxo
            </option>
            {flows.map((f) => (
              <option key={f.id} value={f.id} className="text-gray-900">
                {f.name}
              </option>
            ))}
          </select>

          {selectedFlow && (
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/10">
              <Button
                onClick={() => {
                  resetItemForm();
                  setIsItemModal(true);
                  setIsMobileMenuOpen(false);
                }}
                size="sm"
                className="w-full justify-start text-white border-0 shadow-md"
                style={{ backgroundColor: THEME.colors.primary }}
              >
                <Plus size={14} className="mr-2" /> Novo Item
              </Button>
              <Button
                onClick={() => {
                  resetStageForm();
                  setIsStageModal(true);
                  setIsMobileMenuOpen(false);
                }}
                size="sm"
                className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <Layers size={14} className="mr-2" /> Nova Etapa
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setIsFlowModal(true)}
              variant="secondary"
              className="w-full justify-start"
            >
              <Plus size={14} className="mr-2" /> Novo Fluxo
            </Button>
            <Button
              onClick={loadInitialData}
              variant="ghost"
              className="w-full justify-start"
            >
              <RefreshCw size={14} className="mr-2" /> Atualizar
            </Button>
          </div>
          {selectedFlow && (
            <Button
              onClick={() => setIsDeleteFlowModal(true)}
              variant="ghost"
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 size={14} className="mr-2" /> Excluir Fluxo Atual
            </Button>
          )}

          <Button onClick={logout} variant="destructive" className="w-full">
            <LogOut size={14} className="mr-2" /> Sair
          </Button>
        </div>
      )}

      {/* --- ÁREA DE FILTROS --- */}
      {selectedFlow && (
      <div className="mx-4 md:mx-6 mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
        {/* Data Inicial */}
        <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600">De</Label>
            <Input 
            type="date" 
            className="h-9 w-36" 
            value={filterStartDate} 
            onChange={e => setFilterStartDate(e.target.value)} 
            />
        </div>

        {/* Data Final */}
        <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600">Até</Label>
            <Input 
            type="date" 
            className="h-9 w-36" 
            value={filterEndDate} 
            onChange={e => setFilterEndDate(e.target.value)} 
            />
        </div>

        {/* Tipo de Data */}
        <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600">Filtrar por data de:</Label>
            <select 
            className="h-9 border rounded px-2 text-sm bg-white w-40 focus:ring-2 focus:ring-orange-500 outline-none"
            value={filterDateType}
            onChange={e => setFilterDateType(e.target.value)}
            >
            <option value="dueDate">Prazo (Meta)</option>
            <option value="productionStartedAt">Início Produção</option>
            <option value="deliveryAt">Entrega</option>
            <option value="enteredAt">Criação</option>
            </select>
        </div>
        
        {/* Checkbox Terceirizados */}
        <div className="flex items-center gap-2 pb-2 h-9">
            <input 
            type="checkbox" 
            id="outsourcedCheck"
            checked={filterOnlyOutsourced}
            onChange={e => setFilterOnlyOutsourced(e.target.checked)}
            className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
            />
            <Label htmlFor="outsourcedCheck" className="cursor-pointer text-sm font-medium">
            Apenas Terceirizados
            </Label>
        </div>

        {/* Botões */}
        <div className="flex gap-2 pb-0.5">
            <Button 
            size="sm" 
            onClick={applyFilter}
            className="bg-gray-800 hover:bg-gray-900 text-white"
            >
            <Filter size={14} className="mr-2"/> Filtrar
            </Button>
            
            {filteredItems && (
            <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setFilteredItems(null)} // Volta pro Kanban normal
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
                <X size={14} className="mr-2"/> Limpar Filtro
            </Button>
            )}
        </div>
      </div>
      )}

      {/* --- CONTEÚDO PRINCIPAL (KANBAN OU LISTA) --- */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6 custom-scrollbar">
        {!selectedFlow ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <Layers
              size={64}
              style={{ color: THEME.colors.secondaryText }}
              className="mb-4"
            />
            <h2
              className="text-xl font-bold"
              style={{ color: THEME.colors.textMain }}
            >
              Nenhum fluxo selecionado
            </h2>
            <p style={{ color: THEME.colors.secondaryText }}>
              Selecione um fluxo existente ou crie um novo para começar.
            </p>
            <Button
              onClick={() => setIsFlowModal(true)}
              className="mt-4"
              style={{ backgroundColor: THEME.colors.primary }}
            >
              Criar Fluxo
            </Button>
          </div>
        ) : (
          <>
            {filteredItems ? (
                 // --- MODO LISTA (RESULTADO DO FILTRO) ---
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Relatório Filtrado</h3>
                    <Badge variant="secondary">{filteredItems.length} registros</Badge>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Oficina/Terceirizado</th>
                            <th className="px-4 py-3">Etapa Atual</th>
                            <th className="px-4 py-3">Data Ref.</th>
                            {/* COLUNA AÇÕES REMOVIDA AQUI */}
                        </tr>
                        </thead>
                        <tbody>
                        {filteredItems.map(item => (
                            <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{item.title}</div>
                                <div className="text-xs text-gray-500">{item.productRef}</div>
                            </td>
                            <td className="px-4 py-3">
                                {item.supplier ? (
                                <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded-full text-xs font-medium w-fit">
                                    <Factory size={12} /> {item.supplier.name}
                                </span>
                                ) : (
                                <span className="text-gray-400 text-xs italic">Interno</span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <Badge variant="outline" style={{borderColor: item.stage?.color, color: item.stage?.color}}>
                                {item.stage?.name}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-600">
                                {formatDateUTC(item[filterDateType as keyof FlowItem] as string)}
                            </td>
                            {/* CÉLULA AÇÕES REMOVIDA AQUI */}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    {filteredItems.length === 0 && (
                        <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                        <Search size={24} className="opacity-20"/>
                        Nenhum item encontrado com estes filtros.
                        </div>
                    )}
                    </div>
                </div>
            ) : (
                // --- MODO KANBAN (ORIGINAL) ---
                <div className="flex h-full gap-6 min-w-max pb-4">
                {currentFlow?.stages
                    ?.sort((a, b) => a.order - b.order)
                    .map((stage) => (
                    <div
                        key={stage.id}
                        className="w-[300px] flex flex-col h-full rounded-xl transition-colors bg-gray-100/50 border border-gray-200"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("itemId");
                        if (id) moveItem(id, stage.id);
                        }}
                    >
                        <div
                        className="p-3 rounded-t-xl flex justify-between items-center text-white shadow-sm"
                        style={{
                            backgroundColor: stage.color || THEME.colors.navigation,
                        }}
                        >
                        <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wide">
                            {stage.name}{" "}
                            <Badge
                            variant="secondary"
                            className="bg-white/20 text-white border-0 hover:bg-white/30 text-[10px] h-5 px-1.5"
                            >
                            {stage.items?.length || 0}
                            </Badge>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <button className="text-white/80 hover:text-white transition-colors">
                                <MoreVertical size={16} />
                            </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                            <DropdownMenuItem
                                onClick={() => {
                                setEditingStage(stage);
                                setStageName(stage.name);
                                setStageColor(stage.color || "");
                                setIsStageModal(true);
                                }}
                            >
                                <Edit size={14} className="mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                setStageToDelete(stage);
                                setIsDeleteStageModal(true);
                                }}
                            >
                                <Trash2 size={14} className="mr-2" /> Excluir
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar min-h-[150px]">
                        {stage.items
                            ?.sort((a, b) => a.priority - b.priority)
                            .map((item) => (
                            <KanbanCard key={item.id} item={item} />
                            ))}
                        {stage.items?.length === 0 && (
                            <div className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                            Vazio
                            </div>
                        )}
                        </div>
                    </div>
                    ))}
                <button
                    onClick={() => {
                    resetStageForm();
                    setIsStageModal(true);
                    }}
                    className="w-[300px] h-[100px] border-2 border-dashed rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all"
                    style={{ borderColor: THEME.colors.secondaryText }}
                >
                    <div className="flex flex-col items-center gap-2">
                    <Plus size={24} />
                    <span className="font-medium">Adicionar Etapa</span>
                    </div>
                </button>
                </div>
            )}
          </>
        )}
      </main>

      {/* MODAL DE CRIAÇÃO DE ITEM */}
      <Dialog open={isItemModal} onOpenChange={setIsItemModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: THEME.colors.textMain }}>
              Novo Item de Produção
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Título *</Label>
                <Input
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Ex: Camisa Linho M"
                />
              </div>

              <div className="space-y-2">
                <Label>Referência *</Label>
                <Input
                  value={itemProductRef}
                  onChange={(e) => setItemProductRef(e.target.value)}
                  placeholder="REF-001"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Detalhes adicionais sobre a produção..."
                  className="resize-none h-20"
                />
              </div>

            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Qtd.</Label>
                <Input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-white"
                  value={itemPriority}
                  onChange={(e) => setItemPriority(e.target.value)}
                >
                  <option value="1">Alta (Urgente)</option>
                  <option value="2">Média</option>
                  <option value="3">Baixa</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Etapa Inicial</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-white"
                  value={itemStage}
                  onChange={(e) => setItemStage(e.target.value)}
                >
                  {currentFlow?.stages
                    ?.sort((a, b) => a.order - b.order)
                    .map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Prazo (Meta)</Label>
                <Input
                  type="date"
                  value={itemDueDate}
                  onChange={(e) => setItemDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Início Produção</Label>
                <Input
                  type="date"
                  value={itemProductionStart}
                  onChange={(e) => setItemProductionStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Entrega Produção</Label>
                <Input
                  type="date"
                  value={itemProductionDelivery}
                  onChange={(e) => setItemProductionDelivery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Responsável (Interno)</Label>
                    <select
                    className="w-full border rounded-md p-2 text-sm bg-white"
                    value={itemAssignedTo}
                    onChange={(e) => setItemAssignedTo(e.target.value)}
                    >
                    <option value="">Selecione...</option>
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>
                        {u.name}
                        </option>
                    ))}
                    </select>
                </div>
                
                {/* SELEÇÃO DE FORNECEDOR */}
                <div className="space-y-2">
                    <Label>Oficina / Terceirizado</Label>
                    <select
                        className="w-full border rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-primary"
                        value={itemSupplier} 
                        onChange={(e) => setItemSupplier(e.target.value)} 
                    >
                        <option value="">Produção Interna</option>
                        {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                            {sup.name} {sup.category === 'HYBRID' ? '(Híbrido)' : ''}
                        </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* UPLOAD IMAGENS */}
            <div className="space-y-2">
              <Label>Imagens</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative cursor-pointer">
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) =>
                    e.target.files &&
                    setItemImages([
                      ...itemImages,
                      ...Array.from(e.target.files),
                    ])
                  }
                />
                <ImageIcon className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">
                  Clique ou arraste imagens
                </span>
              </div>
              {itemImages.length > 0 && (
                <div className="text-xs text-green-600 font-medium">
                  {itemImages.length} imagens selecionadas
                </div>
              )}
            </div>

            {/* UPLOAD VIDEOS */}
            <div className="space-y-2">
              <Label>Vídeos</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative cursor-pointer">
                <Input
                  type="file"
                  multiple
                  accept="video/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) =>
                    e.target.files &&
                    setItemVideos([
                      ...itemVideos,
                      ...Array.from(e.target.files),
                    ])
                  }
                />
                <Video className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">
                  Clique ou arraste vídeos
                </span>
              </div>
              {itemVideos.length > 0 && (
                <div className="text-xs text-green-600 font-medium">
                  {itemVideos.length} vídeos selecionados
                </div>
              )}
            </div>

            {/* UPLOAD AUDIOS */}
            <div className="space-y-2">
              <Label>Áudios</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload Arquivo */}
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative cursor-pointer">
                  <Input
                    type="file"
                    multiple
                    accept="audio/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) =>
                      e.target.files &&
                      setItemAudios([
                        ...itemAudios,
                        ...Array.from(e.target.files),
                      ])
                    }
                  />
                  <FileAudio className="text-gray-400 mb-2" />
                  <span className="text-xs text-gray-500">
                    Upload de Arquivo
                  </span>
                </div>
                {/* Gravar Mic */}
                <div className={`flex flex-col items-center justify-center gap-2 border rounded-lg p-4 transition-colors ${isRecording ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={
                      isRecording
                        ? "text-red-600 border-red-200 bg-red-100 hover:bg-red-200 w-full"
                        : "w-full"
                    }
                  >
                    {isRecording ? (
                      <Square className="w-4 h-4 mr-2" />
                    ) : (
                      <Mic className="w-4 h-4 mr-2" />
                    )}
                    {isRecording
                      ? `Parar Gravação`
                      : "Gravar Áudio"}
                  </Button>
                  {isRecording && (
                      <span className="text-xs text-red-500 animate-pulse font-medium flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Gravando...
                      </span>
                  )}
                </div>
              </div>

              {/* LISTA DE ÁUDIOS PRONTOS PARA SALVAR (PENDENTES) - COM PLAYER */}
              {itemAudios.length > 0 && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs text-gray-500">Áudios prontos para enviar ({itemAudios.length})</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {itemAudios.map((file, index) => (
                      <div key={index} className="flex flex-col bg-green-50 border border-green-100 p-2 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Music size={14} className="text-green-600 flex-shrink-0" />
                                <span className="text-xs text-gray-700 truncate">{file.name}</span>
                                <span className="text-[10px] text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => removePendingAudio(index)}
                                className="text-gray-400 hover:text-red-500 p-1"
                                title="Remover"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        {/* PLAYER PARA OUVIR ANTES DE SALVAR */}
                        <audio 
                            controls 
                            src={URL.createObjectURL(file)} 
                            className="w-full h-8" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={createFlowItem}
              disabled={isSubmitting}
              style={{ backgroundColor: THEME.colors.primary }}
            >
              {isSubmitting ? (
                <RefreshCw className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}{" "}
              Criar Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={isEditItemModal} onOpenChange={setIsEditItemModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Título</Label>
                  <Input
                    value={editItemTitle}
                    onChange={(e) => setEditItemTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={editItemDescription}
                    onChange={(e) => setEditItemDescription(e.target.value)}
                    placeholder="Detalhes adicionais..."
                    className="resize-none h-20"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Referência</Label>
                  <Input
                    value={editItemProductRef}
                    onChange={(e) => setEditItemProductRef(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <select
                    className="w-full border rounded-md p-2 text-sm bg-white"
                    value={editItemAssignedTo}
                    onChange={(e) => setEditItemAssignedTo(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                 <div className="space-y-2">
                  <Label>Prazo (Meta)</Label>
                  <Input
                    type="date"
                    value={editItemDueDate}
                    onChange={(e) => setEditItemDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Início Produção</Label>
                  <Input
                    type="date"
                    value={editItemProductionStart}
                    onChange={(e) => setEditItemProductionStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entrega Produção</Label>
                  <Input
                    type="date"
                    value={editItemProductionDelivery}
                    onChange={(e) => setEditItemProductionDelivery(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                    <Label>Oficina / Terceirizado</Label>
                    <select
                        className="w-full border rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-primary"
                        value={editItemSupplier} 
                        onChange={(e) => setEditItemSupplier(e.target.value)} 
                    >
                        <option value="">Produção Interna</option>
                        {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                            {sup.name} {sup.category === 'HYBRID' ? '(Híbrido)' : ''}
                        </option>
                        ))}
                    </select>
               </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Qtd</Label>
                  <Input
                    type="number"
                    value={editItemQuantity}
                    onChange={(e) => setEditItemQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={editItemPriority}
                    onChange={(e) => setEditItemPriority(e.target.value)}
                  >
                    <option value="1">Alta</option>
                    <option value="2">Média</option>
                    <option value="3">Baixa</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Etapa (Coluna)</Label>
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={editItemStage}
                    onChange={(e) => setEditItemStage(e.target.value)}
                  >
                    {currentFlow?.stages
                      ?.sort((a, b) => a.order - b.order)
                      .map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={editItemStatus}
                    onChange={(e) => setEditItemStatus(e.target.value)}
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="EM_PRODUCAO">Em Produção</option>
                    <option value="CONCLUIDO">Concluído</option>
                  </select>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block font-bold text-gray-700">
                  Mídias Existentes
                </Label>
                <MediaThumbnails item={editingItem} />

                <Label className="mt-6 mb-2 block font-bold text-gray-700">
                  Adicionar Novas Mídias
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="border border-dashed rounded p-3 text-center relative hover:bg-gray-50">
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) =>
                        e.target.files &&
                        setEditItemImages([
                          ...editItemImages,
                          ...Array.from(e.target.files),
                        ])
                      }
                    />
                    <span className="text-xs text-gray-500 flex flex-col items-center gap-1">
                      <ImageIcon size={16} /> + Imagens
                    </span>
                  </div>
                  <div className="border border-dashed rounded p-3 text-center relative hover:bg-gray-50">
                    <Input
                      type="file"
                      multiple
                      accept="video/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) =>
                        e.target.files &&
                        setEditItemVideos([
                          ...editItemVideos,
                          ...Array.from(e.target.files),
                        ])
                      }
                    />
                    <span className="text-xs text-gray-500 flex flex-col items-center gap-1">
                      <Video size={16} /> + Vídeos
                    </span>
                  </div>
                  <div className="border border-dashed rounded p-3 text-center relative hover:bg-gray-50">
                    <Input
                      type="file"
                      multiple
                      accept="audio/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) =>
                        e.target.files &&
                        setEditItemAudios([
                          ...editItemAudios,
                          ...Array.from(e.target.files),
                        ])
                      }
                    />
                    <span className="text-xs text-gray-500 flex flex-col items-center gap-1">
                      <Music size={16} /> + Áudios
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-green-600">
                  {editItemImages.length > 0 && (
                    <span>{editItemImages.length} imgs novas</span>
                  )}
                  {editItemVideos.length > 0 && (
                    <span>{editItemVideos.length} vids novos</span>
                  )}
                  {editItemAudios.length > 0 && (
                    <span>{editItemAudios.length} áudios novos</span>
                  )}
                </div>

                <div className="mt-4 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 h-auto p-0 hover:text-red-700"
                    onClick={clearAllMedia}
                  >
                    Desfazer adições
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={updateFlowItem}
              disabled={isSubmitting}
              style={{ backgroundColor: THEME.colors.primary }}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFlowModal} onOpenChange={setIsFlowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: THEME.colors.textMain }}>
              Novo Fluxo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Fluxo</Label>
              <Input
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder="Ex: Confecção Verão 2025"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFlowModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={createFlow}
              style={{ backgroundColor: THEME.colors.primary }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteFlowModal} onOpenChange={setIsDeleteFlowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle /> Zona de Perigo
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o fluxo{" "}
              <strong>{flows.find((f) => f.id === selectedFlow)?.name}</strong>?
              <br />
              Isso apagará todas as etapas e itens associados permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteFlowModal(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteFlow}>
              Sim, excluir tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteStageModal} onOpenChange={setIsDeleteStageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Etapa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>{stageToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteStageModal(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteStage}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStageModal} onOpenChange={setIsStageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: THEME.colors.textMain }}>
              {editingStage ? "Editar Etapa" : "Nova Etapa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Ex: CORTE, COSTURA"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor de Identificação</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="w-12 p-1 cursor-pointer"
                />
                <Input
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="flex-1 font-mono uppercase"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStageModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={editingStage ? updateStage : createStage}
              style={{ backgroundColor: THEME.colors.primary }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PREVIEW */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewItem?.title}
              <Badge variant="outline">{previewItem?.status}</Badge>
            </DialogTitle>
            <DialogDescription className="flex gap-4">
              <span>REF: {previewItem?.productRef}</span>
            </DialogDescription>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">Detalhes</h4>
                  <div className="text-sm grid grid-cols-2 gap-y-2">
                    <span className="text-gray-500">Quantidade:</span>
                    <span>{previewItem.quantity}</span>
                    <span className="text-gray-500">Prioridade:</span>
                    <span>{previewItem.priority}</span>
                    <span className="text-gray-500">Criado em:</span>
                    <span>
                      {formatDateUTC(previewItem.createdAt)}
                    </span>
                    
                    {/* DATAS NOVAS E EXISTENTES */}
                    <span className="text-gray-500">Prazo (Meta):</span>
                    <span className={previewItem.dueDate && new Date(previewItem.dueDate) < new Date() ? "text-red-500 font-bold" : ""}>
                      {formatDateUTC(previewItem.dueDate)}
                    </span>

                    <span className="text-gray-500">Início Produção:</span>
                    <span className="text-blue-600 font-medium">
                      {formatDateUTC(previewItem.productionStartedAt)}
                    </span>

                    <span className="text-gray-500">Entrega Realizada:</span>
                    <span className="text-green-600 font-medium">
                      {formatDateUTC(previewItem.deliveryAt)}
                    </span>
                    
                    {/* Fornecedor */}
                    <span className="text-gray-500">Produção Por:</span>
                    <span className="font-medium">
                      {previewItem.supplier ? previewItem.supplier.name : 'Interno'}
                    </span>
                  </div>
                </div>
                {/* BLOCO DE DESCRIÇÃO NO PREVIEW */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Descrição</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {previewItem.description || "Sem descrição."}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">
                  Imagens ({previewItem.images.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {previewItem.images.map((img) => (
                    <div
                      key={img.id}
                      className="relative group rounded-lg overflow-hidden border"
                    >
                      <img
                        src={img.url}
                        alt={img.filename}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/20"
                          onClick={() => window.open(img.url, "_blank")}
                        >
                          <Maximize2 size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/20"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = img.url;
                            a.download = img.filename;
                            a.click();
                          }}
                        >
                          <Download size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {(previewItem.audios.length > 0 ||
                previewItem.videos.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {previewItem.audios.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Áudios</h4>
                        <div className="space-y-2">
                          {previewItem.audios.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center gap-2 bg-gray-100 p-2 rounded"
                            >
                              <Music size={16} className="text-gray-500" />
                              <span className="text-xs truncate flex-1">
                                {a.filename}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => window.open(a.url, "_blank")}
                              >
                                <Eye size={14} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {previewItem.videos.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Vídeos</h4>
                        <div className="space-y-2">
                          {previewItem.videos.map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center gap-2 bg-gray-100 p-2 rounded"
                            >
                              <Video size={16} className="text-gray-500" />
                              <span className="text-xs truncate flex-1">
                                {v.filename}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => window.open(v.url, "_blank")}
                              >
                                <Eye size={14} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewModal(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                setIsPreviewModal(false);
                openEditModal(previewItem!);
              }}
            >
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteModal
        isOpen={isDeleteItemModal}
        onClose={() => {
          setIsDeleteItemModal(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDeleteItem}
        loading={isSubmitting}
        title="Excluir Item?"
        description={`Você tem certeza que deseja excluir o item "${itemToDelete?.title}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
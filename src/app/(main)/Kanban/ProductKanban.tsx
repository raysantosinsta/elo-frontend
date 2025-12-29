/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
// IMPORTANTE: Importe sua instância de API aqui
import { api } from "@/services/api";
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit,
  Eye,
  FileVideo,
  Flag,
  Globe,
  ImageIcon,
  Layout,
  MapPin,
  Menu,
  Mic,
  MoreHorizontal,
  MoreVertical,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// --- INTERFACES ---
interface Professional {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface TaskImage {
  id: string;
  url: string;
  filename: string;
  size?: number;
}

interface TaskAddress {
  id: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
  latitude?: number;
  longitude?: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;

  finalComment?: string;
  scheduledDate?: string;
  completionDate?: string;

  dueDate?: string;
  priority: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  columnId?: string | null;
  assignedTo?: Professional;
  createdBy?: Professional;

  taskAddress?: TaskAddress | null;

  taskImages: TaskImage[];
  taskAudios: any[];
  taskVideos: any[];
  createdAt: string;
  updatedAt: string;
}

interface Column {
  id: string;
  title: string;
  order: number;
  tasks: Task[];
  status?: "PENDING" | "FINISHED";
}

export default function ProductKanban() {
  const { user, loading: authLoading } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  // --- ESTADOS GERAIS ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modais
  const [isColumnModal, setIsColumnModal] = useState(false);
  const [isTaskModal, setIsTaskModal] = useState(false);
  const [isEditTaskModal, setIsEditTaskModal] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);

  // Seleções
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [colTitle, setColTitle] = useState("");

  // --- FORM NOVA TAREFA ---
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskScheduledDate, setTaskScheduledDate] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskColumn, setTaskColumn] = useState("");
  const [taskPriority, setTaskPriority] = useState("1");
  const [taskFinalComment, setTaskFinalComment] = useState("");

  // Endereço (Nova)
  const [taskZip, setTaskZip] = useState("");
  const [taskStreet, setTaskStreet] = useState("");
  const [taskNumber, setTaskNumber] = useState("");
  const [taskNeighborhood, setTaskNeighborhood] = useState("");
  const [taskCity, setTaskCity] = useState("");
  const [taskState, setTaskState] = useState("");
  const [taskComplement, setTaskComplement] = useState("");
  const [taskLatitude, setTaskLatitude] = useState("");
  const [taskLongitude, setTaskLongitude] = useState("");

  // Arquivos (Nova)
  const [taskImages, setTaskImages] = useState<File[]>([]);
  const [taskAudios, setTaskAudios] = useState<File[]>([]);
  const [taskVideos, setTaskVideos] = useState<File[]>([]);

  // --- FORM EDIÇÃO TAREFA ---
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskScheduledDate, setEditTaskScheduledDate] = useState("");
  const [editTaskAssignedTo, setEditTaskAssignedTo] = useState("");
  const [editTaskColumn, setEditTaskColumn] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState("1");
  const [editTaskFinalComment, setEditTaskFinalComment] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState("PENDING");

  // Endereço (Edição)
  const [editTaskZip, setEditTaskZip] = useState("");
  const [editTaskStreet, setEditTaskStreet] = useState("");
  const [editTaskNumber, setEditTaskNumber] = useState("");
  const [editTaskNeighborhood, setEditTaskNeighborhood] = useState("");
  const [editTaskCity, setEditTaskCity] = useState("");
  const [editTaskState, setEditTaskState] = useState("");
  const [editTaskComplement, setEditTaskComplement] = useState("");
  const [editTaskLatitude, setEditTaskLatitude] = useState("");
  const [editTaskLongitude, setEditTaskLongitude] = useState("");

  // Arquivos (Edição)
  const [editTaskImages, setEditTaskImages] = useState<File[]>([]);
  const [editTaskAudios, setEditTaskAudios] = useState<File[]>([]);
  const [editTaskVideos, setEditTaskVideos] = useState<File[]>([]);

  // Remoções na Edição
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [removedAudioIds, setRemovedAudioIds] = useState<string[]>([]);
  const [removedVideoIds, setRemovedVideoIds] = useState<string[]>([]);

  // Gravação
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Modal Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: "column" | "task";
    id: string;
  } | null>(null);

  // --- VIACEP (Mantido com fetch nativo pois é API Externa) ---
  const handleCepSearch = async (isEdit: boolean) => {
    const cep = isEdit ? editTaskZip : taskZip;
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      toast.error("CEP inválido");
      return;
    }
    setIsSearchingCep(true);
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`
      );
      const data = await response.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      if (isEdit) {
        setEditTaskStreet(data.logradouro);
        setEditTaskNeighborhood(data.bairro);
        setEditTaskCity(data.localidade);
        setEditTaskState(data.uf);
      } else {
        setTaskStreet(data.logradouro);
        setTaskNeighborhood(data.bairro);
        setTaskCity(data.localidade);
        setTaskState(data.uf);
      }
      toast.success("Endereço preenchido!");
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsSearchingCep(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Pendente",
          style: "bg-slate-100 text-slate-600 border border-slate-200",
        };
      case "IN_PROGRESS":
        return {
          label: "Em Progresso",
          style: "bg-blue-100 text-blue-700 border border-blue-200",
        };
      case "COMPLETED":
        return {
          label: "Concluído",
          style: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        };
      case "FAILED":
        return {
          label: "Falhou",
          style: "bg-red-100 text-red-700 border border-red-200",
        };
      default:
        return { label: status, style: "bg-gray-100 text-gray-500" };
    }
  };

  // --- GEOCODING (NOMINATIM / OPENSTREETMAP - Mantido fetch nativo) ---
  const handleGeocode = async (isEdit: boolean) => {
    const street = isEdit ? editTaskStreet : taskStreet;
    const number = isEdit ? editTaskNumber : taskNumber;
    const city = isEdit ? editTaskCity : taskCity;
    const state = isEdit ? editTaskState : taskState;

    if (!street || !city || !state) {
      toast.error("Preencha Rua, Cidade e Estado para buscar coordenadas.");
      return;
    }

    setIsGeocoding(true);
    try {
      const query = `${street}, ${
        number ? number + "," : ""
      } ${city}, ${state}, Brasil`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "ProductKanbanApp/1.0",
        },
      });

      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        if (isEdit) {
          setEditTaskLatitude(lat);
          setEditTaskLongitude(lon);
        } else {
          setTaskLatitude(lat);
          setTaskLongitude(lon);
        }
        toast.success("Coordenadas encontradas!");
      } else {
        toast.error("Endereço não encontrado no mapa. Tente simplificar.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar coordenadas.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // --- FETCH DATA (USANDO API AXIOS) ---
  const fetchColumns = useCallback(async () => {
    try {
      const { data } = await api.get("/kanban-columns");
      let columnsArray: Column[] = [];
      if (Array.isArray(data)) columnsArray = data;
      else if (data.columns && Array.isArray(data.columns))
        columnsArray = data.columns;
      if (columnsArray.length > 0)
        setColumns(
          columnsArray.sort((a, b) => (a.order || 0) - (b.order || 0))
        );
      else setColumns([]);
    } catch (err) {
      setColumns([]);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const { data } = await api.get("/tasks", { params: { limit: 100 } });
      let tasksArray = [];
      if (data.data && Array.isArray(data.data)) tasksArray = data.data;
      else if (Array.isArray(data)) tasksArray = data;
      else if (data.tasks && Array.isArray(data.tasks)) tasksArray = data.tasks;
      setTasks(tasksArray);
    } catch (err) {
      setTasks([]);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const { data } = await api.get(`/users/company/${user.company.id}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {}
  }, [user?.company?.id]);

  const loadInitialData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([fetchColumns(), fetchTasks(), fetchUsers()]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchColumns, fetchTasks, fetchUsers]);

  useEffect(() => {
    if (user) loadInitialData();
  }, [user, loadInitialData]);

  // --- CRUD COLUNAS/TAREFAS ---
  const createColumn = async () => {
    if (!colTitle.trim()) return toast.error("Título obrigatório");
    try {
      const { data: newColumn } = await api.post("/kanban-columns", {
        title: colTitle,
      });
      setColumns((prev) => [...prev, newColumn]);
      setColTitle("");
      setIsColumnModal(false);
      toast.success("Coluna criada");
    } catch (err) {
      toast.error("Erro ao criar coluna");
    }
  };

  const updateColumn = async () => {
    if (!editingCol || !colTitle.trim()) return;
    try {
      const { data: updated } = await api.put(
        `/kanban-columns/${editingCol.id}`,
        { title: colTitle }
      );
      setColumns((prev) =>
        prev.map((c) => (c.id === editingCol.id ? updated : c))
      );
      setColTitle("");
      setEditingCol(null);
      setIsColumnModal(false);
      toast.success("Coluna atualizada");
    } catch (err) {
      toast.error("Erro ao atualizar");
    }
  };

  const onRequestDeleteColumn = (id: string) => {
    if (tasks.some((t) => t.columnId === id))
      return toast.error("Coluna possui tarefas vinculadas.");
    setItemToDelete({ type: "column", id });
    setDeleteModalOpen(true);
  };

  const onRequestDeleteTask = (id: string) => {
    setItemToDelete({ type: "task", id });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      if (itemToDelete.type === "column") {
        await api.delete(`/kanban-columns/${itemToDelete.id}`);
        setColumns((prev) => prev.filter((c) => c.id !== itemToDelete.id));
        toast.success("Coluna excluída");
      } else {
        await api.delete(`/tasks/${itemToDelete.id}`);
        setTasks((prev) => prev.filter((t) => t.id !== itemToDelete.id));
        toast.success("Tarefa excluída");
        if (isPreviewModal) setIsPreviewModal(false);
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Erro ao excluir"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const refreshTask = useCallback(async (taskId: string) => {
    try {
      const { data: updated } = await api.get(`/tasks/${taskId}`);
      // Se necessário ajustar URL, o interceptor da API não muda o body da resposta,
      // então sua lógica de ajuste de URL relativa continua válida se o backend não retornar URL absoluta.
      const API_URL =
        process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

      const taskWithUrls = {
        ...updated,
        taskImages:
          updated.taskImages?.map((img: TaskImage) => ({
            ...img,
            url: img.url.startsWith("http") ? img.url : `${API_URL}${img.url}`,
          })) || [],
      };
      setTasks((prev) => prev.map((t) => (t.id === taskId ? taskWithUrls : t)));
    } catch (err) {}
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, columnId: string | null) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("taskId");
      if (!taskId) return;
      const prevTasks = [...tasks];
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, columnId } : t))
      );
      try {
        await api.patch(`/tasks/${taskId}/status`, { columnId });
        await refreshTask(taskId);
      } catch (err) {
        setTasks(prevTasks);
        toast.error("Erro ao mover tarefa");
      }
    },
    [tasks, refreshTask]
  );

  // --- GRAVAÇÃO ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) =>
        e.data.size > 0 && audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setTaskAudios([
          new File([blob], `gravacao-${Date.now()}.webm`, {
            type: "audio/webm",
          }),
        ]);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      toast.error("Erro no microfone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    let i: NodeJS.Timeout;
    if (isRecording)
      i = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [isRecording]);

  const removeNewFile = (idx: number, type: string, isEdit: boolean) => {
    if (isEdit) {
      if (type === "image")
        setEditTaskImages((prev) => prev.filter((_, i) => i !== idx));
      if (type === "audio")
        setEditTaskAudios((prev) => prev.filter((_, i) => i !== idx));
      if (type === "video")
        setEditTaskVideos((prev) => prev.filter((_, i) => i !== idx));
    } else {
      if (type === "image")
        setTaskImages((prev) => prev.filter((_, i) => i !== idx));
      if (type === "audio")
        setTaskAudios((prev) => prev.filter((_, i) => i !== idx));
      if (type === "video")
        setTaskVideos((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const removeExistingFile = (id: string, type: string) => {
    if (type === "image") setRemovedImageIds((prev) => [...prev, id]);
    if (type === "audio") setRemovedAudioIds((prev) => [...prev, id]);
    if (type === "video") setRemovedVideoIds((prev) => [...prev, id]);
  };

  // --- SUBMISSÃO ---
  const createTask = async () => {
    if (!taskTitle.trim()) return toast.error("Título obrigatório");
    if (!taskColumn) return toast.error("Selecione coluna");

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", taskTitle);
    formData.append("description", taskDescription);
    formData.append("priority", taskPriority);
    formData.append("columnId", taskColumn);
    if (user?.company?.id) formData.append("companyId", user.company.id);
    if (user?.id) formData.append("createdById", user.id);
    if (taskAssignedTo) formData.append("assignedToId", taskAssignedTo);

    if (taskDueDate)
      formData.append("dueDate", new Date(taskDueDate).toISOString());
    if (taskScheduledDate)
      formData.append("scheduledAt", new Date(taskScheduledDate).toISOString());
    if (taskFinalComment) formData.append("finalComment", taskFinalComment);

    // Endereço + Lat/Long
    if (taskZip && taskStreet && taskNumber) {
      formData.append(
        "address",
        JSON.stringify({
          cep: taskZip,
          endereco: taskStreet,
          numero: taskNumber,
          bairro: taskNeighborhood,
          cidade: taskCity,
          estado: taskState,
          complemento: taskComplement,
          latitude: taskLatitude ? parseFloat(taskLatitude) : undefined,
          longitude: taskLongitude ? parseFloat(taskLongitude) : undefined,
        })
      );
    }

    taskImages.forEach((f) => formData.append("images", f));
    taskAudios.forEach((f) => formData.append("audios", f));
    taskVideos.forEach((f) => formData.append("videos", f));

    try {
      // Axios lida automaticamente com FormData
      const { data: newTask } = await api.post("/tasks", formData);
      setTasks((prev) => [newTask, ...prev]);
      resetTaskForm();
      setIsTaskModal(false);
      toast.success("Tarefa criada!");
      setTimeout(() => refreshTask(newTask.id), 1000);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Erro ao criar"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTask = async () => {
    if (!editingTask || !editTaskTitle.trim())
      return toast.error("Título obrigatório");
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", editTaskTitle);
    formData.append("description", editTaskDescription || "");
    formData.append("priority", editTaskPriority);
    if (editTaskColumn) formData.append("columnId", editTaskColumn);
    if (editTaskAssignedTo) formData.append("assignedToId", editTaskAssignedTo);
    formData.append("status", editTaskStatus);

    if (editTaskDueDate)
      formData.append("dueDate", new Date(editTaskDueDate).toISOString());
    if (editTaskScheduledDate)
      formData.append(
        "scheduledAt",
        new Date(editTaskScheduledDate).toISOString()
      );
    if (editTaskFinalComment)
      formData.append("finalComment", editTaskFinalComment);

    if (removedImageIds.length)
      formData.append("removeImageIds", JSON.stringify(removedImageIds));
    if (removedAudioIds.length)
      formData.append("removeAudioIds", JSON.stringify(removedAudioIds));
    if (removedVideoIds.length)
      formData.append("removeVideoIds", JSON.stringify(removedVideoIds));

    editTaskImages.forEach((f) => formData.append("images", f));
    editTaskAudios.forEach((f) => formData.append("audios", f));
    editTaskVideos.forEach((f) => formData.append("videos", f));

    try {
      const { data: responseData } = await api.put(
        `/tasks/${editingTask.id}`,
        formData
      );
      let updated = responseData;

      if (editTaskZip && editTaskStreet && editTaskNumber) {
        // Atualiza endereço via POST (conforme seu código original)
        await api.post(`/tasks/${editingTask.id}/address`, {
          cep: editTaskZip,
          endereco: editTaskStreet,
          numero: editTaskNumber,
          bairro: editTaskNeighborhood,
          cidade: editTaskCity,
          estado: editTaskState,
          complemento: editTaskComplement,
          latitude: editTaskLatitude ? parseFloat(editTaskLatitude) : undefined,
          longitude: editTaskLongitude
            ? parseFloat(editTaskLongitude)
            : undefined,
        });

        // Refresh após salvar endereço
        const { data: refreshData } = await api.get(`/tasks/${editingTask.id}`);
        updated = refreshData;
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? updated : t))
      );
      setIsEditTaskModal(false);
      setEditingTask(null);
      resetEditTaskForm();
      toast.success("Atualizado!");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Erro ao atualizar"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskScheduledDate("");
    setTaskAssignedTo("");
    setTaskColumn("");
    setTaskPriority("1");
    setTaskFinalComment("");
    setTaskImages([]);
    setTaskAudios([]);
    setTaskVideos([]);
    setAudioBlob(null);
    setRecordingTime(0);
    setTaskZip("");
    setTaskStreet("");
    setTaskNumber("");
    setTaskNeighborhood("");
    setTaskCity("");
    setTaskState("");
    setTaskComplement("");
    setTaskLatitude("");
    setTaskLongitude("");
  };

  const resetEditTaskForm = () => {
    setEditTaskTitle("");
    setEditTaskDescription("");
    setEditTaskDueDate("");
    setEditTaskScheduledDate("");
    setEditTaskAssignedTo("");
    setEditTaskColumn("");
    setEditTaskPriority("1");
    setEditTaskStatus("PENDING");
    setEditTaskFinalComment("");
    setEditTaskImages([]);
    setEditTaskAudios([]);
    setEditTaskVideos([]);
    setRemovedImageIds([]);
    setRemovedAudioIds([]);
    setRemovedVideoIds([]);
    setEditTaskZip("");
    setEditTaskStreet("");
    setEditTaskNumber("");
    setEditTaskNeighborhood("");
    setEditTaskCity("");
    setEditTaskState("");
    setEditTaskComplement("");
    setEditTaskLatitude("");
    setEditTaskLongitude("");
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || "");
    setEditTaskDueDate(
      task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ""
    );
    setEditTaskScheduledDate(
      task.scheduledDate
        ? new Date(task.scheduledDate).toISOString().slice(0, 16)
        : ""
    );
    setEditTaskAssignedTo(task.assignedTo?.id || "");
    setEditTaskColumn(task.columnId || "");
    setEditTaskPriority(task.priority.toString());
    setEditTaskStatus(task.status);

    setEditTaskFinalComment(task.finalComment || "");

    if (task.taskAddress) {
      setEditTaskZip(task.taskAddress.cep);
      setEditTaskStreet(task.taskAddress.endereco);
      setEditTaskNumber(task.taskAddress.numero);
      setEditTaskNeighborhood(task.taskAddress.bairro);
      setEditTaskCity(task.taskAddress.cidade);
      setEditTaskState(task.taskAddress.estado);
      setEditTaskComplement(task.taskAddress.complemento || "");
      setEditTaskLatitude(
        task.taskAddress.latitude ? String(task.taskAddress.latitude) : ""
      );
      setEditTaskLongitude(
        task.taskAddress.longitude ? String(task.taskAddress.longitude) : ""
      );
    }

    setIsEditTaskModal(true);
    setIsMobileMenuOpen(false);
  };

  const openCreateTaskInColumn = (columnId: string) => {
    resetTaskForm();
    setTaskColumn(columnId);
    setIsTaskModal(true);
    setIsMobileMenuOpen(false);
  };

  // --- UI UTILS ---
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatDateShort = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const isOverdue = (d: string) => new Date(d) < new Date();
  const getInitials = (name: string) => {
    const p = name.split(" ");
    return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
  };
  const getPriorityConfig = (priority: number) => {
    if (priority === 1)
      return { label: "High", style: "bg-rose-100 text-rose-700" };
    if (priority === 2)
      return { label: "Medium", style: "bg-amber-100 text-amber-700" };
    return { label: "Low", style: "bg-indigo-100 text-indigo-700" };
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const filesCount =
      task.taskImages.length + task.taskAudios.length + task.taskVideos.length;
    const cover = task.taskImages[0];

    return (
      <Card
        draggable
        onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
        className="bg-white shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing border border-slate-200 rounded-2xl group relative overflow-hidden transition-all duration-200"
      >
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="flex justify-end items-start h-6">
            {task.taskAddress && (
              <div
                className="absolute top-5 left-5 text-indigo-500"
                title="Possui endereço"
              >
                <MapPin className="w-4 h-4" />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-600 -mr-2"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setPreviewTask(task);
                    setIsPreviewModal(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" /> Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditModal(task)}>
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onRequestDeleteTask(task.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className={cn(task.taskAddress ? "mt-2" : "")}>
            <h3
              className="font-bold text-slate-900 text-[15px] mb-1.5 cursor-pointer hover:text-indigo-600"
              onClick={() => {
                setPreviewTask(task);
                setIsPreviewModal(true);
              }}
            >
              {task.title}
            </h3>
            <p className="text-slate-500 text-xs line-clamp-2">
              {task.description || "Sem descrição."}
            </p>
          </div>

          {cover && (
            <div
              className="relative w-full h-32 rounded-lg overflow-hidden mt-1 cursor-pointer"
              onClick={() => {
                setPreviewTask(task);
                setIsPreviewModal(true);
              }}
            >
              <img
                src={cover.url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              {task.taskImages.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  +{task.taskImages.length - 1}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500 text-xs font-medium">
              Assignees:
            </span>
            <div className="flex -space-x-2">
              {task.assignedTo ? (
                <div
                  className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600"
                  title={task.assignedTo.name}
                >
                  {getInitials(task.assignedTo.name)}
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-400">
                  <User className="w-3 h-3" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            {/* DATA DE VENCIMENTO (Já existente) */}
            <div
              className={cn(
                "flex items-center gap-2 text-xs font-medium",
                isOverdue(task.dueDate || "") && task.status !== "COMPLETED"
                  ? "text-rose-500"
                  : "text-slate-400"
              )}
            >
              <Flag className="w-3.5 h-3.5" />{" "}
              <span>
                {task.dueDate ? formatDateShort(task.dueDate) : "Sem prazo"}
              </span>
            </div>

            {/* ÁREA DOS BADGES (STATUS + PRIORIDADE) */}
            <div className="flex items-center gap-1.5">
              {/* --- NOVO: BADGE DE STATUS --- */}
              <div
                className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                  getStatusConfig(task.status).style
                )}
              >
                {getStatusConfig(task.status).label}
              </div>

              {/* PRIORIDADE (Já existente) */}
              <div
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-[10px] font-bold",
                  getPriorityConfig(task.priority).style
                )}
              >
                {getPriorityConfig(task.priority).label}
              </div>
            </div>
          </div>

          <div className="pt-3 mt-1 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs font-medium">
            <div className="flex items-center gap-1.5" title="Anexos">
              <Paperclip className="w-3.5 h-3.5" /> <span>{filesCount}</span>
            </div>

            <div
              className="flex items-center gap-1.5 text-[10px]"
              title="Data da última atualização"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{formatDateTime(task.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (authLoading || loading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F0E6]">
        <RefreshCw className="h-10 w-10 text-[#D35400] animate-spin" />
      </div>
    );
  if (!user) return null;

  return (
    <div className="min-h-[100dvh] bg-[#F5F0E6] flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-[#2C3E50] text-white px-4 py-3 shadow-md border-b border-[#2C3E50] z-20">
        <div className="flex justify-between items-center max-w-[1920px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#D35400]" />
                <h1 className="text-lg font-bold">Fluxo de Produto</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 mr-4 bg-white/5 px-3 py-1 rounded-full border border-white/10 text-xs text-gray-300">
              <span>{tasks.length} Tarefas</span>
              <span className="w-px h-3 bg-white/20"></span>
              <span>{columns.length} Colunas</span>
            </div>
            <Button
              onClick={() => {
                setEditingCol(null);
                setColTitle("");
                setIsColumnModal(true);
              }}
              variant="outline"
              className="hidden sm:flex border-white/20 text-white hover:bg-white/10 bg-transparent text-xs h-9"
            >
              <Settings className="w-3.5 h-3.5 mr-2" /> Colunas
            </Button>
            <Button
              onClick={() => {
                resetTaskForm();
                setIsTaskModal(true);
              }}
              className="bg-[#D35400] hover:bg-[#A04000] text-white text-xs h-9 font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nova Tarefa
            </Button>
          </div>
        </div>
      </header>

      {/* BOARD */}
      <main className="flex-1 overflow-x-auto p-4 md:p-6">
        <div className="flex gap-4 min-w-max h-full items-start">
          {columns.map((col) => (
            <div
              key={col.id}
              className="w-80 flex-shrink-0 flex flex-col max-h-[calc(100vh-140px)] rounded-xl bg-white border border-[#95A5A6]/20 shadow-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="px-4 py-3 border-b border-[#95A5A6]/10 flex justify-between items-center bg-[#FAFAFA] rounded-t-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2C3E50]"></span>
                  <h3 className="font-bold text-[#2D3436] text-sm uppercase">
                    {col.title}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-[#F5F0E6] text-[#2D3436] text-[10px]"
                  >
                    {tasks.filter((t) => t.columnId === col.id).length}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-[#95A5A6]"
                    onClick={() => openCreateTaskInColumn(col.id)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-[#95A5A6]"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingCol(col);
                          setColTitle(col.title);
                          setIsColumnModal(true);
                        }}
                      >
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onRequestDeleteColumn(col.id)}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="p-3 overflow-y-auto flex-1 space-y-3 bg-[#FAFAFA]/50 custom-scrollbar">
                {tasks
                  .filter((t) => t.columnId === col.id)
                  .map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
              </div>
            </div>
          ))}
          {tasks.filter((t) => !t.columnId).length > 0 && (
            <div
              className="w-80 flex-shrink-0 flex flex-col max-h-[calc(100vh-140px)] rounded-xl bg-orange-50 border border-orange-100 shadow-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, null)}
            >
              <div className="px-4 py-3 border-b border-orange-200 bg-orange-100/50 rounded-t-xl flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-orange-800 text-sm uppercase">
                    Não Classificado
                  </h3>
                </div>
              </div>
              <div className="p-3 overflow-y-auto flex-1 space-y-3">
                {tasks
                  .filter((t) => !t.columnId)
                  .map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MODAL DE TAREFA (CRIAÇÃO/EDIÇÃO) --- */}
      <Dialog
        open={isTaskModal || isEditTaskModal}
        onOpenChange={(o) => {
          if (!o) {
            setIsTaskModal(false);
            setIsEditTaskModal(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              isEditTaskModal ? updateTask() : createTask();
            }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isEditTaskModal ? (
                  <Edit className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5 text-[#D35400]" />
                )}{" "}
                {isEditTaskModal ? "Editar Tarefa" : "Nova Tarefa"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* BLOCO 1: Informações Básicas */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>
                    Título <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={isEditTaskModal ? editTaskTitle : taskTitle}
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskTitle(e.target.value)
                        : setTaskTitle(e.target.value)
                    }
                    placeholder="Ex: Refatorar Homepage"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={
                      isEditTaskModal ? editTaskDescription : taskDescription
                    }
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskDescription(e.target.value)
                        : setTaskDescription(e.target.value)
                    }
                    placeholder="Detalhes..."
                  />
                </div>
              </div>

              {/* BLOCO 2: Endereço */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                <Label className="flex items-center gap-2 font-bold">
                  <MapPin className="w-4 h-4 text-[#D35400]" /> Localização
                </Label>
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <div className="relative">
                    <Input
                      placeholder="CEP"
                      maxLength={9}
                      value={isEditTaskModal ? editTaskZip : taskZip}
                      onChange={(e) =>
                        isEditTaskModal
                          ? setEditTaskZip(e.target.value)
                          : setTaskZip(e.target.value)
                      }
                      onBlur={() => handleCepSearch(isEditTaskModal)}
                    />
                    {isSearchingCep && (
                      <div className="absolute right-2 top-2.5">
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>
                  <Input
                    placeholder="Rua"
                    value={isEditTaskModal ? editTaskStreet : taskStreet}
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskStreet(e.target.value)
                        : setTaskStreet(e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-3">
                  <Input
                    placeholder="Nº"
                    value={isEditTaskModal ? editTaskNumber : taskNumber}
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskNumber(e.target.value)
                        : setTaskNumber(e.target.value)
                    }
                  />
                  <Input
                    placeholder="Bairro"
                    value={
                      isEditTaskModal ? editTaskNeighborhood : taskNeighborhood
                    }
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskNeighborhood(e.target.value)
                        : setTaskNeighborhood(e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-3">
                  <Input
                    placeholder="Cidade"
                    value={isEditTaskModal ? editTaskCity : taskCity}
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskCity(e.target.value)
                        : setTaskCity(e.target.value)
                    }
                  />
                  <Input
                    placeholder="UF"
                    value={isEditTaskModal ? editTaskState : taskState}
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskState(e.target.value)
                        : setTaskState(e.target.value)
                    }
                  />
                </div>
                <Input
                  placeholder="Complemento"
                  value={isEditTaskModal ? editTaskComplement : taskComplement}
                  onChange={(e) =>
                    isEditTaskModal
                      ? setEditTaskComplement(e.target.value)
                      : setTaskComplement(e.target.value)
                  }
                />

                {/* Lat/Long Automático */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Coordenadas
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGeocode(isEditTaskModal)}
                      disabled={isGeocoding}
                      className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      {isGeocoding ? (
                        <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Search className="w-3 h-3 mr-1" />
                      )}
                      {isGeocoding ? "Buscando..." : "Buscar Coordenadas"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Latitude"
                      value={isEditTaskModal ? editTaskLatitude : taskLatitude}
                      onChange={(e) =>
                        isEditTaskModal
                          ? setEditTaskLatitude(e.target.value)
                          : setTaskLatitude(e.target.value)
                      }
                      type="number"
                      step="any"
                      className="bg-white"
                    />
                    <Input
                      placeholder="Longitude"
                      value={
                        isEditTaskModal ? editTaskLongitude : taskLongitude
                      }
                      onChange={(e) =>
                        isEditTaskModal
                          ? setEditTaskLongitude(e.target.value)
                          : setTaskLongitude(e.target.value)
                      }
                      type="number"
                      step="any"
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 3: Detalhes e Prazos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* --- NOVO CAMPO: STATUS (Apenas na edição) --- */}
                {isEditTaskModal && (
                  <div className="grid gap-2">
                    <Label>Status Atual</Label>
                    <select
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm font-medium"
                      value={editTaskStatus}
                      onChange={(e) => setEditTaskStatus(e.target.value)}
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="IN_PROGRESS">Em Progresso</option>
                      <option value="COMPLETED">Concluído</option>
                      <option value="FAILED">Falhou</option>
                    </select>
                  </div>
                )}
                
                <div className="grid gap-2">
                  <Label>Prioridade</Label>
                  <select
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={isEditTaskModal ? editTaskPriority : taskPriority}
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskPriority(e.target.value)
                        : setTaskPriority(e.target.value)
                    }
                  >
                    <option value="1">Alta</option>
                    <option value="2">Média</option>
                    <option value="3">Baixa</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Coluna</Label>
                  <select
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={isEditTaskModal ? editTaskColumn : taskColumn}
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskColumn(e.target.value)
                        : setTaskColumn(e.target.value)
                    }
                  >
                    <option value="">-- Selecione --</option>
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Agendado Para</Label>
                  <Input
                    type="datetime-local"
                    value={
                      isEditTaskModal
                        ? editTaskScheduledDate
                        : taskScheduledDate
                    }
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskScheduledDate(e.target.value)
                        : setTaskScheduledDate(e.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Prazo Final (Due Date)</Label>
                  <Input
                    type="datetime-local"
                    value={isEditTaskModal ? editTaskDueDate : taskDueDate}
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskDueDate(e.target.value)
                        : setTaskDueDate(e.target.value)
                    }
                  />
                </div>
              </div>

              {/* BLOCO 4: Responsável */}
              <div className="grid gap-2 mt-4">
                <Label>Responsável</Label>
                <select
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={isEditTaskModal ? editTaskAssignedTo : taskAssignedTo}
                  onChange={(e) =>
                    isEditTaskModal
                      ? setEditTaskAssignedTo(e.target.value)
                      : setTaskAssignedTo(e.target.value)
                  }
                >
                  <option value="">Sem responsável</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* BLOCO 5: Comentário Final */}
              <div className="grid gap-2">
                <Label>Comentário Final / Observações</Label>
                <Textarea
                  className="min-h-[80px]"
                  placeholder="Informações de conclusão..."
                  value={
                    isEditTaskModal ? editTaskFinalComment : taskFinalComment
                  }
                  onChange={(e) =>
                    isEditTaskModal
                      ? setEditTaskFinalComment(e.target.value)
                      : setTaskFinalComment(e.target.value)
                  }
                />
              </div>

              {/* BLOCO 6: Arquivos */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" /> Anexos
                </h4>

                {isEditTaskModal && editingTask?.taskImages.length! > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {editingTask?.taskImages.map(
                      (img) =>
                        !removedImageIds.includes(img.id) && (
                          <div
                            key={img.id}
                            className="relative aspect-square border rounded overflow-hidden group"
                          >
                            <img
                              src={img.url}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                removeExistingFile(img.id, "image")
                              }
                              className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Label className="cursor-pointer border border-dashed p-3 rounded-md flex items-center gap-2 hover:bg-slate-50">
                    <ImageIcon className="w-4 h-4" /> Add Imagem{" "}
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          const f = Array.from(e.target.files);
                          isEditTaskModal
                            ? setEditTaskImages((p) => [...p, ...f])
                            : setTaskImages((p) => [...p, ...f]);
                        }
                      }}
                    />
                  </Label>
                  <Label className="cursor-pointer border border-dashed p-3 rounded-md flex items-center gap-2 hover:bg-slate-50">
                    <FileVideo className="w-4 h-4" /> Add Vídeo{" "}
                    <Input
                      type="file"
                      accept="video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          const f = Array.from(e.target.files);
                          isEditTaskModal
                            ? setEditTaskVideos((p) => [...p, ...f])
                            : setTaskVideos((p) => [...p, ...f]);
                        }
                      }}
                    />
                  </Label>
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={isRecording ? "animate-pulse" : ""}
                  >
                    <Mic className="w-4 h-4 mr-2" />{" "}
                    {isRecording ? "Gravando..." : "Gravar Áudio"}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTaskModal(false);
                  setIsEditTaskModal(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#D35400] text-white"
              >
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL COLUNA --- */}
      <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
        <DialogContent className="sm:max-w-[425px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editingCol ? updateColumn() : createColumn();
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {editingCol ? "Renomear" : "Nova Coluna"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Título</Label>
                <Input
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsColumnModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#2C3E50] text-white">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL PREVIEW --- */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogDescription className="sr-only">Preview</DialogDescription>
          {previewTask && (
            <div className="flex flex-col h-full bg-white">
              <div className="p-6 border-b flex justify-between items-start bg-white sticky top-0 z-10">
                <div>
                  <Badge
                    className={cn(
                      "text-[10px] mb-2",
                      getPriorityConfig(previewTask.priority).style
                    )}
                  >
                    {getPriorityConfig(previewTask.priority).label}
                  </Badge>
                  <h2 className="text-2xl font-bold">{previewTask.title}</h2>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsPreviewModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Responsável
                    </span>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <User className="w-3 h-3" />{" "}
                      {previewTask.assignedTo?.name || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Vencimento
                    </span>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Flag className="w-3 h-3" />{" "}
                      {previewTask.dueDate
                        ? formatDateTime(previewTask.dueDate)
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Agendado
                    </span>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="w-3 h-3" />{" "}
                      {previewTask.scheduledDate
                        ? formatDateTime(previewTask.scheduledDate)
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Criado
                    </span>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="w-3 h-3" />{" "}
                      {formatDateShort(previewTask.createdAt)}
                    </div>
                  </div>
                </div>

                {previewTask.taskAddress && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <h3 className="text-xs font-bold text-indigo-900 uppercase mb-2 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Endereço
                    </h3>
                    <p className="text-sm text-indigo-800">
                      {previewTask.taskAddress.endereco},{" "}
                      {previewTask.taskAddress.numero} -{" "}
                      {previewTask.taskAddress.bairro}
                    </p>
                    <p className="text-xs text-indigo-600">
                      {previewTask.taskAddress.cidade}/
                      {previewTask.taskAddress.estado} - CEP:{" "}
                      {previewTask.taskAddress.cep}
                    </p>
                    {(previewTask.taskAddress.latitude ||
                      previewTask.taskAddress.longitude) && (
                      <div className="mt-2 pt-2 border-t border-indigo-200 text-xs text-indigo-500 font-mono flex items-center gap-2">
                        <Globe className="w-3 h-3" /> Lat:{" "}
                        {previewTask.taskAddress.latitude} | Long:{" "}
                        {previewTask.taskAddress.longitude}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold uppercase mb-2">
                    Descrição
                  </h3>
                  <p className="text-slate-600 text-sm whitespace-pre-wrap">
                    {previewTask.description || "-"}
                  </p>
                </div>
                {previewTask.finalComment && (
                  <div>
                    <h3 className="text-sm font-bold uppercase mb-2">
                      Comentário Final
                    </h3>
                    <p className="text-slate-600 text-sm whitespace-pre-wrap bg-yellow-50 p-3 rounded border border-yellow-100">
                      {previewTask.finalComment}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold uppercase mb-4">
                    Anexos (
                    {previewTask.taskImages.length +
                      previewTask.taskVideos.length +
                      previewTask.taskAudios.length}
                    )
                  </h3>
                  {previewTask.taskImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {previewTask.taskImages.map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          className="w-full aspect-square object-cover rounded border cursor-pointer"
                          onClick={() => window.open(img.url, "_blank")}
                        />
                      ))}
                    </div>
                  )}
                  {previewTask.taskVideos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {previewTask.taskVideos.map((v) => (
                        <video
                          key={v.id}
                          src={v.url}
                          controls
                          className="w-full rounded border"
                        />
                      ))}
                    </div>
                  )}
                  {previewTask.taskAudios.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {previewTask.taskAudios.map((a) => (
                        <audio
                          key={a.id}
                          src={a.url}
                          controls
                          className="w-full h-10"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewModal(false)}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setIsPreviewModal(false);
                    openEditModal(previewTask);
                  }}
                >
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        title={
          itemToDelete?.type === "column" ? "Excluir Coluna" : "Excluir Tarefa"
        }
        description="Tem certeza? Isso não pode ser desfeito."
      />
    </div>
  );
}

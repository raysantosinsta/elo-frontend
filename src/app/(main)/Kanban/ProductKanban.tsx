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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  ImageIcon,
  Layout,
  Menu,
  Mic,
  MoreVertical,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Settings,
  Square,
  Trash2,
  User,
  Video,
  X,
  Flag,
  FileText,
  Paperclip,
  UploadCloud,
  FileVideo,
  FileAudio,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { DialogDescription } from "@radix-ui/react-dialog";

const API_BASE =
  process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

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

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  columnId?: string | null;
  assignedTo?: Professional;
  createdBy?: Professional;
  taskImages: TaskImage[];
  taskAudios: Array<{
    id: string;
    url: string;
    filename: string;
    duration?: number;
  }>;
  taskVideos: Array<{
    id: string;
    url: string;
    filename: string;
    duration?: number;
  }>;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  completedAt?: string;
}

interface Column {
  id: string;
  title: string;
  order: number;
  tasks: Task[];
  status?: "PENDING" | "FINISHED";
}

export default function ProductKanban() {
  const { user, logout, loading: authLoading } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  // --- ESTADOS ---
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

  // Form Nova Tarefa
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskColumn, setTaskColumn] = useState("");
  const [taskPriority, setTaskPriority] = useState("1");
  const [taskImages, setTaskImages] = useState<File[]>([]);
  const [taskAudios, setTaskAudios] = useState<File[]>([]);
  const [taskVideos, setTaskVideos] = useState<File[]>([]);

  // Form Edição
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskAssignedTo, setEditTaskAssignedTo] = useState("");
  const [editTaskColumn, setEditTaskColumn] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState("1");
  const [editTaskImages, setEditTaskImages] = useState<File[]>([]);
  const [editTaskAudios, setEditTaskAudios] = useState<File[]>([]);
  const [editTaskVideos, setEditTaskVideos] = useState<File[]>([]);
  const [editTaskStatus, setEditTaskStatus] = useState("PENDING");

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

  // --- ESTADOS PARA O MODAL DE EXCLUSÃO ---
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: "column" | "task";
    id: string;
  } | null>(null);

  // --- HELPERS DE AUTENTICAÇÃO ---
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

      if (response.status === 401) {
        logout();
        return response;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error("Erro na requisição (Files):", errorBody);
        throw new Error(
          errorBody.message || `Erro ${response.status}: Falha na requisição`
        );
      }

      return response;
    },
    [getAuthToken, logout]
  );

  // --- DATA FETCHING & INITIALIZATION ---

  const fetchColumns = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/kanban-columns`);

      if (!res.ok) {
        console.error(`Erro ao buscar colunas: ${res.status}`);
        return;
      }

      const data = await res.json();
      let columnsArray: Column[] = [];

      if (Array.isArray(data)) {
        columnsArray = data;
      } else if (data.columns && Array.isArray(data.columns)) {
        columnsArray = data.columns;
      }

      if (columnsArray.length > 0) {
        setColumns(
          columnsArray.sort((a, b) => (a.order || 0) - (b.order || 0))
        );
      } else {
        setColumns([]);
      }
    } catch (err) {
      console.error("Erro de conexão ao buscar colunas", err);
      setColumns([]);
    }
  }, [authFetch]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/tasks?limit=100`);
      if (!res.ok) {
        if (res.status === 400) {
          setTasks([]);
          return;
        }
        throw new Error(`Erro ${res.status}`);
      }
      const data = await res.json();
      let tasksArray = [];
      if (data.data && Array.isArray(data.data)) {
        tasksArray = data.data;
      } else if (Array.isArray(data)) {
        tasksArray = data;
      } else if (data.tasks && Array.isArray(data.tasks)) {
        tasksArray = data.tasks;
      }

      setTasks(tasksArray);
    } catch (err) {
      console.error("Erro ao buscar tarefas", err);
      setTasks([]);
    }
  }, [authFetch]);

  const fetchUsers = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const res = await authFetch(
        `${API_BASE}/users/company/${user.company.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao buscar usuários", err);
    }
  }, [authFetch, user?.company?.id]);

  const loadInitialData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([fetchColumns(), fetchTasks(), fetchUsers()]);
    } catch (error) {
      console.error("Erro inicial:", error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchColumns, fetchTasks, fetchUsers]);

  useEffect(() => {
    if (user) loadInitialData();
  }, [user, loadInitialData]);

  // --- CRUD COLUNAS ---
  const createColumn = async () => {
    if (!colTitle.trim()) return toast.error("Título da coluna é obrigatório");
    try {
      const res = await authFetch(`${API_BASE}/kanban-columns`, {
        method: "POST",
        body: JSON.stringify({ title: colTitle }),
      });
      if (!res.ok) throw new Error("Erro ao criar");
      const newColumn = await res.json();
      setColumns((prev) => [...prev, newColumn]);
      setColTitle("");
      setIsColumnModal(false);
      toast.success("Coluna criada com sucesso");
    } catch (err) {
      toast.error("Erro ao criar coluna");
    }
  };

  const updateColumn = async () => {
    if (!editingCol || !colTitle.trim()) return;
    try {
      const res = await authFetch(
        `${API_BASE}/kanban-columns/${editingCol.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ title: colTitle }),
        }
      );
      if (!res.ok) throw new Error("Erro ao atualizar");
      const updatedColumn = await res.json();
      setColumns((prev) =>
        prev.map((col) => (col.id === editingCol.id ? updatedColumn : col))
      );
      setColTitle("");
      setEditingCol(null);
      setIsColumnModal(false);
      toast.success("Coluna atualizada");
    } catch (err) {
      toast.error("Erro ao atualizar coluna");
    }
  };

  const onRequestDeleteColumn = (columnId: string) => {
    const hasTasks = tasks.some((t) => t.columnId === columnId);
    if (hasTasks) {
      toast.error(
        "Não é possível excluir esta coluna porque ainda existem tarefas vinculadas a ela."
      );
      return;
    }
    setItemToDelete({ type: "column", id: columnId });
    setDeleteModalOpen(true);
  };

  const onRequestDeleteTask = (taskId: string) => {
    setItemToDelete({ type: "task", id: taskId });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      if (itemToDelete.type === "column") {
        const res = await authFetch(
          `${API_BASE}/kanban-columns/${itemToDelete.id}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Erro ao deletar");
        }
        setColumns((prev) => prev.filter((col) => col.id !== itemToDelete.id));
        toast.success("Coluna removida com sucesso");
      } else if (itemToDelete.type === "task") {
        await authFetch(`${API_BASE}/tasks/${itemToDelete.id}`, {
          method: "DELETE",
        });
        setTasks((prev) => prev.filter((t) => t.id !== itemToDelete.id));
        toast.success("Tarefa excluída");
        if (isPreviewModal && previewTask?.id === itemToDelete.id) {
          setIsPreviewModal(false);
        }
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir item");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditColumnModal = (column: Column) => {
    setEditingCol(column);
    setColTitle(column.title);
    setIsColumnModal(true);
    setIsMobileMenuOpen(false);
  };

  const openCreateColumnModal = () => {
    setEditingCol(null);
    setColTitle("");
    setIsColumnModal(true);
    setIsMobileMenuOpen(false);
  };

  // --- CRUD TAREFAS ---
  const refreshTask = useCallback(
    async (taskId: string) => {
      try {
        const res = await authFetch(`${API_BASE}/tasks/${taskId}`);
        if (res.ok) {
          const updated = await res.json();
          const taskWithAbsoluteUrls = {
            ...updated,
            taskImages:
              updated.taskImages?.map((img: TaskImage) => ({
                ...img,
                url: img.url.startsWith("http")
                  ? img.url
                  : `${API_BASE}${img.url.startsWith("/") ? "" : "/"}${
                      img.url
                    }`,
              })) || [],
          };
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? taskWithAbsoluteUrls : t))
          );
        }
      } catch (err) {}
    },
    [authFetch]
  );

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
        await authFetch(`${API_BASE}/tasks/${taskId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ columnId }),
        });
        await refreshTask(taskId);
      } catch (err) {
        setTasks(prevTasks); // Rollback
        toast.error("Erro ao mover tarefa");
      }
    },
    [tasks, authFetch, refreshTask]
  );

  // --- GRAVAÇÃO DE ÁUDIO ---
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
        const file = new File([blob], `gravação-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setTaskAudios([file]);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      toast.error("Erro ao acessar microfone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    let i: NodeJS.Timeout;
    if (isRecording) {
      i = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    }
    return () => clearInterval(i);
  }, [isRecording]);

  const removeNewFile = (
    index: number,
    type: "image" | "audio" | "video",
    isEdit: boolean
  ) => {
    if (isEdit) {
      if (type === "image")
        setEditTaskImages((prev) => prev.filter((_, i) => i !== index));
      if (type === "audio")
        setEditTaskAudios((prev) => prev.filter((_, i) => i !== index));
      if (type === "video")
        setEditTaskVideos((prev) => prev.filter((_, i) => i !== index));
    } else {
      if (type === "image")
        setTaskImages((prev) => prev.filter((_, i) => i !== index));
      if (type === "audio")
        setTaskAudios((prev) => prev.filter((_, i) => i !== index));
      if (type === "video")
        setTaskVideos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // --- Função para marcar arquivos existentes para remoção ---
  const removeExistingFile = (
    id: string,
    type: "image" | "audio" | "video"
  ) => {
    if (type === "image") setRemovedImageIds((prev) => [...prev, id]);
    if (type === "audio") setRemovedAudioIds((prev) => [...prev, id]);
    if (type === "video") setRemovedVideoIds((prev) => [...prev, id]);
  };

  // --- SUBMISSÃO ---
  const createTask = async () => {
    if (!taskTitle.trim()) return toast.error("Título obrigatório");

    if (!taskColumn) {
      toast.error("Selecione uma coluna para a tarefa");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();

    formData.append("title", taskTitle);
    formData.append("description", taskDescription);
    formData.append("priority", taskPriority);

    if (user?.company?.id) formData.append("companyId", user.company.id);
    if (user?.id) formData.append("createdById", user.id);

    formData.append("columnId", taskColumn);

    if (taskDueDate) {
      formData.append("dueDate", new Date(taskDueDate).toISOString());
    }

    if (taskAssignedTo) formData.append("assignedToId", taskAssignedTo);

    taskImages.forEach((f) => formData.append("images", f));
    taskAudios.forEach((f) => formData.append("audios", f));
    taskVideos.forEach((f) => formData.append("videos", f));

    try {
      const res = await authFetchWithFiles(
        `${API_BASE}/tasks`,
        formData,
        "POST"
      );
      const newTask = await res.json();
      setTasks((prev) => [newTask, ...prev]);
      resetTaskForm();
      setIsTaskModal(false);
      toast.success("Tarefa criada!");
      setTimeout(() => refreshTask(newTask.id), 1000);
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      toast.error(err.message || "Erro ao criar tarefa. Verifique o console.");
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

    if (editTaskDueDate) {
      formData.append("dueDate", new Date(editTaskDueDate).toISOString());
    }

    if (editTaskAssignedTo) formData.append("assignedToId", editTaskAssignedTo);
    formData.append("status", editTaskStatus);

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
      const res = await authFetchWithFiles(
        `${API_BASE}/tasks/${editingTask.id}`,
        formData,
        "PUT"
      );
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? updated : t))
      );
      setIsEditTaskModal(false);
      setEditingTask(null);
      resetEditTaskForm();
      toast.success("Tarefa atualizada");
    } catch (err: any) {
      console.error("Erro detalhado na atualização:", err);
      toast.error(err.message || "Erro ao atualizar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskAssignedTo("");
    setTaskColumn("");
    setTaskPriority("1");
    setTaskImages([]);
    setTaskAudios([]);
    setTaskVideos([]);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const resetEditTaskForm = () => {
    setEditTaskTitle("");
    setEditTaskDescription("");
    setEditTaskDueDate("");
    setEditTaskAssignedTo("");
    setEditTaskColumn("");
    setEditTaskPriority("1");
    setEditTaskStatus("PENDING");
    setEditTaskImages([]);
    setEditTaskAudios([]);
    setEditTaskVideos([]);
    setRemovedImageIds([]);
    setRemovedAudioIds([]);
    setRemovedVideoIds([]);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || "");
    setEditTaskDueDate(
      task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ""
    );
    setEditTaskAssignedTo(task.assignedTo?.id || "");
    setEditTaskColumn(task.columnId || "");
    setEditTaskPriority(task.priority.toString());
    setEditTaskStatus(task.status);
    setIsEditTaskModal(true);
    setIsMobileMenuOpen(false);
  };

  const openPreviewModal = (task: Task) => {
    setPreviewTask(task);
    setIsPreviewModal(true);
  };

  const openCreateTaskInColumn = (columnId: string) => {
    resetTaskForm();
    setTaskColumn(columnId);
    setIsTaskModal(true);
    setIsMobileMenuOpen(false);
  };

  // --- UTILS UI ---
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
    const parts = name.split(" ");
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  };

  const getPriorityConfig = (priority: number) => {
    if (priority === 1)
      return { label: "High", style: "bg-rose-100 text-rose-700" };
    if (priority === 2)
      return { label: "Medium", style: "bg-amber-100 text-amber-700" };
    return { label: "Low", style: "bg-indigo-100 text-indigo-700" };
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const images = task.taskImages || [];
    const audios = task.taskAudios || [];
    const videos = task.taskVideos || [];
    const priorityConfig = getPriorityConfig(task.priority);
    const filesCount = images.length + audios.length + videos.length;
    const coverImage = images.length > 0 ? images[0] : null;

    return (
      <Card
        draggable
        onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
        className="bg-white shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all border border-slate-200 rounded-2xl group relative overflow-hidden"
      >
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="flex justify-end items-start h-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-600 -mr-2 touch-action-manipulation"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 z-50">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openPreviewModal(task)}>
                  <Eye className="w-4 h-4 mr-2" /> Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditModal(task)}>
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  onClick={() => onRequestDeleteTask(task.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <h3
              className="font-bold text-slate-900 text-[15px] leading-tight mb-1.5 cursor-pointer hover:text-indigo-600 transition-colors"
              onClick={() => openPreviewModal(task)}
            >
              {task.title}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
              {task.description || "Sem descrição disponível para esta tarefa."}
            </p>
          </div>

          {coverImage && (
            <div
              className="relative w-full h-32 rounded-lg overflow-hidden cursor-pointer group-hover:opacity-90 transition-opacity mt-1"
              onClick={() => openPreviewModal(task)}
            >
              <img
                src={coverImage.url}
                alt="Task Cover"
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  +{images.length - 1}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500 text-xs font-medium">
              Assignees :
            </span>
            <div className="flex -space-x-2 overflow-hidden">
              {task.assignedTo ? (
                <div
                  className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600"
                  title={task.assignedTo.name}
                >
                  {getInitials(task.assignedTo.name)}
                </div>
              ) : (
                <div
                  className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-400"
                  title="Sem responsável"
                >
                  <User className="w-3 h-3" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div
              className={cn(
                "flex items-center gap-2 text-xs font-medium",
                isOverdue(task.dueDate || "") && task.status !== "COMPLETED"
                  ? "text-rose-500"
                  : "text-slate-400"
              )}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>
                {task.dueDate ? formatDateShort(task.dueDate) : "Sem prazo"}
              </span>
            </div>
            <div
              className={cn(
                "px-2.5 py-0.5 rounded-md text-[10px] font-bold",
                priorityConfig.style
              )}
            >
              {priorityConfig.label}
            </div>
          </div>

          <div className="pt-3 mt-1 border-t border-slate-100 flex items-center gap-4">
            <div
              className="flex items-center gap-1.5 text-slate-400 text-xs font-medium hover:text-slate-600 transition-colors cursor-pointer"
              title="Arquivos"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>{filesCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // --- RENDER ---
  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F0E6]">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-10 w-10 text-[#D35400] animate-spin mb-4" />
          <p className="text-[#2D3436] font-medium">Carregando quadro...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const safeColumns = Array.isArray(columns) ? columns : [];
  const tasksWithoutColumn = tasks.filter((t) => !t.columnId);

  return (
    <div className="min-h-[100dvh] bg-[#F5F0E6] flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-[#2C3E50] text-white px-4 py-3 shadow-md border-b border-[#2C3E50] z-20">
        <div className="flex justify-between items-center max-w-[1920px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-white/10 touch-action-manipulation"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#D35400]" />
                <h1 className="text-lg font-bold tracking-wide">
                  Fluxo de Produto
                </h1>
              </div>
              <p className="text-xs text-gray-300 hidden md:block">
                Gerencie o ciclo de vida dos produtos da {user.company?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 mr-4 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <span className="text-xs font-medium text-gray-300">
                {tasks.length} Tarefas
              </span>
              <span className="w-px h-3 bg-white/20"></span>
              <span className="text-xs font-medium text-gray-300">
                {safeColumns.length} Colunas
              </span>
            </div>

            <Button
              onClick={openCreateColumnModal}
              variant="outline"
              className="hidden sm:flex border-white/20 text-white hover:bg-white/10 bg-transparent text-xs h-9"
            >
              <Settings className="w-3.5 h-3.5 mr-2" /> Colunas
            </Button>

            <Button
              onClick={() => {
                resetTaskForm();
                setIsTaskModal(true);
                setIsMobileMenuOpen(false);
              }}
              className="bg-[#D35400] hover:bg-[#A04000] text-white text-xs h-9 font-semibold shadow-lg hover:shadow-xl transition-all touch-action-manipulation"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nova Tarefa
            </Button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {isMobileMenuOpen && (
          <div className="mt-4 p-4 bg-[#34495E] rounded-lg space-y-3 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  loadInitialData();
                  setIsMobileMenuOpen(false);
                }}
                className="justify-start text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
              </Button>
              <Button
                variant="ghost"
                onClick={openCreateColumnModal}
                className="justify-start text-white hover:bg-white/10"
              >
                <Settings className="w-4 h-4 mr-2" /> Colunas
              </Button>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs text-gray-400">
              <span>{user.name}</span>
              <Button
                variant="link"
                onClick={logout}
                className="text-red-400 p-0 h-auto"
              >
                Sair
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* BOARD CONTENT */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6">
        {safeColumns.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white p-6 rounded-full shadow-sm border border-[#95A5A6]/20">
              <Layout className="w-12 h-12 text-[#95A5A6]" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-xl font-bold text-[#2D3436]">
                Nenhuma coluna encontrada
              </h3>
              <p className="text-[#95A5A6]">
                Seu quadro ainda está vazio. Crie a primeira coluna para começar a
                organizar o fluxo de produtos.
              </p>
            </div>
            <Button
              onClick={openCreateColumnModal}
              className="bg-[#D35400] hover:bg-[#A04000] text-white px-8 shadow-lg hover:shadow-xl transition-all touch-action-manipulation"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Coluna
            </Button>
          </div>
        ) : (
          <div className="flex gap-4 min-w-max h-full items-start">
            {safeColumns.map((col) => (
              <div
                key={col.id}
                className="w-80 flex-shrink-0 flex flex-col max-h-[calc(100vh-140px)] rounded-xl bg-white border border-[#95A5A6]/20 shadow-sm"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="px-4 py-3 border-b border-[#95A5A6]/10 flex justify-between items-center bg-[#FAFAFA] rounded-t-xl">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-2 h-2 rounded-full bg-[#2C3E50]"></span>
                    <h3 className="font-bold text-[#2D3436] text-sm truncate uppercase tracking-wider">
                      {col.title}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="bg-[#F5F0E6] text-[#2D3436] text-[10px] font-bold h-5 min-w-[20px] justify-center"
                    >
                      {tasks.filter((t) => t.columnId === col.id).length}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-[#95A5A6] hover:bg-[#F5F0E6] hover:text-[#D35400] touch-action-manipulation"
                      onClick={() => openCreateTaskInColumn(col.id)}
                      title="Adicionar tarefa nesta coluna"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-[#95A5A6] hover:bg-[#F5F0E6] touch-action-manipulation"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50">
                        <DropdownMenuItem
                          onClick={() => openEditColumnModal(col)}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 cursor-pointer"
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

                  {tasks.filter((t) => t.columnId === col.id).length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-[#95A5A6]/10 rounded-lg">
                      <p className="text-xs text-[#95A5A6]/50 font-medium">
                        Vazio
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {tasksWithoutColumn.length > 0 && (
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
                  <Badge
                    variant="outline"
                    className="border-orange-200 text-orange-700 bg-white"
                  >
                    {tasksWithoutColumn.length}
                  </Badge>
                </div>
                <div className="p-3 overflow-y-auto flex-1 space-y-3">
                  {tasksWithoutColumn.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- DIALOGS --- */}

      {/* 1. Modal Nova/Edit Tarefa */}
      <Dialog
        open={isTaskModal || isEditTaskModal}
        onOpenChange={(open) => {
          if (!open) {
            setIsTaskModal(false);
            setIsEditTaskModal(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-0 shadow-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isEditTaskModal) updateTask();
              else createTask();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#2D3436] flex items-center gap-2">
                {isEditTaskModal ? (
                  <Edit className="w-5 h-5 text-[#2C3E50]" />
                ) : (
                  <Plus className="w-5 h-5 text-[#D35400]" />
                )}
                {isEditTaskModal ? "Editar Tarefa" : "Nova Tarefa"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="text-[#2D3436]">
                    Título da Tarefa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ex: Refatorar Homepage"
                    value={isEditTaskModal ? editTaskTitle : taskTitle}
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskTitle(e.target.value)
                        : setTaskTitle(e.target.value)
                    }
                    className="border-[#95A5A6]/30 focus:border-[#2C3E50] focus:ring-[#2C3E50]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc" className="text-[#2D3436]">
                    Descrição
                  </Label>
                  <Textarea
                    id="desc"
                    placeholder="Detalhes da tarefa..."
                    value={
                      isEditTaskModal
                        ? editTaskDescription
                        : taskDescription
                    }
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskDescription(e.target.value)
                        : setTaskDescription(e.target.value)
                    }
                    className="min-h-[100px] border-[#95A5A6]/30 resize-none focus:border-[#2C3E50] focus:ring-[#2C3E50]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[#2D3436]">Prioridade</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-[#95A5A6]/30 bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#2C3E50] focus:border-transparent"
                    value={
                      isEditTaskModal ? editTaskPriority : taskPriority
                    }
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskPriority(e.target.value)
                        : setTaskPriority(e.target.value)
                    }
                  >
                    <option value="1">Alta (Urgente)</option>
                    <option value="2">Média (Normal)</option>
                    <option value="3">Baixa (Rotina)</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[#2D3436]">Coluna / Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-[#95A5A6]/30 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[#2C3E50]"
                    value={isEditTaskModal ? editTaskColumn : taskColumn}
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskColumn(e.target.value)
                        : setTaskColumn(e.target.value)
                    }
                  >
                    <option value="">-- Selecione --</option>
                    {safeColumns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[#2D3436]">Vencimento</Label>
                  <Input
                    type="datetime-local"
                    value={
                      isEditTaskModal ? editTaskDueDate : taskDueDate
                    }
                    onChange={(e) =>
                      isEditTaskModal
                        ? setEditTaskDueDate(e.target.value)
                        : setTaskDueDate(e.target.value)
                    }
                    className="border-[#95A5A6]/30"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[#2D3436]">Responsável</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-[#95A5A6]/30 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[#2C3E50]"
                    value={
                      isEditTaskModal
                        ? editTaskAssignedTo
                        : taskAssignedTo
                    }
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
              </div>

              {/* Uploads Section (NOVA ORGANIZAÇÃO) */}
              <div className="space-y-6 border-t border-[#95A5A6]/20 pt-6">
                <h4 className="font-semibold text-sm text-[#2D3436] flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" /> Gerenciar Anexos
                </h4>

                {/* --- 1. BLOCO DE IMAGENS --- */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-[#95A5A6] uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Imagens
                  </Label>

                  {/* Lista de Imagens (Existentes + Novas) */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {/* Existentes */}
                    {isEditTaskModal &&
                      editingTask?.taskImages?.map((img) => {
                        if (removedImageIds.includes(img.id)) return null;
                        return (
                          <div
                            key={img.id}
                            className="relative aspect-square rounded-md overflow-hidden border border-indigo-200 group bg-slate-50"
                          >
                            <img
                              src={img.url}
                              alt="saved"
                              className="w-full h-full object-cover"
                            />
                            <div
                              className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              onClick={() => removeExistingFile(img.id, "image")}
                              title="Excluir (será removido ao salvar)"
                            >
                              <Trash2 className="w-3 h-3" />
                            </div>
                            <div className="absolute bottom-0 left-0 bg-indigo-600/80 text-white text-[8px] font-bold px-1.5 py-0.5 w-full text-center">
                              SALVO
                            </div>
                          </div>
                        );
                      })}

                    {/* Novas */}
                    {(isEditTaskModal ? editTaskImages : taskImages).map(
                      (file, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-md overflow-hidden border-2 border-green-400 group bg-green-50"
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            className="w-full h-full object-cover opacity-90"
                            alt="preview"
                          />
                          <div
                            className="absolute top-1 right-1 bg-slate-800 text-white p-1 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            onClick={() =>
                              removeNewFile(idx, "image", isEditTaskModal)
                            }
                            title="Cancelar upload"
                          >
                            <X className="w-3 h-3" />
                          </div>
                          <div className="absolute bottom-0 left-0 bg-green-600/80 text-white text-[8px] font-bold px-1.5 py-0.5 w-full text-center">
                            NOVO
                          </div>
                        </div>
                      )
                    )}

                    {/* Botão de Adicionar Imagem */}
                    <div className="aspect-square flex items-center justify-center border border-dashed border-[#95A5A6] rounded-md bg-[#F5F0E6]/50 hover:bg-[#F5F0E6] transition-colors cursor-pointer">
                      <Label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                        <Plus className="w-5 h-5 text-[#2C3E50]" />
                        <span className="text-[9px] text-[#95A5A6] mt-1 font-medium">
                          Add Img
                        </span>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = Array.from(e.target.files);
                              if (isEditTaskModal)
                                setEditTaskImages((prev) => [...prev, ...files]);
                              else
                                setTaskImages((prev) => [...prev, ...files]);
                            }
                          }}
                        />
                      </Label>
                    </div>
                  </div>
                </div>

                {/* --- 2. BLOCO DE VÍDEOS --- */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-[#95A5A6] uppercase tracking-wider flex items-center gap-1.5">
                    <FileVideo className="w-3.5 h-3.5" /> Vídeos
                  </Label>

                  <div className="space-y-2">
                    {/* Lista Unificada de Vídeos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Existentes */}
                      {isEditTaskModal &&
                        editingTask?.taskVideos?.map((v) => {
                          if (removedVideoIds.includes(v.id)) return null;
                          return (
                            <div
                              key={v.id}
                              className="flex items-center justify-between p-2 rounded border border-indigo-200 bg-indigo-50/50"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Video className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <span
                                  className="text-xs font-medium text-indigo-900 truncate"
                                  title={v.filename}
                                >
                                  {v.filename}
                                </span>
                                <Badge className="text-[9px] h-4 bg-indigo-200 text-indigo-800 hover:bg-indigo-300">
                                  Salvo
                                </Badge>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-700"
                                onClick={() => removeExistingFile(v.id, "video")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          );
                        })}

                      {/* Novos */}
                      {(isEditTaskModal ? editTaskVideos : taskVideos).map(
                        (file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded border border-green-300 bg-green-50"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Video className="w-4 h-4 text-green-700 flex-shrink-0" />
                              <span
                                className="text-xs font-medium text-green-900 truncate"
                                title={file.name}
                              >
                                {file.name}
                              </span>
                              <Badge className="text-[9px] h-4 bg-green-200 text-green-800 hover:bg-green-300">
                                Novo
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-500 hover:text-slate-800"
                              onClick={() =>
                                removeNewFile(idx, "video", isEditTaskModal)
                              }
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )
                      )}
                    </div>

                    {/* Botão de Upload Vídeo */}
                    <div className="flex items-center justify-center p-3 border border-dashed border-[#95A5A6] rounded-md bg-[#F5F0E6]/30 hover:bg-[#F5F0E6] transition-colors cursor-pointer">
                      <Label className="cursor-pointer flex items-center gap-2 w-full justify-center">
                        <Plus className="w-4 h-4 text-[#2C3E50]" />
                        <span className="text-xs text-[#2C3E50] font-medium">
                          Adicionar Vídeo
                        </span>
                        <Input
                          type="file"
                          accept="video/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = Array.from(e.target.files);
                              if (isEditTaskModal)
                                setEditTaskVideos((prev) => [...prev, ...files]);
                              else
                                setTaskVideos((prev) => [...prev, ...files]);
                            }
                          }}
                        />
                      </Label>
                    </div>
                  </div>
                </div>

                {/* --- 3. BLOCO DE ÁUDIOS --- */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-[#95A5A6] uppercase tracking-wider flex items-center gap-1.5">
                    <FileAudio className="w-3.5 h-3.5" /> Áudios e Gravações
                  </Label>

                  <div className="space-y-2">
                    {/* Lista Unificada de Áudios */}
                    <div className="grid grid-cols-1 gap-2">
                      {/* Existentes */}
                      {isEditTaskModal &&
                        editingTask?.taskAudios?.map((a) => {
                          if (removedAudioIds.includes(a.id)) return null;
                          return (
                            <div
                              key={a.id}
                              className="flex items-center justify-between p-2 rounded border border-indigo-200 bg-indigo-50/50"
                            >
                              <div className="flex items-center gap-2 overflow-hidden flex-1">
                                <Mic className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <span
                                  className="text-xs font-medium text-indigo-900 truncate max-w-[150px]"
                                  title={a.filename}
                                >
                                  {a.filename}
                                </span>
                                <Badge className="text-[9px] h-4 bg-indigo-200 text-indigo-800 hover:bg-indigo-300">
                                  Salvo
                                </Badge>
                                {/* Mini Player Opcional */}
                                <audio
                                  controls
                                  src={a.url}
                                  className="h-6 w-24 ml-2"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-700"
                                onClick={() => removeExistingFile(a.id, "audio")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          );
                        })}

                      {/* Novos */}
                      {(isEditTaskModal ? editTaskAudios : taskAudios).map(
                        (file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded border border-green-300 bg-green-50"
                          >
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                              <Mic className="w-4 h-4 text-green-700 flex-shrink-0" />
                              <span
                                className="text-xs font-medium text-green-900 truncate"
                                title={file.name}
                              >
                                {file.name}
                              </span>
                              <Badge className="text-[9px] h-4 bg-green-200 text-green-800 hover:bg-green-300">
                                Novo
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-500 hover:text-slate-800"
                              onClick={() =>
                                removeNewFile(idx, "audio", isEditTaskModal)
                              }
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex gap-2">
                      {/* Upload Áudio */}
                      <div className="flex-1 flex items-center justify-center p-2 border border-dashed border-[#95A5A6] rounded-md bg-[#F5F0E6]/30 hover:bg-[#F5F0E6] transition-colors cursor-pointer">
                        <Label className="cursor-pointer flex items-center gap-2 w-full justify-center">
                          <Plus className="w-4 h-4 text-[#2C3E50]" />
                          <span className="text-xs text-[#2C3E50] font-medium">
                            Upload
                          </span>
                          <Input
                            type="file"
                            accept="audio/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) {
                                const files = Array.from(e.target.files);
                                if (isEditTaskModal)
                                  setEditTaskAudios((prev) => [
                                    ...prev,
                                    ...files,
                                  ]);
                                else
                                  setTaskAudios((prev) => [...prev, ...files]);
                              }
                            }}
                          />
                        </Label>
                      </div>

                      {/* Gravador */}
                      <Button
                        type="button"
                        size="sm"
                        variant={isRecording ? "destructive" : "secondary"}
                        onClick={isRecording ? stopRecording : startRecording}
                        className={cn(
                          "flex-1 border border-dashed border-[#95A5A6]",
                          isRecording
                            ? "animate-pulse"
                            : "bg-[#F5F0E6]/30 text-[#2C3E50] hover:bg-[#F5F0E6]"
                        )}
                      >
                        {isRecording ? (
                          <>
                            <Square className="w-3 h-3 mr-2" />
                            <span className="font-mono">
                              00:{String(recordingTime).padStart(2, "0")}
                            </span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3 h-3 mr-2" />
                            <span className="text-xs">Gravar Voz</span>
                          </>
                        )}
                      </Button>
                    </div>
                    {/* Feedback visual de áudio gravado (blob) */}
                    {audioBlob && !isRecording && (
                      <div className="text-xs text-green-600 flex items-center gap-1 bg-green-50 p-2 rounded border border-green-200">
                        <CheckCircle2 className="w-3 h-3" /> Áudio gravado pronto
                        para envio
                      </div>
                    )}
                  </div>
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
                className="bg-[#D35400] hover:bg-[#A04000] text-white touch-action-manipulation"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isSubmitting
                  ? "Salvando..."
                  : isEditTaskModal
                  ? "Salvar Alterações"
                  : "Criar Tarefa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Modal Coluna */}
      <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
        <DialogContent className="sm:max-w-[425px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingCol) updateColumn();
              else createColumn();
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {editingCol ? "Renomear Coluna" : "Nova Coluna"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="colTitle">Título</Label>
                <Input
                  id="colTitle"
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  placeholder="Ex: Em revisão"
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
              <Button
                type="submit"
                className="bg-[#2C3E50] text-white hover:bg-[#34495E] touch-action-manipulation"
              >
                {editingCol ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Modal Preview Profissional Única Coluna - NOVO LAYOUT */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0 gap-0 border-0 shadow-2xl flex flex-col">
          <DialogDescription id="task-preview-desc" className="sr-only">
            Detalhes da tarefa: {previewTask?.title}
          </DialogDescription>
          {previewTask && (
            <div className="flex flex-col h-full bg-white relative">
              {/* HEADER Sticky */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white sticky top-0 z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        "text-[10px] uppercase tracking-wider font-bold shadow-sm",
                        getPriorityConfig(previewTask.priority).style
                      )}
                    >
                      {getPriorityConfig(previewTask.priority).label}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                    {previewTask.title}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  className="h-8 w-8 rounded-full hover:bg-slate-100 touch-action-manipulation"
                  onClick={() => setIsPreviewModal(false)}
                >
                  <X className="w-5 h-5 text-slate-500" />
                </Button>
              </div>

              {/* MAIN CONTENT SCROLLABLE */}
              <div className="p-6 md:p-8 space-y-8 flex-1 overflow-y-auto">
                {/* Metadata Bar */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Responsável
                    </span>
                    <div className="flex items-center gap-2 font-medium text-slate-700 text-sm">
                      <User className="w-4 h-4 text-slate-400" />
                      {previewTask.assignedTo?.name || "Não atribuído"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Vencimento
                    </span>
                    <div className="flex items-center gap-2 font-medium text-slate-700 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {previewTask.dueDate
                        ? formatDateTime(previewTask.dueDate)
                        : "Sem data"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Criado em
                    </span>
                    <div className="flex items-center gap-2 font-medium text-slate-700 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {formatDateShort(previewTask.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Descrição
                  </h3>
                  <div className="text-slate-600 leading-relaxed text-sm md:text-base whitespace-pre-wrap bg-white p-1">
                    {previewTask.description ||
                      "Nenhuma descrição fornecida para esta tarefa."}
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-slate-100 my-6" />

                {/* Attachments Section - Layout Otimizado */}
                <div className="space-y-8">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Paperclip className="w-4 h-4" /> Anexos & Mídia
                  </h3>

                  {/* Empty State */}
                  {previewTask.taskImages.length === 0 &&
                    previewTask.taskVideos.length === 0 &&
                    previewTask.taskAudios.length === 0 && (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                          Nenhum anexo encontrado nesta tarefa.
                        </p>
                      </div>
                    )}

                  {/* 1. SEÇÃO DE IMAGENS (Grid Adaptável) */}
                  {previewTask.taskImages.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Imagens ({previewTask.taskImages.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {previewTask.taskImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm hover:shadow-md transition-all cursor-zoom-in"
                            onClick={() => window.open(img.url, "_blank")}
                          >
                            <img
                              src={img.url}
                              alt="Attachment"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <Eye className="text-white opacity-0 group-hover:opacity-100 w-6 h-6 drop-shadow-lg transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. SEÇÃO DE VÍDEOS (Grid 2 por linha) */}
                  {previewTask.taskVideos.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                        <Video className="w-3.5 h-3.5" />
                        Vídeos ({previewTask.taskVideos.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {previewTask.taskVideos.map((v) => (
                          <div
                            key={v.id}
                            className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="aspect-video bg-black relative group">
                              <video
                                controls
                                src={v.url}
                                className="w-full h-full"
                              />
                            </div>
                            <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                              <p
                                className="text-xs text-slate-600 font-medium truncate"
                                title={v.filename}
                              >
                                {v.filename}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. SEÇÃO DE ÁUDIOS (Lista Estilizada) */}
                  {previewTask.taskAudios.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                        <Mic className="w-3.5 h-3.5" />
                        Áudios ({previewTask.taskAudios.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {previewTask.taskAudios.map((a) => (
                          <div
                            key={a.id}
                            className="flex flex-col gap-2 p-3 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <Mic className="w-3 h-3 text-indigo-600" />
                              </div>
                              <span
                                className="text-xs font-medium text-slate-700 truncate"
                                title={a.filename}
                              >
                                {a.filename}
                              </span>
                            </div>
                            <audio controls src={a.url} className="w-full h-8" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER Actions */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 sticky bottom-0 z-10">
                <Button
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-white hover:text-slate-900 touch-action-manipulation"
                  onClick={() => setIsPreviewModal(false)}
                >
                  Fechar
                </Button>
                <div className="h-6 w-px bg-slate-200 mx-1" />
                <Button
                  className="bg-slate-800 text-white hover:bg-slate-900 shadow-sm touch-action-manipulation"
                  onClick={() => {
                    setIsPreviewModal(false);
                    openEditModal(previewTask);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" /> Editar Detalhes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. MODAL DE EXCLUSÃO */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        title={
          itemToDelete?.type === "column" ? "Excluir Coluna?" : "Excluir Tarefa?"
        }
        description={
          itemToDelete?.type === "column"
            ? "Você tem certeza que deseja excluir esta coluna? Esta ação é irreversível."
            : "Você tem certeza que deseja excluir esta tarefa permanentemente? Todos os anexos e dados serão perdidos."
        }
      />
    </div>
  );
}
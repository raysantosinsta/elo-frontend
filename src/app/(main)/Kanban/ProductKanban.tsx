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
  // FileAudio, // (Não utilizado no momento, mas mantido imports)
  // FileVideo,
  Image as ImageIcon,
  Layout,
  // LogOut,
  Menu,
  Mic,
  MoreVertical,
  MoreHorizontal,
  // Music,
  Plus,
  RefreshCw,
  Settings,
  Square,
  Trash2,
  User,
  Video,
  X,
  Flag,
  // MessageSquare,
  // Link as LinkIcon,
  FileText,
  Paperclip
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// --- IMPORTAÇÃO DO NOVO COMPONENTE ---
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal"; 

const API_BASE = "http://localhost:3000";

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

  // --- ESTADOS PARA O MODAL DE EXCLUSÃO (NOVO) ---
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'column' | 'task', id: string } | null>(null);

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
      if (response.status === 401) logout();
      return response;
    },
    [getAuthToken, logout]
  );

  // --- DATA FETCHING & INITIALIZATION ---
  const createDefaultColumns = async () => {
    try {
      const existingRes = await authFetch(`${API_BASE}/kanban-columns`);
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        let existingColumns = [];
        if (Array.isArray(existingData)) existingColumns = existingData;
        else if (existingData.columns && Array.isArray(existingData.columns))
          existingColumns = existingData.columns;

        if (existingColumns.length > 0) return;
      }

      const defaultColumns = [
        "Backlog",
        "A Fazer",
        "Em Progresso",
        "Revisão",
        "Concluído",
      ];

      const createPromises = defaultColumns.map((title) =>
        authFetch(`${API_BASE}/kanban-columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        })
      );

      await Promise.all(createPromises);
      await fetchColumns();
    } catch (createError) {
      console.error("Erro ao criar colunas padrão:", createError);
    }
  };

  const fetchColumns = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/kanban-columns`);
      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          await createDefaultColumns();
          return;
        }
        throw new Error(`Erro ${res.status}`);
      }

      const data = await res.json();
      let columnsArray: Column[] = [];

      if (Array.isArray(data)) columnsArray = data;
      else if (data.columns && Array.isArray(data.columns)) columnsArray = data.columns;
      else if (data.success !== undefined && Array.isArray(data.columns)) columnsArray = data.columns;

      if (columnsArray.length === 0) {
        await createDefaultColumns();
        return;
      }

      setColumns(columnsArray.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (err) {
      console.error("Erro ao buscar colunas", err);
      setColumns([]);
    }
  }, [authFetch]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/tasks`);
      if (!res.ok) {
        if (res.status === 400) {
          setTasks([]);
          return;
        }
        throw new Error(`Erro ${res.status}`);
      }
      const data = await res.json();
      let tasksArray = [];
      if (Array.isArray(data)) tasksArray = data;
      else if (data.tasks && Array.isArray(data.tasks)) tasksArray = data.tasks;
      else if (data.success !== undefined && Array.isArray(data.tasks)) tasksArray = data.tasks;

      setTasks(tasksArray);
    } catch (err) {
      console.error("Erro ao buscar tarefas", err);
      setTasks([]);
    }
  }, [authFetch]);

  const fetchUsers = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const res = await authFetch(`${API_BASE}/auth/professionals/${user.company.id}`);
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
      const res = await authFetch(`${API_BASE}/kanban-columns/${editingCol.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: colTitle }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      const updatedColumn = await res.json();
      setColumns((prev) => prev.map((col) => (col.id === editingCol.id ? updatedColumn : col)));
      setColTitle("");
      setEditingCol(null);
      setIsColumnModal(false);
      toast.success("Coluna atualizada");
    } catch (err) {
      toast.error("Erro ao atualizar coluna");
    }
  };

  // --- NOVA LÓGICA DE EXCLUSÃO (SUBSTITUINDO DELETE DIRETO) ---
  
  // 1. Solicitar exclusão de coluna
  const onRequestDeleteColumn = (columnId: string) => {
    const hasTasks = tasks.some((t) => t.columnId === columnId);
    if (hasTasks) {
      toast.error("Não é possível excluir esta coluna porque ainda existem tarefas vinculadas a ela.");
      return;
    }
    setItemToDelete({ type: 'column', id: columnId });
    setDeleteModalOpen(true);
  };

  // 2. Solicitar exclusão de tarefa
  const onRequestDeleteTask = (taskId: string) => {
    setItemToDelete({ type: 'task', id: taskId });
    setDeleteModalOpen(true);
  };

  // 3. Confirmar Exclusão
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      if (itemToDelete.type === 'column') {
        const res = await authFetch(`${API_BASE}/kanban-columns/${itemToDelete.id}`, { method: "DELETE" });
        if (!res.ok) {
           const errorData = await res.json().catch(() => ({}));
           throw new Error(errorData.message || "Erro ao deletar");
        }
        setColumns((prev) => prev.filter((col) => col.id !== itemToDelete.id));
        toast.success("Coluna removida com sucesso");
      } else if (itemToDelete.type === 'task') {
        await authFetch(`${API_BASE}/tasks/${itemToDelete.id}`, { method: "DELETE" });
        setTasks((prev) => prev.filter((t) => t.id !== itemToDelete.id));
        toast.success("Tarefa excluída");
        // Fechar modal de preview se estiver aberto na tarefa deletada
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
  };

  const openCreateColumnModal = () => {
    setEditingCol(null);
    setColTitle("");
    setIsColumnModal(true);
  };

  // --- CRUD TAREFAS ---
  const refreshTask = useCallback(async (taskId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/tasks/${taskId}`);
      if (res.ok) {
        const updated = await res.json();
        const taskWithAbsoluteUrls = {
          ...updated,
          taskImages: updated.taskImages?.map((img: TaskImage) => ({
            ...img,
            url: img.url.startsWith("http") ? img.url : `${API_BASE}${img.url.startsWith("/") ? "" : "/"}${img.url}`,
          })) || [],
        };
        setTasks((prev) => prev.map((t) => (t.id === taskId ? taskWithAbsoluteUrls : t)));
      }
    } catch (err) {}
  }, [authFetch]);

  const completeTask = useCallback(async (taskId: string) => {
    try {
      await authFetch(`${API_BASE}/tasks/${taskId}/complete`, { method: "PATCH" });
      await refreshTask(taskId);
      toast.success("Tarefa concluída!");
    } catch(e) { toast.error("Erro ao concluir tarefa"); }
  }, [authFetch, refreshTask]);


  const handleDrop = useCallback(async (e: React.DragEvent, columnId: string | null) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const prevTasks = [...tasks];
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, columnId } : t)));

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
  }, [tasks, authFetch, refreshTask]);

  // --- GRAVAÇÃO DE ÁUDIO ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const file = new File([blob], `gravação-${Date.now()}.webm`, { type: "audio/webm" });
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

  // --- GERENCIAMENTO DE ARQUIVOS LOCAIS ---
  const removeNewFile = (index: number, type: 'image' | 'audio' | 'video', isEdit: boolean) => {
    if (isEdit) {
      if (type === 'image') setEditTaskImages(prev => prev.filter((_, i) => i !== index));
      if (type === 'audio') setEditTaskAudios(prev => prev.filter((_, i) => i !== index));
      if (type === 'video') setEditTaskVideos(prev => prev.filter((_, i) => i !== index));
    } else {
      if (type === 'image') setTaskImages(prev => prev.filter((_, i) => i !== index));
      if (type === 'audio') setTaskAudios(prev => prev.filter((_, i) => i !== index));
      if (type === 'video') setTaskVideos(prev => prev.filter((_, i) => i !== index));
    }
  };

  // --- SUBMISSÃO ---
  const createTask = async () => {
    if (!taskTitle.trim()) return toast.error("Título obrigatório");
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", taskTitle);
    formData.append("description", taskDescription);
    formData.append("priority", taskPriority);
    if (user?.company?.id) formData.append("companyId", user.company.id);
    if (user?.id) formData.append("createdById", user.id);
    if (taskColumn) formData.append("columnId", taskColumn);
    if (taskDueDate) formData.append("dueDate", taskDueDate);
    if (taskAssignedTo) formData.append("assignedToId", taskAssignedTo);
    taskImages.forEach((f) => formData.append("images", f));
    taskAudios.forEach((f) => formData.append("audios", f));
    taskVideos.forEach((f) => formData.append("videos", f));

    try {
      const res = await authFetchWithFiles(`${API_BASE}/tasks`, formData, "POST");
      if (!res.ok) throw new Error("Erro ao criar");
      const newTask = await res.json();
      setTasks((prev) => [newTask, ...prev]);
      resetTaskForm();
      setIsTaskModal(false);
      toast.success("Tarefa criada!");
      setTimeout(() => refreshTask(newTask.id), 1000);
    } catch (err) {
      toast.error("Erro ao criar tarefa");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTask = async () => {
    if (!editingTask || !editTaskTitle.trim()) return toast.error("Título obrigatório");
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("title", editTaskTitle);
    formData.append("description", editTaskDescription || "");
    formData.append("priority", editTaskPriority);
    formData.append("columnId", editTaskColumn || "");
    formData.append("dueDate", editTaskDueDate || "");
    formData.append("assignedToId", editTaskAssignedTo || "");
    formData.append("status", editTaskStatus);

    if (removedImageIds.length) formData.append("removeImageIds", JSON.stringify(removedImageIds));
    if (removedAudioIds.length) formData.append("removeAudioIds", JSON.stringify(removedAudioIds));
    if (removedVideoIds.length) formData.append("removeVideoIds", JSON.stringify(removedVideoIds));

    editTaskImages.forEach((f) => formData.append("images", f));
    editTaskAudios.forEach((f) => formData.append("audios", f));
    editTaskVideos.forEach((f) => formData.append("videos", f));

    try {
      const res = await authFetchWithFiles(`${API_BASE}/tasks/${editingTask.id}`, formData, "PUT");
      if (!res.ok) throw new Error("Erro ao atualizar");
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
      setIsEditTaskModal(false);
      setEditingTask(null);
      resetEditTaskForm();
      toast.success("Tarefa atualizada");
    } catch (err) {
      toast.error("Erro ao atualizar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTaskForm = () => {
    setTaskTitle(""); setTaskDescription(""); setTaskDueDate(""); setTaskAssignedTo("");
    setTaskColumn(""); setTaskPriority("1"); setTaskImages([]); setTaskAudios([]); setTaskVideos([]);
    setAudioBlob(null); setRecordingTime(0);
  };

  const resetEditTaskForm = () => {
    setEditTaskTitle(""); setEditTaskDescription(""); setEditTaskDueDate(""); setEditTaskAssignedTo("");
    setEditTaskColumn(""); setEditTaskPriority("1"); setEditTaskStatus("PENDING");
    setEditTaskImages([]); setEditTaskAudios([]); setEditTaskVideos([]);
    setRemovedImageIds([]); setRemovedAudioIds([]); setRemovedVideoIds([]);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || "");
    setEditTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
    setEditTaskAssignedTo(task.assignedTo?.id || "");
    setEditTaskColumn(task.columnId || "");
    setEditTaskPriority(task.priority.toString());
    setEditTaskStatus(task.status);
    setIsEditTaskModal(true);
  };

  const openPreviewModal = (task: Task) => {
    setPreviewTask(task);
    setIsPreviewModal(true);
  };

  const openCreateTaskInColumn = (columnId: string) => {
    resetTaskForm();
    setTaskColumn(columnId);
    setIsTaskModal(true);
  };

  // --- UTILS UI ---
  const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const formatDateShort = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
  const isOverdue = (d: string) => new Date(d) < new Date();
  
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }

  // Helper de Cores
  const getStatusConfig = (status: string) => {
     switch(status) {
       case "PENDING": return { label: "Not Started", color: "text-indigo-600 bg-indigo-50", dot: "bg-indigo-600" };
       case "IN_PROGRESS": return { label: "In Progress", color: "text-amber-600 bg-amber-50", dot: "bg-amber-600" };
       case "COMPLETED": return { label: "Completed", color: "text-emerald-600 bg-emerald-50", dot: "bg-emerald-600" };
       case "FAILED": return { label: "Canceled", color: "text-rose-600 bg-rose-50", dot: "bg-rose-600" };
       default: return { label: "Unknown", color: "text-slate-600 bg-slate-50", dot: "bg-slate-600" };
     }
  }

  const getPriorityConfig = (priority: number) => {
     if (priority === 1) return { label: "High", style: "bg-rose-100 text-rose-700" };
     if (priority === 2) return { label: "Medium", style: "bg-amber-100 text-amber-700" };
     return { label: "Low", style: "bg-indigo-100 text-indigo-700" };
  }

  // --- COMPONENTS ---
  const TaskCard = ({ task }: { task: Task }) => {
    const statusConfig = getStatusConfig(task.status);
    const priorityConfig = getPriorityConfig(task.priority);
    const filesCount = (task.taskImages?.length || 0) + (task.taskAudios?.length || 0) + (task.taskVideos?.length || 0);

    return (
      <Card
        draggable
        onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
        className="bg-white shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all border border-slate-200 rounded-2xl group relative overflow-hidden"
      >
        <CardContent className="p-5 flex flex-col gap-4">
          
          {/* Header: Menu */}
          <div className="flex justify-end items-start h-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600 -mr-2">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openPreviewModal(task)}>
                  <Eye className="w-4 h-4 mr-2" /> Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditModal(task)}>
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* AÇÃO DE EXCLUSÃO ATUALIZADA */}
                <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={() => onRequestDeleteTask(task.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title & Description */}
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

          {/* Assignees */}
          <div className="flex items-center justify-between py-1">
             <span className="text-slate-500 text-xs font-medium">Assignees :</span>
             <div className="flex -space-x-2 overflow-hidden">
                {task.assignedTo ? (
                  <div 
                    className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600" 
                    title={task.assignedTo.name}
                  >
                     {getInitials(task.assignedTo.name)}
                  </div>
                ) : (
                   <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-400" title="Sem responsável">
                     <User className="w-3 h-3" />
                   </div>
                )}
             </div>
          </div>

          {/* Date & Priority */}
          <div className="flex items-center justify-between">
             <div className={cn("flex items-center gap-2 text-xs font-medium", isOverdue(task.dueDate || "") && task.status !== 'COMPLETED' ? "text-rose-500" : "text-slate-400")}>
                <Flag className="w-3.5 h-3.5" />
                <span>{task.dueDate ? formatDateShort(task.dueDate) : "Sem prazo"}</span>
             </div>
             <div className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-bold", priorityConfig.style)}>
                {priorityConfig.label}
             </div>
          </div>

          {/* Footer Separator & Meta */}
          <div className="pt-3 mt-1 border-t border-slate-100 flex items-center gap-4">
             <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium hover:text-slate-600 transition-colors cursor-pointer" title="Arquivos">
                <FileText className="w-3.5 h-3.5" /> 
                <span>{filesCount}/{filesCount}</span>
             </div>
          </div>

        </CardContent>
      </Card>
    );
  }

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
    // Fundo Bege Suave (#F5F0E6)
    <div className="min-h-screen bg-[#F5F0E6] flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="bg-[#2C3E50] text-white px-4 py-3 shadow-md border-b border-[#2C3E50] z-20">
        <div className="flex justify-between items-center max-w-[1920px] mx-auto w-full">
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
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#D35400]" />
                <h1 className="text-lg font-bold tracking-wide">Fluxo de Produto</h1>
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
              onClick={() => { resetTaskForm(); setIsTaskModal(true); }}
              className="bg-[#D35400] hover:bg-[#A04000] text-white text-xs h-9 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nova Tarefa
            </Button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {isMobileMenuOpen && (
          <div className="mt-4 p-4 bg-[#34495E] rounded-lg space-y-3 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={loadInitialData} className="justify-start text-white hover:bg-white/10">
                <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
              </Button>
              <Button variant="ghost" onClick={openCreateColumnModal} className="justify-start text-white hover:bg-white/10">
                <Settings className="w-4 h-4 mr-2" /> Colunas
              </Button>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs text-gray-400">
              <span>{user.name}</span>
              <Button variant="link" onClick={logout} className="text-red-400 p-0 h-auto">Sair</Button>
            </div>
          </div>
        )}
      </header>

      {/* BOARD CONTENT */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6">
        <div className="flex gap-4 min-w-max h-full items-start">
          
          {safeColumns.map((col) => (
            <div
              key={col.id}
              className="w-80 flex-shrink-0 flex flex-col max-h-[calc(100vh-140px)] rounded-xl bg-white border border-[#95A5A6]/20 shadow-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Header da Coluna */}
              <div className="px-4 py-3 border-b border-[#95A5A6]/10 flex justify-between items-center bg-[#FAFAFA] rounded-t-xl">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-2 h-2 rounded-full bg-[#2C3E50]"></span>
                  <h3 className="font-bold text-[#2D3436] text-sm truncate uppercase tracking-wider">
                    {col.title}
                  </h3>
                  <Badge variant="secondary" className="bg-[#F5F0E6] text-[#2D3436] text-[10px] font-bold h-5 min-w-[20px] justify-center">
                    {tasks.filter((t) => t.columnId === col.id).length}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-[#95A5A6] hover:bg-[#F5F0E6] hover:text-[#D35400]"
                    onClick={() => openCreateTaskInColumn(col.id)}
                    title="Adicionar tarefa nesta coluna"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-[#95A5A6] hover:bg-[#F5F0E6]">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditColumnModal(col)}>Editar</DropdownMenuItem>
                      {/* AÇÃO DE EXCLUSÃO ATUALIZADA */}
                      <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => onRequestDeleteColumn(col.id)}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Corpo da Coluna */}
              <div className="p-3 overflow-y-auto flex-1 space-y-3 bg-[#FAFAFA]/50 custom-scrollbar">
                {tasks
                  .filter((t) => t.columnId === col.id)
                  .map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                
                {tasks.filter((t) => t.columnId === col.id).length === 0 && (
                   <div className="h-24 flex items-center justify-center border-2 border-dashed border-[#95A5A6]/10 rounded-lg">
                      <p className="text-xs text-[#95A5A6]/50 font-medium">Vazio</p>
                   </div>
                )}
              </div>
            </div>
          ))}

          {/* Coluna "Sem Etapa" (Fallback) */}
          {tasksWithoutColumn.length > 0 && (
            <div
              className="w-80 flex-shrink-0 flex flex-col max-h-[calc(100vh-140px)] rounded-xl bg-orange-50 border border-orange-100 shadow-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, null)}
            >
              <div className="px-4 py-3 border-b border-orange-200 bg-orange-100/50 rounded-t-xl flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-orange-800 text-sm uppercase">Não Classificado</h3>
                </div>
                <Badge variant="outline" className="border-orange-200 text-orange-700 bg-white">
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
      </main>

      {/* --- DIALOGS --- */}
      
      {/* 1. Modal Nova/Edit Tarefa */}
      <Dialog open={isTaskModal || isEditTaskModal} onOpenChange={(open) => {
         if (!open) { setIsTaskModal(false); setIsEditTaskModal(false); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2D3436] flex items-center gap-2">
              {isEditTaskModal ? <Edit className="w-5 h-5 text-[#2C3E50]" /> : <Plus className="w-5 h-5 text-[#D35400]" />}
              {isEditTaskModal ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Título e Descrição */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-[#2D3436]">Título da Tarefa <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  placeholder="Ex: Refatorar Homepage"
                  value={isEditTaskModal ? editTaskTitle : taskTitle}
                  onChange={(e) => isEditTaskModal ? setEditTaskTitle(e.target.value) : setTaskTitle(e.target.value)}
                  className="border-[#95A5A6]/30 focus:border-[#2C3E50] focus:ring-[#2C3E50]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc" className="text-[#2D3436]">Descrição</Label>
                <Textarea
                  id="desc"
                  placeholder="Detalhes da tarefa..."
                  value={isEditTaskModal ? editTaskDescription : taskDescription}
                  onChange={(e) => isEditTaskModal ? setEditTaskDescription(e.target.value) : setTaskDescription(e.target.value)}
                  className="min-h-[100px] border-[#95A5A6]/30 resize-none focus:border-[#2C3E50] focus:ring-[#2C3E50]"
                />
              </div>
            </div>

            {/* Metadados (Grid 2 colunas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[#2D3436]">Prioridade</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#95A5A6]/30 bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#2C3E50] focus:border-transparent"
                  value={isEditTaskModal ? editTaskPriority : taskPriority}
                  onChange={(e) => isEditTaskModal ? setEditTaskPriority(e.target.value) : setTaskPriority(e.target.value)}
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
                  onChange={(e) => isEditTaskModal ? setEditTaskColumn(e.target.value) : setTaskColumn(e.target.value)}
                >
                  <option value="">-- Selecione --</option>
                  {safeColumns.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[#2D3436]">Vencimento</Label>
                <Input
                  type="datetime-local"
                  value={isEditTaskModal ? editTaskDueDate : taskDueDate}
                  onChange={(e) => isEditTaskModal ? setEditTaskDueDate(e.target.value) : setTaskDueDate(e.target.value)}
                  className="border-[#95A5A6]/30"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[#2D3436]">Responsável</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#95A5A6]/30 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[#2C3E50]"
                  value={isEditTaskModal ? editTaskAssignedTo : taskAssignedTo}
                  onChange={(e) => isEditTaskModal ? setEditTaskAssignedTo(e.target.value) : setTaskAssignedTo(e.target.value)}
                >
                  <option value="">Sem responsável</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Uploads */}
            <div className="space-y-4 border-t border-[#95A5A6]/20 pt-4">
              <h4 className="font-semibold text-sm text-[#2D3436]">Anexos</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 1. Imagem */}
                  <div className="flex flex-col gap-2">
                      <div className="p-3 border border-dashed border-[#95A5A6]/40 rounded-lg bg-[#F5F0E6]/30 hover:bg-[#F5F0E6]/60 transition-colors h-32 flex flex-col justify-center">
                         <Label className="cursor-pointer flex flex-col items-center gap-2 text-center h-full justify-center">
                           <ImageIcon className="w-6 h-6 text-[#2C3E50]" />
                           <span className="text-xs text-[#95A5A6]">Adicionar Imagens</span>
                           <Input 
                             type="file" 
                             accept="image/*" 
                             multiple 
                             className="hidden" 
                             onChange={(e) => {
                                 if (e.target.files) {
                                     const files = Array.from(e.target.files);
                                     if (isEditTaskModal) setEditTaskImages(prev => [...prev, ...files]);
                                     else setTaskImages(prev => [...prev, ...files]);
                                 }
                             }} 
                           />
                         </Label>
                      </div>
                      {(isEditTaskModal ? editTaskImages : taskImages).length > 0 && (
                          <div className="space-y-1">
                              <p className="text-[10px] font-bold text-[#95A5A6]">{(isEditTaskModal ? editTaskImages : taskImages).length} selecionadas</p>
                              <div className="grid grid-cols-3 gap-2">
                                  {(isEditTaskModal ? editTaskImages : taskImages).map((file, idx) => (
                                      <div key={idx} className="relative aspect-square rounded overflow-hidden border border-gray-200 group">
                                           <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="preview" />
                                           <button 
                                             onClick={() => removeNewFile(idx, 'image', isEditTaskModal)}
                                             className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                           >
                                             <X className="w-3 h-3" />
                                           </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  {/* 2. Vídeo */}
                  <div className="flex flex-col gap-2">
                      <div className="p-3 border border-dashed border-[#95A5A6]/40 rounded-lg bg-[#F5F0E6]/30 hover:bg-[#F5F0E6]/60 transition-colors h-32 flex flex-col justify-center">
                         <Label className="cursor-pointer flex flex-col items-center gap-2 text-center h-full justify-center">
                           <Video className="w-6 h-6 text-[#2C3E50]" />
                           <span className="text-xs text-[#95A5A6]">Adicionar Vídeos</span>
                           <Input 
                             type="file" 
                             accept="video/*" 
                             multiple 
                             className="hidden" 
                             onChange={(e) => {
                                 if (e.target.files) {
                                     const files = Array.from(e.target.files);
                                     if (isEditTaskModal) setEditTaskVideos(prev => [...prev, ...files]);
                                     else setTaskVideos(prev => [...prev, ...files]);
                                 }
                             }} 
                           />
                         </Label>
                      </div>
                      {(isEditTaskModal ? editTaskVideos : taskVideos).length > 0 && (
                          <div className="space-y-1">
                              <p className="text-[10px] font-bold text-[#95A5A6]">{(isEditTaskModal ? editTaskVideos : taskVideos).length} selecionados</p>
                              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                                 {(isEditTaskModal ? editTaskVideos : taskVideos).map((file, idx) => (
                                     <div key={idx} className="flex justify-between items-center text-[10px] bg-gray-50 p-1 rounded">
                                         <span className="truncate max-w-[80%]">{file.name}</span>
                                         <button onClick={() => removeNewFile(idx, 'video', isEditTaskModal)} className="text-red-500 hover:text-red-700">
                                             <X className="w-3 h-3" />
                                         </button>
                                     </div>
                                 ))}
                              </div>
                          </div>
                      )}
                  </div>

                  {/* 3. Audio */}
                  <div className="flex flex-col gap-2">
                      <div className="p-3 border border-dashed border-[#95A5A6]/40 rounded-lg bg-[#F5F0E6]/30 hover:bg-[#F5F0E6]/60 transition-colors h-32 flex flex-col justify-center">
                         <Label className="cursor-pointer flex flex-col items-center gap-2 text-center h-full justify-center">
                           <Mic className="w-6 h-6 text-[#2C3E50]" />
                           <span className="text-xs text-[#95A5A6]">Upload Áudio</span>
                           <Input 
                             type="file" 
                             accept="audio/*" 
                             multiple 
                             className="hidden" 
                             onChange={(e) => {
                                 if (e.target.files) {
                                     const files = Array.from(e.target.files);
                                     if (isEditTaskModal) setEditTaskAudios(prev => [...prev, ...files]);
                                     else setTaskAudios(prev => [...prev, ...files]);
                                 }
                             }} 
                           />
                         </Label>
                      </div>
                      {(isEditTaskModal ? editTaskAudios : taskAudios).length > 0 && (
                          <div className="space-y-1">
                              <p className="text-[10px] font-bold text-[#95A5A6]">{(isEditTaskModal ? editTaskAudios : taskAudios).length} selecionados</p>
                              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                                 {(isEditTaskModal ? editTaskAudios : taskAudios).map((file, idx) => (
                                     <div key={idx} className="flex justify-between items-center text-[10px] bg-gray-50 p-1 rounded">
                                         <span className="truncate max-w-[80%]">{file.name}</span>
                                         <button onClick={() => removeNewFile(idx, 'audio', isEditTaskModal)} className="text-red-500 hover:text-red-700">
                                             <X className="w-3 h-3" />
                                         </button>
                                     </div>
                                 ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
              
              {/* Gravador */}
              <div className="flex items-center gap-3 bg-[#F5F0E6] p-3 rounded-lg border border-[#D35400]/10">
                <Button
                  type="button"
                  size="sm"
                  variant={isRecording ? "destructive" : "secondary"}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn("w-32", isRecording ? "animate-pulse" : "bg-[#2C3E50] text-white hover:bg-[#34495E]")}
                >
                  {isRecording ? <Square className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                  {isRecording ? "Parar" : "Gravar Voz"}
                </Button>
                {isRecording && <span className="text-sm font-mono text-red-600">00:{String(recordingTime).padStart(2, '0')}</span>}
                {audioBlob && !isRecording && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Áudio gravado</span>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsTaskModal(false); setIsEditTaskModal(false); }}>Cancelar</Button>
            <Button 
              onClick={isEditTaskModal ? updateTask : createTask} 
              disabled={isSubmitting}
              className="bg-[#D35400] hover:bg-[#A04000] text-white"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              {isSubmitting ? "Salvando..." : (isEditTaskModal ? "Salvar Alterações" : "Criar Tarefa")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Modal Coluna */}
      <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCol ? "Renomear Coluna" : "Nova Coluna"}</DialogTitle>
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
            <Button variant="outline" onClick={() => setIsColumnModal(false)}>Cancelar</Button>
            <Button onClick={editingCol ? updateColumn : createColumn} className="bg-[#2C3E50] text-white hover:bg-[#34495E]">
              {editingCol ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Modal Preview Profissional Única Coluna */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0 gap-0 border-0 shadow-2xl flex flex-col">
          {previewTask && (
            <div className="flex flex-col h-full bg-white relative">
              
              {/* HEADER Sticky */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white sticky top-0 z-10">
                 <div className="space-y-2">
                    <div className="flex items-center gap-3">
                       <Badge className={cn("text-[10px] uppercase tracking-wider font-bold shadow-sm", getPriorityConfig(previewTask.priority).style)}>
                          {getPriorityConfig(previewTask.priority).label}
                       </Badge>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">{previewTask.title}</h2>
                 </div>
                 <Button variant="ghost" className="h-8 w-8 rounded-full hover:bg-slate-100" onClick={() => setIsPreviewModal(false)}>
                    <X className="w-5 h-5 text-slate-500" />
                 </Button>
              </div>

              {/* MAIN CONTENT SCROLLABLE */}
              <div className="p-6 md:p-8 space-y-8 flex-1 overflow-y-auto">
                 
                 {/* Metadata Bar */}
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-1">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsável</span>
                       <div className="flex items-center gap-2 font-medium text-slate-700 text-sm">
                          <User className="w-4 h-4 text-slate-400" />
                          {previewTask.assignedTo?.name || "Não atribuído"}
                       </div>
                    </div>
                    <div className="space-y-1">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencimento</span>
                       <div className="flex items-center gap-2 font-medium text-slate-700 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {previewTask.dueDate ? formatDateTime(previewTask.dueDate) : "Sem data"}
                       </div>
                    </div>
                    <div className="space-y-1">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Criado em</span>
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
                       {previewTask.description || "Nenhuma descrição fornecida para esta tarefa."}
                    </div>
                 </div>

                 {/* Separator */}
                 <div className="border-t border-slate-100" />

                 {/* Attachments Section - Unified Gallery */}
                 <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                       <Paperclip className="w-4 h-4" /> Anexos & Mídia
                    </h3>

                    {/* Images Grid */}
                    {previewTask.taskImages.length > 0 && (
                       <div className="mb-6">
                          <h4 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5"/> Imagens ({previewTask.taskImages.length})</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             {previewTask.taskImages.map((img) => (
                                <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer shadow-sm hover:shadow-md transition-all">
                                   <img 
                                     src={img.url} 
                                     alt="Attachment" 
                                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                   />
                                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>
                             ))}
                          </div>
                       </div>
                    )}

                    {/* Videos & Audios Split View */}
                    <div className="grid md:grid-cols-2 gap-6">
                       
                       {/* Videos List */}
                       {previewTask.taskVideos.length > 0 && (
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                             <h4 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5"><Video className="w-3.5 h-3.5"/> Vídeos ({previewTask.taskVideos.length})</h4>
                             <div className="space-y-4">
                                {previewTask.taskVideos.map(v => (
                                   <div key={v.id} className="group">
                                      <div className="rounded-lg overflow-hidden bg-black aspect-video mb-2 shadow-sm">
                                         <video controls src={v.url} className="w-full h-full" />
                                      </div>
                                      <p className="text-xs text-slate-500 truncate px-1" title={v.filename}>{v.filename}</p>
                                   </div>
                                ))}
                             </div>
                          </div>
                       )}

                       {/* Audios List */}
                       {previewTask.taskAudios.length > 0 && (
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 h-fit">
                             <h4 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5"><Mic className="w-3.5 h-3.5"/> Áudios ({previewTask.taskAudios.length})</h4>
                             <div className="space-y-2">
                                {previewTask.taskAudios.map(a => (
                                   <div key={a.id} className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex flex-col gap-1">
                                      <audio controls src={a.url} className="w-full h-8" />
                                      <span className="text-[10px] text-slate-400 px-1 truncate">{a.filename}</span>
                                   </div>
                                ))}
                             </div>
                          </div>
                       )}

                    </div>

                    {/* Empty State for Media */}
                    {previewTask.taskImages.length === 0 && previewTask.taskVideos.length === 0 && previewTask.taskAudios.length === 0 && (
                       <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">Nenhum anexo encontrado nesta tarefa.</p>
                       </div>
                    )}

                 </div>
              </div>

              {/* FOOTER Actions */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 sticky bottom-0 z-10">
                 <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-white hover:text-slate-900" onClick={() => setIsPreviewModal(false)}>
                    Fechar
                 </Button>
                 <div className="h-6 w-px bg-slate-200 mx-1" />
                 <Button 
                    className="bg-slate-800 text-white hover:bg-slate-900 shadow-sm"
                    onClick={() => { setIsPreviewModal(false); openEditModal(previewTask); }}
                 >
                    <Edit className="w-4 h-4 mr-2" /> Editar Detalhes
                 </Button>
                 {previewTask.status !== "COMPLETED" && (
                   <Button 
                      className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                      onClick={() => { completeTask(previewTask.id); setIsPreviewModal(false); }}
                   >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Concluído
                   </Button>
                 )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. MODAL DE EXCLUSÃO (NOVO) */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        title={itemToDelete?.type === 'column' ? "Excluir Coluna?" : "Excluir Tarefa?"}
        description={
          itemToDelete?.type === 'column'
            ? "Você tem certeza que deseja excluir esta coluna? Esta ação é irreversível."
            : "Você tem certeza que deseja excluir esta tarefa permanentemente? Todos os anexos e dados serão perdidos."
        }
      />

    </div>
  );
}











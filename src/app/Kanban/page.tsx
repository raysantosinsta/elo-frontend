/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Filter,
  MoreVertical,
  Settings,
  Trash2,
  Edit,
  Calendar,
  User,
  Mic,
  Square,
  Upload,
  Clock,
  LogOut,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  RefreshCw,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const API_BASE = "http://localhost:3000";

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
  taskAudios: Array<{ id: string; url: string; filename: string; duration?: number }>;
  taskVideos: Array<{ id: string; url: string; filename: string; duration?: number }>;
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
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isColumnModal, setIsColumnModal] = useState(false);
  const [isTaskModal, setIsTaskModal] = useState(false);
  const [isEditTaskModal, setIsEditTaskModal] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);

  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [colTitle, setColTitle] = useState("");

  // Formulário nova tarefa
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskColumn, setTaskColumn] = useState("");
  const [taskPriority, setTaskPriority] = useState("1");
  const [taskImages, setTaskImages] = useState<File[]>([]);
  const [taskAudios, setTaskAudios] = useState<File[]>([]);
  const [taskVideos, setTaskVideos] = useState<File[]>([]);

  // Formulário edição - AGORA COMPLETO com suporte a remoção e adição
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

  // Controle de reprodução
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==================================== AUTH E FETCH ====================================
  const getAuthToken = useCallback((): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  }, []);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
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
  }, [getAuthToken, logout]);

  const authFetchWithFiles = useCallback(async (
    url: string,
    formData: FormData,
    method: string = "POST"
  ) => {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(url, { method, headers, body: formData });
    if (response.status === 401) logout();
    return response;
  }, [getAuthToken, logout]);

  // ==================================== CARREGAMENTO ====================================
  const fetchColumns = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/kanban-columns`);
      if (!res.ok && res.status !== 404) throw new Error("Erro colunas");
      const data = res.status === 404 ? [] : await res.json();
      const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setColumns(sorted);
    } catch (err) {
      setColumns([]);
    }
  }, [authFetch]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/tasks`);
      if (!res.ok) throw new Error("Erro tasks");
      const data = await res.json();
      const tasksArray = Array.isArray(data) ? data : data.tasks || [];
      
      // Garantir que as URLs das imagens sejam absolutas
      const tasksWithAbsoluteUrls = tasksArray.map((task: Task) => ({
        ...task,
        taskImages: task.taskImages?.map((img: TaskImage) => ({
          ...img,
          url: img.url.startsWith('http') ? img.url : `${API_BASE}${img.url.startsWith('/') ? '' : '/'}${img.url}`
        })) || []
      }));
      
      setTasks(tasksWithAbsoluteUrls);
    } catch (err) {
      setTasks([]);
    }
  }, [authFetch]);

  const fetchUsers = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const res = await authFetch(`${API_BASE}/auth/professionals/${user.company.id}`);
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
    await Promise.all([fetchColumns(), fetchTasks(), fetchUsers()]);
    setLoading(false);
  }, [user, fetchColumns, fetchTasks, fetchUsers]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (user) loadInitialData();
  }, [user, authLoading, router, loadInitialData]);

  // ==================================== FUNÇÕES DE COLUNAS ====================================
  const createColumn = async () => {
    if (!colTitle.trim()) return alert("Título da coluna é obrigatório");
    
    try {
      const res = await authFetch(`${API_BASE}/kanban-columns`, {
        method: "POST",
        body: JSON.stringify({ title: colTitle }),
      });
      
      if (!res.ok) throw new Error("Erro ao criar coluna");
      
      const newColumn = await res.json();
      setColumns(prev => [...prev, newColumn]);
      setColTitle("");
      setIsColumnModal(false);
    } catch (err: any) {
      alert(err.message || "Erro ao criar coluna");
    }
  };

  const updateColumn = async () => {
    if (!editingCol || !colTitle.trim()) return alert("Título da coluna é obrigatório");
    
    try {
      const res = await authFetch(`${API_BASE}/kanban-columns/${editingCol.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: colTitle }),
      });
      
      if (!res.ok) throw new Error("Erro ao atualizar coluna");
      
      const updatedColumn = await res.json();
      setColumns(prev => prev.map(col => 
        col.id === editingCol.id ? updatedColumn : col
      ));
      setColTitle("");
      setEditingCol(null);
      setIsColumnModal(false);
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar coluna");
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta coluna? As tarefas serão movidas para a coluna padrão.")) return;
    
    try {
      const res = await authFetch(`${API_BASE}/kanban-columns/${columnId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Erro ao deletar coluna");
      
      // Atualizar a lista de colunas
      setColumns(prev => prev.filter(col => col.id !== columnId));
      
      // Atualizar as tarefas para remover a referência à coluna deletada
      setTasks(prev => prev.map(task => 
        task.columnId === columnId ? { ...task, columnId: null } : task
      ));
    } catch (err: any) {
      alert(err.message || "Erro ao deletar coluna");
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

  // ==================================== FUNÇÕES AUXILIARES ====================================
  const refreshTask = useCallback(async (taskId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/tasks/${taskId}`);
      if (res.ok) {
        const updated = await res.json();
        // Garantir URLs absolutas para as imagens
        const taskWithAbsoluteUrls = {
          ...updated,
          taskImages: updated.taskImages?.map((img: TaskImage) => ({
            ...img,
            url: img.url.startsWith('http') ? img.url : `${API_BASE}${img.url.startsWith('/') ? '' : '/'}${img.url}`
          })) || []
        };
        setTasks(prev => prev.map(t => t.id === taskId ? taskWithAbsoluteUrls : t));
      }
    } catch (err) { }
  }, [authFetch]);

  const completeTask = useCallback(async (taskId: string) => {
    await authFetch(`${API_BASE}/tasks/${taskId}/complete`, { method: "PATCH" });
    await refreshTask(taskId);
  }, [authFetch, refreshTask]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!confirm("Excluir tarefa permanentemente?")) return;
    await authFetch(`${API_BASE}/tasks/${taskId}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, [authFetch]);

  const handleDrop = useCallback(async (e: React.DragEvent, columnId: string | null) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const prevTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, columnId } : t));

    try {
      await authFetch(`${API_BASE}/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ columnId }),
      });
      await refreshTask(taskId);
    } catch (err) {
      setTasks(prevTasks);
    }
  }, [tasks, authFetch, refreshTask]);

  // ==================================== GRAVAÇÃO DE ÁUDIO ====================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const file = new File([blob], `gravação-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`, { type: "audio/webm" });
        setTaskAudios([file]);
        stream.getTracks().forEach(t => t.stop());
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
      const i = setInterval(() => setRecordingTime(t => t + 1), 1000);
      return () => clearInterval(i);
    }
  }, [isRecording]);

  // ==================================== CRIAÇÃO E EDIÇÃO DE TASK ====================================
  const createTask = async () => {
    if (!taskTitle.trim()) return alert("Título obrigatório");
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
    taskImages.forEach(f => formData.append("images", f));
    taskAudios.forEach(f => formData.append("audios", f));
    taskVideos.forEach(f => formData.append("videos", f));

    try {
      const res = await authFetchWithFiles(`${API_BASE}/tasks`, formData, "POST");
      if (!res.ok) throw new Error("Erro ao criar");
      const newTask = await res.json();
      setTasks(prev => [newTask, ...prev]);
      resetTaskForm();
      setIsTaskModal(false);
      setTimeout(() => refreshTask(newTask.id), 1500);
    } catch (err) {
      alert("Erro ao criar tarefa");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções para remover arquivos na edição
  const removeImage = (id: string) => {
    setRemovedImageIds(prev => [...prev, id]);
  };

  const removeAudio = (id: string) => {
    setRemovedAudioIds(prev => [...prev, id]);
  };

  const removeVideo = (id: string) => {
    setRemovedVideoIds(prev => [...prev, id]);
  };

  const updateTask = async () => {
    if (!editingTask || !editTaskTitle.trim()) return alert("Título obrigatório");
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("title", editTaskTitle);
    formData.append("description", editTaskDescription || "");
    formData.append("priority", editTaskPriority);
    formData.append("columnId", editTaskColumn || "");
    formData.append("dueDate", editTaskDueDate || "");
    formData.append("assignedToId", editTaskAssignedTo || "");
    formData.append("status", editTaskStatus);

    // Adicionar IDs removidos
    if (removedImageIds.length > 0) {
      formData.append("removeImageIds", JSON.stringify(removedImageIds));
    }
    if (removedAudioIds.length > 0) {
      formData.append("removeAudioIds", JSON.stringify(removedAudioIds));
    }
    if (removedVideoIds.length > 0) {
      formData.append("removeVideoIds", JSON.stringify(removedVideoIds));
    }

    // Adicionar novos arquivos
    editTaskImages.forEach(f => formData.append("images", f));
    editTaskAudios.forEach(f => formData.append("audios", f));
    editTaskVideos.forEach(f => formData.append("videos", f));

    try {
      const res = await authFetchWithFiles(`${API_BASE}/tasks/${editingTask.id}`, formData, "PUT");
      if (!res.ok) throw new Error("Erro ao atualizar");
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t));
      setIsEditTaskModal(false);
      setEditingTask(null);
      resetEditTaskForm();
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTaskForm = () => {
    setTaskTitle(""); setTaskDescription(""); setTaskDueDate(""); setTaskAssignedTo(""); setTaskColumn(""); setTaskPriority("1");
    setTaskImages([]); setTaskAudios([]); setTaskVideos([]); setAudioBlob(null); setRecordingTime(0);
  };

  const resetEditTaskForm = () => {
    setEditTaskTitle(""); setEditTaskDescription(""); setEditTaskDueDate(""); setEditTaskAssignedTo(""); setEditTaskColumn(""); 
    setEditTaskPriority("1"); setEditTaskStatus("PENDING"); setEditTaskImages([]); setEditTaskAudios([]); setEditTaskVideos([]);
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
    setEditTaskImages([]);
    setEditTaskAudios([]);
    setEditTaskVideos([]);
    setRemovedImageIds([]);
    setRemovedAudioIds([]);
    setRemovedVideoIds([]);
    setIsEditTaskModal(true);
  };

  const openPreviewModal = (task: Task) => {
    setPreviewTask(task);
    setIsPreviewModal(true);
  };

  // ==================================== FUNÇÕES DE FORMATAÇÃO ====================================
  const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const isOverdue = (d: string) => new Date(d) < new Date();

  const getPriorityColor = (p: number) => {
    if (p === 1) return "bg-red-100 text-red-800 border-red-200";
    if (p === 2) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  // Função para garantir URL absoluta da imagem
  const getImageUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // ==================================== RENDER TASK CARD ====================================
  const TaskCard = ({ task }: { task: Task }) => (
    <Card draggable onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
      className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-all">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <Badge className={`${getPriorityColor(task.priority)} border`}>Prio: {task.priority}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => openPreviewModal(task)}><Eye className="w-4 h-4 mr-2" /> Visualizar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditModal(task)}><Edit className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
              {task.status !== "COMPLETED" && <DropdownMenuItem onClick={() => completeTask(task.id)}><CheckCircle2 className="w-4 h-4 mr-2" /> Concluir</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => refreshTask(task.id)}><RefreshCw className="w-4 h-4 mr-2" /> Recarregar</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => deleteTask(task.id)}><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.taskImages && task.taskImages.length > 0 ? (
          <div className="mb-3 relative">
            <img
              src={getImageUrl(task.taskImages[0].url)}
              alt="img"
              className="w-full h-48 object-cover rounded-md cursor-pointer"
              onClick={() => openPreviewModal(task)}
              onError={(e) => {
                // Fallback em caso de erro no carregamento
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            {task.taskImages.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                +{task.taskImages.length - 1}
              </div>
            )}
          </div>
        ) : (
          <div
            className="bg-gray-100 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400 cursor-pointer"
            onClick={() => openPreviewModal(task)}
          >
            <ImageIcon className="w-8 h-8 mr-2" /> Sem imagem
          </div>
        )}

        <h4 className="font-semibold text-lg cursor-pointer hover:text-purple-600 line-clamp-2"
          onClick={() => openPreviewModal(task)}>{task.title}</h4>
        {task.description && <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>}

        {task.dueDate && (
          <div className="flex items-center gap-1 text-sm my-2">
            <Clock className="w-4 h-4" />
            <span className={isOverdue(task.dueDate) ? "text-red-600" : ""}>{formatDateTime(task.dueDate)}</span>
            {isOverdue(task.dueDate) && <Badge variant="destructive" className="ml-2 text-xs">Atrasado</Badge>}
          </div>
        )}

        <div className="flex justify-between items-center mt-3">
          <Badge variant={task.status === "COMPLETED" ? "default" : task.status === "IN_PROGRESS" ? "secondary" : "outline"}>
            {task.status === "COMPLETED" ? "Concluído" : task.status === "IN_PROGRESS" ? "Em progresso" : "Pendente"}
          </Badge>
          {task.assignedTo && (
            <div className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full text-xs">
              <User className="w-3 h-3" /> {task.assignedTo.name}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // ==================================== RENDER PRINCIPAL ====================================
  if (authLoading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600" /></div>;
  if (!user) return null;

  const safeColumns = Array.isArray(columns) ? columns : [];
  const tasksWithoutColumn = tasks.filter(t => !t.columnId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">KANBAN - {user.company?.name}</h1>
          <div className="flex gap-2">
            <Badge className="bg-white/20">{safeColumns.length} colunas</Badge>
            <Badge className="bg-white/20">{tasks.length} tarefas</Badge>
            {tasksWithoutColumn.length > 0 && (
              <Badge variant="destructive" className="bg-orange-500">
                {tasksWithoutColumn.length} sem coluna
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2"><User className="w-4 h-4" /> {user.name}</span>
          <Button onClick={openCreateColumnModal} variant="secondary" className="bg-white/20 hover:bg-white/30">
            <Settings className="w-4 h-4 mr-2" /> Colunas
          </Button>
          <Button onClick={() => { resetTaskForm(); setIsTaskModal(true); }} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
          </Button>
          <Button onClick={logout} className="bg-red-600 hover:bg-red-700">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center h-96 items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-6 p-6 min-w-max">
              {safeColumns.map(col => (
                <div key={col.id} className="w-80 flex-shrink-0"
                  onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col.id)}>
                  <div className="bg-gray-200 rounded-t-lg px-4 py-3 flex justify-between items-center">
                    <h3 className="font-semibold">{col.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge>{tasks.filter(t => t.columnId === col.id).length}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openEditColumnModal(col)}>
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => deleteColumn(col.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
                    {tasks.filter(t => t.columnId === col.id).map(task => <TaskCard key={task.id} task={task} />)}
                  </div>
                </div>
              ))}

              {/* Área para tarefas sem coluna - aparece apenas quando há tarefas sem coluna */}
              {tasksWithoutColumn.length > 0 && (
                <div className="w-80 flex-shrink-0"
                  onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, null)}>
                  <div className="bg-orange-200 rounded-t-lg px-4 py-3">
                    <h3 className="font-semibold text-orange-800">Tarefas Sem Coluna</h3>
                  </div>
                  <div className="bg-orange-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
                    {tasksWithoutColumn.map(task => <TaskCard key={task.id} task={task} />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ====================== TODOS OS MODAIS COMPLETOS ====================== */}

      {/* MODAL PREVIEW */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualização Completa - {previewTask?.title}</DialogTitle>
          </DialogHeader>
          {previewTask && (
            <div className="space-y-6">
              {/* cabeçalho rápido */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                <div>
                  <Badge className={getPriorityColor(previewTask.priority)}>Prioridade {previewTask.priority}</Badge>
                  <Badge className="ml-2" variant={previewTask.status === "COMPLETED" ? "default" : "secondary"}>
                    {previewTask.status === "COMPLETED" ? "Concluído" : "Em progresso"}
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div>Criado: {formatDateTime(previewTask.createdAt)}</div>
                  {previewTask.dueDate && <div>Vence: {formatDateTime(previewTask.dueDate)}</div>}
                </div>
              </div>

              {/* imagens - CORREÇÃO: removido height fixo para não cortar */}
              {previewTask.taskImages && previewTask.taskImages.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Imagens</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {previewTask.taskImages.map(img => (
                      <div key={img.id} className="flex flex-col items-center">
                        <img 
                          src={getImageUrl(img.url)} 
                          alt={img.filename} 
                          className="w-full max-w-md rounded-lg object-contain max-h-96"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <p className="text-sm text-gray-600 mt-2">{img.filename}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* áudios */}
              {previewTask.taskAudios && previewTask.taskAudios.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Music className="w-5 h-5" /> Áudios</h3>
                  <div className="space-y-3">
                    {previewTask.taskAudios.map(a => (
                      <div key={a.id} className="flex flex-col">
                        <audio controls src={getImageUrl(a.url)} className="w-full" />
                        <p className="text-sm text-gray-600 mt-1">{a.filename}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* vídeos */}
              {previewTask.taskVideos && previewTask.taskVideos.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Video className="w-5 h-5" /> Vídeos</h3>
                  {previewTask.taskVideos.map(v => (
                    <div key={v.id} className="flex flex-col">
                      <video controls src={getImageUrl(v.url)} className="w-full max-w-2xl mx-auto rounded-lg" />
                      <p className="text-sm text-gray-600 mt-2 text-center">{v.filename}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsPreviewModal(false)}>Fechar</Button>
                <Button onClick={() => { setIsPreviewModal(false); openEditModal(previewTask); }}>Editar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL NOVA TAREFA */}
      <Dialog open={isTaskModal} onOpenChange={setIsTaskModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} /></div>
            <div><Label>Descrição</Label><Textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} rows={3} /></div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prioridade</Label>
                <select className="w-full border rounded p-2" value={taskPriority} onChange={e => setTaskPriority(e.target.value)}>
                  <option value="1">1 - Alta</option>
                  <option value="2">2 - Média</option>
                  <option value="3">3 - Baixa</option>
                </select>
              </div>
              <div><Label>Coluna</Label>
                <select className="w-full border rounded p-2" value={taskColumn} onChange={e => setTaskColumn(e.target.value)}>
                  <option value="">Nenhuma</option>
                  {safeColumns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data/Hora vencimento</Label><Input type="datetime-local" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} /></div>
              <div><Label>Responsável</Label>
                <select className="w-full border rounded p-2" value={taskAssignedTo} onChange={e => setTaskAssignedTo(e.target.value)}>
                  <option value="">Ninguém</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            {/* Imagens */}
            <div><Label>Imagens</Label><Input type="file" accept="image/*" multiple onChange={e => e.target.files && setTaskImages([...e.target.files])} /></div>

            {/* Áudio com gravação */}
            <div>
              <Label>Áudio</Label>
              <div className="flex items-center gap-3 my-2">
                <Button variant={isRecording ? "destructive" : "outline"} onClick={isRecording ? stopRecording : startRecording}>
                  {isRecording ? <><Square className="w-4 h-4 mr-2" /> Parar</> : <><Mic className="w-4 h-4 mr-2" /> Gravar</>}
                </Button>
                {isRecording && <span>{String(Math.floor(recordingTime / 60)).padStart(2, "0")}:{String(recordingTime % 60).padStart(2, "0")}</span>}
              </div>
              {audioBlob && <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />}
              <Input type="file" accept="audio/*" multiple onChange={e => e.target.files && setTaskAudios(prev => [...prev, ...e.target.files!])} />
            </div>

            {/* Vídeos */}
            <div><Label>Vídeos</Label><Input type="file" accept="video/*" multiple onChange={e => e.target.files && setTaskVideos([...e.target.files])} /></div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setIsTaskModal(false); resetTaskForm(); }}>Cancelar</Button>
              <Button onClick={createTask} disabled={isSubmitting || !taskTitle.trim()}>
                {isSubmitting ? "Criando..." : "Criar Tarefa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR TAREFA - AGORA COMPLETO com remoção e adição */}
      <Dialog open={isEditTaskModal} onOpenChange={setIsEditTaskModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Tarefa - {editingTask?.title}</DialogTitle></DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input value={editTaskTitle} onChange={e => setEditTaskTitle(e.target.value)} />
              </div>
              
              <div>
                <Label>Descrição</Label>
                <Textarea 
                  value={editTaskDescription} 
                  onChange={e => setEditTaskDescription(e.target.value)} 
                  rows={4}
                  placeholder="Descrição da tarefa..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prioridade</Label>
                  <select 
                    className="w-full border rounded p-2" 
                    value={editTaskPriority} 
                    onChange={e => setEditTaskPriority(e.target.value)}
                  >
                    <option value="1">1 - Alta</option>
                    <option value="2">2 - Média</option>
                    <option value="3">3 - Baixa</option>
                  </select>
                </div>
                
                <div>
                  <Label>Status</Label>
                  <select 
                    className="w-full border rounded p-2" 
                    value={editTaskStatus} 
                    onChange={e => setEditTaskStatus(e.target.value)}
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="IN_PROGRESS">Em Progresso</option>
                    <option value="COMPLETED">Concluído</option>
                    <option value="FAILED">Falhou</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Coluna</Label>
                  <select 
                    className="w-full border rounded p-2" 
                    value={editTaskColumn} 
                    onChange={e => setEditTaskColumn(e.target.value)}
                  >
                    <option value="">Nenhuma</option>
                    {safeColumns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                
                <div>
                  <Label>Responsável</Label>
                  <select 
                    className="w-full border rounded p-2" 
                    value={editTaskAssignedTo} 
                    onChange={e => setEditTaskAssignedTo(e.target.value)}
                  >
                    <option value="">Ninguém</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label>Data/Hora vencimento</Label>
                <Input 
                  type="datetime-local" 
                  value={editTaskDueDate} 
                  onChange={e => setEditTaskDueDate(e.target.value)} 
                />
              </div>

              {/* Imagens para edição - com remoção */}
              <div>
                <Label>Adicionar Novas Imagens</Label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={e => e.target.files && setEditTaskImages([...e.target.files])} 
                />
                {editingTask.taskImages && editingTask.taskImages.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Imagens atuais (clique no ícone de lixeira para remover):</p>
                    <div className="grid grid-cols-2 gap-2">
                      {editingTask.taskImages
                        .filter(img => !removedImageIds.includes(img.id))
                        .map(img => (
                          <div key={img.id} className="relative">
                            <img 
                              src={getImageUrl(img.url)} 
                              alt={img.filename}
                              className="w-full h-20 object-cover rounded"
                            />
                            <p className="text-xs truncate">{img.filename}</p>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-0 right-0 w-5 h-5 p-0"
                              onClick={() => removeImage(img.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Áudio para edição - com remoção */}
              <div>
                <Label>Adicionar Novos Áudios</Label>
                <Input 
                  type="file" 
                  accept="audio/*" 
                  multiple 
                  onChange={e => e.target.files && setEditTaskAudios([...e.target.files])} 
                />
                {editingTask.taskAudios && editingTask.taskAudios.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Áudios atuais (clique no ícone de lixeira para remover):</p>
                    <div className="space-y-2">
                      {editingTask.taskAudios
                        .filter(audio => !removedAudioIds.includes(audio.id))
                        .map(audio => (
                          <div key={audio.id} className="flex items-center gap-2 relative">
                            <audio controls src={getImageUrl(audio.url)} className="flex-1" />
                            <p className="text-xs min-w-[120px] truncate">{audio.filename}</p>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-6 h-6 p-0 absolute -right-2 -top-2"
                              onClick={() => removeAudio(audio.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Vídeos para edição - com remoção */}
              <div>
                <Label>Adicionar Novos Vídeos</Label>
                <Input 
                  type="file" 
                  accept="video/*" 
                  multiple 
                  onChange={e => e.target.files && setEditTaskVideos([...e.target.files])} 
                />
                {editingTask.taskVideos && editingTask.taskVideos.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Vídeos atuais (clique no ícone de lixeira para remover):</p>
                    <div className="space-y-2">
                      {editingTask.taskVideos
                        .filter(video => !removedVideoIds.includes(video.id))
                        .map(video => (
                          <div key={video.id} className="relative">
                            <video controls src={getImageUrl(video.url)} className="w-full max-w-md rounded" />
                            <p className="text-xs mt-1">{video.filename}</p>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-0 right-0 w-5 h-5 p-0"
                              onClick={() => removeVideo(video.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditTaskModal(false);
                    setEditingTask(null);
                    resetEditTaskForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={updateTask} 
                  disabled={isSubmitting || !editTaskTitle.trim()}
                >
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL COLUNAS */}
      <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCol ? "Editar Coluna" : "Nova Coluna"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              value={colTitle} 
              onChange={e => setColTitle(e.target.value)} 
              placeholder="Título da coluna" 
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  editingCol ? updateColumn() : createColumn();
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setIsColumnModal(false);
                setEditingCol(null);
                setColTitle("");
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={editingCol ? updateColumn : createColumn}
                disabled={!colTitle.trim()}
              >
                {editingCol ? "Salvar Alterações" : "Criar Coluna"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
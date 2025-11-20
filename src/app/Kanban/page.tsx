// versao 2
"use client";
import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const API_BASE = "http://localhost:3000";

interface Professional {
  id: string;
  name: string;
  email: string;
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
  taskImages: Array<{ id: string; url: string; filename: string }>;
  taskAudios: Array<{ id: string; url: string; filename: string }>;
  taskVideos: Array<{ id: string; url: string; filename: string }>;
  createdAt: string;
  updatedAt: string;
}

interface Column {
  id: string;
  title: string;
  order: number;
  tasks: Task[];
}

export default function ProductKanban() {
  const { user, logout, loading: authLoading, token } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isColumnModal, setIsColumnModal] = useState(false);
  const [isTaskModal, setIsTaskModal] = useState(false);
  const [isEditTaskModal, setIsEditTaskModal] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [colTitle, setColTitle] = useState("");

  // Estados para o formulário de tarefa
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskColumn, setTaskColumn] = useState("");
  const [taskPriority, setTaskPriority] = useState("1");
  const [taskImages, setTaskImages] = useState<File[]>([]);
  const [taskAudios, setTaskAudios] = useState<File[]>([]);
  const [taskVideos, setTaskVideos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para edição de tarefa
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskAssignedTo, setEditTaskAssignedTo] = useState("");
  const [editTaskColumn, setEditTaskColumn] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState("1");
  const [editTaskImages, setEditTaskImages] = useState<File[]>([]);
  const [editTaskAudios, setEditTaskAudios] = useState<File[]>([]);
  const [editTaskVideos, setEditTaskVideos] = useState<File[]>([]);

  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);

  // Função para obter token JWT
  const getAuthToken = (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  };

  // 🔥 FUNÇÃO authFetch MELHORADA
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();

    if (!token) {
      console.error("❌ Nenhum token encontrado");
      logout();
      throw new Error("Autenticação necessária");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    console.log(`📡 Fazendo requisição para: ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📡 Resposta: ${response.status} ${response.statusText}`);

      if (response.status === 401) {
        console.warn("❌ Token expirado ou inválido (401)");
        logout();
        return response;
      }

      if (response.status === 404) {
        console.warn("⚠️ Endpoint não encontrado (404)");
        return response;
      }

      return response;
    } catch (error) {
      console.error("❌ Erro na requisição:", error);
      throw error;
    }
  };

  // Função para upload de arquivos
  const authFetchWithFiles = async (
    url: string,
    formData: FormData,
    method: string = "POST"
  ) => {
    const token = getAuthToken();

    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: formData,
    });

    if (response.status === 401) {
      logout();
      return response;
    }

    return response;
  };

  // 🔥 ATUALIZE a função fetchColumns para usar companyId
  const fetchColumns = async () => {
    try {
      console.log("🔍 Buscando colunas para company:", user?.company?.id);

      const res = await authFetch(`${API_BASE}/kanban-columns`);

      if (res.status === 404) {
        console.warn("Endpoint não encontrado, tentando alternativa...");
        // Tenta uma rota alternativa se necessário
        const altRes = await authFetch(`${API_BASE}/columns`);
        if (!altRes.ok) throw new Error("Erro ao buscar colunas");
        const altData = await altRes.json();
        setColumns(Array.isArray(altData) ? altData : []);
        return;
      }

      if (!res.ok) throw new Error("Erro ao buscar colunas");

      const data = await res.json();
      console.log("📦 Dados das colunas recebidos:", data);

      if (Array.isArray(data)) {
        setColumns(data);
      } else {
        console.warn("Dados de colunas inesperados:", data);
        setColumns([]);
      }
    } catch (error) {
      console.error("Erro ao buscar colunas:", error);

      // 🔥 FALLBACK: Criar colunas padrão se não existirem
      if (user?.company?.id) {
        console.log("🔄 Tentando criar colunas padrão...");
        try {
          await createDefaultColumns();
        } catch (fallbackError) {
          console.error("❌ Erro ao criar colunas padrão:", fallbackError);
          setColumns([]);
        }
      } else {
        setColumns([]);
      }
    }
  };

  // 🔥 NOVA FUNÇÃO: Criar colunas padrão
  const createDefaultColumns = async () => {
    const defaultColumns = [
      "Sem etapa",
      "Preenchimento Estilo",
      "Desenvolvimento",
      "Cad",
      "Ficha para Engenharia",
      "Lacre",
    ];

    const createdColumns = [];

    for (const title of defaultColumns) {
      try {
        const response = await authFetch(`${API_BASE}/kanban-columns`, {
          method: "POST",
          body: JSON.stringify({ title }),
        });

        if (response.ok) {
          const column = await response.json();
          createdColumns.push(column);
        }
      } catch (error) {
        console.error(`Erro ao criar coluna "${title}":`, error);
      }
    }

    setColumns(createdColumns);
  };

  // Buscar tasks - VERSÃO MELHORADA
  const fetchTasks = async () => {
    try {
      const res = await authFetch(`${API_BASE}/tasks`);
      if (!res.ok) throw new Error("Erro ao buscar tasks");

      const data = await res.json();
      console.log("📦 Tasks recebidas:", data);

      let tasksArray: Task[] = [];

      if (Array.isArray(data)) {
        tasksArray = data;
      } else if (data && Array.isArray(data.tasks)) {
        tasksArray = data.tasks;
      } else {
        console.warn("Dados de tasks inesperados:", data);
        tasksArray = [];
      }

      // 🔥 VERIFICAR SE AS TASKS TÊM OS ARQUIVOS
      tasksArray.forEach((task) => {
        console.log(
          `Task ${task.id} - Imagens: ${
            task.taskImages?.length || 0
          }, Áudios: ${task.taskAudios?.length || 0}, Vídeos: ${
            task.taskVideos?.length || 0
          }`
        );
      });

      setTasks(tasksArray);
    } catch (error) {
      console.error("Erro ao buscar tasks:", error);
      setTasks([]);
    }
  };

  // 🔥 NOVA FUNÇÃO: Atualizar uma task específica
  const refreshTask = async (taskId: string) => {
    try {
      const response = await authFetch(`${API_BASE}/tasks/${taskId}`);
      if (response.ok) {
        const updatedTask = await response.json();
        setTasks((prev) =>
          prev.map((task) => (task.id === taskId ? updatedTask : task))
        );
        console.log("✅ Task atualizada:", updatedTask);
        return updatedTask;
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar task:", error);
    }
    return null;
  };

  const fetchUsers = async () => {
    if (!user?.company?.id) {
      console.warn("Usuário não autenticado ou sem empresa");
      setUsers([]);
      return;
    }

    try {
      console.log(`🔍 Buscando profissionais da empresa: ${user.company.id}`);

      // 🔥 CORREÇÃO: Use o endpoint correto
      const res = await authFetch(
        `${API_BASE}/auth/professionals/${user.company.id}`
      );

      console.log(
        "📡 Resposta da busca por profissionais:",
        res.status,
        res.statusText
      );

      if (!res.ok) {
        // 🔥 TRATAMENTO ESPECÍFICO POR STATUS
        if (res.status === 404) {
          console.warn("❌ Endpoint não encontrado (404)");
          setUsers([]);
          return;
        }

        if (res.status === 401) {
          console.warn("❌ Não autorizado (401) - token pode ter expirado");
          logout(); // 🔥 FAZ LOGOUT SE NÃO AUTORIZADO
          return;
        }

        const errorText = await res.text();
        console.error(
          `❌ Erro ${res.status} ao buscar profissionais:`,
          errorText
        );

        setUsers([]);
        return;
      }

      const data = await res.json();
      console.log("✅ Profissionais recebidos:", data);

      if (Array.isArray(data)) {
        setUsers(data);
        console.log(`✅ ${data.length} profissionais carregados`);

        // 🔥 DEBUG: Mostrar os profissionais encontrados
        data.forEach((prof, index) => {
          console.log(
            `   ${index + 1}. ${prof.name} (${prof.email}) - ${prof.role}`
          );
        });
      } else {
        console.warn("⚠️ Dados de profissionais inesperados:", data);
        setUsers([]);
      }
    } catch (error) {
      console.error("❌ Erro ao buscar profissionais:", error);
      setUsers([]);
    }
  };

  // 🔥 ATUALIZE a função loadInitialData
  const loadInitialData = async () => {
    if (!user) {
      console.log("⏳ Aguardando usuário...");
      return;
    }

    setLoading(true);
    console.log("🚀 Iniciando carregamento de dados...");
    console.log("👤 Usuário:", user.name, "Empresa:", user.company?.id);
    try {
      console.log("📋 Etapa 1/3: Buscando colunas...");
      await fetchColumns();

      console.log("📋 Etapa 2/3: Buscando tasks...");
      await fetchTasks();

      console.log("📋 Etapa 3/3: Buscando profissionais...");
      await fetchUsers();

      console.log("✅ Todos os dados carregados com sucesso!");
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
      console.log("🏁 Carregamento finalizado");
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadInitialData();
    }
  }, [user, authLoading, router]);

  // Temporizador para gravação
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Mover task entre colunas
  const handleDrop = async (e: React.DragEvent, columnId: string | null) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const previousTasks = [...tasks];

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? ({ ...t, columnId } as Task) : t))
    );

    try {
      await authFetch(`${API_BASE}/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ columnId }),
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setTasks(previousTasks);
    }
  };

  // Salvar coluna
  const saveColumn = async () => {
    if (!colTitle.trim()) return;

    try {
      if (editingCol) {
        await authFetch(`${API_BASE}/kanban-columns/${editingCol.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: colTitle }),
        });
      } else {
        await authFetch(`${API_BASE}/kanban-columns`, {
          method: "POST",
          body: JSON.stringify({ title: colTitle }),
        });
      }

      setIsColumnModal(false);
      setColTitle("");
      setEditingCol(null);
      await fetchColumns();
    } catch (error) {
      console.error("Erro ao salvar coluna:", error);
    }
  };

  // Funções de gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioBlob(audioBlob);
        setTaskAudios([
          new File([audioBlob], "recording.webm", { type: "audio/webm" }),
        ]);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Erro ao acessar o microfone:", error);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  // Criar task - VERSÃO OTIMIZADA
const createTask = async () => {
  if (!taskTitle.trim()) {
    alert("Título da tarefa é obrigatório");
    return;
  }

  setIsSubmitting(true);

  try {
    const formData = new FormData();
    formData.append("title", taskTitle);
    formData.append("description", taskDescription);
    formData.append("priority", taskPriority);
    if (user?.company?.id) formData.append("companyId", user.company.id);
    if (user?.id) formData.append("createdById", user.id);

    if (taskColumn) formData.append("columnId", taskColumn);
    if (taskDueDate) formData.append("dueDate", taskDueDate);
    if (taskAssignedTo) formData.append("assignedToId", taskAssignedTo);

    // 🔥 CORREÇÃO: Usar os nomes de campo que o backend espera
    taskImages.forEach((image) => {
      formData.append("images", image);
    });
    taskAudios.forEach((audio) => {
      formData.append("audios", audio);
    });
    taskVideos.forEach((video) => {
      formData.append("videos", video);
    });

    console.log("📤 Criando nova task...");

    const response = await authFetchWithFiles(
      `${API_BASE}/tasks`,
      formData,
      "POST"
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro response:", errorText);
      throw new Error(`Erro ao criar tarefa: ${errorText}`);
    }

    const newTask = await response.json();
    console.log("✅ Tarefa criada com sucesso:", newTask);

    // 🔥 SOLUÇÃO: Criar uma task otimizada com preview local imediato
    const optimizedTask: Task = {
      ...newTask,
      // 🔥 ADICIONAR PREVIEW LOCAL DAS IMAGENS ENQUANTO O BACKEND PROCESSA
      taskImages: taskImages.length > 0 ? 
        taskImages.map((file, index) => ({
          id: `temp-${Date.now()}-${index}`,
          url: URL.createObjectURL(file), // 🔥 URL LOCAL PARA PREVIEW IMEDIATO
          filename: file.name,
          isTemp: true // 🔥 FLAG PARA IDENTIFICAR QUE É TEMPORÁRIO
        })) : []
    };

    // 🔥 ATUALIZAR A LISTA COM A TASK OTIMIZADA (PREVIEW IMEDIATO)
    setTasks((prev) => [optimizedTask, ...prev]);

    // Resetar o formulário
    resetTaskForm();
    setIsTaskModal(false);

    // 🔥 BUSCAR A VERSÃO COMPLETA DO BACKEND APÓS UM DELAY
    setTimeout(async () => {
      try {
        const completeTaskResponse = await authFetch(
          `${API_BASE}/tasks/${newTask.id}`
        );
        if (completeTaskResponse.ok) {
          const completeTask = await completeTaskResponse.json();
          console.log("📦 Task completa com arquivos:", completeTask);

          // 🔥 SUBSTITUIR A TASK TEMPORÁRIA PELA COMPLETA
          setTasks((prev) => 
            prev.map((task) => 
              task.id === newTask.id ? completeTask : task
            )
          );
        }
      } catch (error) {
        console.error("❌ Erro ao buscar task completa:", error);
      }
    }, 2000); // 🔥 AUMENTEI O DELAY PARA 2 SEGUNDOS

  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    alert("Erro ao criar tarefa. Tente novamente.");
  } finally {
    setIsSubmitting(false);
  }
};

  // Abrir modal de edição
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || "");
    setEditTaskDueDate(
      task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ""
    );
    setEditTaskAssignedTo(task.assignedTo?.id || "");
    setEditTaskColumn(task.columnId || "");
    setEditTaskPriority(task.priority?.toString() || "1");
    setEditTaskImages([]);
    setEditTaskAudios([]);
    setEditTaskVideos([]);
    setIsEditTaskModal(true);
  };

  // 🔥 NOVA FUNÇÃO: Abrir modal de preview
  const openPreviewModal = (task: Task) => {
    setPreviewTask(task);
    setIsPreviewModal(true);
  };

  // Editar tarefa
  const updateTask = async () => {
    if (!editingTask || !editTaskTitle.trim()) {
      alert("Título da tarefa é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData = {
        title: editTaskTitle,
        description: editTaskDescription,
        priority: parseInt(editTaskPriority),
        columnId: editTaskColumn || null,
        dueDate: editTaskDueDate || null,
        assignedToId: editTaskAssignedTo || null,
      };

      console.log("📤 Atualizando task...");

      const response = await authFetch(`${API_BASE}/tasks/${editingTask.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar tarefa");
      }

      const updatedTask = await response.json();

      // Atualizar a lista de tasks
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? updatedTask : t))
      );

      // Fechar modal e resetar
      setIsEditTaskModal(false);
      setEditingTask(null);
      resetEditForm();

      console.log("✅ Tarefa atualizada com sucesso:", updatedTask);
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      alert("Erro ao atualizar tarefa. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deletar tarefa
  const deleteTask = async (taskId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    try {
      const response = await authFetch(`${API_BASE}/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remover da lista local
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        console.log("✅ Tarefa excluída com sucesso");
      } else {
        throw new Error("Erro ao excluir tarefa");
      }
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      alert("Erro ao excluir tarefa. Tente novamente.");
    }
  };

  // Marcar como concluída - VERSÃO CORRIGIDA
  const completeTask = async (taskId: string) => {
    try {
      const response = await authFetch(`${API_BASE}/tasks/${taskId}/complete`, {
        method: "PATCH",
      });

      if (response.ok) {
        // 🔥 USAR A FUNÇÃO DE REFRESH PARA OBTER OS DADOS COMPLETOS
        await refreshTask(taskId);
        console.log("✅ Tarefa marcada como concluída");
      }
    } catch (error) {
      console.error("Erro ao marcar tarefa como concluída:", error);
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
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const resetEditForm = () => {
    setEditTaskTitle("");
    setEditTaskDescription("");
    setEditTaskDueDate("");
    setEditTaskAssignedTo("");
    setEditTaskColumn("");
    setEditTaskPriority("1");
    setEditTaskImages([]);
    setEditTaskAudios([]);
    setEditTaskVideos([]);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  // Deletar coluna
  const deleteColumn = async (id: string) => {
    if (
      !confirm(
        "Excluir coluna? Todas as tasks desta coluna ficarão sem coluna."
      )
    )
      return;
    try {
      await authFetch(`${API_BASE}/kanban-columns/${id}`, { method: "DELETE" });
      await Promise.all([fetchColumns(), fetchTasks()]);
    } catch (error) {
      console.error("Erro ao excluir coluna:", error);
    }
  };

  // Função para formatar a data com hora
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  // Função para verificar se a data está atrasada
  const isOverdue = (dateString: string) => {
    if (!dateString) return false;
    try {
      const dueDate = new Date(dateString);
      const today = new Date();
      return dueDate < today;
    } catch (error) {
      return false;
    }
  };

  // Manipulação de múltiplos arquivos
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false
  ) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    if (isEdit) {
      setEditTaskImages((prev) => [...prev, ...fileArray]);
    } else {
      setTaskImages((prev) => [...prev, ...fileArray]);
    }
  };

  const handleAudioUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false
  ) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    if (isEdit) {
      setEditTaskAudios((prev) => [...prev, ...fileArray]);
    } else {
      setTaskAudios((prev) => [...prev, ...fileArray]);
    }
  };

  const handleVideoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false
  ) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    if (isEdit) {
      setEditTaskVideos((prev) => [...prev, ...fileArray]);
    } else {
      setTaskVideos((prev) => [...prev, ...fileArray]);
    }
  };

  // 🔥 NOVA FUNÇÃO: Obter nome da coluna pelo ID
  const getColumnName = (columnId: string | null | undefined) => {
    if (!columnId) return "Sem coluna";
    const column = columns.find((col) => col.id === columnId);
    return column ? column.title : "Coluna não encontrada";
  };

  // 🔥 NOVA FUNÇÃO: Obter nome do status
  const getStatusName = (status: string) => {
    const statusMap: { [key: string]: string } = {
      PENDING: "Pendente",
      IN_PROGRESS: "Em Progresso",
      COMPLETED: "Concluído",
      FAILED: "Falhou",
    };
    return statusMap[status] || status;
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const safeColumns = Array.isArray(columns) ? columns : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER ROXO */}
      <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">
            KANBAN DE DESENVOLVIMENTO DE PRODUTOS - {user.company?.name}
          </h1>
          <Badge className="bg-white/20">
            {safeColumns.length} coluna{safeColumns.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2 mr-4">
            <User className="w-4 h-4" />
            <span className="text-sm">Olá, {user.name}</span>
          </div>

          <Button
            onClick={() => {
              setEditingCol(null);
              setColTitle("");
              setIsColumnModal(true);
            }}
            variant="secondary"
            className="bg-white/20 hover:bg-white/30"
          >
            <Settings className="w-4 h-4 mr-2" /> Gerenciar Colunas
          </Button>

          <Button
            onClick={() => setIsTaskModal(true)}
            variant="secondary"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
          </Button>

          <Button variant="secondary" className="bg-white/20 hover:bg-white/30">
            <Filter className="w-4 h-4 mr-2" /> FILTRAR
          </Button>

          <Button
            onClick={logout}
            variant="secondary"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando Kanban...</p>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="flex gap-6 p-6 min-w-max">
              {safeColumns.map((col) => (
                <div
                  key={col.id}
                  className="w-80 flex-shrink-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="bg-gray-200 rounded-t-lg px-4 py-3 flex justify-between items-center">
                    <h3 className="font-semibold">{col.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-300 text-gray-700">
                        {tasks.filter((t) => t.columnId === col.id).length}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingCol(col);
                              setColTitle(col.title);
                              setIsColumnModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" /> Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteColumn(col.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
                    {tasks
                      .filter((t) => t.columnId === col.id)
                      .map((task) => (
                        <Card
                          key={task.id}
                          draggable
                          onDragStart={(e) =>
                            e.dataTransfer.setData("taskId", task.id)
                          }
                          className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow"
                        >
                          <CardContent className="p-3">
                            {/* Menu de opções da task */}
                            <div className="flex justify-end mb-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() => openPreviewModal(task)}
                                  >
                                    <Eye className="w-4 h-4 mr-2" /> Visualizar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openEditModal(task)}
                                  >
                                    <Edit className="w-4 h-4 mr-2" /> Editar
                                  </DropdownMenuItem>
                                  {task.status !== "COMPLETED" && (
                                    <DropdownMenuItem
                                      onClick={() => completeTask(task.id)}
                                    >
                                      <Square className="w-4 h-4 mr-2" />{" "}
                                      Concluir
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => deleteTask(task.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      await refreshTask(task.id);
                                    }}
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />{" "}
                                    Recarregar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {task.taskImages && task.taskImages.length > 0 ? (
                              <div className="mb-3">
                                {task.taskImages.slice(0, 1).map((image) => (
                                  <div key={image.id} className="relative">
                                    <img
                                      src={image.url}
                                      alt={image.filename}
                                      className="w-full h-48 object-cover rounded-md cursor-pointer"
                                      onClick={() => openPreviewModal(task)}
                                      onError={(e) => {
                                        // 🔥 TRATAR ERRO DE CARREGAMENTO DE IMAGEM
                                        console.error(
                                          `Erro ao carregar imagem: ${image.url}`
                                        );
                                        e.currentTarget.src =
                                          "/placeholder-image.jpg"; // Imagem fallback
                                      }}
                                    />
                                    {/* 🔥 INDICADOR DE MÍDIA CARREGADA */}
                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                      {task.taskImages.length} imagem
                                      {task.taskImages.length > 1 ? "ns" : ""}
                                    </div>
                                  </div>
                                ))}
                                {task.taskImages.length > 1 && (
                                  <div className="text-center text-sm text-gray-500 mt-2">
                                    +{task.taskImages.length - 1} imagem(ns)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className="bg-gray-200 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400 cursor-pointer"
                                onClick={() => openPreviewModal(task)}
                              >
                                <ImageIcon className="w-8 h-8 mr-2" />
                                Sem imagem
                              </div>
                            )}

                            <div className="flex justify-between items-start mb-2">
                              <h4
                                className="font-semibold text-lg flex-1 mr-2 cursor-pointer hover:text-purple-600"
                                onClick={() => openPreviewModal(task)}
                              >
                                {task.title}
                              </h4>
                              <Badge
                                variant={
                                  task.priority === 1
                                    ? "secondary"
                                    : task.priority === 2
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                Prio: {task.priority}
                              </Badge>
                            </div>

                            {task.description && (
                              <p
                                className="text-sm text-gray-600 mb-3 line-clamp-2 cursor-pointer"
                                onClick={() => openPreviewModal(task)}
                              >
                                {task.description}
                              </p>
                            )}

                            {/* DATA E HORA DE VENCIMENTO */}
                            {task.dueDate && (
                              <div className="mb-3">
                                <div className="flex items-center space-x-1 text-sm">
                                  <Clock className="w-3 h-3 text-gray-500" />
                                  <span
                                    className={`font-medium ${
                                      isOverdue(task.dueDate)
                                        ? "text-red-600"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {formatDateTime(task.dueDate)}
                                  </span>
                                  {isOverdue(task.dueDate) && (
                                    <Badge
                                      variant="destructive"
                                      className="ml-2 text-xs"
                                    >
                                      Atrasado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Mostrar áudios */}
                            {task.taskAudios && task.taskAudios.length > 0 && (
                              <div className="mb-3">
                                {task.taskAudios.slice(0, 1).map((audio) => (
                                  <audio
                                    key={audio.id}
                                    controls
                                    src={audio.url}
                                    className="w-full h-8"
                                  >
                                    Seu navegador não suporta o elemento de
                                    áudio.
                                  </audio>
                                ))}
                              </div>
                            )}

                            <div className="flex justify-between items-center">
                              <Badge
                                variant={
                                  task.status === "COMPLETED"
                                    ? "default"
                                    : task.status === "IN_PROGRESS"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {task.status === "COMPLETED"
                                  ? "Concluído"
                                  : task.status === "IN_PROGRESS"
                                  ? "Em Progresso"
                                  : "Pendente"}
                              </Badge>
                              {task.assignedTo && (
                                <div className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full">
                                  <User className="w-3 h-3 text-purple-600" />
                                  <span className="text-xs font-medium text-purple-700">
                                    {task.assignedTo.name}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Criador da task */}
                            {task.createdBy && (
                              <div className="mt-2 text-xs text-gray-500">
                                Criado por: {task.createdBy.name}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              ))}

              {/* MENSAGEM QUANDO NÃO HÁ COLUNAS */}
              {safeColumns.length === 0 && (
                <div className="w-80 flex-shrink-0">
                  <div className="bg-gray-200 rounded-t-lg px-4 py-3">
                    <h3 className="font-semibold text-gray-600">
                      Nenhuma coluna criada
                    </h3>
                  </div>
                  <div className="bg-gray-100 rounded-b-lg p-4 min-h-[600px] flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-2">Nenhuma coluna criada ainda</p>
                      <Button
                        onClick={() => {
                          setEditingCol(null);
                          setColTitle("");
                          setIsColumnModal(true);
                        }}
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Criar Primeira Coluna
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE PREVIEW COMPLETO */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Tarefa - Detalhes Completos</DialogTitle>
            <DialogDescription>
              Visualização completa de todos os dados da tarefa
            </DialogDescription>
          </DialogHeader>
          {previewTask && (
            <div className="space-y-6">
              {/* CABEÇALHO COM INFORMAÇÕES PRINCIPAIS */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {previewTask.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        previewTask.priority === 1
                          ? "destructive"
                          : previewTask.priority === 2
                          ? "default"
                          : "secondary"
                      }
                    >
                      Prioridade: {previewTask.priority}
                    </Badge>
                    <Badge
                      variant={
                        previewTask.status === "COMPLETED"
                          ? "default"
                          : previewTask.status === "IN_PROGRESS"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {getStatusName(previewTask.status)}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Coluna: {getColumnName(previewTask.columnId)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Criado em:</span>
                    <span className="text-sm font-medium">
                      {formatDateTime(previewTask.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Atualizado em:
                    </span>
                    <span className="text-sm font-medium">
                      {formatDateTime(previewTask.updatedAt)}
                    </span>
                  </div>
                  {previewTask.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Vencimento:</span>
                      <span
                        className={`text-sm font-medium ${
                          isOverdue(previewTask.dueDate)
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {formatDateTime(previewTask.dueDate)}
                        {isOverdue(previewTask.dueDate) && (
                          <Badge variant="destructive" className="ml-2">
                            Atrasado
                          </Badge>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* DESCRIÇÃO */}
              {previewTask.description && (
                <div>
                  <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Descrição
                  </h4>
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {previewTask.description}
                    </p>
                  </div>
                </div>
              )}

              {/* RESPONSÁVEIS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Responsável
                  </h4>
                  <div className="bg-white p-3 rounded-lg border">
                    {previewTask.assignedTo ? (
                      <div>
                        <p className="font-medium">
                          {previewTask.assignedTo.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {previewTask.assignedTo.email}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500">
                        Nenhum responsável atribuído
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Criador
                  </h4>
                  <div className="bg-white p-3 rounded-lg border">
                    {previewTask.createdBy ? (
                      <div>
                        <p className="font-medium">
                          {previewTask.createdBy.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {previewTask.createdBy.email}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500">Informação não disponível</p>
                    )}
                  </div>
                </div>
              </div>

              {/* IMAGENS */}
              {previewTask.taskImages && previewTask.taskImages.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Imagens ({previewTask.taskImages.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previewTask.taskImages.map((image, index) => (
                      <div
                        key={image.id}
                        className="bg-white rounded-lg border overflow-hidden"
                      >
                        <img
                          src={image.url}
                          alt={image.filename}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-2">
                          <p className="text-sm text-gray-600 truncate">
                            {image.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            Imagem {index + 1}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ÁUDIOS */}
              {previewTask.taskAudios && previewTask.taskAudios.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Áudios ({previewTask.taskAudios.length})
                  </h4>
                  <div className="space-y-3">
                    {previewTask.taskAudios.map((audio, index) => (
                      <div
                        key={audio.id}
                        className="bg-white p-4 rounded-lg border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{audio.filename}</p>
                            <p className="text-sm text-gray-600">
                              Áudio {index + 1}
                            </p>
                          </div>
                        </div>
                        <audio controls src={audio.url} className="w-full">
                          Seu navegador não suporta o elemento de áudio.
                        </audio>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VÍDEOS */}
              {previewTask.taskVideos && previewTask.taskVideos.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Vídeos ({previewTask.taskVideos.length})
                  </h4>
                  <div className="space-y-4">
                    {previewTask.taskVideos.map((video, index) => (
                      <div
                        key={video.id}
                        className="bg-white p-4 rounded-lg border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{video.filename}</p>
                            <p className="text-sm text-gray-600">
                              Vídeo {index + 1}
                            </p>
                          </div>
                        </div>
                        <video
                          controls
                          src={video.url}
                          className="w-full rounded-lg"
                          poster="/video-poster.jpg"
                        >
                          Seu navegador não suporta o elemento de vídeo.
                        </video>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MENSAGEM QUANDO NÃO HÁ MÍDIA */}
              {(!previewTask.taskImages ||
                previewTask.taskImages.length === 0) &&
                (!previewTask.taskAudios ||
                  previewTask.taskAudios.length === 0) &&
                (!previewTask.taskVideos ||
                  previewTask.taskVideos.length === 0) && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">
                      Nenhuma mídia anexada a esta tarefa
                    </p>
                  </div>
                )}

              {/* BOTÕES DE AÇÃO */}
              <div className="flex justify-end gap-3 pt-4 border-t">
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
                  <Edit className="w-4 h-4 mr-2" /> Editar Tarefa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAIS EXISTENTES (Column, Create Task, Edit Task) */}
      <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCol ? "Editar" : "Nova"} Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="column-title">Título</Label>
              <Input
                id="column-title"
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                placeholder="Digite o título da coluna"
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveColumn();
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsColumnModal(false)}>
                Cancelar
              </Button>
              <Button onClick={saveColumn}>
                {editingCol ? "Atualizar" : "Criar"} Coluna
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTaskModal} onOpenChange={setIsTaskModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Tarefa</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da nova tarefa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* TÍTULO */}
            <div>
              <Label htmlFor="new-title">Título *</Label>
              <Input
                id="new-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Digite o título da tarefa"
              />
            </div>

            {/* DESCRIÇÃO */}
            <div>
              <Label htmlFor="new-description">Descrição</Label>
              <Textarea
                id="new-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Descreva a tarefa..."
                rows={4}
              />
            </div>

            {/* PRIORIDADE E COLUNA */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridade</Label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md mt-1"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option value="1">1 - Alta (vermelha)</option>
                  <option value="2">2 - Média (amarela)</option>
                  <option value="3">3 - Baixa (cinza)</option>
                </select>
              </div>

              <div>
                <Label>Coluna</Label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md mt-1"
                  value={taskColumn}
                  onChange={(e) => setTaskColumn(e.target.value)}
                >
                  <option value="">Nenhuma coluna</option>
                  {safeColumns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DATA/HORA E RESPONSÁVEL */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-dueDate">Data e Hora de Vencimento</Label>
                <Input
                  id="new-dueDate"
                  type="datetime-local"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="new-assignedTo">Responsável</Label>
                <select
                  id="new-assignedTo"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={taskAssignedTo}
                  onChange={(e) => setTaskAssignedTo(e.target.value)}
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

            {/* 🔥 IMAGENS - USANDO handleImageUpload */}
            <div>
              <Label htmlFor="new-images">Imagens (múltiplas)</Label>
              <Input
                id="new-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(e)}
                className="mt-1"
              />
              {taskImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {taskImages.map((file, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        className="h-24 w-24 object-cover rounded border"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition"
                        onClick={() =>
                          setTaskImages((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                      >
                        X
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🔥 ÁUDIO COM GRAVAÇÃO - USANDO handleAudioUpload */}
            <div>
              <Label>Áudio</Label>

              {/* Botão de gravação */}
              <div className="flex items-center gap-4 my-3">
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <Square className="w-4 h-4 mr-2" />
                  ) : (
                    <Mic className="w-4 h-4 mr-2" />
                  )}
                  {isRecording ? "Parar Gravação" : "Gravar Áudio"}
                </Button>

                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="font-mono text-lg">
                      {String(Math.floor(recordingTime / 60)).padStart(2, "0")}:
                      {String(recordingTime % 60).padStart(2, "0")}
                    </span>
                  </div>
                )}
              </div>

              {/* Preview da gravação */}
              {audioBlob && (
                <div className="mb-3">
                  <audio
                    controls
                    src={URL.createObjectURL(audioBlob)}
                    className="w-full"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 text-red-600"
                    onClick={() => {
                      setAudioBlob(null);
                      setTaskAudios([]);
                    }}
                  >
                    Remover gravação
                  </Button>
                </div>
              )}

              {/* Upload manual de áudio - AGORA USANDO handleAudioUpload */}
              <div className="mt-2">
                <Label htmlFor="new-audios">
                  Ou faça upload de arquivos de áudio
                </Label>
                <Input
                  id="new-audios"
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) => handleAudioUpload(e)}
                  className="mt-1"
                />
                {taskAudios.length > 0 && !audioBlob && (
                  <div className="mt-2 space-y-1">
                    {taskAudios.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-gray-100 p-2 rounded text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setTaskAudios((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 🔥 VÍDEOS - USANDO handleVideoUpload */}
            <div>
              <Label htmlFor="new-videos">Vídeos (opcional)</Label>
              <Input
                id="new-videos"
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => handleVideoUpload(e)}
                className="mt-1"
              />
              {taskVideos.length > 0 && (
                <div className="mt-2 space-y-2">
                  {taskVideos.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-100 p-2 rounded text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setTaskVideos((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                      >
                        X
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÕES */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsTaskModal(false);
                  resetTaskForm();
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={createTask}
                disabled={isSubmitting || !taskTitle.trim()}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Criando tarefa...
                  </>
                ) : (
                  <>Criar Tarefa</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR TAREFA (mantido igual) */}
      <Dialog open={isEditTaskModal} onOpenChange={setIsEditTaskModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>Edite os detalhes da tarefa</DialogDescription>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-5">
              {/* TÍTULO */}
              <div>
                <Label htmlFor="edit-title">Título *</Label>
                <Input
                  id="edit-title"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  placeholder="Digite o título da tarefa"
                />
              </div>

              {/* DESCRIÇÃO */}
              <div>
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  placeholder="Descreva a tarefa..."
                  rows={4}
                />
              </div>

              {/* PRIORIDADE E COLUNA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prioridade</Label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md mt-1"
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value)}
                  >
                    <option value="1">1 - Alta (vermelha)</option>
                    <option value="2">2 - Média (amarela)</option>
                    <option value="3">3 - Baixa (cinza)</option>
                  </select>
                </div>

                <div>
                  <Label>Coluna</Label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md mt-1"
                    value={editTaskColumn}
                    onChange={(e) => setEditTaskColumn(e.target.value)}
                  >
                    <option value="">Nenhuma coluna</option>
                    {safeColumns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DATA/HORA E RESPONSÁVEL */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-dueDate">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Data e Hora de Vencimento
                  </Label>
                  <Input
                    id="edit-dueDate"
                    type="datetime-local"
                    value={editTaskDueDate}
                    onChange={(e) => setEditTaskDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-assignedTo">
                    <User className="w-4 h-4 inline mr-2" />
                    Responsável
                  </Label>
                  <select
                    id="edit-assignedTo"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={editTaskAssignedTo}
                    onChange={(e) => setEditTaskAssignedTo(e.target.value)}
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

              {/* IMAGENS ATUAIS */}
              {editingTask.taskImages.length > 0 && (
                <div>
                  <Label>
                    Imagens atuais ({editingTask.taskImages.length})
                  </Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {editingTask.taskImages.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.url}
                          alt={img.filename}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded flex items-center justify-center">
                          <Badge variant="secondary">Atual</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NOVAS IMAGENS */}
              {/* NOVAS IMAGENS */}
              <div>
                <Label htmlFor="edit-images">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Adicionar/Substituir imagens
                </Label>
                <Input
                  id="edit-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e, true)}
                  className="mt-1"
                />
                {editTaskImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editTaskImages.map((file, i) => (
                      <div key={i} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="preview"
                          className="h-20 rounded border"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-0 right-0 h-6 w-6 rounded-full"
                          onClick={() =>
                            setEditTaskImages((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload manual de áudio no EDITAR */}
              <Input
                id="edit-audios"
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => handleAudioUpload(e, true)}
              />

              {/* VÍDEOS no EDITAR */}
              <div>
                <Label htmlFor="edit-videos">Vídeos (opcional)</Label>
                <Input
                  id="edit-videos"
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => handleVideoUpload(e, true)}
                  className="mt-1"
                />
                {editTaskVideos.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {editTaskVideos.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-gray-100 p-2 rounded"
                      >
                        <span className="text-sm">{file.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setEditTaskVideos((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ÁUDIOS ATUAIS */}
              {editingTask.taskAudios.length > 0 && (
                <div>
                  <Label>Áudios atuais ({editingTask.taskAudios.length})</Label>
                  <div className="space-y-2 mt-2">
                    {editingTask.taskAudios.map((audio) => (
                      <audio
                        key={audio.id}
                        controls
                        src={audio.url}
                        className="w-full h-9"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* NOVO NOVO */}
              <div>
                <Label htmlFor="edit-audios">
                  <Mic className="w-4 h-4 inline mr-2" />
                  Adicionar/Substituir áudio
                </Label>

                {/* Gravação */}
                <div className="flex items-center gap-3 my-3">
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? (
                      <Square className="w-4 h-4 mr-2" />
                    ) : (
                      <Mic className="w-4 h-4 mr-2" />
                    )}
                    {isRecording ? "Parar gravação" : "Gravar áudio"}
                  </Button>
                  {isRecording && (
                    <span className="font-mono text-sm">
                      {String(Math.floor(recordingTime / 60)).padStart(2, "0")}:
                      {String(recordingTime % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>

                {audioBlob && (
                  <audio
                    controls
                    src={URL.createObjectURL(audioBlob)}
                    className="w-full mb-2"
                  />
                )}

                {/* Upload manual */}
                <Input
                  id="edit-audios"
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) =>
                    e.target.files && setEditTaskAudios([...e.target.files])
                  }
                />
                {editTaskAudios.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {editTaskAudios.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-gray-100 p-2 rounded"
                      >
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setEditTaskAudios((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* VÍDEOS */}
              <div>
                <Label htmlFor="edit-videos">Vídeos (opcional)</Label>
                <Input
                  id="edit-videos"
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) =>
                    e.target.files && setEditTaskVideos([...e.target.files])
                  }
                  className="mt-1"
                />
                {editTaskVideos.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {editTaskVideos.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-gray-100 p-2 rounded"
                      >
                        <span className="text-sm">{file.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setEditTaskVideos((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BOTÕES */}
              <div className="flex justify-end gap-3 pt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditTaskModal(false);
                    setEditingTask(null);
                    resetEditForm();
                  }}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={updateTask}
                  disabled={isSubmitting || !editTaskTitle.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" /> Atualizar Tarefa
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

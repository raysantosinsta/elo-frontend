/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

// VERSAO COM COLUMN.MAP CORRIGIDDO
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
} from "lucide-react";

const API_BASE = "http://localhost:3002";

interface Professional {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  code?: string;
  imageUrl?: string;
  audioUrl?: string;
  fichaTecnica?: boolean;
  assignedTo?: Professional;
  statusId?: string | null;
  description?: string;
  dueDate?: string;
}

interface Column {
  id: string;
  title: string;
}

export default function ProductKanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isColumnModal, setIsColumnModal] = useState(false);
  const [isTaskModal, setIsTaskModal] = useState(false);
  const [isEditTaskModal, setIsEditTaskModal] = useState(false);
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [colTitle, setColTitle] = useState("");

  // Estados para o formulário de tarefa
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [taskImage, setTaskImage] = useState<File | null>(null);
  const [taskAudio, setTaskAudio] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para edição de tarefa
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskAssignedTo, setEditTaskAssignedTo] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState("");
  const [editTaskImage, setEditTaskImage] = useState<File | null>(null);
  const [editTaskAudio, setEditTaskAudio] = useState<File | null>(null);

  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);

  // 🔥 CORREÇÃO: Função para garantir que columns seja sempre um array
  const fetchColumns = async () => {
    try {
      const res = await fetch(`${API_BASE}/kanban-columns`);
      const data = await res.json();

      // 🔥 GARANTIR que data seja um array
      if (Array.isArray(data)) {
        setColumns(data);
      } else if (data && Array.isArray(data.columns)) {
        setColumns(data.columns);
      } else if (data && typeof data === 'object') {
        // Se for um objeto, tentar extrair um array
        const possibleArray = Object.values(data).find(val => Array.isArray(val));
        setColumns(possibleArray || []);
      } else {
        console.warn('Dados de colunas inesperados:', data);
        setColumns([]);
      }
    } catch (error) {
      console.error('Erro ao buscar colunas:', error);
      setColumns([]); // 🔥 Garantir array vazio em caso de erro
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      const data = await res.json();

      // 🔥 CORREÇÃO: Garantir que tasks seja sempre um array
      if (Array.isArray(data)) {
        setTasks(data);
      } else if (data && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      } else {
        console.warn('Dados de tasks inesperados:', data);
        setTasks([]);
      }
    } catch (error) {
      console.error('Erro ao buscar tasks:', error);
      setTasks([]);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const res = await fetch(`${API_BASE}/professionals`);
      const data = await res.json();

      // 🔥 CORREÇÃO: Garantir que professionals seja sempre um array
      if (Array.isArray(data)) {
        setProfessionals(data);
      } else {
        console.warn('Dados de profissionais inesperados:', data);
        setProfessionals([]);
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      setProfessionals([]);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchColumns(), fetchTasks(), fetchProfessionals()]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

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

  const handleDrop = async (e: React.DragEvent, statusId: string | null) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, statusId } : t
    ));

    try {
      await fetch(`${API_BASE}/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusId }),
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setTasks(previousTasks);
    }
  };

  const saveColumn = async () => {
    if (!colTitle.trim()) return;

    try {
      if (editingCol) {
        await fetch(`${API_BASE}/kanban-columns/${editingCol.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: colTitle }),
        });
      } else {
        await fetch(`${API_BASE}/kanban-columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: colTitle }),
        });
      }

      setIsColumnModal(false);
      setColTitle("");
      setEditingCol(null);
      await fetchColumns();
    } catch (error) {
      console.error('Erro ao salvar coluna:', error);
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
        setTaskAudio(new File([audioBlob], "recording.webm", { type: "audio/webm" }));
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
      formData.append("statusId", taskStatus || "");

      if (taskDueDate) formData.append("dueDate", taskDueDate);
      if (taskAssignedTo) formData.append("assignedToId", taskAssignedTo);

      // Adicionar arquivos
      if (taskImage) {
        formData.append("files", taskImage);
      }
      if (taskAudio) {
        formData.append("files", taskAudio);
      }

      console.log('📤 Criando nova task com arquivos...');

      const response = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao criar tarefa");
      }

      const newTask = await response.json();

      // Atualizar a lista de tasks
      setTasks(prev => [newTask, ...prev]);

      // Resetar o formulário
      resetTaskForm();
      setIsTaskModal(false);

      console.log("✅ Tarefa criada com sucesso:", newTask);
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      alert("Erro ao criar tarefa. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para abrir modal de edição
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || "");
    setEditTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
    setEditTaskAssignedTo(task.assignedTo?.id || "");
    setEditTaskStatus(task.statusId || "");
    setEditTaskImage(null);
    setEditTaskAudio(null);
    setIsEditTaskModal(true);
  };

  // Função para editar tarefa
  const updateTask = async () => {
    if (!editingTask || !editTaskTitle.trim()) {
      alert("Título da tarefa é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", editTaskTitle);
      formData.append("description", editTaskDescription);
      formData.append("statusId", editTaskStatus || "");

      if (editTaskDueDate) formData.append("dueDate", editTaskDueDate);
      if (editTaskAssignedTo) formData.append("assignedToId", editTaskAssignedTo);

      // Adicionar novos arquivos (se houver)
      if (editTaskImage) {
        formData.append("files", editTaskImage);
      }
      if (editTaskAudio) {
        formData.append("files", editTaskAudio);
      }

      console.log('📤 Atualizando task...');

      const response = await fetch(`${API_BASE}/tasks/${editingTask.id}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar tarefa");
      }

      const updatedTask = await response.json();

      // Atualizar a lista de tasks
      setTasks(prev => prev.map(t =>
        t.id === editingTask.id ? updatedTask : t
      ));

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

  // Função para deletar tarefa
  const deleteTask = async (taskId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remover da lista local
        setTasks(prev => prev.filter(t => t.id !== taskId));
        console.log("✅ Tarefa excluída com sucesso");
      } else {
        throw new Error("Erro ao excluir tarefa");
      }
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      alert("Erro ao excluir tarefa. Tente novamente.");
    }
  };

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskAssignedTo("");
    setTaskStatus("");
    setTaskImage(null);
    setTaskAudio(null);
    setAudioBlob(null);
    setRecordingTime(0);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const resetEditForm = () => {
    setEditTaskTitle("");
    setEditTaskDescription("");
    setEditTaskDueDate("");
    setEditTaskAssignedTo("");
    setEditTaskStatus("");
    setEditTaskImage(null);
    setEditTaskAudio(null);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const deleteColumn = async (id: string) => {
    if (!confirm("Excluir coluna? Todas as tasks desta coluna ficarão sem coluna.")) return;
    try {
      await fetch(`${API_BASE}/kanban-columns/${id}`, { method: "DELETE" });
      await Promise.all([fetchColumns(), fetchTasks()]);
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
    }
  };

  // Função para formatar a data com hora
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

  // 🔥 CORREÇÃO: Verificar se columns é um array antes de renderizar
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  // 🔥 CORREÇÃO: Garantir que columns seja um array
  const safeColumns = Array.isArray(columns) ? columns : [];

  return (
    <div className="p-6">
      <div className="min-h-screen bg-gray-50">
        {/* HEADER ROXO */}
        <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">KANBAN DE DESENVOLVIMENTO DE PRODUTOS MARCA</h1>
            <Badge className="bg-white/20">
              {safeColumns.length} coluna{safeColumns.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex gap-3">
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

            {/* BOTÃO NOVO - CRIAR TAREFA */}
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
          </div>
        </div>

        {/* CONTAINER PRINCIPAL COM SCROLL HORIZONTAL */}
        <div className="w-full overflow-x-auto">
          <div className="flex gap-6 p-6 min-w-max">
            {/* 🔥 CORREÇÃO: Usar safeColumns em vez de columns */}
            {safeColumns.map(col => (
              <div
                key={col.id}
                className="w-80 flex-shrink-0"
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, col.id)}
              >
                <div className="bg-gray-200 rounded-t-lg px-4 py-3 flex justify-between items-center">
                  <h3 className="font-semibold">{col.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gray-300 text-gray-700">
                      {tasks.filter(t => t.statusId === col.id).length}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
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
                    .filter(t => t.statusId === col.id)
                    .map(task => (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
                        className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow"
                      >
                        <CardContent className="p-3">
                          {/* Menu de opções da task */}
                          <div className="flex justify-end mb-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() => openEditModal(task)}
                                >
                                  <Edit className="w-4 h-4 mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {task.imageUrl ? (
                            <img
                              src={task.imageUrl}
                              alt={task.title}
                              className="w-full h-48 object-cover rounded-md mb-3"
                            />
                          ) : (
                            <div className="bg-gray-200 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400">
                              Sem imagem
                            </div>
                          )}

                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-lg flex-1 mr-2">{task.title}</h4>
                            <span className="text-sm text-gray-500 shrink-0">#{task.code || task.id.slice(0, 4).toUpperCase()}</span>
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* DATA E HORA DE VENCIMENTO */}
                          {task.dueDate && (
                            <div className="mb-3">
                              <div className="flex items-center space-x-1 text-sm">
                                <Clock className="w-3 h-3 text-gray-500" />
                                <span className={`font-medium ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-700'
                                  }`}>
                                  {formatDateTime(task.dueDate)}
                                </span>
                                {isOverdue(task.dueDate) && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Atrasado
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {task.audioUrl && (
                            <div className="mb-3">
                              <audio
                                controls
                                src={task.audioUrl}
                                className="w-full h-8"
                              >
                                Seu navegador não suporta o elemento de áudio.
                              </audio>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <Badge variant={task.fichaTecnica ? "default" : "secondary"}>
                              Ficha Técnica
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
                  <h3 className="font-semibold text-gray-600">Nenhuma coluna criada</h3>
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

        {/* MODAL CRIAR COLUNA */}
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
                  onChange={e => setColTitle(e.target.value)}
                  placeholder="Digite o título da coluna"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveColumn();
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsColumnModal(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={saveColumn}>
                  {editingCol ? "Atualizar" : "Criar"} Coluna
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL CRIAR TAREFA */}
        <Dialog open={isTaskModal} onOpenChange={setIsTaskModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
              <DialogDescription>
                Preencha os detalhes da nova tarefa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Título *</Label>
                <Input
                  id="task-title"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Digite o título da tarefa"
                />
              </div>

              <div>
                <Label htmlFor="task-description">Descrição</Label>
                <Textarea
                  id="task-description"
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="Descreva a tarefa..."
                  rows={3}
                />
              </div>

              {/* UPLOAD DE IMAGEM */}
              <div>
                <Label htmlFor="task-image">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Imagem
                </Label>
                <Input
                  id="task-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setTaskImage(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {taskImage && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {taskImage.name}
                  </p>
                )}
              </div>

              {/* GRAVAÇÃO DE ÁUDIO */}
              <div>
                <Label>
                  <Mic className="w-4 h-4 inline mr-2" />
                  Gravação de Áudio
                </Label>
                <div className="flex items-center space-x-3 mt-2">
                  <Button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                  >
                    {isRecording ? <Square className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
                    {isRecording ? "Parar" : "Gravar"}
                  </Button>

                  {isRecording && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600 font-mono">
                        {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  )}
                </div>

                {audioBlob && (
                  <div className="mt-3">
                    <audio
                      controls
                      className="w-full h-8"
                      src={URL.createObjectURL(audioBlob)}
                    >
                      Seu navegador não suporta o elemento de áudio.
                    </audio>
                  </div>
                )}

                {/* UPLOAD DE ÁUDIO (alternativo) */}
                <div className="mt-3">
                  <Label htmlFor="task-audio">Ou faça upload de um arquivo de áudio</Label>
                  <Input
                    id="task-audio"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setTaskAudio(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                  {taskAudio && !audioBlob && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ {taskAudio.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task-dueDate">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Data e Hora de Vencimento
                  </Label>
                  <Input
                    id="task-dueDate"
                    type="datetime-local"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="task-assignedTo">
                    <User className="w-4 h-4 inline mr-2" />
                    Responsável
                  </Label>
                  <select
                    id="task-assignedTo"
                    value={taskAssignedTo}
                    onChange={e => setTaskAssignedTo(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecione um responsável</option>
                    {professionals.map(professional => (
                      <option key={professional.id} value={professional.id}>
                        {professional.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="task-status">Coluna</Label>
                <select
                  id="task-status"
                  value={taskStatus}
                  onChange={e => setTaskStatus(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Nenhuma coluna</option>
                  {safeColumns.map(column => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
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
                  disabled={!taskTitle.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" /> Criar Tarefa
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL EDITAR TAREFA */}
        <Dialog open={isEditTaskModal} onOpenChange={setIsEditTaskModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Tarefa</DialogTitle>
              <DialogDescription>
                Edite os detalhes da tarefa
              </DialogDescription>
            </DialogHeader>
            {editingTask && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-task-title">Título *</Label>
                  <Input
                    id="edit-task-title"
                    value={editTaskTitle}
                    onChange={e => setEditTaskTitle(e.target.value)}
                    placeholder="Digite o título da tarefa"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-task-description">Descrição</Label>
                  <Textarea
                    id="edit-task-description"
                    value={editTaskDescription}
                    onChange={e => setEditTaskDescription(e.target.value)}
                    placeholder="Descreva a tarefa..."
                    rows={3}
                  />
                </div>

                {/* PREVIEW DA IMAGEM ATUAL */}
                {editingTask.imageUrl && (
                  <div>
                    <Label>Imagem Atual</Label>
                    <div className="mt-2 relative">
                      <img
                        src={editingTask.imageUrl}
                        alt="Imagem atual"
                        className="w-full h-48 object-cover rounded-md border"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary">Atual</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* UPLOAD DE NOVA IMAGEM */}
                <div>
                  <Label htmlFor="edit-task-image">
                    <Upload className="w-4 h-4 inline mr-2" />
                    {editingTask.imageUrl ? "Substituir Imagem" : "Adicionar Imagem"}
                  </Label>
                  <Input
                    id="edit-task-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditTaskImage(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                  {editTaskImage && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Nova imagem selecionada: {editTaskImage.name}
                    </p>
                  )}
                </div>

                {/* PREVIEW DO ÁUDIO ATUAL */}
                {editingTask.audioUrl && (
                  <div>
                    <Label>Áudio Atual</Label>
                    <div className="mt-2">
                      <audio
                        controls
                        src={editingTask.audioUrl}
                        className="w-full h-8"
                      >
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                      <div className="mt-1">
                        <Badge variant="secondary">Atual</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* UPLOAD DE NOVO ÁUDIO */}
                <div>
                  <Label>
                    <Mic className="w-4 h-4 inline mr-2" />
                    {editingTask.audioUrl ? "Substituir Áudio" : "Adicionar Áudio"}
                  </Label>

                  {/* UPLOAD DE ÁUDIO (alternativo) */}
                  <div className="mt-3">
                    <Label htmlFor="edit-task-audio">Fazer upload de um arquivo de áudio</Label>
                    <Input
                      id="edit-task-audio"
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setEditTaskAudio(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                    {editTaskAudio && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Novo áudio selecionado: {editTaskAudio.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-task-dueDate">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Data e Hora de Vencimento
                    </Label>
                    <Input
                      id="edit-task-dueDate"
                      type="datetime-local"
                      value={editTaskDueDate}
                      onChange={e => setEditTaskDueDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-task-assignedTo">
                      <User className="w-4 h-4 inline mr-2" />
                      Responsável
                    </Label>
                    <select
                      id="edit-task-assignedTo"
                      value={editTaskAssignedTo}
                      onChange={e => setEditTaskAssignedTo(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Selecione um responsável</option>
                      {professionals.map(professional => (
                        <option key={professional.id} value={professional.id}>
                          {professional.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-task-status">Coluna</Label>
                  <select
                    id="edit-task-status"
                    value={editTaskStatus}
                    onChange={e => setEditTaskStatus(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Nenhuma coluna</option>
                    {safeColumns.map(column => (
                      <option key={column.id} value={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-4">
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
                    disabled={!editTaskTitle.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
    </div>
  );
}
/* eslint-disable prefer-const */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/error-context";
import { api } from "@/services/api";
import {
  Filter,
  Flag,
  Layout,
  MapPin,
  Menu,
  Paperclip,
  Plus,
  RefreshCw,
  Settings,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Componentes do Kanban
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { TaskFormModal } from "@/components/modals/task-form-modal";
import { useKanbanDrag } from "@/hooks/use-kanban-drag";

// Interfaces
interface Professional { id: string; name: string; email: string; role?: string; }
interface TaskImage { id: string; url: string; filename: string; size?: number; }
interface TaskAddress { id: string; cep: string; endereco: string; numero: string; bairro: string; cidade: string; estado: string; complemento?: string; latitude?: number; longitude?: number; }
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
  userAssigned?: Professional;
  createdBy?: Professional;
  taskAddress?: TaskAddress | null;
  taskImages: TaskImage[];
  taskAudios: any[];
  taskVideos: any[];
  createdAt: string;
  updatedAt: string;
}
interface Column { id: string; title: string; order: number; tasks: Task[]; status?: "PENDING" | "FINISHED"; }

// Utils
const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const formatDateShort = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
const isOverdue = (d: string) => new Date(d) < new Date();
const getPriorityColor = (p: number) => { if (p === 1) return "#E74C3C"; if (p === 2) return "#F1C40F"; return "#27AE60"; };

export default function ProductKanban() {
  const { user, loading: authLoading } = useAuth();
  const { showError } = useError();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isColumnModal, setIsColumnModal] = useState(false);
  const [isTaskModal, setIsTaskModal] = useState(false);
  const [isEditTaskModal, setIsEditTaskModal] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);

  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [colTitle, setColTitle] = useState("");
  const [itemToDelete, setItemToDelete] = useState<{ type: "column" | "task"; id: string; } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("all");
  const [filterHasLocation, setFilterHasLocation] = useState(false);

  // Hook de Drag & Drop – só pegamos o que usamos
  const { moveItem, onDragStart: handleDragStart } = useKanbanDrag({
    items: tasks,
    setItems: setTasks,
    idField: "columnId",
    moveCallback: async (itemId, newColId) => {
      await api.patch(`/tasks/${itemId}/status`, { columnId: newColId });
      await refreshTask(itemId);
    }
  });

  // Fetch data
  const fetchColumns = useCallback(async () => {
    try {
      const { data } = await api.get("/kanban-columns");
      let cols = Array.isArray(data) ? data : data.columns || [];
      if (cols.length > 0) setColumns(cols.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
      else setColumns([]);
    } catch (err) { setColumns([]); }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const params: any = { limit: 100 };
      if (filterStartDate) params.startDate = new Date(filterStartDate).toISOString();
      if (filterEndDate) params.endDate = new Date(filterEndDate).toISOString();
      if (filterAssignedTo && filterAssignedTo !== "all") params.assignedToId = filterAssignedTo;
      if (filterHasLocation) params.hasLocation = "true";
      const { data } = await api.get("/tasks", { params });
      const tasksArray = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : data.tasks || []);
      setTasks(tasksArray);
    } catch (err) { setTasks([]); toast.error("Erro ao carregar tarefas"); }
  }, [filterStartDate, filterEndDate, filterAssignedTo, filterHasLocation]);

  const fetchUsers = useCallback(async () => {
    if (!user?.company?.id) return;
    try {
      const { data } = await api.get(`/users/company/${user.company.id}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) { }
  }, [user?.company?.id]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchColumns(), fetchTasks(), fetchUsers()]).finally(() => setLoading(false));
    }
  }, [user, fetchColumns, fetchTasks, fetchUsers]);

  const refreshTask = async (taskId: string) => {
    try {
      const { data: updated } = await api.get(`/tasks/${taskId}`);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) { console.error(err); }
  };

  // CRUD Tasks via modal
  const handleTaskSubmit = async (values: any, files: any, removedMedia: any) => {
    setIsSubmitting(true);
    const formData = new FormData();

    Object.keys(values).forEach(key => {
      if (values[key] !== undefined && values[key] !== null && values[key] !== "") {
        formData.append(key, values[key]);
      }
    });

    if (values.cep && values.street) {
      const addressData = {
        cep: values.cep, endereco: values.street, numero: values.number, bairro: values.neighborhood,
        cidade: values.city, estado: values.state, complemento: values.complement,
        latitude: values.latitude ? parseFloat(values.latitude) : undefined,
        longitude: values.longitude ? parseFloat(values.longitude) : undefined,
      };
      formData.append("address", JSON.stringify(addressData));
      ['cep', 'street', 'number', 'neighborhood', 'city', 'state', 'complement', 'latitude', 'longitude'].forEach(k => formData.delete(k));
    }

    if (user?.company?.id) formData.append("companyId", user.company.id);
    if (!editingTask && user?.id) formData.append("createdById", user.id);

    files.images.forEach((f: File) => formData.append("images", f));
    files.audios.forEach((f: File) => formData.append("audios", f));
    files.videos.forEach((f: File) => formData.append("videos", f));

    if (removedMedia.images.length) formData.append("removeImageIds", JSON.stringify(removedMedia.images));
    if (removedMedia.audios.length) formData.append("removeAudioIds", JSON.stringify(removedMedia.audios));
    if (removedMedia.videos.length) formData.append("removeVideoIds", JSON.stringify(removedMedia.videos));

    try {
      if (editingTask) {
        const { data: updated } = await api.put(`/tasks/${editingTask.id}`, formData);
        if (values.cep) {
          await api.post(`/tasks/${editingTask.id}/address`, JSON.parse(formData.get("address") as string));
        }
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updated } : t));
        await refreshTask(editingTask.id);
        toast.success("Tarefa atualizada!");
        setIsEditTaskModal(false);
      } else {
        const { data: newTask } = await api.post("/tasks", formData, { headers: { "Content-Type": "multipart/form-data" } });
        setTasks(prev => [newTask, ...prev]);
        toast.success("Tarefa criada!");
        setIsTaskModal(false);
      }
    } catch (err: any) {
      toast.error("Erro ao salvar tarefa");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // CRUD Columns
  const createColumn = async () => {
    if (!colTitle.trim()) return toast.error("Título obrigatório");
    try {
      const { data: newColumn } = await api.post("/kanban-columns", { title: colTitle });
      setColumns(prev => [...prev, newColumn]);
      setColTitle("");
      setIsColumnModal(false);
      toast.success("Coluna criada");
    } catch (err) { toast.error("Erro ao criar coluna"); }
  };

  const updateColumn = async () => {
    if (!editingCol || !colTitle.trim()) return;
    try {
      const { data: updated } = await api.put(`/kanban-columns/${editingCol.id}`, { title: colTitle });
      setColumns(prev => prev.map(c => c.id === editingCol.id ? updated : c));
      setColTitle("");
      setEditingCol(null);
      setIsColumnModal(false);
      toast.success("Coluna atualizada");
    } catch (err) { toast.error("Erro ao atualizar"); }
  };

  const deleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      if (itemToDelete.type === "column") {
        if (tasks.some(t => t.columnId === itemToDelete.id)) {
          toast.error("Coluna possui tarefas vinculadas.");
          return;
        }
        await api.delete(`/kanban-columns/${itemToDelete.id}`);
        setColumns(prev => prev.filter(c => c.id !== itemToDelete.id));
        toast.success("Coluna excluída");
      } else {
        await api.delete(`/tasks/${itemToDelete.id}`);
        setTasks(prev => prev.filter(t => t.id !== itemToDelete.id));
        toast.success("Tarefa excluída");
        if (isPreviewModal) setIsPreviewModal(false);
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err) {
      toast.error("Erro ao excluir");
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F5F0E6]">
      <RefreshCw className="h-10 w-10 text-[#D35400] animate-spin" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] bg-[#F5F0E6] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#2C3E50] text-white px-4 py-3 shadow-md border-b border-[#2C3E50] z-20">
        <div className="flex justify-between items-center max-w-[1920px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-[#D35400]" />
              <h1 className="text-lg font-bold">Fluxo de Tarefas</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 mr-4 bg-white/5 px-3 py-1 rounded-full border border-white/10 text-xs text-gray-300">
              <span>{tasks.length} Tarefas</span>
              <span className="w-px h-3 bg-white/20"></span>
              <span>{columns.length} Colunas</span>
            </div>
            <Button onClick={() => { setEditingCol(null); setColTitle(""); setIsColumnModal(true); }} variant="outline" className="hidden sm:flex border-white/20 text-white hover:bg-white/10 bg-transparent text-xs h-9">
              <Settings className="w-3.5 h-3.5 mr-2" /> Colunas
            </Button>
            <Button onClick={() => setIsTaskModal(true)} className="bg-[#D35400] hover:bg-[#A04000] text-white text-xs h-9 font-semibold">
              <Plus className="w-4 h-4 mr-1.5" /> Nova Tarefa
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm z-10 sticky top-0 md:static">
        <div className="flex flex-col md:flex-row md:items-center gap-4 max-w-[1920px] mx-auto w-full">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium min-w-fit">
            <Filter className="w-4 h-4" /> Filtros:
          </div>
          <div className="flex items-center gap-2">
            <div className="grid gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">De</label>
              <Input type="date" className="h-8 text-xs w-32" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Até</label>
              <Input type="date" className="h-8 text-xs w-32" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden md:block" />
          <div className="grid gap-1 min-w-[150px]">
            <label className="text-[10px] uppercase font-bold text-slate-400">Responsável</label>
            <select className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs" value={filterAssignedTo} onChange={e => setFilterAssignedTo(e.target.value)}>
              <option value="all">Todos</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-4 md:pt-0">
            <Button variant={filterHasLocation ? "default" : "outline"} size="sm" onClick={() => setFilterHasLocation(!filterHasLocation)} className="text-xs h-8">
              <MapPin className="w-3.5 h-3.5 mr-2" /> {filterHasLocation ? "Com Local" : "Filtrar Local"}
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard className="bg-[#F5F0E6] p-4 md:p-6">
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            count={tasks.filter(t => t.columnId === col.id).length}
            onEditClick={() => { setEditingCol(col); setColTitle(col.title); setIsColumnModal(true); }}
            onDeleteClick={() => { setItemToDelete({ type: "column", id: col.id }); setDeleteModalOpen(true); }}
            onAddClick={() => setIsTaskModal(true)}
            onDropItem={moveItem}
          >
            {tasks.filter(t => t.columnId === col.id).map(task => (
              <KanbanCard
                key={task.id}
                id={task.id}
                title={task.title}
                priorityColor={getPriorityColor(task.priority)}
                coverImage={task.taskImages[0]?.url}
                imagesCount={task.taskImages.length}
                onView={() => { setPreviewTask(task); setIsPreviewModal(true); }}
                onEdit={() => { setEditingTask(task); setIsEditTaskModal(true); }}
                onDelete={() => { setItemToDelete({ type: "task", id: task.id }); setDeleteModalOpen(true); }}
                onDragStart={(e) => handleDragStart(e, task.id)}  // ← Aqui está o ajuste principal
                footer={
                  <>
                    <div className="flex gap-2 text-slate-400 text-xs">
                      {(task.taskImages.length + task.taskVideos.length + task.taskAudios.length) > 0 && (
                        <span className="flex items-center gap-1">
                          <Paperclip size={12} /> {task.taskImages.length + task.taskVideos.length + task.taskAudios.length}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className={`flex items-center gap-1 ${isOverdue(task.dueDate) ? 'text-red-500' : ''}`}>
                          <Flag size={12} /> {formatDateShort(task.dueDate)}
                        </span>
                      )}
                    </div>
                    {task.userAssigned && (
                      <div className="bg-slate-200 px-2 py-0.5 rounded-full text-[10px] text-slate-700">
                        {task.userAssigned.name.split(" ")[0]}
                      </div>
                    )}
                  </>
                }
              >
                <p className="line-clamp-2 mb-1 text-sm text-slate-600">{task.description || "Sem descrição"}</p>
                {task.taskAddress && (
                  <div className="flex items-center gap-1 text-[10px] text-blue-600">
                    <MapPin size={10} /> {task.taskAddress.bairro}
                  </div>
                )}
              </KanbanCard>
            ))}
          </KanbanColumn>
        ))}

        {/* Coluna "Não Classificado" */}
        {tasks.filter(t => !t.columnId).length > 0 && (
          <KanbanColumn
            id="null"
            title="Não Classificado"
            count={tasks.filter(t => !t.columnId).length}
            color="#E67E22"
            onDropItem={moveItem}
          >
            {tasks.filter(t => !t.columnId).map(task => (
              <KanbanCard
                key={task.id}
                id={task.id}
                title={task.title}
                priorityColor={getPriorityColor(task.priority)}
                onView={() => { setPreviewTask(task); setIsPreviewModal(true); }}
                onEdit={() => { setEditingTask(task); setIsEditTaskModal(true); }}
                onDelete={() => { setItemToDelete({ type: "task", id: task.id }); setDeleteModalOpen(true); }}
                onDragStart={(e) => handleDragStart(e, task.id)}  // ← Aqui também
              >
                <p className="text-sm text-slate-600">{task.description || "Sem descrição"}</p>
              </KanbanCard>
            ))}
          </KanbanColumn>
        )}
      </KanbanBoard>

      {/* Modal de Tarefa */}
      <TaskFormModal
        isOpen={isTaskModal || isEditTaskModal}
        onClose={() => {
          setIsTaskModal(false);
          setIsEditTaskModal(false);
          setEditingTask(null);
        }}
        initialData={editingTask}
        onSubmit={handleTaskSubmit}
        isLoading={isSubmitting}
        users={users}
        columns={columns}
      />

      {/* Modal Nova/Editar Coluna */}
      <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCol ? "Editar Coluna" : "Nova Coluna"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nome da Coluna</Label>
            <Input value={colTitle} onChange={e => setColTitle(e.target.value)} placeholder="Ex: Em Andamento" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsColumnModal(false)}>Cancelar</Button>
            <Button onClick={editingCol ? updateColumn : createColumn} className="bg-[#D35400] hover:bg-[#A04000]">
              {editingCol ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Preview (simplificado) */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTask?.title}</DialogTitle>
          </DialogHeader>
          {previewTask && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">{previewTask.description || "Sem descrição"}</p>
              {previewTask.taskAddress && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="font-medium flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-blue-600" /> Localização
                  </p>
                  <p className="text-sm">
                    {previewTask.taskAddress.endereco}, {previewTask.taskAddress.numero} - {previewTask.taskAddress.bairro}<br />
                    {previewTask.taskAddress.cidade} / {previewTask.taskAddress.estado} - CEP {previewTask.taskAddress.cep}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewModal(false)}>Fechar</Button>
            {previewTask && (
              <Button onClick={() => {
                setIsPreviewModal(false);
                setEditingTask(previewTask);
                setIsEditTaskModal(true);
              }}>
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={deleteItem}
        loading={isDeleting}
        title="Confirmar exclusão"
        description="Esta ação não pode ser desfeita. Deseja continuar?"
      />
    </div>
  );
}
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Layout, 
  Plus, 
  Columns, 
  MapPin, 
  Flag, 
  Paperclip, 
  Calendar,
  Filter as FilterIcon,
  RefreshCw
} from "lucide-react";

// --- Imports de Infraestrutura ---
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useKanbanDrag } from "@/hooks/use-kanban-drag";

// --- Imports dos Componentes Base (Refatorados) ---
import { KanbanLayout } from "@/components/kanban/kanban-layout";
import { KanbanHeader } from "@/components/kanban/kanban-header";
import { KanbanFilter } from "@/components/kanban/kanban-filter";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { KanbanCard } from "@/components/kanban/kanban-card";

// --- Imports de UI Genéricos ---
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// --- Imports de Modais Específicos ---
import { TaskFormModal } from "@/components/modals/task-form-modal";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";

// --- Tipagens Locais ---
interface Professional { id: string; name: string; email: string; }
interface TaskImage { id: string; url: string; }
interface TaskAddress { bairro: string; cidade: string; estado: string; }
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: number;
  status: string;
  columnId?: string | null;
  userAssigned?: Professional;
  dueDate?: string;
  taskAddress?: TaskAddress | null;
  taskImages: TaskImage[];
  taskAudios: any[];
  taskVideos: any[];
}
interface Column { id: string; title: string; order: number; }

// --- Helpers ---
const formatDateShort = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
const isOverdue = (d: string) => new Date(d) < new Date();
const getPriorityColor = (p: number) => { 
  if (p === 1) return "#E74C3C"; // Alta
  if (p === 2) return "#F1C40F"; // Média
  return "#27AE60"; // Baixa
};

export default function ProductKanban() {
  const { user } = useAuth();

  // --- Estados de Dados ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Estados de Controle de UI/Modais ---
  const [isTaskModal, setIsTaskModal] = useState(false);
  const [isEditTaskModal, setIsEditTaskModal] = useState(false);
  const [isColumnModal, setIsColumnModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);

  // --- Estados de Edição/Seleção ---
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [colTitle, setColTitle] = useState("");
  const [itemToDelete, setItemToDelete] = useState<{ type: "column" | "task"; id: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Estados de Filtro ---
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("all");

  // --- Hook de Drag & Drop ---
  const { moveItem, onDragStart } = useKanbanDrag({
    items: tasks,
    setItems: setTasks,
    idField: "columnId", // Campo identificador no Kanban de Tarefas
    moveCallback: async (itemId, newColId) => {
      await api.patch(`/tasks/${itemId}/status`, { columnId: newColId });
    }
  });

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!user?.company?.id) return;
    setLoading(true);
    try {
      const [colsRes, tasksRes, usersRes] = await Promise.all([
        api.get("/kanban-columns"),
        api.get("/tasks", { params: { 
            limit: 100,
            startDate: filterStartDate ? new Date(filterStartDate).toISOString() : undefined,
            endDate: filterEndDate ? new Date(filterEndDate).toISOString() : undefined,
            assignedToId: filterAssignedTo !== "all" ? filterAssignedTo : undefined
        }}),
        api.get(`/users/company/${user.company.id}`)
      ]);

      const colsData = Array.isArray(colsRes.data) ? colsRes.data : colsRes.data.columns || [];
      setColumns(colsData.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));

      const tasksData = Array.isArray(tasksRes.data.data) ? tasksRes.data.data : tasksRes.data.tasks || [];
      setTasks(tasksData);

      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [user, filterStartDate, filterEndDate, filterAssignedTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Actions Definition (Header Configuration) ---
  // Aqui definimos as ações que aparecem na engrenagem do header
  const headerConfigActions = [
    { 
      label: 'Criar Tarefa', 
      onClick: () => { setEditingTask(null); setIsTaskModal(true); },
      icon: <Plus className="w-4 h-4 mr-2" />
    },
    { 
      label: 'Nova Coluna', 
      onClick: () => { setEditingCol(null); setColTitle(""); setIsColumnModal(true); },
      icon: <Columns className="w-4 h-4 mr-2" />
    }
  ];

  // --- CRUD Handlers ---

  const handleTaskSubmit = async (values: any, files: any, removedMedia: any) => {
    setIsSubmitting(true);
    const formData = new FormData();
    
    // ... (Lógica de montagem do FormData igual ao original)
    Object.keys(values).forEach(key => {
      if (key !== 'taskAddress' && values[key] !== undefined && values[key] !== null && values[key] !== "") {
        formData.append(key, values[key]);
      }
    });
    if (values.taskAddress) formData.append("address", JSON.stringify(values.taskAddress));
    if (user?.company?.id) formData.append("companyId", user.company.id);
    if (!editingTask && user?.id) formData.append("createdById", user.id);

    // Files
    files.images.forEach((f: File) => formData.append("images", f));
    files.audios.forEach((f: File) => formData.append("audios", f));
    files.videos.forEach((f: File) => formData.append("videos", f));
    
    // Removals
    if (removedMedia.images.length) formData.append("removeImageIds", JSON.stringify(removedMedia.images));
    if (removedMedia.audios.length) formData.append("removeAudioIds", JSON.stringify(removedMedia.audios));
    if (removedMedia.videos.length) formData.append("removeVideoIds", JSON.stringify(removedMedia.videos));

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, formData);
        if (values.taskAddress) await api.post(`/tasks/${editingTask.id}/address`, values.taskAddress);
        toast.success("Tarefa atualizada!");
      } else {
        await api.post("/tasks", formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Tarefa criada!");
      }
      setIsTaskModal(false);
      setIsEditTaskModal(false);
      fetchData(); // Recarrega tudo para garantir consistência
    } catch (err) {
      toast.error("Erro ao salvar tarefa");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleColumnSubmit = async () => {
    if (!colTitle.trim()) return toast.error("Título obrigatório");
    try {
      if (editingCol) {
        await api.put(`/kanban-columns/${editingCol.id}`, { title: colTitle });
        toast.success("Coluna atualizada");
      } else {
        await api.post("/kanban-columns", { title: colTitle });
        toast.success("Coluna criada");
      }
      setIsColumnModal(false);
      fetchData();
    } catch (err) {
      toast.error("Erro ao salvar coluna");
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === "column") {
         if (tasks.some(t => t.columnId === itemToDelete.id)) {
           return toast.error("Coluna não está vazia.");
         }
         await api.delete(`/kanban-columns/${itemToDelete.id}`);
      } else {
         await api.delete(`/tasks/${itemToDelete.id}`);
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData();
      toast.success("Excluído com sucesso");
    } catch (err) {
      toast.error("Erro ao excluir");
    }
  };

  // --- Render ---

  if (loading && tasks.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F0E6]">
        <RefreshCw className="animate-spin text-[#D35400]" />
      </div>
    );
  }

  return (
    <KanbanLayout>
      
      {/* 1. Header Genérico */}
      <KanbanHeader
        title="Fluxo de Tarefas"
        icon={<Layout className="w-5 h-5 text-[#D35400]" />}
        configActions={headerConfigActions}
        rightContent={
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
             <span>{tasks.length} Tarefas</span>
             <span className="w-px h-3 bg-white/20"></span>
             <span>{columns.length} Colunas</span>
          </div>
        }
      />

      {/* 2. Filtro Genérico */}
      <KanbanFilter>
         <div className="grid gap-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">De</label>
            <Input 
              type="date" 
              className="h-8 text-xs w-32" 
              value={filterStartDate} 
              onChange={e => setFilterStartDate(e.target.value)} 
            />
         </div>
         <div className="grid gap-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Até</label>
            <Input 
              type="date" 
              className="h-8 text-xs w-32" 
              value={filterEndDate} 
              onChange={e => setFilterEndDate(e.target.value)} 
            />
         </div>
         <div className="grid gap-1 min-w-[150px]">
            <label className="text-[10px] uppercase font-bold text-slate-400">Responsável</label>
            <select 
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs" 
              value={filterAssignedTo} 
              onChange={e => setFilterAssignedTo(e.target.value)}
            >
               <option value="all">Todos</option>
               {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
         </div>
         <div className="flex items-center gap-2 pt-4">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={fetchData}>
              <FilterIcon className="w-3 h-3 mr-2"/> Filtrar
            </Button>
         </div>
      </KanbanFilter>

      {/* 3. Board Genérico */}
      <KanbanBoard>
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.columnId === col.id);
          return (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              count={colTasks.length}
              onDropItem={moveItem}
              // Ações específicas da Coluna
              onEditClick={() => { setEditingCol(col); setColTitle(col.title); setIsColumnModal(true); }}
              onDeleteClick={() => { setItemToDelete({ type: "column", id: col.id }); setDeleteModalOpen(true); }}
              onAddClick={() => { setEditingTask(null); setIsTaskModal(true); }}
            >
              {colTasks.map(task => (
                <KanbanCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  priorityColor={getPriorityColor(task.priority)}
                  coverImage={task.taskImages[0]?.url}
                  imagesCount={task.taskImages.length}
                  onDragStart={(e) => onDragStart(e, task.id)}
                  
                  // Ações do Card
                  onView={() => { setPreviewTask(task); setIsPreviewModal(true); }}
                  onEdit={() => { setEditingTask(task); setIsEditTaskModal(true); }}
                  onDelete={() => { setItemToDelete({ type: "task", id: task.id }); setDeleteModalOpen(true); }}
                  
                  // Footer Específico de Tarefa
                  footer={
                    <>
                      <div className="flex gap-2 text-slate-400 text-xs items-center">
                         {(task.taskImages.length + task.taskVideos.length + task.taskAudios.length) > 0 && (
                            <span className="flex items-center gap-1">
                               <Paperclip size={10} /> {task.taskImages.length + task.taskVideos.length + task.taskAudios.length}
                            </span>
                         )}
                         {task.dueDate && (
                            <span className={`flex items-center gap-1 ${isOverdue(task.dueDate) ? 'text-red-500 font-bold' : ''}`}>
                               <Flag size={10} /> {formatDateShort(task.dueDate)}
                            </span>
                         )}
                      </div>
                      {task.userAssigned && (
                         <div className="bg-slate-200 px-2 py-0.5 rounded-full text-[10px] text-slate-700 font-medium truncate max-w-[80px]">
                            {task.userAssigned.name.split(" ")[0]}
                         </div>
                      )}
                    </>
                  }
                >
                  {/* Conteúdo Central Específico de Tarefa */}
                  <p className="line-clamp-2 mb-2 text-xs text-slate-600">
                    {task.description || "Sem descrição"}
                  </p>
                  {task.taskAddress && (
                     <div className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 p-1 rounded w-fit">
                        <MapPin size={10} /> {task.taskAddress.bairro} - {task.taskAddress.cidade}
                     </div>
                  )}
                </KanbanCard>
              ))}
            </KanbanColumn>
          );
        })}

        {/* Coluna "Não Classificado" (opcional, para tarefas sem coluna) */}
        {tasks.some(t => !t.columnId) && (
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
                    onDragStart={(e) => onDragStart(e, task.id)}
                    onEdit={() => { setEditingTask(task); setIsEditTaskModal(true); }}
                 >
                    <p className="text-xs text-red-500">Mova para uma coluna</p>
                 </KanbanCard>
              ))}
           </KanbanColumn>
        )}
      </KanbanBoard>

      {/* --- MODAIS (Lógica Específica) --- */}
      
      {/* 1. Modal de Tarefa */}
      <TaskFormModal
        isOpen={isTaskModal || isEditTaskModal}
        onClose={() => {
          setIsTaskModal(false);
          setIsEditTaskModal(false);
          setEditingTask(null);
        }}
        initialData={editingTask as any}
        onSubmit={handleTaskSubmit}
        isLoading={isSubmitting}
        users={users}
        columns={columns}
      />

      {/* 2. Modal de Coluna */}
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
            <Button onClick={handleColumnSubmit} className="bg-[#D35400] hover:bg-[#A04000]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Modal de Exclusão */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteItem}
        loading={loading} // Reutilizando loading state para simplicidade
        title="Confirmar exclusão"
        description="Esta ação não pode ser desfeita."
      />

      {/* 4. Modal de Visualização Rápida */}
      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
         <DialogContent className="max-w-2xl">
            <DialogHeader>
               <DialogTitle>{previewTask?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
               <p className="text-sm text-gray-600">{previewTask?.description || "Sem descrição"}</p>
               {previewTask?.taskAddress && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
                     <MapPin size={16} /> 
                     {previewTask.taskAddress.bairro}, {previewTask.taskAddress.cidade} - {previewTask.taskAddress.estado}
                  </div>
               )}
               {previewTask?.dueDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                     <Calendar size={16} /> Prazo: {formatDateShort(previewTask.dueDate)}
                  </div>
               )}
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsPreviewModal(false)}>Fechar</Button>
               <Button onClick={() => { setIsPreviewModal(false); setEditingTask(previewTask); setIsEditTaskModal(true); }}>
                  Editar
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

    </KanbanLayout>
  );
}
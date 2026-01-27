/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Layout,
  RefreshCw,
  Filter as FilterIcon,
  Calendar,
  CheckCircle2,
  Paperclip,
  MapPin,
  Flag,
  ImageIcon,
  Mic,
  Loader2,
  X,
} from "lucide-react";

// --- Infraestrutura ---
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useKanbanDrag } from "@/hooks/use-kanban-drag";

// --- Componentes Base do Kanban ---
import { KanbanLayout } from "@/components/kanban/kanban-layout";
import { KanbanHeader } from "@/components/kanban/kanban-header";
import { KanbanFilter } from "@/components/kanban/kanban-filter";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { KanbanCard } from "@/components/kanban/kanban-card";

// --- UI Genérica ---
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

// --- Modais ---
import { TaskFormModal } from "@/components/modals/task-form-modal";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";

// --- Interfaces ---
interface Professional {
  id: string;
  name: string;
  email: string;
}

interface MediaFile {
  id: string;
  url: string;
}

interface TaskAddress {
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
  priority: number;
  status: string;
  columnId?: string | null;
  userAssigned?: Professional;
  dueDate?: string;
  scheduledDate?: string;
  finalComment?: string;
  taskAddress?: TaskAddress | null;
  taskImages: MediaFile[];
  taskAudios: MediaFile[];
  taskVideos: MediaFile[];
  createdAt: string;
}

interface Column {
  id: string;
  title: string;
  order: number;
}

export interface Supplier {
  id: string;
  name: string;
  zipCode?: string;
  address?: string;
  city?: string;
  state?: string;
  complement?: string;
  latitude?: number;
  longitude?: number;
  numero?: string;
  bairro?: string;
}

// --- Helpers ---
const formatDateShort = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
const isOverdue = (d: string) => new Date(d) < new Date();

const getPriorityColor = (p: number) => {
  if (p === 1) return "#E74C3C"; // Alta
  if (p === 2) return "#F1C40F"; // Média
  return "#27AE60"; // Baixa
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "PENDING":
      return { label: "Pendente", color: "#F1C40F" };
    case "IN_PROGRESS":
      return { label: "Em Progresso", color: "#3498DB" };
    case "COMPLETED":
      return { label: "Concluído", color: "#27AE60" };
    case "FAILED":
      return { label: "Falhou", color: "#E74C3C" };
    default:
      return { label: status, color: "#95A5A6" };
  }
};

export default function ProductKanban() {
  const { user } = useAuth();

  // Estados de Dados
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<Professional[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de UI (Modais)
  const [isTaskModal, setIsTaskModal] = useState(false);
  const [isEditTaskModal, setIsEditTaskModal] = useState(false);
  const [isColumnModal, setIsColumnModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isPreviewModal, setIsPreviewModal] = useState(false);

  // Estados de Controle/Edição
  const [initialColumnId, setInitialColumnId] = useState<string | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [colTitle, setColTitle] = useState("");
  const [itemToDelete, setItemToDelete] = useState<{ type: "column" | "task"; id: string; } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FILTROS ---
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("all");
  const [filterDateType, setFilterDateType] = useState("created");

  // Estado para o loading do botão de filtrar
  const [isFiltering, setIsFiltering] = useState(false);

  // Hook de Drag & Drop
  const { moveItem, onDragStart } = useKanbanDrag({
    items: tasks,
    setItems: setTasks,
    idField: "columnId",
    moveCallback: async (itemId, newColId) => {
      const targetColumn = columns.find((c) => c.id === newColId);
      const isDone = targetColumn?.title.toLowerCase() === "concluído";
      let newStatus: string | undefined = undefined;

      if (isDone) {
        newStatus = "COMPLETED";
      } else {
        const currentTask = tasks.find((t) => t.id === itemId);
        if (currentTask?.status === "COMPLETED") {
          newStatus = "IN_PROGRESS";
        }
      }

      if (newStatus) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === itemId ? { ...t, status: newStatus as string } : t,
          ),
        );
      }

      await api.patch(`/tasks/${itemId}/status`, {
        columnId: newColId,
        status: newStatus,
      });
    },
  });

  // Helper de Normalização
  const normalizeText = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  // --- fetchData ---
  const fetchData = useCallback(async (forceClear = false) => {
    if (!user?.company?.id) return;
    setLoading(true);
    try {
      const queryStartDate = !forceClear && filterStartDate ? new Date(filterStartDate).toISOString() : undefined;
      const queryEndDate = !forceClear && filterEndDate ? new Date(filterEndDate).toISOString() : undefined;
      const queryAssigned = !forceClear && filterAssignedTo !== "all" ? filterAssignedTo : undefined;
      const queryDateType = !forceClear ? filterDateType : "created";

      const [colsRes, tasksRes, usersRes, suppliersRes] = await Promise.all([
        api.get("/kanban-columns"),
        api.get("/tasks", {
          params: {
            limit: 100,
            startDate: queryStartDate,
            endDate: queryEndDate,
            assignedToId: queryAssigned,
            dateType: queryDateType,
          },
        }),
        api.get(`/users/company/${user.company.id}`),
        api.get(`/suppliers?companyId=${user.company.id}`),
      ]);

      const colsData = Array.isArray(colsRes.data) ? colsRes.data : colsRes.data.columns || [];

      // Ordenação inicial (segurança extra na carga)
      const sortedCols = colsData.sort((a: any, b: any) => {
        const titleA = normalizeText(a.title);
        const titleB = normalizeText(b.title);
        const doneVariants = ["concluido", "concluído", "done", "finalizado"];

        const isADone = doneVariants.includes(titleA);
        const isBDone = doneVariants.includes(titleB);

        if (isADone && !isBDone) return 1;
        if (!isADone && isBDone) return -1;
        return (a.order || 0) - (b.order || 0);
      });

      setColumns(sortedCols);

      const tasksData = Array.isArray(tasksRes.data.data) ? tasksRes.data.data : tasksRes.data.tasks || [];
      setTasks(tasksData);

      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      const supData = Array.isArray(suppliersRes.data) ? suppliersRes.data : suppliersRes.data.data || [];
      setSuppliers(supData);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [user, filterStartDate, filterEndDate, filterAssignedTo, filterDateType]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.company?.id]);

  const handleFilterClick = async () => {
    setIsFiltering(true);
    await fetchData();
    setIsFiltering(false);
  };

  const handleClearFilters = async () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterAssignedTo("all");
    setFilterDateType("created");
    setIsFiltering(true);
    await fetchData(true);
    setIsFiltering(false);
    toast.success("Filtros limpos");
  };

  const handleOpenNewColumn = () => {
    setEditingCol(null);
    setColTitle("");
    setIsColumnModal(true);
  };

  const handleAddTaskFromColumn = (colId: string) => {
    setEditingTask(null);
    setInitialColumnId(colId);
    setIsTaskModal(true);
  };

  const handleCompleteTask = async (task: Task) => {
    const doneCol = columns.find((c) => ["concluído", "concluido", "done"].includes(c.title.toLowerCase()));
    if (!doneCol) return toast.error("Coluna 'Concluído' não encontrada.");

    const oldStatus = task.status;
    const oldCol = task.columnId;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: "COMPLETED", columnId: doneCol.id } : t,
      ),
    );

    try {
      const formData = new FormData();
      formData.append("status", "COMPLETED");
      formData.append("columnId", doneCol.id);
      await api.put(`/tasks/${task.id}`, formData);
      toast.success("Tarefa concluída!");
    } catch (error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: oldStatus, columnId: oldCol } : t,
        ),
      );
      toast.error("Erro ao concluir tarefa.");
    }
  };

  const handleTaskSubmit = async (values: any, files: any, removedMedia: any) => {
    setIsSubmitting(true);
    const formData = new FormData();

    Object.keys(values).forEach((key) => {
      if (
        key !== "taskAddress" &&
        key !== "address" &&
        key !== "id" &&
        values[key] !== undefined &&
        values[key] !== null &&
        values[key] !== ""
      ) {
        formData.append(key, values[key]);
      }
    });

    const addressData = values.address || values.taskAddress;
    if (addressData) {
      formData.append("address", JSON.stringify(addressData));
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
      const taskId = values.id || editingTask?.id;

      if (taskId) {
        await api.put(`/tasks/${taskId}`, formData);
        toast.success("Tarefa atualizada!");
      } else {
        await api.post("/tasks", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Tarefa criada!");
      }

      setIsTaskModal(false);
      setIsEditTaskModal(false);
      setInitialColumnId(undefined);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      console.error(err);
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
        if (tasks.some((t) => t.columnId === itemToDelete.id)) {
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

  // 🔥 [CORREÇÃO FINAL] Visual Columns com useMemo
  // Esta lógica roda a cada renderização e força a coluna Concluído para o final visualmente
  const visualColumns = useMemo(() => {
    return [...columns].sort((a, b) => {
      const titleA = (a.title || "").toLowerCase().trim();
      const titleB = (b.title || "").toLowerCase().trim();
      const doneVariants = ["concluido", "concluído", "done", "finalizado", "concluded"];

      const isADone = doneVariants.some(v => titleA.includes(v));
      const isBDone = doneVariants.some(v => titleB.includes(v));

      // Regra Suprema: Concluído sempre pesa infinito positivo
      if (isADone && !isBDone) return 1;  // A vai pro fundo
      if (!isADone && isBDone) return -1; // B vai pro fundo

      // Desempate por ordem numérica normal
      return (a.order || 0) - (b.order || 0);
    });
  }, [columns]);

  if (loading && tasks.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F0E6]">
        <RefreshCw className="animate-spin text-[#D35400]" />
      </div>
    );
  }

  return (
    <KanbanLayout>
      <KanbanHeader
        title="Fluxo de Tarefas"
        icon={<Layout className="w-5 h-5 text-[#D35400]" />}
        onAddColumn={handleOpenNewColumn}
        rightContent={
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
            <span>{tasks.length} Tarefas</span>
            <span className="w-px h-3 bg-white/20"></span>
            <span>{columns.length} Colunas</span>
          </div>
        }
      />

      <KanbanFilter>
        <div className="grid gap-1 min-w-[140px]">
          <label className="text-[10px] uppercase font-bold text-slate-400">Filtrar Data Por</label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            value={filterDateType}
            onChange={(e) => setFilterDateType(e.target.value)}
          >
            <option value="created">Data de Criação</option>
            <option value="scheduled">Agendado Para</option>
            <option value="due">Prazo Final</option>
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-[10px] uppercase font-bold text-slate-400">De</label>
          <Input type="date" className="h-8 text-xs w-32" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-[10px] uppercase font-bold text-slate-400">Até</label>
          <Input type="date" className="h-8 text-xs w-32" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
        </div>

        <div className="grid gap-1 min-w-[150px]">
          <label className="text-[10px] uppercase font-bold text-slate-400">Responsável</label>
          <select className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs" value={filterAssignedTo} onChange={(e) => setFilterAssignedTo(e.target.value)}>
            <option value="all">Todos</option>
            {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-4">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs min-w-[100px]"
            onClick={handleFilterClick}
            disabled={isFiltering}
          >
            {isFiltering ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Buscando...
              </>
            ) : (
              <>
                <FilterIcon className="w-3 h-3 mr-2" /> Filtrar
              </>
            )}
          </Button>

          {(filterStartDate || filterEndDate || filterAssignedTo !== "all" || filterDateType !== "created") && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
              onClick={handleClearFilters}
              title="Limpar Filtros"
              disabled={isFiltering}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </KanbanFilter>

      <KanbanBoard>
        {/* 🔥 USO DO VISUAL COLUMNS AQUI */}
        {visualColumns.map((col) => {
          const colTasks = tasks.filter((t) => t.columnId === col.id);
          const isDoneColumn = ["concluído", "concluido", "done"].includes(col.title.toLowerCase());

          return (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              count={colTasks.length}
              color={isDoneColumn ? "#27AE60" : undefined}
              onDropItem={moveItem}
              onAddClick={isDoneColumn ? undefined : () => handleAddTaskFromColumn(col.id)}
              onEditClick={isDoneColumn ? undefined : () => { setEditingCol(col); setColTitle(col.title); setIsColumnModal(true); }}
              onDeleteClick={isDoneColumn ? undefined : () => { setItemToDelete({ type: "column", id: col.id }); setDeleteModalOpen(true); }}
            >
              {colTasks.map((task) => {
                const statusConfig = getStatusConfig(task.status);
                const totalAttachments = (task.taskImages?.length || 0) + (task.taskVideos?.length || 0) + (task.taskAudios?.length || 0);

                return (
                  <KanbanCard
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    priorityColor={getPriorityColor(task.priority)}
                    statusLabel={statusConfig.label}
                    statusColor={statusConfig.color}
                    onDragStart={(e) => onDragStart(e, task.id)}
                    onDoubleClick={() => { setPreviewTask(task); setIsPreviewModal(true); }}
                    onView={() => { setPreviewTask(task); setIsPreviewModal(true); }}
                    onEdit={() => { setEditingTask(task); setIsEditTaskModal(true); }}
                    onDelete={() => { setItemToDelete({ type: "task", id: task.id }); setDeleteModalOpen(true); }}
                    extraMenuItems={!isDoneColumn ? (
                      <DropdownMenuItem onClick={() => handleCompleteTask(task)} className="text-green-600 cursor-pointer">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Concluir
                      </DropdownMenuItem>
                    ) : null}
                    footer={
                      <div className="flex justify-between items-center w-full">
                        <div className="flex gap-2">
                          {task.userAssigned && (
                            <div className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px] text-slate-600 font-medium truncate max-w-full">
                              {task.userAssigned.name}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 text-slate-400">
                          {totalAttachments > 0 && (
                            <div className="flex items-center gap-0.5"><Paperclip size={12} /><span className="text-[10px]">{totalAttachments}</span></div>
                          )}
                          {task.taskAddress && <MapPin size={12} />}
                          {task.dueDate && <Flag size={12} className={isOverdue(task.dueDate) ? "text-red-500" : ""} />}
                        </div>
                      </div>
                    }
                  >
                    <p className="line-clamp-2 mb-2 text-xs text-slate-600">{task.description || "Sem descrição"}</p>
                  </KanbanCard>
                );
              })}
            </KanbanColumn>
          );
        })}
      </KanbanBoard>

      <TaskFormModal
        isOpen={isTaskModal || isEditTaskModal}
        onClose={() => {
          setIsTaskModal(false);
          setIsEditTaskModal(false);
          setEditingTask(null);
          setInitialColumnId(undefined);
        }}
        initialData={editingTask as any}
        initialColumnId={initialColumnId}
        onSubmit={handleTaskSubmit}
        isLoading={isSubmitting}
        users={users}
        columns={columns}
        suppliers={suppliers}
      />

      <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCol ? "Editar Coluna" : "Nova Coluna"}</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Nome da Coluna</Label>
            <Input value={colTitle} onChange={(e) => setColTitle(e.target.value)} placeholder="Ex: Em Andamento" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsColumnModal(false)}>Cancelar</Button>
            <Button onClick={handleColumnSubmit} className="bg-[#D35400] hover:bg-[#A04000]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteItem}
        loading={loading}
        title="Confirmar exclusão"
        description="Esta ação não pode ser desfeita."
      />

      <Dialog open={isPreviewModal} onOpenChange={setIsPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <div className="px-6 py-4 border-b sticky top-0 bg-white z-20 flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-800">{previewTask?.title}</DialogTitle>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">
                  Prioridade {previewTask?.priority === 1 ? "Alta" : previewTask?.priority === 2 ? "Média" : "Baixa"}
                </span>
                <span className="text-[10px] uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded font-bold text-orange-600">
                  {previewTask?.status}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-8">
            {((previewTask?.taskImages?.length || 0) + (previewTask?.taskVideos?.length || 0) + (previewTask?.taskAudios?.length || 0) > 0) && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Paperclip size={16} className="text-orange-600" /> Arquivos e Anexos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {previewTask?.taskImages?.map((img) => (
                    <div key={img.id} className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img src={img.url} alt="Anexo" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <a href={img.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-2">
                        <ImageIcon size={16} /> Visualizar Original
                      </a>
                    </div>
                  ))}
                  {previewTask?.taskVideos?.map((video) => (
                    <div key={video.id} className="rounded-xl overflow-hidden bg-black border border-slate-200 shadow-inner">
                      <video controls className="w-full aspect-video"><source src={video.url} type="video/mp4" /></video>
                    </div>
                  ))}
                  {previewTask?.taskAudios?.map((audio) => (
                    <div key={audio.id} className="col-span-1 md:col-span-2 flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mic size={14} className="text-orange-600" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">Anexo de Áudio</span>
                      </div>
                      <audio controls className="w-full h-10"><source src={audio.url} type="audio/mpeg" /></audio>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight text-[11px]">Descrição da Tarefa</h4>
              <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[100px] leading-relaxed">
                {previewTask?.description || "Nenhuma descrição detalhada fornecida para esta tarefa."}
              </div>
            </div>

            {previewTask?.taskAddress && (
              <div className="bg-orange-50/30 p-4 rounded-xl border border-orange-100 space-y-2">
                <h4 className="text-sm font-bold text-orange-700 flex items-center gap-2">
                  <MapPin size={16} /> Local de Execução
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold">{previewTask.taskAddress.endereco}, {previewTask.taskAddress.numero}</span>
                  {previewTask.taskAddress.complemento && <span> - {previewTask.taskAddress.complemento}</span>}
                  <br />
                  {previewTask.taskAddress.bairro} — {previewTask.taskAddress.cidade}, {previewTask.taskAddress.estado}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Responsável Técnico</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {previewTask?.userAssigned?.name?.charAt(0) || "?"}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{previewTask?.userAssigned?.name || "Pendente de Atribuição"}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data Limite</span>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className={previewTask?.dueDate && isOverdue(previewTask.dueDate) ? "text-red-500" : "text-slate-400"} />
                  <span className={`text-sm font-semibold ${previewTask?.dueDate && isOverdue(previewTask.dueDate) ? "text-red-600" : "text-slate-700"}`}>
                    {previewTask?.dueDate ? formatDateShort(previewTask.dueDate) : "Sem prazo definido"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t sticky bottom-0 z-20">
            <Button variant="outline" className="text-slate-600" onClick={() => setIsPreviewModal(false)}>Fechar Janela</Button>
            <Button className="bg-[#D35400] hover:bg-[#A04000]" onClick={() => { setIsPreviewModal(false); setEditingTask(previewTask); setIsEditTaskModal(true); }}>
              Editar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </KanbanLayout>
  );
}
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/services/api";
import {
  ArrowRight,
  Clock,
  RefreshCcw,
  Search,
  User
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// --- Interface Corrigida para bater com o Prisma ---
interface Task {
  id: string;
  title: string;
  description?: string;
  columnId?: string | null;
  column?: {
    id: string;
    title: string;
  };
  dueDate?: string; // Prazo final
  scheduledDate?: string; // 🔥 Corrigido de scheduledAt para scheduledDate (igual ao banco)
  assignedTo?: {
    id: string;
    name: string;
  };
  createdBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
  priority: number;
  completedAt?: string;
  taskImages?: Array<{ id: string; url: string; filename: string }>;
  taskAudios?: Array<{ id: string; url: string; filename: string }>;
  taskVideos?: Array<{ id: string; url: string; filename: string }>;
  taskAddress?: {
    id: string;
    rua: string;
    numero: string;
    cidade: string;
    estado: string;
  };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  company?: {
    id: string;
    name: string;
    email: string;
    cnpj: string;
  };
}

// --- Funções Auxiliares ---

// Helper para pegar a data efetiva de vencimento (Prazo ou Agendamento)
const getEffectiveDueDate = (task: Task): Date | null => {
  if (task.dueDate) return new Date(task.dueDate);
  if (task.scheduledDate) return new Date(task.scheduledDate);
  return null;
};

const getStatusClasses = (columnTitle?: string) => {
  if (!columnTitle) return { bg: "bg-slate-100", text: "text-slate-600" };
  const title = columnTitle.toLowerCase();
  if (title.match(/(concluído|finalizado|pronto)/))
    return { bg: "bg-green-100", text: "text-green-700" };
  if (title.match(/(andamento|progresso)/))
    return { bg: "bg-blue-100", text: "text-blue-700" };
  if (title.match(/(urgente|prioridade)/))
    return { bg: "bg-red-100", text: "text-red-700" };
  if (title.match(/(pendente|aguardando)/))
    return { bg: "bg-yellow-100", text: "text-yellow-700" };
  return { bg: "bg-slate-100", text: "text-slate-600" };
};

const getPriorityClasses = (priority: number) => {
  switch (priority) {
    case 5:
      return { bg: "bg-red-100", text: "text-red-700" };
    case 4:
      return { bg: "bg-orange-100", text: "text-orange-700" };
    case 3:
      return { bg: "bg-green-100", text: "text-green-700" };
    case 2:
      return { bg: "bg-blue-100", text: "text-blue-700" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-700" };
  }
};

const getPriorityText = (priority: number) => {
  const labels: Record<number, string> = {
    5: "Crítica",
    4: "Urgente",
    3: "Alta",
    2: "Média",
    1: "Baixa",
  };
  return labels[priority] || "Normal";
};

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const navigateToKanbanOverdue = () => {
    router.push("/Kanban?filter=overdue");
  };

  // --- Lógica de Vencimento Atualizada ---
  const isTaskOverdue = (task: Task) => {
    const targetDate = getEffectiveDueDate(task);
    if (!targetDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const isCompleted =
      task.completedAt ||
      task.column?.title?.toLowerCase().match(/(concluído|finalizado|pronto)/);

    return targetDate.getTime() < today.getTime() && !isCompleted;
  };

  const isTaskDueSoon = (task: Task) => {
    const targetDate = getEffectiveDueDate(task);
    if (!targetDate || isTaskOverdue(task)) return false;

    const isCompleted =
      task.completedAt ||
      task.column?.title?.toLowerCase().match(/(concluído|finalizado|pronto)/);
    if (isCompleted) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 && diffDays <= 7;
  };

  const hasAttachments = (task: Task) => {
    return (
      (task.taskImages?.length || 0) +
        (task.taskAudios?.length || 0) +
        (task.taskVideos?.length || 0) >
      0
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- FETCH TASKS ---
  const fetchAllTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/tasks", {
        params: {
          limit: 100,
          page: 1,
        },
      });

      const data = response.data;
      const tasksArray: Task[] = Array.isArray(data)
        ? data
        : data.tasks || data.data || [];

      const tasksWithDefaults = tasksArray.map((task) => ({
        ...task,
        priority: task.priority || 1,
        title: task.title || "Sem título",
        taskImages: task.taskImages || [],
        taskAudios: task.taskAudios || [],
        taskVideos: task.taskVideos || [],
      }));
      setAllTasks(tasksWithDefaults);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("accessToken");
        router.push("/login");
        return;
      }
      console.error(err);
      setError("Erro ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return router.push("/login");
      try {
        const { data: userData } = await api.get("/auth/profile");
        setUser(userData);
        await fetchAllTasks();
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    checkAuth();
  }, [router, fetchAllTasks]);

  const navigateToAgenda = (task: Task) => {
    const dateToFocus = task.dueDate || task.scheduledDate || task.createdAt;
    const focusDate = new Date(dateToFocus).toISOString().split("T")[0];
    router.push(`/agenda?focusDate=${focusDate}&highlightTask=${task.id}`);
  };

  // --- FILTROS ---
  const filteredTasks = (() => {
    let result = allTasks;

    if (filter === "overdue") result = result.filter(isTaskOverdue);
    if (filter === "due-soon") result = result.filter(isTaskDueSoon);
    if (filter === "my-tasks")
      result = result.filter((t) => t.assignedTo?.id === user?.id);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assignedTo?.name?.toLowerCase().includes(q) ||
          t.column?.title?.toLowerCase().includes(q),
      );
    }
    return result;
  })();

  // Estatísticas
  const overdueTasksCount = allTasks.filter(isTaskOverdue).length;
  const highPriorityCount = allTasks.filter((t) => t.priority >= 4).length;
  const completedTasksCount = allTasks.filter(
    (t) =>
      t.completedAt ||
      t.column?.title?.toLowerCase().match(/(concluído|finalizado)/),
  ).length;

  const tasksForTodayCount = allTasks.filter((task) => {
    const targetDate = getEffectiveDueDate(task);
    if (!targetDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isUpcoming = diffDays > 0 && diffDays <= 7;

    const isCompleted =
      task.completedAt ||
      task.column?.title?.toLowerCase().match(/(concluído|finalizado|pronto)/);

    return isUpcoming && !isCompleted;
  }).length;

  const navigateToTodayTasks = () => {
    const today = new Date().toISOString().split("T")[0];
    router.push(
      `/Kanban?filterType=scheduled&startDate=${today}&endDate=${today}&t=${Date.now()}`,
    );
  };

  // Render Loading
  if (!user && loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F6FA]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2F80ED]"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#353A40] mb-2">
              ELO PRODUTIVO
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-lg text-[#353A40]">
                Olá, <strong>{user.name}</strong>
              </span>
              <Badge className="bg-[#2F80ED] text-white hover:bg-[#1E5CB8]">
                {user.role}
              </Badge>
            </div>
            {user.company && (
              <p className="text-sm text-[#7A7E83] mt-1">{user.company.name}</p>
            )}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={fetchAllTasks}
                  variant="outline"
                  size="icon"
                  disabled={loading}
                  className="border-[#CBD5E1] text-[#353A40] bg-white hover:bg-gray-50"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recarregar dados</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </header>

        <hr className="border-[#E2E8F0] mb-6" />

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <Card
            className={`bg-white border-b-2 ${overdueTasksCount > 0 ? "border-red-500" : "border-gray-300"} shadow-sm hover:shadow-md transition-all cursor-pointer`}
            onClick={navigateToKanbanOverdue}
          >
            <CardContent className="p-4 text-center">
              <div
                className={`text-2xl md:text-3xl font-extrabold ${overdueTasksCount > 0 ? "text-red-600" : "text-[#353A40]"}`}
              >
                {overdueTasksCount}
              </div>
              <div className="text-xs text-[#7A7E83] mt-1">Atrasadas</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => router.push("/Kanban")}
            className="bg-white border-b-2 border-green-500 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-green-600">
                {completedTasksCount}
              </div>
              <div className="text-xs text-[#7A7E83] mt-1">Concluídas</div>
            </CardContent>
          </Card>

          <Card
            className="bg-white border-b-2 border-blue-500 shadow-sm hover:shadow-md transition-all cursor-pointer animate-in fade-in duration-500"
            onClick={navigateToTodayTasks}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-blue-600">
                {tasksForTodayCount}
              </div>
              <div className="text-xs text-[#7A7E83] mt-1 flex justify-center items-center gap-1 font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Próximos a vencer
              </div>
              <div className="text-xs text-[#7A7E83] mt-1 flex justify-center items-center gap-1 font-bold">
                (7 dias)
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CONTROLES */}
        <Card className="mb-8 bg-white border-t-4 border-[#2F80ED]/20 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A7E83]" />
              <Input
                placeholder="Buscar tarefas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-[#F5F6FA] border-[#E2E8F0]"
              />
            </div>
            {/* <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                className={
                  filter === "all"
                    ? "bg-[#2F80ED] hover:bg-[#1E5CB8] text-white"
                    : "border-[#CBD5E1] text-[#353A40] hover:bg-gray-50"
                }
              >
                Todas
              </Button>
              <Button
                variant={filter === "overdue" ? "default" : "outline"}
                onClick={() => setFilter("overdue")}
                className={
                  filter === "overdue"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "text-red-600 border-red-200 hover:bg-red-50"
                }
              >
                <AlertTriangle className="h-4 w-4 mr-1" /> Atrasadas
              </Button>
            </div> */}
          </CardContent>
        </Card>

        {/* LISTAS */}
        {!error && (
          <main className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* LISTA 1: TODAS / FILTRADAS */}
            <Card className="bg-white shadow-lg rounded-xl h-full">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                  <Clock className="h-5 w-5 text-[#2F80ED]" /> Atividades
                  <span className="text-sm font-normal text-[#7A7E83] ml-auto">
                    {filteredTasks.length} itens
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center text-[#7A7E83]">
                    Nenhuma tarefa encontrada.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filteredTasks.slice(0, 50).map((task) => (
                      <TaskListItem
                        key={task.id}
                        task={task}
                        onClick={() => navigateToAgenda(task)}
                      />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* LISTA 2: PRÓXIMOS VENCIMENTOS */}
            {/* <Card className="bg-white shadow-lg rounded-xl h-full border-t-4 border-[#2F80ED]/50">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                  <Calendar className="h-5 w-5 text-[#2F80ED]" /> Próximos
                  Vencimentos
                </CardTitle>
                <p className="text-xs text-[#7A7E83]">
                  Tarefas agendadas ou com prazo para os próximos 7 dias
                </p>
              </CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                {(() => {
                  const upcoming = allTasks
                    .filter(isTaskDueSoon)
                    .sort((a, b) => {
                      const dateA = getEffectiveDueDate(a)?.getTime() || 0;
                      const dateB = getEffectiveDueDate(b)?.getTime() || 0;
                      return dateA - dateB;
                    });

                  if (upcoming.length === 0) {
                    return (
                      <div className="p-8 text-center text-[#7A7E83]">
                        Nenhuma tarefa vencendo em breve.
                      </div>
                    );
                  }

                  return (
                    <ul className="divide-y divide-gray-100">
                      {upcoming.map((task) => (
                        <TaskListItem
                          key={task.id}
                          task={task}
                          onClick={() => navigateToAgenda(task)}
                          isUpcomingView
                        />
                      ))}
                    </ul>
                  );
                })()}
              </CardContent>
            </Card> */}
          </main>
        )}
      </div>
    </div>
  );
}

// --- Subcomponente de Item de Lista ---
const TaskListItem = ({
  task,
  onClick,
  isUpcomingView,
}: {
  task: Task;
  onClick: () => void;
  isUpcomingView?: boolean;
}) => {
  const effectiveDate = getEffectiveDueDate(task);
  const isOverdue =
    effectiveDate && effectiveDate < new Date() && !task.completedAt;

  const dateLabel = task.dueDate ? "Vence" : "Agendado";
  const displayDate = effectiveDate?.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <li className="group hover:bg-gray-50 transition-colors">
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className="flex items-start gap-3 p-4 block"
      >
        <div
          className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
            isOverdue ? "bg-red-500" : "bg-[#2F80ED]"
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <p className="font-semibold text-[#353A40] line-clamp-1 group-hover:text-[#2F80ED] transition-colors">
              {task.title}
            </p>
            {effectiveDate && (
              <span
                className={`text-xs font-mono whitespace-nowrap ml-2 
                ${
                  isOverdue
                    ? "text-red-600 font-bold"
                    : isUpcomingView
                      ? "text-[#2F80ED] font-bold"
                      : "text-[#7A7E83]"
                }`}
              >
                {dateLabel}: {displayDate}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <Badge
              variant="outline"
              className={`${getPriorityClasses(task.priority).bg} ${
                getPriorityClasses(task.priority).text
              } border-0 text-[10px]`}
            >
              {getPriorityText(task.priority)}
            </Badge>
            {task.column && (
              <Badge
                variant="outline"
                className={`${getStatusClasses(task.column.title).bg} ${
                  getStatusClasses(task.column.title).text
                } border-0 text-[10px]`}
              >
                {task.column.title}
              </Badge>
            )}
            {task.assignedTo && (
              <div className="flex items-center gap-1 text-xs text-[#7A7E83] ml-auto">
                <User className="h-3 w-3" /> {task.assignedTo.name}
              </div>
            )}
          </div>
        </div>

        <ArrowRight className="h-4 w-4 text-[#CBD5E1] group-hover:text-[#2F80ED] self-center" />
      </a>
    </li>
  );
};

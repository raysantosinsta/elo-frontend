/* eslint-disable @typescript-eslint/no-explicit-any */
// app/agenda/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar as CalendarIcon,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Star,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getDay,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Types & Interfaces ---
interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string | null;
  code?: string;
  column?: {
    title: string;
    status: "PENDING" | "FINISHED";
  };
  status: string;
  priority?: number;
  assignedTo?: {
    id: string;
    name: string;
  };
}

// --- Design Tokens (Paleta de Cores ELO PRODUTIVO) ---
const COLORS = {
  textMain: "#353A40", // Cinza escuro
  background: "#F5F6FA", // Fundo claro
  primary: "#2F80ED", // Azul ELO
  primaryDark: "#1E5CB8", // Azul escuro (hover)
  secondaryText: "#7A7E83", // Cinza médio
  accent: "#2F80ED", // Azul ELO
  white: "#FFFFFF",
  border: "#E2E8F0", // Bordas
  inputBorder: "#CBD5E1", // Bordas de inputs
};

export default function AgendaPage() {
  // --- Hooks & Context ---
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Local State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedTask, setHighlightedTask] = useState<string | null>(null);

  // --- Auth Check ---
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // --- Query Params Processing ---
  useEffect(() => {
    const focusDateStr = searchParams.get("focusDate");
    const taskId = searchParams.get("highlightTask");

    if (taskId) setHighlightedTask(taskId);

    if (focusDateStr) {
      const focusDate = new Date(focusDateStr);
      if (!isNaN(focusDate.getTime())) {
        setCurrentMonth(startOfMonth(focusDate));
      }
    }
  }, [searchParams]);

  // --- Data Fetching ---
  const fetchTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const response = await api.get("/tasks");
      const data = response.data;

      let taskList: any[] = [];
      if (Array.isArray(data)) taskList = data;
      else if (Array.isArray(data.tasks)) taskList = data.tasks;
      else if (Array.isArray(data.data)) taskList = data.data;

      const filtered = taskList
        .filter((t: any) => t.dueDate)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || "",
          dueDate: new Date(t.dueDate).toISOString().split("T")[0],
          code: t.code,
          status: t.status,
          priority: t.priority || 1,
          assignedTo: t.assignedTo,
          column: t.column
            ? {
                title: t.column.title || "Sem coluna",
                status: t.column.status || "PENDING",
              }
            : undefined,
        }));

      setTasks(filtered);
    } catch (err: any) {
      console.error("❌ Erro silencioso (tratado pelo Global Dialog):", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchTasks();
  }, [user, fetchTasks]);

  // --- Calendar Logic ---
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = getDay(startDate);

    const emptySlots = Array.from({ length: startDayOfWeek });

    return { days, emptySlots };
  }, [currentMonth]);

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasks.filter((task) => task.dueDate === dateStr);
  };

  // --- Navigation Handlers ---
  const goToPreviousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const goToToday = () => setCurrentMonth(startOfMonth(new Date()));
  const navigateToTaskInKanban = (taskId: string) =>
    router.push(`/Kanban?highlightTask=${taskId}`);

  // --- UI Helpers ---
  const getPriorityStyles = (priority: number) => {
    switch (priority) {
      case 5:
        return "bg-red-500 border-red-600 text-white"; // Crítica
      case 4:
        return "bg-orange-500 border-orange-600 text-white"; // Urgente
      case 3:
        return "bg-yellow-500 border-yellow-600 text-white"; // Alta
      case 2:
        return "bg-[#2F80ED] border-[#1E5CB8] text-white"; // Média (Azul ELO)
      default:
        return "bg-[#7A7E83] border-[#6B6F75] text-white"; // Baixa/Normal
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 5:
        return "Crítica";
      case 4:
        return "Urgente";
      case 3:
        return "Alta";
      case 2:
        return "Média";
      default:
        return "Normal";
    }
  };

  // --- Loading State ---
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F6FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#2F80ED]"></div>
          <p className="text-[#353A40]">Carregando sua agenda...</p>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen p-4 md:p-8 font-sans bg-[#F5F6FA] text-[#353A40]">
      <div className="max-w-[1400px] mx-auto">
        {/* --- Header Section --- */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <Button
              onClick={() => router.push("/")}
              variant="ghost"
              className="pl-0 hover:bg-transparent gap-2 transition-transform hover:-translate-x-1 text-[#7A7E83] hover:text-[#353A40]"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar ao Dashboard
            </Button>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3 text-[#353A40]">
              <CalendarIcon className="h-8 w-8 text-[#2F80ED]" />
              Agenda de Tarefas
            </h1>
            <p className="text-sm md:text-base font-medium text-[#7A7E83]">
              Gerencie seus prazos com eficiência e clareza.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-[#E2E8F0]">
            <Button
              onClick={goToToday}
              variant="outline"
              size="sm"
              className="border-dashed border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA]"
            >
              Hoje
            </Button>

            <div className="flex items-center mx-2">
              <Button
                onClick={goToPreviousMonth}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-[#F5F6FA]"
              >
                <ChevronLeft className="h-5 w-5 text-[#7A7E83]" />
              </Button>

              <span className="min-w-[160px] text-center font-bold text-lg capitalize select-none text-[#353A40]">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </span>

              <Button
                onClick={goToNextMonth}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-[#F5F6FA]"
              >
                <ChevronRight className="h-5 w-5 text-[#7A7E83]" />
              </Button>
            </div>

            <Button
              onClick={fetchTasks}
              disabled={loading}
              className="shadow-sm transition-all hover:brightness-110 active:scale-95 text-white gap-2 bg-[#2F80ED] hover:bg-[#1E5CB8]"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        </header>

        {highlightedTask && tasks.find((t) => t.id === highlightedTask) && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-4 shadow-sm animate-in zoom-in-95">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#353A40]">Foco na Tarefa</p>
              <p className="text-sm text-[#7A7E83]">
                Você está visualizando:{" "}
                <strong>
                  {tasks.find((t) => t.id === highlightedTask)?.title}
                </strong>
              </p>
            </div>
            <Button
              onClick={() => setHighlightedTask(null)}
              variant="ghost"
              size="sm"
              className="text-yellow-700 hover:bg-yellow-100"
            >
              Limpar Foco
            </Button>
          </div>
        )}

        {/* --- Calendar Grid --- */}
        <Card className="border-0 shadow-lg overflow-hidden rounded-xl bg-white">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 grid grid-cols-1 md:grid-cols-7 gap-4">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-32 w-full rounded-lg bg-[#E2E8F0] animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[1000px] grid grid-cols-7 bg-[#E2E8F0] gap-px border border-[#E2E8F0]">
                  {/* Weekday Headers */}
                  {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map(
                    (day) => (
                      <div
                        key={day}
                        className="bg-[#F8F9FA] py-3 text-center text-xs font-bold tracking-wider uppercase border-b-2 text-[#7A7E83] border-[#E2E8F0]"
                      >
                        {day}
                      </div>
                    ),
                  )}

                  {/* Empty Slots */}
                  {calendarDays.emptySlots.map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="bg-[#FBFCFD] min-h-[160px]"
                    />
                  ))}

                  {/* Day Cells */}
                  {calendarDays.days.map((day) => {
                    const dateKey = day.toISOString();
                    const dayTasks = getTasksForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                      <div
                        key={dateKey}
                        className={`min-h-[160px] p-2 transition-colors relative group border-b border-r border-transparent hover:z-10
                          ${isCurrentMonth ? "bg-white" : "bg-gray-50/50"}
                          ${isToday ? "ring-2 ring-[#2F80ED]/30" : "hover:bg-[#F5F6FA]"}
                        `}
                      >
                        {/* Day Number Header */}
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={`text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center
                              ${isToday ? "text-white shadow-sm" : "text-[#353A40]"}
                              ${!isCurrentMonth ? "opacity-40" : ""}
                            `}
                            style={{
                              backgroundColor: isToday
                                ? "#2F80ED"
                                : "transparent",
                            }}
                          >
                            {format(day, "d")}
                          </span>
                          {isToday && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 border-[#2F80ED]/30 text-[#2F80ED] bg-[#2F80ED]/10"
                            >
                              Hoje
                            </Badge>
                          )}
                        </div>

                        {/* Task List */}
                        <div className="space-y-1.5">
                          {dayTasks.slice(0, 5).map((task) => {
                            const isFinished =
                              task.column?.status === "FINISHED";
                            const isHighlighted = task.id === highlightedTask;

                            return (
                              <div
                                key={task.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToTaskInKanban(task.id);
                                }}
                                className={`
                                  group/task text-xs p-1.5 rounded-lg border shadow-sm cursor-pointer 
                                  transition-all duration-200 hover:scale-[1.02] hover:shadow-md relative overflow-hidden
                                  ${isHighlighted ? "ring-2 ring-yellow-400 ring-offset-1 z-20" : ""}
                                  ${
                                    isFinished
                                      ? "bg-green-50 border-green-200 text-green-800 opacity-80"
                                      : getPriorityStyles(task.priority || 1)
                                  }
                                `}
                              >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover/task:opacity-10 transition-opacity" />

                                <div className="flex items-center gap-1.5 font-semibold truncate">
                                  {isHighlighted && (
                                    <Star
                                      size={10}
                                      className="fill-yellow-400 text-yellow-400 shrink-0"
                                    />
                                  )}
                                  {isFinished && (
                                    <CheckCircle2
                                      size={10}
                                      className="text-green-600 shrink-0"
                                    />
                                  )}
                                  <span className="truncate">{task.title}</span>
                                </div>

                                <div className="flex justify-between items-center mt-1 text-[10px] opacity-90">
                                  <span className="font-mono opacity-80">
                                    {task.code ? `#${task.code}` : ""}
                                  </span>
                                  {task.assignedTo && (
                                    <span
                                      className="bg-black/20 px-1 rounded text-[9px] text-white/90 truncate max-w-[60px]"
                                      title={`Atribuído a: ${task.assignedTo.name}`}
                                    >
                                      {task.assignedTo.name.split(" ")[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {dayTasks.length > 5 && (
                            <button className="w-full text-center text-xs py-1 rounded hover:bg-[#F5F6FA] text-[#7A7E83] font-medium transition-colors">
                              +{dayTasks.length - 5} tarefas
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- Legend / Footer --- */}
        <div className="mt-8 bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-4 justify-center md:justify-between items-center border-[#E2E8F0]">
          <div className="flex flex-wrap gap-4 justify-center">
            {[
              { label: "Normal", color: "bg-[#7A7E83]" },
              { label: "Média", color: "bg-[#2F80ED]" },
              { label: "Alta", color: "bg-yellow-500" },
              { label: "Urgente", color: "bg-orange-500" },
              { label: "Crítica", color: "bg-red-500" },
              {
                label: "Concluída",
                color: "bg-green-100 border border-green-300",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${item.color} shadow-sm`}
                ></div>
                <span className="text-xs font-medium text-[#353A40]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="text-xs flex items-center gap-2 text-[#7A7E83] bg-[#F5F6FA] px-3 py-1.5 rounded-full">
            <Clock className="h-3 w-3" />
            <span>
              Total: <strong className="text-[#353A40]">{tasks.length}</strong>{" "}
              tarefas carregadas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

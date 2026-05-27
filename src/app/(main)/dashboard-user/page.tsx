/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  ChevronRight,
  LayoutDashboard,
  Calendar,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Tema atualizado para combinar com o código de exemplo
const theme = {
  primary: "#2F80ED", // Azul principal
  textPrimary: "#353A40", // Texto principal
  textSecondary: "#7A7E83", // Texto secundário
  background: "#F5F6FA", // Fundo da página
  border: "#E2E8F0", // Cor de borda
  white: "#FFFFFF",
  red: "#DC2626",
  green: "#10B981",
  yellow: "#F59E0B",
};

interface Task {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  priority: number;
  scheduledDate: string;
  dueDate?: string;
  taskAddress?: { cidade: string };
}

// 🔥 CORREÇÃO: Função para obter o label do cargo baseado no role real
const getRoleLabel = (role?: string) => {
  // Verifica se é MASTER (super admin)
  if (role === "MASTER") {
    return {
      text: "Master",
      color: "bg-purple-600 hover:bg-purple-700",
    };
  }
  // Verifica se é ADMIN
  if (role === "ADMIN") {
    return {
      text: "Administrador",
      color: "bg-[#2F80ED] hover:bg-[#1E5CB8]",
    };
  }
  // Qualquer outro role (EMPLOYER, etc)
  return {
    text: "Funcionário",
    color: "bg-gray-500 hover:bg-gray-600",
  };
};

export default function EmployeeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  // 🔥 DEBUG: Log para verificar o role do usuário
  useEffect(() => {
    if (user) {
      console.log("👤 Usuário logado:", {
        name: user.name,
        role: user.role,
        email: user.email,
      });
    }
  }, [user]);

  // --- BUSCA AUTOMÁTICA DE DADOS ---
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoadingTasks(true);
      const response = await api.get("/tasks", {
        params: {
          assignedToId: user.id,
          limit: 100,
        },
      });

      const data = response.data.data || response.data.tasks || [];
      setTasks(data);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id, fetchDashboardData]);

  // --- LÓGICA DE PROCESSAMENTO ---
  const stats = useMemo(() => {
    const now = new Date();
    return {
      pending: tasks.filter(
        (t) => t.status === "PENDING" || t.status === "IN_PROGRESS",
      ).length,
      overdue: tasks.filter((t) => {
        if (t.status === "COMPLETED") return false;
        const dateToCompare = t.dueDate ? new Date(t.dueDate) : null;
        return dateToCompare ? dateToCompare < now : false;
      }).length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
    };
  }, [tasks]);

  const roleInfo = getRoleLabel(user?.role);

  // Renderização de carregamento inicial
  if (authLoading || (isLoadingTasks && tasks.length === 0)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F6FA]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2F80ED]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#7A7E83] mb-1">
              <LayoutDashboard size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">
                Painel Operacional
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#353A40] mb-2">
              Olá,{" "}
              <span className="text-[#2F80ED]">
                {user?.name?.split(" ")[0]}
              </span>
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[#7A7E83] font-medium">
                Você concluiu {stats.completed} tarefas até agora.
              </p>
              <Badge className={`${roleInfo.color} text-white`}>
                {roleInfo.text}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-[#E2E8F0]">
            <Calendar className="text-[#2F80ED]" size={24} />
            <div className="leading-tight">
              <p className="text-[10px] uppercase font-black text-[#7A7E83]">
                Hoje
              </p>
              <p className="text-sm font-bold text-[#353A40]">
                {new Date().toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </header>

        <hr className="border-[#E2E8F0] mb-6" />

        {/* MÉTRICAS EM TEMPO REAL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <StatCard
            label="Atrasos"
            value={stats.overdue}
            icon={<AlertTriangle size={24} />}
            color={theme.red}
          />
          <StatCard
            label="Para Fazer"
            value={stats.pending}
            icon={<Clock size={24} />}
            color={theme.primary}
          />
          <StatCard
            label="Concluídas"
            value={stats.completed}
            icon={<CheckCircle2 size={24} />}
            color={theme.green}
          />
        </div>

        <main>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#353A40] flex items-center gap-2">
              Sua Agenda de Trabalho
              <span className="text-sm font-normal text-[#7A7E83]">
                ({tasks.length})
              </span>
            </h2>
          </div>

          <Card className="bg-white shadow-lg rounded-xl">
            <CardContent className="p-0">
              {tasks.length > 0 ? (
                <ul className="divide-y divide-[#E2E8F0]">
                  {tasks
                    .sort((a, b) => (a.status === "COMPLETED" ? 1 : -1))
                    .map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                </ul>
              ) : (
                <EmptyState />
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTES ---

function StatCard({ label, value, icon, color }: any) {
  return (
    <Card
      className="bg-white border-b-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
      style={{ borderBottomColor: value > 0 ? color : theme.border }}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#7A7E83] uppercase mb-1">
              {label}
            </p>
            <p
              className={`text-4xl font-black ${value > 0 ? "" : "text-[#353A40]"}`}
              style={value > 0 ? { color: color } : {}}
            >
              {value}
            </p>
          </div>
          <div
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${color}10`, color: color }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskItem({ task }: { task: Task }) {
  const isDone = task.status === "COMPLETED";

  const getStatusColor = () => {
    if (isDone) return theme.green;
    return theme.primary;
  };

  return (
    <li className="group hover:bg-gray-50 transition-colors">
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          // Aqui você pode adicionar navegação para detalhes da tarefa
        }}
        className="flex items-start gap-3 p-5 block"
      >
        <div
          className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: getStatusColor() }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <p
              className={`font-semibold text-[#353A40] line-clamp-1 group-hover:text-[#2F80ED] transition-colors ${isDone ? "line-through text-[#7A7E83]" : ""}`}
            >
              {task.title}
            </p>
            {task.scheduledDate && (
              <span className="text-xs text-[#7A7E83] flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(task.scheduledDate).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mt-2 text-sm text-[#7A7E83]">
            {task.taskAddress?.cidade && (
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {task.taskAddress.cidade}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-[#CBD5E1] group-hover:text-[#2F80ED] self-center" />
      </a>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <CheckCircle
        size={48}
        className="mx-auto text-[#7A7E83] mb-4 opacity-20"
      />
      <p className="text-[#7A7E83] font-medium">Sem atividades para listar.</p>
    </div>
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  ChevronRight,
  LayoutDashboard,
  Calendar,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

const theme = {
  grafite: "#2D3436",
  bege: "#F5F0E6",
  terracota: "#D35400",
  areia: "#95A5A6",
  petroleo: "#2C3E50",
};

interface Task {
  id: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  priority: number;
  scheduledDate: string;
  dueDate?: string;
  taskAddress?: { cidade: string };
}

export default function EmployeeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  // --- BUSCA AUTOMÁTICA DE DADOS ---
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingTasks(true);
      const response = await api.get('/tasks', {
        params: {
          assignedToId: user.id, // Filtra apenas tarefas do usuário logado
          limit: 100,            // Pega massa de dados para os contadores
          // NÃO enviamos isOverdue: true aqui para que as COMPLETED apareçam
        }
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

  // --- LÓGICA DE PROCESSAMENTO (GOLD STANDARD) ---
  const stats = useMemo(() => {
    const now = new Date();
    return {
      pending: tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length,
      overdue: tasks.filter(t => {
        if (t.status === 'COMPLETED') return false;
        const dateToCompare = t.dueDate ? new Date(t.dueDate) : null;
        return dateToCompare ? dateToCompare < now : false;
      }).length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
    };
  }, [tasks]);

  // Renderização de carregamento inicial
  if (authLoading || (isLoadingTasks && tasks.length === 0)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F5F0E6] gap-4">
        <Loader2 className="animate-spin text-[#D35400]" size={40} />
        <p className="text-[#95A5A6] font-bold animate-pulse uppercase tracking-widest text-xs">Carregando seu painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-8 font-sans text-[#2D3436]">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#95A5A6] mb-1">
            <LayoutDashboard size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Painel Operacional</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#2D3436]">
            Olá, <span className="text-[#D35400]">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-[#95A5A6] font-medium">Você concluiu {stats.completed} tarefas até agora.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-[#95A5A6]/10">
          <Calendar className="text-[#D35400]" size={24} />
          <div className="leading-tight">
            <p className="text-[10px] uppercase font-black text-[#95A5A6]">Hoje</p>
            <p className="text-sm font-bold">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      </header>

      {/* MÉTRICAS EM TEMPO REAL */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <StatCard label="Atrasos" value={stats.overdue} icon={<AlertTriangle size={24} />} color={theme.terracota} />
        <StatCard label="Para Fazer" value={stats.pending} icon={<Clock size={24} />} color={theme.petroleo} />
        <StatCard label="Concluídas" value={stats.completed} icon={<CheckCircle2 size={24} />} color="#27AE60" />
      </section>

      <main className="max-w-5xl">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          Sua Agenda de Trabalho <span className="text-sm font-normal text-[#95A5A6]">({tasks.length})</span>
        </h2>

        <div className="space-y-4">
          {tasks.length > 0 ? (
            tasks
              .sort((a, b) => (a.status === 'COMPLETED' ? 1 : -1)) // Empurra concluídas para baixo
              .map((task) => <TaskItem key={task.id} task={task} />)
          ) : (
            <EmptyState />
          )}
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTES POLIDOS ---

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#95A5A6]/10 flex items-center justify-between transition-all hover:scale-[1.01]">
      <div>
        <p className="text-xs font-bold text-[#95A5A6] uppercase mb-1">{label}</p>
        <p className="text-4xl font-black" style={{ color: value > 0 ? color : theme.grafite }}>{value}</p>
      </div>
      <div className="p-4 rounded-xl" style={{ backgroundColor: `${color}12`, color: color }}>
        {icon}
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: Task }) {
  const isDone = task.status === 'COMPLETED';

  return (
    <article className={`bg-white p-5 rounded-2xl border transition-all flex items-center justify-between group ${isDone ? 'opacity-60 bg-slate-50/50' : 'hover:border-[#D35400]/40 shadow-sm'}`}>
      <div className="flex items-center gap-5">
        <div className={`w-1.5 h-10 rounded-full ${isDone ? 'bg-green-500' : task.priority >= 3 ? 'bg-[#D35400]' : 'bg-[#2C3E50]/20'}`} />
        <div>
          <h3 className={`font-bold text-lg leading-tight ${isDone ? 'line-through text-[#95A5A6]' : 'text-[#2D3436]'}`}>{task.title}</h3>
          <div className="flex flex-wrap items-center gap-x-4 mt-2 text-sm font-medium text-[#95A5A6]">
            <span className="flex items-center gap-1.5"><MapPin size={14} /> {task.taskAddress?.cidade || "Externo"}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(task.scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>
      </div>
      <ChevronRight size={20} className={`${isDone ? 'text-green-500' : 'text-[#95A5A6]'}`} />
    </article>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-white/40 rounded-3xl border-2 border-dashed border-[#95A5A6]/20">
      <CheckCircle size={48} className="mx-auto text-[#95A5A6] mb-4 opacity-20" />
      <p className="text-[#95A5A6] font-bold tracking-tight">Sem atividades para listar.</p>
    </div>
  );
}
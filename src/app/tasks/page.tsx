// app/tasks/page.tsx
"use client";

import { TasksTable } from "@/components/tasks-table";
import { useEffect, useState } from "react";
import { useAuth, useAuthFetch } from "@/contexts/AuthContext";
import type { Task } from "@/types/task";

export default function TasksPage() {
  const { user, isAuthenticated } = useAuth();
  const authFetch = useAuthFetch();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!isAuthenticated || !user?.companyId) {
      setLoading(false);
      setError("Usuário não está autenticado ou não tem empresa associada");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔍 Buscando tarefas para company:", user.companyId);
      
      // Use a função authFetch que já inclui o token de autenticação
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000"}/tasks`
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Falha ao carregar: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      console.log("📦 Dados recebidos da API:", data);
      
      // Processar a resposta baseado no formato
      let tasksArray: Task[] = [];
      
      if (Array.isArray(data)) {
        tasksArray = data;
      } else if (data && data.tasks && Array.isArray(data.tasks)) {
        tasksArray = data.tasks;
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Se for um objeto com paginação
        if (data.pagination && Array.isArray(data.tasks)) {
          tasksArray = data.tasks;
        } else {
          // Tentar extrair arrays do objeto
          const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            tasksArray = possibleArrays[0] as Task[];
          }
        }
      }
      
      // Filtrar por companyId no cliente (segurança adicional)
      const filteredTasks = tasksArray.filter(
        (task: Task) => task.companyId === user.companyId
      );
      
      console.log(`✅ ${filteredTasks.length} tarefas carregadas`);
      setTasks(filteredTasks);
      
    } catch (err: any) {
      console.error("❌ Erro ao carregar tarefas:", err);
      
      // Mensagens de erro mais amigáveis
      let errorMessage = "Erro ao carregar tarefas";
      if (err.message.includes("401") || err.message.includes("403")) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (err.message.includes("Network")) {
        errorMessage = "Erro de conexão. Verifique sua internet.";
      } else {
        errorMessage = err.message || "Erro desconhecido";
      }
      
      setError(errorMessage);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Carrega quando o usuário estiver autenticado
  useEffect(() => {
    if (isAuthenticated && user?.companyId) {
      fetchTasks();
    } else if (!loading) {
      setLoading(false);
      setError("Usuário não autenticado");
    }
  }, [isAuthenticated, user?.companyId]);

  // ESCUTA NOTIFICAÇÕES EM TEMPO REAL
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleNewNotification = (e: CustomEvent) => {
      const notif = e.detail;
      console.log("📢 Notificação recebida:", notif);
      if (notif.type === "TASK_ASSIGNED" || notif.taskId) {
        fetchTasks();
      }
    };

    const handleTaskUpdated = () => {
      console.log("🔄 Task atualizada → recarregando lista");
      fetchTasks();
    };

    // Adicione os listeners
    window.addEventListener("notificationReceived", handleNewNotification as EventListener);
    window.addEventListener("taskMoved", handleTaskUpdated);
    window.addEventListener("taskCreated", handleTaskUpdated);
    window.addEventListener("taskUpdated", handleTaskUpdated);

    return () => {
      window.removeEventListener("notificationReceived", handleNewNotification as EventListener);
      window.removeEventListener("taskMoved", handleTaskUpdated);
      window.removeEventListener("taskCreated", handleTaskUpdated);
      window.removeEventListener("taskUpdated", handleTaskUpdated);
    };
  }, [isAuthenticated]);

  // Função para recarregar manualmente
  const handleRefresh = () => {
    fetchTasks();
  };

  // Redirecionar se não estiver autenticado
  if (!isAuthenticated && !loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600 mb-6">Você precisa estar logado para ver as tarefas.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">TODAS AS TAREFAS</h1>
          <p className="text-muted-foreground mt-2">Carregando tarefas...</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">TODAS AS TAREFAS</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <p className="text-red-800 font-medium">Erro ao carregar tarefas</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Todas as Tarefas</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie e acompanhe todas as tarefas da empresa em tempo real
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
              Empresa: <span className="font-medium">{user?.company?.name || 'N/A'}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lista Completa</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-lg text-gray-600 mb-2">Nenhuma tarefa encontrada</p>
            <p className="text-sm text-gray-500 mb-4">
              Crie a primeira tarefa no Kanban ou através do menu de tarefas.
            </p>
            <button
              onClick={() => window.location.href = '/kanban'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir para Kanban
            </button>
          </div>
        ) : (
          <TasksTable tasks={tasks} onTaskUpdated={fetchTasks} />
        )}
      </div>
    </div>
  );
}
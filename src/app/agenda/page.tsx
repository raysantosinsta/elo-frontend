/* eslint-disable @typescript-eslint/no-explicit-any */
// app/agenda/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Star, AlertTriangle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string | null;
  code?: string;
  column?: {
    title: string;
    status: 'PENDING' | 'FINISHED';
  };
  status: string;
  priority?: number;
  assignedTo?: {
    id: string;
    name: string;
  };
}

export default function AgendaPage() {
  const { user, token, authFetch, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedTask, setHighlightedTask] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Processar query params para highlight
  useEffect(() => {
    const focusDateStr = searchParams.get('focusDate');
    const taskId = searchParams.get('highlightTask');
    
    if (taskId) {
      setHighlightedTask(taskId);
    }

    if (focusDateStr) {
      try {
        const focusDate = new Date(focusDateStr);
        if (!isNaN(focusDate.getTime())) {
          setCurrentMonth(startOfMonth(focusDate));
        }
      } catch (err) {
        console.warn('Data de foco inválida:', focusDateStr);
      }
    }
  }, [searchParams]);

  // Carregar todas as tarefas
  const fetchTasks = async () => {
    if (!user || !token) {
      setError('Usuário não autenticado');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('📡 Buscando tarefas para agenda...');
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_NESTJS_API_URL || 'http://localhost:3000';
      const response = await authFetch(`${API_BASE_URL}/tasks`);

      console.log('📊 Resposta da API:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        throw new Error(`Erro ao carregar tarefas: ${response.status}`);
      }

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Resposta não é JSON:', text.substring(0, 200));
        throw new Error('Resposta inválida do servidor');
      }

      const data = await response.json();
      console.log('✅ Dados recebidos:', data);

      // Processar as tarefas - lidar com diferentes formatos de resposta
      let taskList: any[] = [];
      
      if (Array.isArray(data)) {
        taskList = data;
      } else if (data.tasks && Array.isArray(data.tasks)) {
        taskList = data.tasks;
      } else if (data.data && Array.isArray(data.data)) {
        taskList = data.data;
      } else {
        console.warn('⚠️ Formato de dados inesperado:', data);
        taskList = [];
      }

      console.log(`📋 ${taskList.length} tarefas encontradas`);

      // Filtrar tarefas que têm dueDate e mapear os dados
      const filtered = taskList
        .filter((t: any) => {
          const hasDueDate = t.dueDate !== null && t.dueDate !== undefined;
          if (hasDueDate) {
            console.log(`📅 Tarefa com dueDate: ${t.title} - ${t.dueDate}`);
          }
          return hasDueDate;
        })
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : null,
          code: t.code,
          status: t.status,
          priority: t.priority || 1,
          assignedTo: t.assignedTo,
          column: t.column ? { 
            title: t.column.title || 'Sem coluna', 
            status: t.column.status || 'PENDING' 
          } : undefined,
        }));

      console.log(`🎯 ${filtered.length} tarefas com data definida`);
      setTasks(filtered);

    } catch (err: any) {
      console.error('❌ Erro ao carregar agenda:', err);
      setError(err.message || 'Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchTasks();
    }
  }, [user, token]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(startOfMonth(new Date()));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startingDayOfWeek = getDay(monthStart);

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => task.dueDate === dateStr);
  };

  const isToday = (date: Date) => format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const getTaskPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-gray-500';
      case 2: return 'bg-blue-500';
      case 3: return 'bg-green-500';
      case 4: return 'bg-orange-500';
      case 5: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTaskPriorityText = (priority: number) => {
    switch (priority) {
      case 1: return 'Baixa';
      case 2: return 'Média';
      case 3: return 'Alta';
      case 4: return 'Urgente';
      case 5: return 'Crítica';
      default: return 'Normal';
    }
  };

  const isTaskHighlighted = (taskId: string) => {
    return highlightedTask === taskId;
  };

  // Função para navegar para o Kanban com foco na tarefa
  const navigateToTaskInKanban = (taskId: string) => {
    router.push(`/Kanban?highlightTask=${taskId}`);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-gray-600">Usuário não autenticado</p>
          <Button onClick={() => router.push('/login')}>
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => router.push('/dashboard')} variant="outline" size="lg" className="gap-2">
              <ArrowLeft className="h-5 w-5" />
              Voltar ao Dashboard
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="h-9 w-9 text-indigo-600" />
                Minha Agenda
              </h1>
              <p className="text-gray-600 mt-1">Acompanhe todas as suas tarefas com data marcada</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={goToToday} variant="outline" size="sm">
              Hoje
            </Button>
            <Button onClick={goToPreviousMonth} variant="outline" size="icon" className="h-10 w-10">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-xl font-semibold text-gray-800 min-w-48 text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
            </div>
            <Button onClick={goToNextMonth} variant="outline" size="icon" className="h-10 w-10">
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button onClick={fetchTasks} variant="default" size="lg" disabled={loading} className="gap-2">
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <p>{error}</p>
            </div>
            <Button onClick={fetchTasks} variant="outline" size="sm" className="mt-2">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Banner de tarefa destacada */}
        {highlightedTask && tasks.find(t => t.id === highlightedTask) && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800">Tarefa em destaque</p>
                  <p className="text-yellow-700 text-sm">
                    {tasks.find(t => t.id === highlightedTask)?.title}
                  </p>
                </div>
                <Button 
                  onClick={() => setHighlightedTask(null)} 
                  variant="outline" 
                  size="sm"
                  className="text-yellow-700 border-yellow-300"
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <CardTitle className="text-2xl font-bold text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-10">
                <div className="grid grid-cols-7 gap-4">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-20 w-full rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[900px] grid grid-cols-7 text-sm">
                  {/* Cabeçalho dos dias */}
                  {['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'].map((day) => (
                    <div key={day} className="text-center font-bold text-gray-700 py-4 border-b-2 border-gray-200 bg-gray-50">
                      {day}
                    </div>
                  ))}

                  {/* Espaços vazios do início */}
                  {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-r border-b min-h-40 bg-gray-50" />
                  ))}

                  {/* Dias do mês */}
                  {daysInMonth.map((day) => {
                    const dayTasks = getTasksForDay(day);
                    const today = isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className={`border-r border-b min-h-40 p-2 transition-all ${
                          today ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className={`font-bold text-lg mb-2 flex justify-between items-center ${
                          today ? 'text-indigo-700' : 'text-gray-800'
                        }`}>
                          <span>{format(day, 'd')}</span>
                          {today && (
                            <Badge variant="default" className="bg-indigo-600 text-white text-xs">
                              Hoje
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 max-h-28 overflow-y-auto">
                          {dayTasks.slice(0, 6).map((task) => (
                            <div
                              key={task.id}
                              className={`text-xs p-2 rounded-lg text-white shadow-sm cursor-pointer transition-all hover:shadow-md ${
                                isTaskHighlighted(task.id) 
                                  ? 'ring-2 ring-yellow-400 ring-offset-1 scale-105' 
                                  : ''
                              } ${
                                task.column?.status === 'FINISHED' 
                                  ? 'bg-green-600' 
                                  : getTaskPriorityColor(task.priority || 1)
                              }`}
                              title={`${task.title} - ${task.column?.title || 'Sem coluna'}`}
                              onClick={() => navigateToTaskInKanban(task.id)}
                            >
                              <div className="font-semibold truncate flex items-center gap-1">
                                {isTaskHighlighted(task.id) && (
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                )}
                                {task.title}
                              </div>
                              
                              <div className="flex justify-between items-center mt-1">
                                {task.code && (
                                  <div className="text-[10px] opacity-90">#{task.code}</div>
                                )}
                                <Badge className="text-[10px] py-0 h-4 bg-black/20 hover:bg-black/30 border-0">
                                  {getTaskPriorityText(task.priority || 1)}
                                </Badge>
                              </div>
                              
                              {task.assignedTo && (
                                <div className="text-[10px] opacity-90 mt-1 truncate">
                                  👤 {task.assignedTo.name}
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {dayTasks.length > 6 && (
                            <div className="text-center text-xs text-gray-500 font-medium pt-1">
                              +{dayTasks.length - 6} mais
                            </div>
                          )}
                          
                          {dayTasks.length === 0 && (
                            <div className="text-center text-xs text-gray-400 py-2">
                              Sem tarefas
                            </div>
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

        {/* Legenda */}
        <div className="mt-8 flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-100 ring-2 ring-indigo-500 rounded"></div>
            <span className="text-sm text-gray-700">Hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-500 rounded"></div>
            <span className="text-sm text-gray-700">Prioridade Baixa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-700">Prioridade Média</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700">Prioridade Alta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-orange-500 rounded"></div>
            <span className="text-sm text-gray-700">Urgente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-700">Crítica</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-600 rounded"></div>
            <span className="text-sm text-gray-700">Concluída</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 ring-2 ring-yellow-400 rounded"></div>
            <span className="text-sm text-gray-700">Em Destaque</span>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Total de tarefas agendadas: <strong>{tasks.length}</strong> | 
          Visíveis neste mês: <strong>{tasks.filter(t => {
            if (!t.dueDate) return false;
            const monthStartStr = format(monthStart, 'yyyy-MM-dd');
            const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
            return t.dueDate >= monthStartStr && t.dueDate <= monthEndStr;
          }).length}</strong>
        </div>

        {/* Dica */}
        <div className="mt-4 text-center text-xs text-gray-400">
          💡 Clique em qualquer tarefa para abri-la no Kanban
        </div>
      </div>
    </div>
  );
}
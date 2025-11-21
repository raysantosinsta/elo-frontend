/* eslint-disable @typescript-eslint/no-explicit-any */
// app/agenda/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
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
}

export default function AgendaPage() {
  const { user, token, authFetch, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const router = useRouter();

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Carregar todas as tarefas com dueDate
  const fetchTasks = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const res = await authFetch('/tasks?withDueDate=true'); // você pode adicionar esse filtro no backend se quiser

      if (!res.ok) throw new Error('Falha ao carregar tarefas');

      const data = await res.json();
      const taskList = Array.isArray(data) ? data : data.tasks || [];

      const filtered = taskList
        .filter((t: any) => t.dueDate !== null)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          dueDate: t.dueDate,
          code: t.code,
          status: t.status,
          column: t.column ? { title: t.column.title || 'Sem coluna', status: t.column.status || 'PENDING' } : undefined,
        }));

      setTasks(filtered);
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startingDayOfWeek = getDay(monthStart); // 0 = domingo

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => 
      task.dueDate && isSameDay(new Date(task.dueDate), date)
    );
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600">Carregando agenda...</p>
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
            <Button onClick={() => router.push('/kanban')} variant="outline" size="lg" className="gap-2">
              <ArrowLeft className="h-5 w-5" />
              Voltar ao Kanban
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="h-9 w-9 text-indigo-600" />
                Minha Agenda
              </h1>
              <p className="text-gray-600 mt-1">Acompanhe todas as suas tarefas com data marcada</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
                    <div key={day} className="text-center font-bold text-gray-700 py-4 border-b-2 border-gray-200">
                      {day}
                    </div>
                  ))}

                  {/* Espaços vazios do início */}
                  {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-r border-b min-h-32 bg-gray-50" />
                  ))}

                  {/* Dias do mês */}
                  {daysInMonth.map((day) => {
                    const dayTasks = getTasksForDay(day);
                    const today = isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className={`border-r border-b min-h-32 p-3 transition-all ${
                          today ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className={`font-bold text-lg mb-2 ${today ? 'text-indigo-700' : 'text-gray-800'}`}>
                          {format(day, 'd')}
                          {today && <span className="ml-2 text-xs font-normal text-indigo-600">(Hoje)</span>}
                        </div>

                        <div className="space-y-2">
                          {dayTasks.slice(0, 4).map((task) => (
                            <div
                              key={task.id}
                              className={`text-xs p-2 rounded-lg text-white shadow-sm text-xs font-medium cursor-pointer transition-transform hover:scale-105
                                ${task.column?.status === 'FINISHED' ? 'bg-green-600' : 'bg-orange-600'}
                              `}
                              title={`${task.title} - ${task.column?.title || 'Sem coluna'}`}
                            >
                              <div className="font-semibold truncate">{task.title}</div>
                              {task.code && <div className="text-xs opacity-90">#{task.code}</div>}
                              <Badge className="mt-1 text-[10px] py-0 h-4" variant="secondary">
                                {task.column?.title || 'Sem coluna'}
                              </Badge>
                            </div>
                          ))}
                          {dayTasks.length > 4 && (
                            <div className="text-center text-xs text-gray-500 font-medium pt-2">
                              +{dayTasks.length - 4} mais
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
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-100 ring-2 ring-indigo-500 rounded"></div>
            <span className="text-sm text-gray-700">Hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-orange-600 rounded"></div>
            <span className="text-sm text-gray-700">Tarefa Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-600 rounded"></div>
            <span className="text-sm text-gray-700">Tarefa Concluída</span>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Total de tarefas agendadas: <strong>{tasks.length}</strong> | 
          Visíveis neste mês: <strong>{tasks.filter(t => {
            if (!t.dueDate) return false;
            const taskDate = new Date(t.dueDate);
            return taskDate >= monthStart && taskDate <= monthEnd;
          }).length}</strong>
        </div>
      </div>
    </div>
  );
}
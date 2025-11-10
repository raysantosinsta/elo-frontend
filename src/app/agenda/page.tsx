/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskData {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  code?: string;
  column?: string;
}

export default function AgendaPage() {
  const [user, setUser] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const router = useRouter();

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      setUser(user);
    };
    checkAuth();
  }, [router]);

  // Carregar tarefas
  const fetchAllTasks = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${API_BASE_URL}/tasks`);
      if (!response.ok) throw new Error(`Erro: ${response.status}`);

      const data = await response.json();
      const tasks = Array.isArray(data) ? data : (data.tasks || []);

      const processedTasks: TaskData[] = tasks
        .filter((task: any) => task.dueDate)
        .map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          code: task.code,
          column: task.column?.title,
        }));

      setAllTasks(processedTasks);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAllTasks();
  }, [user]);

  // Navegação de mês
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Gerar dias do mês
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Tarefas do dia
  const getTasksForDay = (date: Date) => {
    return allTasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, date);
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-500 mt-2">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button onClick={() => router.push('/dashboard')} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">AGENDA</h1>
              <p className="text-sm text-gray-600">Visualize suas tarefas no calendário</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={goToPreviousMonth} variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={goToNextMonth} variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={fetchAllTasks} variant="outline" size="sm" disabled={loading}>
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-gray-500 mt-2">Carregando agenda...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Cabeçalho dos dias da semana */}
                  <div className="grid grid-cols-7 border-b">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                      <div key={day} className="text-center py-3 text-sm font-semibold text-gray-700">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendário */}
                  <div className="grid grid-cols-7">
                    {/* Preencher dias vazios do início do mês */}
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="border-r border-b min-h-24 bg-gray-50" />
                    ))}

                    {/* Dias do mês */}
                    {monthDays.map((day, idx) => {
                      const tasks = getTasksForDay(day);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={day.toISOString()}
                          className={`border-r border-b min-h-24 p-2 text-sm ${
                            isToday ? 'bg-blue-50' : 'bg-white'
                          }`}
                        >
                          <div className="font-medium text-gray-900 mb-1">
                            {format(day, 'd')}
                          </div>

                          {/* Tarefas do dia */}
                          <div className="space-y-1">
                            {tasks.map(task => (
                              <div
                                key={task.id}
                                className="group relative bg-orange-500 text-white text-xs rounded-md p-1 cursor-pointer hover:bg-orange-600 transition-colors overflow-hidden"
                                title={task.title}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate font-medium">{task.title}</span>
                                  {task.code && (
                                    <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-orange-700">
                                      #{task.code}
                                    </Badge>
                                  )}
                                </div>
                                {task.column && (
                                  <div className="text-[9px] opacity-90 truncate">{task.column}</div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Espaço para mais tarefas (opcional) */}
                          {tasks.length > 3 && (
                            <div className="text-xs text-gray-500 mt-1">+{tasks.length - 3} mais</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legenda */}
        <div className="mt-4 flex justify-center">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            COLEÇÃO INVERNO
          </Badge>
        </div>
      </div>
    </div>
  );
}
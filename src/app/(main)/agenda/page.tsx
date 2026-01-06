/* eslint-disable @typescript-eslint/no-explicit-any */
// app/agenda/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api'; // Sua instância com o interceptor
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar as CalendarIcon, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Star, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Types & Interfaces ---
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

// --- Design Tokens (Paleta de Cores) ---
const COLORS = {
  textMain: '#2D3436',      // Grafite
  background: '#F5F0E6',    // Algodão Cru
  primary: '#D35400',       // Terracota
  secondaryText: '#95A5A6', // Areia Escuro
  accent: '#2C3E50',        // Azul Petróleo
  white: '#FFFFFF',
};

export default function AgendaPage() {
  // --- Hooks & Context ---
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Local State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 1. REMOVIDO: const [error, setError] = useState(''); -> O Dialog Global cuida disso agora.
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedTask, setHighlightedTask] = useState<string | null>(null);

  // --- Auth Check ---
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // --- Query Params Processing ---
  useEffect(() => {
    const focusDateStr = searchParams.get('focusDate');
    const taskId = searchParams.get('highlightTask');
    
    if (taskId) setHighlightedTask(taskId);

    if (focusDateStr) {
      const focusDate = new Date(focusDateStr);
      if (!isNaN(focusDate.getTime())) {
        setCurrentMonth(startOfMonth(focusDate));
      }
    }
  }, [searchParams]);

  // --- Data Fetching (USANDO AXIOS) ---
  const fetchTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    // 2. REMOVIDO: setError('');
    
    try {
      // Se der erro aqui (400, 500, etc), o Interceptor do Axios dispara o Dialog Global automaticamente.
      const response = await api.get('/tasks');
      const data = response.data;
      
      // Normalização de dados (Adapter Pattern)
      let taskList: any[] = [];
      if (Array.isArray(data)) taskList = data;
      else if (Array.isArray(data.tasks)) taskList = data.tasks;
      else if (Array.isArray(data.data)) taskList = data.data;

      const filtered = taskList
        .filter((t: any) => t.dueDate)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          dueDate: new Date(t.dueDate).toISOString().split('T')[0],
          code: t.code,
          status: t.status,
          priority: t.priority || 1,
          assignedTo: t.assignedTo,
          column: t.column ? { 
            title: t.column.title || 'Sem coluna', 
            status: t.column.status || 'PENDING' 
          } : undefined,
        }));

      setTasks(filtered);
    } catch (err: any) {
      // 3. LIMPEZA: O catch agora só serve para parar o loading e logar no console.
      // Nenhuma lógica visual é necessária aqui.
      console.error('❌ Erro silencioso (tratado pelo Global Dialog):', err);
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
    const startDayOfWeek = getDay(startDate); // 0 = Domingo
    
    // Create empty slots for days before the 1st of the month
    const emptySlots = Array.from({ length: startDayOfWeek });
    
    return { days, emptySlots };
  }, [currentMonth]);

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => task.dueDate === dateStr);
  };

  // --- Navigation Handlers ---
  const goToPreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const goToToday = () => setCurrentMonth(startOfMonth(new Date()));
  const navigateToTaskInKanban = (taskId: string) => router.push(`/Kanban?highlightTask=${taskId}`);

  // --- UI Helpers ---
  const getPriorityStyles = (priority: number) => {
    switch (priority) {
      case 5: return 'bg-red-600 border-red-700 text-white'; // Crítica
      case 4: return 'bg-[#D35400] border-[#A04000] text-white'; // Urgente (Terracota)
      case 3: return 'bg-amber-500 border-amber-600 text-white'; // Alta
      case 2: return 'bg-[#2C3E50] border-[#1a252f] text-white'; // Média (Azul Petróleo)
      default: return 'bg-[#95A5A6] border-[#7f8c8d] text-white'; // Baixa/Normal (Areia Escuro)
    }
  };

  // --- Loading State ---
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: COLORS.background }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4" style={{ borderColor: COLORS.primary }}></div>
          <p style={{ color: COLORS.textMain }}>Carregando sua agenda...</p>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen p-4 md:p-8 font-sans transition-colors duration-300" 
          style={{ backgroundColor: COLORS.background, color: COLORS.textMain }}>
      
      <div className="max-w-[1400px] mx-auto">
        {/* --- Header Section --- */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <Button 
              onClick={() => router.push('/')} 
              variant="ghost" 
              className="pl-0 hover:bg-transparent gap-2 transition-transform hover:-translate-x-1"
              style={{ color: COLORS.accent }}
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar ao Dashboard
            </Button>
            
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3" style={{ color: COLORS.textMain }}>
              <CalendarIcon className="h-8 w-8" style={{ color: COLORS.primary }} />
              Agenda de Tarefas
            </h1>
            <p className="text-sm md:text-base font-medium" style={{ color: COLORS.secondaryText }}>
              Gerencie seus prazos com eficiência e clareza.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border" style={{ borderColor: `${COLORS.secondaryText}40` }}>
            <Button 
              onClick={goToToday} 
              variant="outline" 
              size="sm" 
              className="border-dashed hover:border-solid hover:bg-gray-50"
              style={{ color: COLORS.textMain, borderColor: COLORS.secondaryText }}
            >
              Hoje
            </Button>
            
            <div className="flex items-center mx-2">
              <Button onClick={goToPreviousMonth} variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5" style={{ color: COLORS.textMain }} />
              </Button>
              
              <span className="min-w-[160px] text-center font-bold text-lg capitalize select-none" style={{ color: COLORS.textMain }}>
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              
              <Button onClick={goToNextMonth} variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
                <ChevronRight className="h-5 w-5" style={{ color: COLORS.textMain }} />
              </Button>
            </div>

            <Button 
              onClick={fetchTasks} 
              disabled={loading}
              className="shadow-md transition-all hover:brightness-110 active:scale-95 text-white gap-2"
              style={{ backgroundColor: COLORS.primary }}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        </header>

        {/* 4. REMOVIDO: Feedback Section de Erro manual.
            O {error && ...} foi deletado pois o Dialog sobrepõe tudo.
        */}

        {highlightedTask && tasks.find(t => t.id === highlightedTask) && (
          <div className="mb-6 bg-[#FEF9E7] border border-yellow-200 rounded-lg p-4 flex items-center gap-4 shadow-sm animate-in zoom-in-95">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#2D3436]">Foco na Tarefa</p>
              <p className="text-sm text-[#7f8c8d]">
                Você está visualizando: <strong>{tasks.find(t => t.id === highlightedTask)?.title}</strong>
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
                  <Skeleton key={i} className="h-32 w-full rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[1000px] grid grid-cols-7 bg-gray-200 gap-px border border-gray-200">
                  {/* Weekday Headers */}
                  {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day) => (
                    <div 
                      key={day} 
                      className="bg-[#F8F9FA] py-3 text-center text-xs font-bold tracking-wider uppercase border-b-2"
                      style={{ color: COLORS.secondaryText, borderColor: '#E5E7EB' }}
                    >
                      {day}
                    </div>
                  ))}

                  {/* Empty Slots */}
                  {calendarDays.emptySlots.map((_, i) => (
                    <div key={`empty-${i}`} className="bg-[#FBFCFD] min-h-[160px]" />
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
                          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/50'}
                          ${isToday ? 'bg-orange-50/30 ring-inset ring-2' : 'hover:bg-[#F5F0E6]'}
                        `}
                        style={{ 
                          // Aplica a borda de "hoje" usando a cor Terracota suave ou padrão
                          boxShadow: isToday ? `inset 0 0 0 2px ${COLORS.primary}40` : 'none'
                        }}
                      >
                        {/* Day Number Header */}
                        <div className="flex justify-between items-start mb-2">
                          <span 
                            className={`text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center
                              ${isToday ? 'text-white shadow-md' : 'text-gray-700'}
                              ${!isCurrentMonth ? 'opacity-40' : ''}
                            `}
                            style={{ backgroundColor: isToday ? COLORS.primary : 'transparent' }}
                          >
                            {format(day, 'd')}
                          </span>
                          {isToday && (
                            <Badge variant="outline" className="text-[10px] h-5 border-orange-200 text-orange-700 bg-orange-50">
                              Hoje
                            </Badge>
                          )}
                        </div>

                        {/* Task List */}
                        <div className="space-y-1.5">
                          {dayTasks.slice(0, 5).map((task) => {
                            const isFinished = task.column?.status === 'FINISHED';
                            const isHighlighted = task.id === highlightedTask;

                            return (
                              <div
                                key={task.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToTaskInKanban(task.id);
                                }}
                                className={`
                                  group/task text-xs p-1.5 rounded border shadow-sm cursor-pointer 
                                  transition-all duration-200 hover:scale-[1.02] hover:shadow-md relative overflow-hidden
                                  ${isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-1 z-20' : ''}
                                  ${isFinished 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-80' 
                                    : getPriorityStyles(task.priority || 1)
                                  }
                                `}
                              >
                                {/* Efeito de brilho no hover */}
                                <div className="absolute inset-0 bg-white opacity-0 group-hover/task:opacity-10 transition-opacity" />

                                <div className="flex items-center gap-1.5 font-semibold truncate">
                                  {isHighlighted && <Star size={10} className="fill-yellow-400 text-yellow-400 shrink-0" />}
                                  {isFinished && <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />}
                                  <span className="truncate">{task.title}</span>
                                </div>
                                
                                <div className="flex justify-between items-center mt-1 text-[10px] opacity-90">
                                  <span className="font-mono opacity-80">{task.code ? `#${task.code}` : ''}</span>
                                  {task.assignedTo && (
                                    <span 
                                      className="bg-black/20 px-1 rounded text-[9px] text-white/90 truncate max-w-[60px]"
                                      title={`Atribuído a: ${task.assignedTo.name}`}
                                    >
                                      {task.assignedTo.name.split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {dayTasks.length > 5 && (
                            <button 
                              className="w-full text-center text-xs py-1 rounded hover:bg-gray-100 text-gray-500 font-medium transition-colors"
                              onClick={() => {/* Lógica para abrir modal do dia se necessário */}}
                            >
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
        <div className="mt-8 bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-4 justify-center md:justify-between items-center" 
             style={{ borderColor: `${COLORS.secondaryText}40` }}>
          
          <div className="flex flex-wrap gap-4 justify-center">
            {[
              { label: 'Normal', color: 'bg-[#95A5A6]' },
              { label: 'Média', color: 'bg-[#2C3E50]' },
              { label: 'Alta', color: 'bg-amber-500' },
              { label: 'Urgente', color: 'bg-[#D35400]' },
              { label: 'Crítica', color: 'bg-red-600' },
              { label: 'Concluída', color: 'bg-emerald-100 border border-emerald-300' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm`}></div>
                <span className="text-xs font-medium" style={{ color: COLORS.textMain }}>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="text-xs flex items-center gap-2" style={{ color: COLORS.secondaryText }}>
            <Clock className="h-3 w-3" />
            <span>
              Total: <strong>{tasks.length}</strong> tarefas carregadas
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
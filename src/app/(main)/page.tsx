/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'; // Certifique-se de ter este componente instalado
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Search, 
  User, 
  ArrowRight, 
  Image, 
  Video, 
  Music, 
  RefreshCcw // Ícone de recarregar
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/services/api';

// Tipos: Mantidos
interface Task {
  id: string;
  title: string;
  description?: string;
  columnId?: string | null;
  column?: {
    id: string;
    title: string;
  };
  dueDate?: string;
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
  scheduledAt: string;
  completedAt?: string;
  taskImages?: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
  taskAudios?: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
  taskVideos?: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
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

// Funções de Estilo (Mantidas)
const getStatusClasses = (columnTitle?: string) => {
  if (!columnTitle) return { bg: 'bg-areia/10', text: 'text-areia-escuro' };
  const title = columnTitle.toLowerCase();
  if (title.includes('concluído') || title.includes('finalizado') || title.includes('pronto')) {
    return { bg: 'bg-green-100/70', text: 'text-green-700' };
  } else if (title.includes('andamento') || title.includes('progresso')) {
    return { bg: 'bg-blue-100/70', text: 'text-blue-700' };
  } else if (title.includes('urgente') || title.includes('prioridade')) {
    return { bg: 'bg-red-100/70', text: 'text-red-700' };
  } else if (title.includes('pendente') || title.includes('aguardando')) {
    return { bg: 'bg-yellow-100/70', text: 'text-yellow-700' };
  } else {
    return { bg: 'bg-areia/10', text: 'text-areia-escuro' };
  }
};

const getPriorityClasses = (priority: number) => {
  switch (priority) {
    case 5: return { bg: 'bg-red-100/70', text: 'text-red-700' }; 
    case 4: return { bg: 'bg-orange-100/70', text: 'text-orange-700' }; 
    case 3: return { bg: 'bg-green-100/70', text: 'text-green-700' }; 
    case 2: return { bg: 'bg-blue-100/70', text: 'text-blue-700' }; 
    case 1: return { bg: 'bg-gray-100/70', text: 'text-gray-700' }; 
    default: return { bg: 'bg-gray-100/70', text: 'text-gray-700' };
  }
};

const getPriorityText = (priority: number) => {
  switch (priority) {
    case 5: return 'Crítica';
    case 4: return 'Urgente';
    case 3: return 'Alta';
    case 2: return 'Média';
    case 1: return 'Baixa';
    default: return 'Normal';
  }
};

// Componente principal
export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState<string>('');
  const router = useRouter();

  // Lógicas de Negócio (Mantidas)
  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);

    const isCompleted = task.column?.title?.toLowerCase().includes('concluído') ||
      task.column?.title?.toLowerCase().includes('finalizado') ||
      task.column?.title?.toLowerCase().includes('pronto') ||
      task.completedAt;

    return due.getTime() < today.getTime() && !isCompleted;
  };

  const isTaskDueSoon = (task: Task) => {
    if (!task.dueDate || isTaskOverdue(task)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0; 
  };

  const hasAttachments = (task: Task) => {
    const imagesCount = task.taskImages?.length || 0;
    const audiosCount = task.taskAudios?.length || 0;
    const videosCount = task.taskVideos?.length || 0;
    return imagesCount > 0 || audiosCount > 0 || videosCount > 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // --- BUSCA DE TAREFAS (USANDO API/AXIOS) ---
  const fetchAllTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/tasks');
      
      const data = response.data;
      let tasksArray: Task[] = Array.isArray(data) ? data : (data.tasks || data.data || []);
      
      const tasksWithDefaults = tasksArray.map(task => ({
        ...task,
        taskImages: task.taskImages || [],
        taskAudios: task.taskAudios || [],
        taskVideos: task.taskVideos || [],
        priority: task.priority || 1,
        title: task.title || 'Tarefa sem título',
        createdAt: task.createdAt || new Date().toISOString()
      }));
      setAllTasks(tasksWithDefaults);

    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 400) {
        setAllTasks([]);
        return;
      }
      
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        router.push('/login');
        return;
      }

      console.error(error);
      setError('Não foi possível carregar as tarefas.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // --- EFEITO PRINCIPAL ---
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const { data: userData } = await api.get('/auth/profile');
        setUser(userData);
        await fetchAllTasks(); 
      } catch (error) {
        console.error('❌ Erro na autenticação:', error);
      }
    };
    
    checkAuth();
  }, [router, fetchAllTasks]);

  // Funções de Navegação
  const navigateToAgenda = (task: Task) => {
    const focusDate = task.dueDate || task.createdAt
      ? new Date(task.dueDate || task.createdAt!).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    router.push(`/agenda?focusDate=${focusDate}&highlightTask=${task.id}`);
  };

  // Funções de Busca e Filtro
  const getFilteredTasks = () => {
    let filtered = allTasks;
    switch (filter) {
      case 'overdue': filtered = allTasks.filter(task => isTaskOverdue(task)); break;
      case 'due-soon': filtered = allTasks.filter(task => isTaskDueSoon(task)); break;
      case 'with-attachments': filtered = allTasks.filter(task => hasAttachments(task)); break;
      case 'high-priority': filtered = allTasks.filter(task => task.priority >= 4); break;
      case 'my-tasks': filtered = allTasks.filter(task => task.assignedTo?.id === user?.id); break;
      default: filtered = allTasks;
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(lowerSearch) ||
        task.description?.toLowerCase().includes(lowerSearch) ||
        task.column?.title?.toLowerCase().includes(lowerSearch) ||
        task.assignedTo?.name?.toLowerCase().includes(lowerSearch) ||
        task.createdBy?.name?.toLowerCase().includes(lowerSearch)
      );
    }
    return filtered;
  };

  // Estatísticas
  const filteredTasks = getFilteredTasks();
  const overdueTasksCount = allTasks.filter(task => isTaskOverdue(task)).length;
  const dueSoonTasksCount = allTasks.filter(task => isTaskDueSoon(task)).length;
  const highPriorityCount = allTasks.filter(task => task.priority >= 4).length;
  const myTasksCount = allTasks.filter(task => task.assignedTo?.id === user?.id).length;
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(task =>
    task.column?.title?.toLowerCase().includes('concluído') ||
    task.column?.title?.toLowerCase().includes('finalizado') ||
    task.column?.title?.toLowerCase().includes('pronto') ||
    task.completedAt
  ).length;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F0E6]">
        <div className="text-center" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2C3E50] mx-auto"></div>
          <p className="text-[#2D3436] mt-3 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" role="banner">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#2D3436] mb-2 tracking-tight">
              ELO PRODUTIVO
            </h1>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <p className="text-lg text-[#2D3436]">
                Bem-vindo(a), <strong className="font-semibold text-[#2C3E50]">{user.name}</strong>
              </p>
              <Badge 
                className={`text-sm font-medium ${
                  user.role === 'ADMIN' || user.role === 'MASTER' 
                    ? 'bg-[#D35400] text-white hover:bg-[#D35400]/80' 
                    : 'bg-[#95A5A6]/50 text-[#2D3436] hover:bg-[#95A5A6]/80'
                }`}
                aria-label={`Nível de acesso: ${user.role}`}
              >
                {user.role}
              </Badge>
            </div>
            <p className="text-sm text-[#95A5A6]">{user.email}</p>
            {user.company && (
              <p className="text-sm text-[#95A5A6]">Empresa: {user.company.name}</p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Botões antigos removidos (User, Kanban, Sair) */}
            
            {/* Botão de Atualizar Novo */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={fetchAllTasks}
                    variant="outline"
                    size="icon"
                    disabled={loading}
                    className={`border-[#95A5A6] text-[#2D3436] hover:bg-[#95A5A6]/30 transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    aria-label="Recarregar página"
                  >
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Recarregar página</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

          </div>
        </header>

        <hr className="border-[#95A5A6] mb-6" />

        {/* Estatísticas */}
        <h2 className="sr-only">Estatísticas do Dashboard</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <Card className="bg-white border-b-2 border-[#2C3E50] hover:shadow-lg transition-shadow duration-300" role="region" aria-label="Total de Tarefas">
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-[#2D3436]">{totalTasks}</div>
              <div className="text-xs md:text-sm text-[#95A5A6] mt-1">Total</div>
            </CardContent>
          </Card>
          <Card className={`bg-white border-b-2 ${overdueTasksCount > 0 ? 'border-red-500' : 'border-[#95A5A6]'} hover:shadow-lg transition-shadow duration-300`} role="region" aria-label={`Tarefas Atrasadas: ${overdueTasksCount}`}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl md:text-3xl font-extrabold ${overdueTasksCount > 0 ? 'text-red-600' : 'text-[#2D3436]'}`}>
                {overdueTasksCount}
              </div>
              <div className="text-xs md:text-sm text-[#95A5A6] mt-1">Atrasadas</div>
            </CardContent>
          </Card>
          <Card className={`bg-white border-b-2 ${dueSoonTasksCount > 0 ? 'border-orange-500' : 'border-[#95A5A6]'} hover:shadow-lg transition-shadow duration-300`} role="region" aria-label={`Tarefas Próximas do Vencimento: ${dueSoonTasksCount}`}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl md:text-3xl font-extrabold ${dueSoonTasksCount > 0 ? 'text-orange-600' : 'text-[#2D3436]'}`}>
                {dueSoonTasksCount}
              </div>
              <div className="text-xs md:text-sm text-[#95A5A6] mt-1">Próximas</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-b-2 border-green-500 hover:shadow-lg transition-shadow duration-300" role="region" aria-label={`Tarefas Concluídas: ${completedTasks}`}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-green-600">{completedTasks}</div>
              <div className="text-xs md:text-sm text-[#95A5A6] mt-1">Concluídas</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-b-2 border-purple-500 hover:shadow-lg transition-shadow duration-300" role="region" aria-label={`Tarefas de Alta Prioridade: ${highPriorityCount}`}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-purple-600">{highPriorityCount}</div>
              <div className="text-xs md:text-sm text-[#95A5A6] mt-1">Alta Prioridade</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-b-2 border-indigo-500 hover:shadow-lg transition-shadow duration-300" role="region" aria-label={`Minhas Tarefas: ${myTasksCount}`}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-indigo-600">{myTasksCount}</div>
              <div className="text-xs md:text-sm text-[#95A5A6] mt-1">Minhas Tarefas</div>
            </CardContent>
          </Card>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg shadow-sm" role="alert" aria-live="assertive">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
            <Button 
              onClick={fetchAllTasks} 
              variant="outline" 
              size="sm" 
              className="mt-3 border-red-300 text-red-700 hover:bg-red-100 transition-colors duration-300"
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Filtros e Busca */}
        <Card className="mb-8 bg-white shadow-md border-t-4 border-[#2C3E50]/50" role="search" aria-label="Busca e Filtros de Tarefas">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#95A5A6]" />
                  <Input
                    placeholder="Buscar por título, status, responsável..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-[#F5F0E6]/70 border-[#95A5A6] focus:border-[#2C3E50] text-[#2D3436] placeholder:text-[#95A5A6] transition-all duration-300"
                    aria-label="Campo de busca de tarefas"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-start sm:justify-end">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                  className={filter === 'all' ? 'bg-[#2C3E50] hover:bg-[#2C3E50]/90 text-white transition-colors duration-300' : 'border-[#95A5A6] text-[#2D3436] hover:bg-[#95A5A6]/30 transition-colors duration-300'}
                  aria-pressed={filter === 'all'}
                >
                  Todas
                </Button>
                <Button
                  variant={filter === 'my-tasks' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('my-tasks')}
                  className={`${filter === 'my-tasks' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-100'} transition-all duration-300`}
                  aria-pressed={filter === 'my-tasks'}
                >
                  <User className="h-4 w-4 mr-1" />
                  Minhas ({myTasksCount})
                </Button>
                <Button
                  variant={filter === 'overdue' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('overdue')}
                  className={`${filter === 'overdue' ? 'bg-red-600 text-white hover:bg-red-700' : 'border-red-300 text-red-700 hover:bg-red-100'} transition-all duration-300`}
                  aria-pressed={filter === 'overdue'}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Atrasadas ({overdueTasksCount})
                </Button>
                <Button
                  variant={filter === 'due-soon' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('due-soon')}
                  className={`${filter === 'due-soon' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'border-orange-300 text-orange-700 hover:bg-orange-100'} transition-all duration-300`}
                  aria-pressed={filter === 'due-soon'}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Próximas ({dueSoonTasksCount})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo principal */}
        {!error && (
          <main className="grid grid-cols-1 xl:grid-cols-2 gap-6" role="main">
            {/* ATIVIDADES RECENTES */}
            <Card className="bg-white shadow-xl rounded-xl" role="region" aria-labelledby="heading-recentes">
              <CardHeader className="pb-3 border-b border-[#95A5A6]/50">
                <CardTitle id="heading-recentes" className="flex items-center gap-2 text-xl font-bold text-[#2D3436]">
                  <Clock className="h-5 w-5 text-[#2C3E50]" />
                  ATIVIDADES RECENTES
                </CardTitle>
                <p className="text-sm text-[#95A5A6]">
                  {loading ? 'Carregando...' : `${filteredTasks.length} tarefas ${filter !== 'all' ? 'filtradas' : 'recentes'}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8" role="status" aria-live="polite">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2C3E50] mx-auto"></div>
                    <p className="text-[#95A5A6] mt-2">Carregando tarefas...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-[#95A5A6]">
                    <p className="mb-2">Nenhuma tarefa encontrada com os filtros/busca atuais.</p>
                    <Button
                      onClick={() => { setFilter('all'); setSearch(''); }}
                      variant="outline"
                      size="sm"
                      className="mt-2 border-[#95A5A6] text-[#2D3436] hover:bg-[#95A5A6]/30 transition-colors duration-300"
                    >
                      Limpar filtros
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-3" role="list">
                    {filteredTasks.slice(0, 10).map((task) => (
                      <li key={task.id}>
                        <a 
                          href={`/agenda?focusDate=${new Date(task.dueDate || task.createdAt!).toISOString().split('T')[0]}&highlightTask=${task.id}`}
                          onClick={(e) => { e.preventDefault(); navigateToAgenda(task); }}
                          className={`flex items-start gap-4 p-3 border rounded-lg transition-all duration-300 shadow-sm block focus:outline-none focus:ring-2 focus:ring-[#D35400]/50 group 
                            ${isTaskOverdue(task) ? 'border-red-300 bg-red-50/70 hover:bg-red-100' :
                              isTaskDueSoon(task) ? 'border-orange-300 bg-orange-50/70 hover:bg-orange-100' :
                                task.priority >= 4 ? 'border-purple-300 bg-purple-50/70 hover:bg-purple-100' :
                                  'border-[#95A5A6]/50 bg-white hover:shadow-md'
                            }`}
                          role="link"
                          aria-label={`Ver detalhes da tarefa: ${task.title}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-[#2D3436] group-hover:text-[#2C3E50] line-clamp-2 transition-colors duration-300">
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-sm text-[#95A5A6] mt-1 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              <ArrowRight className="h-4 w-4 text-[#95A5A6] group-hover:text-[#D35400] ml-2 flex-shrink-0 mt-1 transition-colors duration-300" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {/* Prioridade */}
                              <Badge 
                                variant="outline" 
                                className={`${getPriorityClasses(task.priority).bg} ${getPriorityClasses(task.priority).text} text-xs font-medium border-0`}
                                aria-label={`Prioridade: ${getPriorityText(task.priority)}`}
                              >
                                {getPriorityText(task.priority)}
                              </Badge>

                              {/* Status */}
                              {task.column && (
                                <Badge 
                                  variant="outline" 
                                  className={`${getStatusClasses(task.column.title).bg} ${getStatusClasses(task.column.title).text} text-xs font-medium border-0`}
                                  aria-label={`Status: ${task.column.title}`}
                                >
                                  {task.column.title}
                                </Badge>
                              )}

                              {/* Anexos */}
                              {hasAttachments(task) && (
                                <div className="flex items-center gap-1 text-xs text-[#95A5A6]">
                                  {(task.taskImages?.length || 0) > 0 && <Image className="h-3 w-3" />}
                                  {(task.taskAudios?.length || 0) > 0 && <Music className="h-3 w-3" />}
                                  {(task.taskVideos?.length || 0) > 0 && <Video className="h-3 w-3" />}
                                  <span className="sr-only">Anexos:</span>
                                  <span>
                                    {(task.taskImages?.length || 0) + (task.taskAudios?.length || 0) + (task.taskVideos?.length || 0)}
                                  </span>
                                </div>
                              )}

                              {/* Data de vencimento */}
                              {task.dueDate && (
                                <div className={`flex items-center gap-1 text-xs font-medium 
                                  ${isTaskOverdue(task) ? 'text-red-600' :
                                    isTaskDueSoon(task) ? 'text-orange-600' :
                                      'text-[#95A5A6]'
                                  }`}
                                  aria-label={`Data de Vencimento: ${formatDate(task.dueDate)}`}
                                >
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(task.dueDate)}
                                  {isTaskOverdue(task) && <span role="img" aria-label="Aviso de Atraso">⚠️</span>}
                                  {isTaskDueSoon(task) && !isTaskOverdue(task) && <span role="img" aria-label="Aviso de Próximo Vencimento">⏳</span>}
                                </div>
                              )}
                              
                              {/* Responsável */}
                              {task.assignedTo && (
                                <div className="flex items-center gap-1 text-xs text-[#95A5A6]" aria-label={`Responsável: ${task.assignedTo.name}`}>
                                  <User className="h-3 w-3" />
                                  {task.assignedTo.name}
                                </div>
                              )}
                            </div>

                            {/* Criador e data de criação */}
                            <div className="flex items-center gap-2 mt-2 text-xs text-[#95A5A6]">
                              {task.createdBy && (
                                <div>
                                <span className="sr-only">Criado por:</span>
                                <span>{task.createdBy.name}</span>
                                  </div>

                              )}
                              <span aria-hidden="true">•</span>
                              <span aria-label={`Criado em: ${formatDateTime(task.createdAt)}`}>{formatDateTime(task.createdAt)}</span>
                            </div>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* AGENDA - PRÓXIMOS VENCIMENTOS */}
            <Card className="bg-white shadow-xl rounded-xl" role="region" aria-labelledby="heading-vencimentos">
              <CardHeader className="pb-3 border-b border-[#95A5A6]/50">
                <CardTitle id="heading-vencimentos" className="flex items-center gap-2 text-xl font-bold text-[#2D3436]">
                  <Calendar className="h-5 w-5 text-[#D35400]" />
                  PRÓXIMOS VENCIMENTOS
                </CardTitle>
                <p className="text-sm text-[#95A5A6]">
                  Tarefas não concluídas com datas de vencimento próximas
                </p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8" role="status">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D35400] mx-auto"></div>
                  </div>
                ) : (
                  <ul className="space-y-3" role="list">
                    {allTasks
                      .filter(task => task.dueDate && !isTaskOverdue(task))
                      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                      .slice(0, 8)
                      .map((task) => (
                        <li key={task.id}>
                          <a 
                            href={`/agenda?focusDate=${new Date(task.dueDate!).toISOString().split('T')[0]}&highlightTask=${task.id}`}
                            onClick={(e) => { e.preventDefault(); navigateToAgenda(task); }}
                            className={`flex items-start gap-4 p-3 border rounded-lg transition-all duration-300 shadow-sm block focus:outline-none focus:ring-2 focus:ring-[#D35400]/50 group
                              ${isTaskDueSoon(task) ? 'border-orange-300 bg-orange-50/70 hover:bg-orange-100' : 'border-[#95A5A6]/50 bg-white hover:shadow-md'
                              }`}
                            role="link"
                            aria-label={`Ver detalhes da tarefa: ${task.title}, Vencimento: ${formatDate(task.dueDate!)}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-1">
                                <p className="font-semibold text-[#2D3436] group-hover:text-[#D35400] line-clamp-2 flex-1 transition-colors duration-300">
                                  {task.title}
                                </p>
                                <ArrowRight className="h-4 w-4 text-[#95A5A6] group-hover:text-[#D35400] ml-2 flex-shrink-0 transition-colors duration-300" />
                              </div>

                              <div className="flex items-center gap-2">
                                <Calendar className={`h-4 w-4 ${isTaskDueSoon(task) ? 'text-orange-500' : 'text-green-600'
                                  }`} aria-hidden="true" />
                                <span className={`text-sm font-medium ${isTaskDueSoon(task) ? 'text-orange-600' : 'text-green-600'
                                  }`}>
                                  Vence em: {new Date(task.dueDate!).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </span>
                                {isTaskDueSoon(task) && <span className="text-sm text-orange-600 font-semibold" role="img" aria-label="Próximo Vencimento">⏳</span>}
                              </div>

                              {task.assignedTo && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-[#95A5A6]" aria-label={`Responsável: ${task.assignedTo.name}`}>
                                  <User className="h-3 w-3" />
                                  {task.assignedTo.name}
                                </div>
                              )}
                            </div>
                          </a>
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </main>
        )}
      </div>
    </div>
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Calendar, Clock, LogOut, Search, User, ArrowRight, Image, Video, Music, Users, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // ajuste o caminho conforme sua estrutura

// Também vamos atualizar a interface Task para tornar as propriedades opcionais
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
  taskImages?: Array<{  // Tornar opcional
    id: string;
    url: string;
    filename: string;
  }>;
  taskAudios?: Array<{  // Tornar opcional
    id: string;
    url: string;
    filename: string;
  }>;
  taskVideos?: Array<{  // Tornar opcional
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

const API_BASE_URL = process.env.NEXT_PUBLIC_NESTJS_API_URL || 'http://localhost:3000';

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const { authFetch } = useAuth(); // Adicione esta linha

  // Verificar autenticação
  useEffect(() => {
  const checkAuth = async () => {
    console.log('🔐 Verificando autenticação...');

    const token = localStorage.getItem('accessToken');
    console.log('📋 Token no localStorage:', token ? 'present' : 'missing');

    if (!token) {
      console.log('❌ Token não encontrado, redirecionando para login');
      router.push('/login');
      return;
    }

    try {
      // Tentar carregar perfil primeiro
      console.log('📡 Carregando perfil do usuário...');
      const profileResponse = await authFetch(`${API_BASE_URL}/auth/profile`);

      if (profileResponse.ok) {
        const userData = await profileResponse.json();
        setUser(userData);
        console.log('✅ Perfil carregado:', userData);
      } else {
        console.warn('⚠️ Endpoint /auth/profile não disponível');
        // Se não conseguir carregar perfil, usar dados básicos
        setUser({
          id: 'unknown',
          name: 'Usuário',
          email: 'usuario@empresa.com',
          role: 'user',
          status: 'active'
        });
      }

      // Carregar tarefas usando authFetch
      await fetchAllTasks();

    } catch (error) {
      console.error('❌ Erro na autenticação:', error);
      localStorage.removeItem('accessToken');
      router.push('/login');
    }
  };

  checkAuth();
}, [router]);

  // Buscar tarefas
 const fetchAllTasks = async () => {
  setLoading(true);
  setError('');

  try {
    console.log('📡 Buscando tarefas com authFetch...');
    
    // Use a função authFetch do contexto de autenticação
    const response = await authFetch(`${API_BASE_URL}/tasks`);

    console.log('📡 Status da resposta:', response.status);
    
    if (!response.ok) {
      // Se for 404 ou 400 (sem tarefas), tratar como array vazio
      if (response.status === 404 || response.status === 400) {
        console.log('ℹ️ Nenhuma tarefa encontrada, inicializando com array vazio');
        setAllTasks([]);
        return;
      }
      
      const errorText = await response.text();
      console.error('❌ Erro detalhado:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Erro ao buscar tarefas: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Tarefas carregadas:', data.length || data.tasks?.length || 0);

    // Fallback para diferentes formatos de resposta
    let tasksArray: Task[] = [];

    if (Array.isArray(data)) {
      tasksArray = data;
    } else if (data.tasks && Array.isArray(data.tasks)) {
      tasksArray = data.tasks;
    } else if (data.data && Array.isArray(data.data)) {
      tasksArray = data.data;
    } else {
      console.warn('⚠️ Formato de dados inesperado, usando array vazio:', data);
      tasksArray = [];
    }

    // Aplicar defaults para evitar undefined
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
    console.error('❌ Erro ao buscar tarefas:', error);
    
    // Se for erro de autenticação, redirecionar para login
    if (error.message.includes('401') || error.message.includes('Autenticação') || error.message.includes('token')) {
      localStorage.removeItem('accessToken');
      router.push('/login');
      return;
    }
    
    // Se for erro de rede ou outro, mostrar mensagem amigável
    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
      setError('Erro de conexão. Verifique se o servidor está rodando.');
    } else if (error.message.includes('404') || error.message.includes('400')) {
      // Se não encontrou tarefas, inicializar com array vazio
      console.log('ℹ️ Nenhuma tarefa encontrada, inicializando com array vazio');
      setAllTasks([]);
    } else {
      setError(error.message || 'Erro ao carregar tarefas');
    }
  } finally {
    setLoading(false);
  }
};

  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    const dueStr = new Date(task.dueDate).toISOString().split('T')[0];
    const isCompleted = task.column?.title?.toLowerCase().includes('concluído') ||
      task.column?.title?.toLowerCase().includes('finalizado') ||
      task.column?.title?.toLowerCase().includes('pronto') ||
      task.completedAt;
    return dueStr < todayStr && !isCompleted;
  };

  const isTaskDueSoon = (task: Task) => {
    if (!task.dueDate || isTaskOverdue(task)) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    const dueStr = new Date(task.dueDate).toISOString().split('T')[0];
    // Simple string compare for days diff
    const today = new Date(todayStr);
    const due = new Date(dueStr);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  // Corrigir a função hasAttachments
  const hasAttachments = (task: Task) => {
    const imagesCount = task.taskImages?.length || 0;
    const audiosCount = task.taskAudios?.length || 0;
    const videosCount = task.taskVideos?.length || 0;

    return imagesCount > 0 || audiosCount > 0 || videosCount > 0;
  };

  const getFilteredTasks = () => {
    let filtered = allTasks;

    // Aplicar filtro principal
    switch (filter) {
      case 'overdue':
        filtered = allTasks.filter(task => isTaskOverdue(task));
        break;
      case 'due-soon':
        filtered = allTasks.filter(task => isTaskDueSoon(task));
        break;
      case 'with-attachments':
        filtered = allTasks.filter(task => hasAttachments(task));
        break;
      case 'high-priority':
        filtered = allTasks.filter(task => task.priority >= 4);
        break;
      case 'my-tasks':
        filtered = allTasks.filter(task => task.assignedTo?.id === user?.id);
        break;
      default:
        filtered = allTasks;
    }

    // Aplicar busca
    if (search) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase()) ||
        task.column?.title?.toLowerCase().includes(search.toLowerCase()) ||
        task.assignedTo?.name?.toLowerCase().includes(search.toLowerCase()) ||
        task.createdBy?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Tentar fazer logout no backend se existir o endpoint
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } catch (logoutError) {
          console.log('ℹ️ Endpoint de logout não disponível, continuando...');
        }
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  };

  // No Dashboard, modifique a função navigateToAgenda
const navigateToAgenda = (task: Task) => {
  if (task.dueDate) {
    // Formatar a data para YYYY-MM-DD
    const focusDate = new Date(task.dueDate).toISOString().split('T')[0];
    router.push(`/agenda?focusDate=${focusDate}&highlightTask=${task.id}`);
  } else {
    // Se não tem dueDate, usar a data de criação ou data atual
    const focusDate = task.createdAt 
      ? new Date(task.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    router.push(`/agenda?focusDate=${focusDate}&highlightTask=${task.id}`);
  }
};

  const navigateToKanban = () => {
    router.push('/Kanban');
  };

  const navigateToUserManagement = () => {
    router.push('/signup');
  };

  const getStatusColor = (columnTitle?: string) => {
    if (!columnTitle) return 'bg-gray-100 text-gray-800';
    const title = columnTitle.toLowerCase();
    if (title.includes('concluído') || title.includes('finalizado') || title.includes('pronto')) {
      return 'bg-green-100 text-green-800';
    } else if (title.includes('andamento') || title.includes('progresso')) {
      return 'bg-blue-100 text-blue-800';
    } else if (title.includes('urgente') || title.includes('prioridade')) {
      return 'bg-red-100 text-red-800';
    } else if (title.includes('pendente') || title.includes('aguardando')) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-gray-100 text-gray-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-green-100 text-green-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 5: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1: return 'Baixa';
      case 2: return 'Média';
      case 3: return 'Alta';
      case 4: return 'Urgente';
      case 5: return 'Crítica';
      default: return 'Normal';
    }
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

  const filteredTasks = getFilteredTasks();

  // Estatísticas
  const overdueTasksCount = allTasks.filter(task => isTaskOverdue(task)).length;
  const dueSoonTasksCount = allTasks.filter(task => isTaskDueSoon(task)).length;
  const withAttachmentsCount = allTasks.filter(task => hasAttachments(task)).length;
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-500 mt-2">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              ELO PRODUTIVO
            </h1>
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-lg text-gray-600">
                Bem-vindo, <strong>{user.name}</strong>
              </p>
              <Badge variant={user.role === 'ADMIN' || user.role === 'MASTER' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">{user.email}</p>
            {user.company && (
              <p className="text-sm text-gray-500">Empresa: {user.company.name}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(user.role === 'ADMIN' || user.role === 'MASTER') && (
              <Button
                onClick={navigateToUserManagement}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Users className="h-4 w-4" />
                Gerenciar Usuários
              </Button>
            )}
            <Button
              onClick={navigateToKanban}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Ver Kanban
            </Button>
            <Button
              onClick={() => fetchAllTasks()}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
            <Button onClick={logout} variant="outline" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl md:text-2xl font-bold text-gray-900">{totalTasks}</div>
              <div className="text-xs md:text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card className={`bg-white/80 backdrop-blur-sm ${overdueTasksCount > 0 ? 'border-red-200' : 'border-gray-200'}`}>
            <CardContent className="p-3 text-center">
              <div className={`text-xl md:text-2xl font-bold ${overdueTasksCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {overdueTasksCount}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Atrasadas</div>
            </CardContent>
          </Card>
          <Card className={`bg-white/80 backdrop-blur-sm ${dueSoonTasksCount > 0 ? 'border-orange-200' : 'border-gray-200'}`}>
            <CardContent className="p-3 text-center">
              <div className={`text-xl md:text-2xl font-bold ${dueSoonTasksCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                {dueSoonTasksCount}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Próximas</div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl md:text-2xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-xs md:text-sm text-gray-600">Concluídas</div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl md:text-2xl font-bold text-purple-600">{highPriorityCount}</div>
              <div className="text-xs md:text-sm text-gray-600">Alta Prioridade</div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-indigo-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl md:text-2xl font-bold text-indigo-600">{myTasksCount}</div>
              <div className="text-xs md:text-sm text-gray-600">Minhas Tarefas</div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <p>{error}</p>
            </div>
            <Button onClick={() => fetchAllTasks()} variant="outline" size="sm" className="mt-2">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Filtros e Busca */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar tarefas por título, descrição, status ou responsável..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  Todas
                </Button>
                <Button
                  variant={filter === 'my-tasks' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('my-tasks')}
                  className={myTasksCount > 0 ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' : ''}
                >
                  <User className="h-4 w-4 mr-1" />
                  Minhas ({myTasksCount})
                </Button>
                <Button
                  variant={filter === 'overdue' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('overdue')}
                  className={overdueTasksCount > 0 ? 'bg-red-100 text-red-800 hover:bg-red-200' : ''}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Atrasadas ({overdueTasksCount})
                </Button>
                <Button
                  variant={filter === 'due-soon' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('due-soon')}
                  className={dueSoonTasksCount > 0 ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' : ''}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Próximas ({dueSoonTasksCount})
                </Button>
                <Button
                  variant={filter === 'high-priority' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('high-priority')}
                  className={highPriorityCount > 0 ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' : ''}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Alta Prioridade ({highPriorityCount})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo principal */}
        {!error && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* ATIVIDADES RECENTES */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                  ATIVIDADES RECENTES
                </CardTitle>
                <p className="text-sm text-gray-600">
                  {loading ? 'Carregando...' : `${filteredTasks.length} tarefas ${filter !== 'all' ? 'filtradas' : ''}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Carregando tarefas...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma tarefa encontrada</p>
                    <Button
                      onClick={() => { setFilter('all'); setSearch(''); }}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      Limpar filtros
                    </Button>
                  </div>
                ) : (
                  filteredTasks.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg hover:shadow-md transition-all cursor-pointer group ${isTaskOverdue(task) ? 'border-red-200 bg-red-50/50' :
                        isTaskDueSoon(task) ? 'border-orange-200 bg-orange-50/50' :
                          task.priority >= 4 ? 'border-purple-200 bg-purple-50/50' :
                            'border-gray-200 bg-white'
                        }`}
                      onClick={() => navigateToAgenda(task)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 ml-2 flex-shrink-0 mt-1" />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {/* Prioridade */}
                          <Badge variant="outline" className={getPriorityColor(task.priority)}>
                            {getPriorityText(task.priority)}
                          </Badge>

                          {/* Status */}
                          {task.column && (
                            <Badge variant="outline" className={getStatusColor(task.column.title)}>
                              {task.column.title}
                            </Badge>
                          )}

                          {/* Anexos */}
                          {hasAttachments(task) && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              {(task.taskImages?.length || 0) > 0 && <Image className="h-3 w-3" />}
                              {(task.taskAudios?.length || 0) > 0 && <Music className="h-3 w-3" />}
                              {(task.taskVideos?.length || 0) > 0 && <Video className="h-3 w-3" />}
                              <span>
                                {(task.taskImages?.length || 0) + (task.taskAudios?.length || 0) + (task.taskVideos?.length || 0)}
                              </span>
                            </div>
                          )}

                          {/* Data de vencimento */}
                          {task.dueDate && (
                            <div className={`flex items-center gap-1 text-xs ${isTaskOverdue(task) ? 'text-red-600 font-semibold' :
                              isTaskDueSoon(task) ? 'text-orange-600 font-semibold' :
                                'text-gray-500'
                              }`}>
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.dueDate)}
                              {isTaskOverdue(task) && ' ⚠️'}
                              {isTaskDueSoon(task) && !isTaskOverdue(task) && ' ⏳'}
                            </div>
                          )}

                          {/* Responsável */}
                          {task.assignedTo && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              {task.assignedTo.name}
                            </div>
                          )}
                        </div>

                        {/* Criador e data de criação */}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          {task.createdBy && (
                            <span>Criado por: {task.createdBy.name}</span>
                          )}
                          <span>•</span>
                          <span>{formatDateTime(task.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* AGENDA - PRÓXIMOS VENCIMENTOS */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                  PRÓXIMOS VENCIMENTOS
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Tarefas com datas próximas
                </p>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  </div>
                ) : allTasks
                  .filter(task => task.dueDate && !isTaskOverdue(task))
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                  .slice(0, 8)
                  .map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg hover:shadow-md transition-all cursor-pointer group ${isTaskDueSoon(task) ? 'border-orange-200 bg-orange-50/50' : 'border-gray-200 bg-white'
                        }`}
                      onClick={() => navigateToAgenda(task)}
                    >
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2 flex-1">
                            {task.title}
                          </p>
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 ml-2 flex-shrink-0" />
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className={`h-4 w-4 ${isTaskDueSoon(task) ? 'text-orange-500' : 'text-green-500'
                            }`} />
                          <span className={`text-sm font-medium ${isTaskDueSoon(task) ? 'text-orange-600' : 'text-green-600'
                            }`}>
                            {new Date(task.dueDate!).toLocaleDateString('pt-BR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                            {isTaskDueSoon(task) && ' ⏳'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {task.column && (
                            <Badge variant="outline" className={getStatusColor(task.column.title)}>
                              {task.column.title}
                            </Badge>
                          )}
                          <Badge variant="outline" className={getPriorityColor(task.priority)}>
                            {getPriorityText(task.priority)}
                          </Badge>
                          {task.assignedTo && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              {task.assignedTo.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {!loading && allTasks.filter(task => task.dueDate && !isTaskOverdue(task)).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>Nenhuma tarefa com data de vencimento futura</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ações Rápidas */}
        <Card className="mt-6 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              AÇÕES RÁPIDAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={navigateToKanban}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nova Tarefa no Kanban
              </Button>
              {(user.role === 'ADMIN' || user.role === 'MASTER') && (
                <Button
                  onClick={navigateToUserManagement}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Gerenciar Usuários
                </Button>
              )}
              <Button
                onClick={() => fetchAllTasks()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Atualizar Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
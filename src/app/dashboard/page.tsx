/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Calendar, Clock, LogOut, Search, User, ArrowRight, Image, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  createdAt: string;
  priority: number;
  scheduledAt: string;
  completedAt?: string;
  taskImages: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
  taskAudios: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
  taskVideos: Array<{
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState<string>('');
  const router = useRouter();

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔐 Verificando autenticação...');
      
      const token = localStorage.getItem('auth_token');
      console.log('📋 Token no localStorage:', token ? 'present' : 'missing');
      
      if (!token) {
        console.log('❌ Token não encontrado, redirecionando para login');
        router.push('/login');
        return;
      }

      try {
        // Tentar carregar tarefas - se funcionar, o token é válido
        console.log('📡 Verificando token carregando tarefas...');
        await fetchAllTasks(token);
        
        // Se chegou aqui, o token é válido
        console.log('✅ Token válido - usuário autenticado');
        
        // Tentar carregar perfil (pode falhar se o endpoint não existir)
        try {
          const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (profileResponse.ok) {
            const userData = await profileResponse.json();
            setUser(userData);
          } else {
            console.warn('⚠️ Endpoint /auth/profile não disponível, usando dados básicos');
            setUser({
              id: 'unknown',
              name: 'Usuário',
              email: 'santosray62@gmail.com',
              role: 'user',
              status: 'active'
            });
          }
        } catch (profileError) {
          console.warn('⚠️ Erro ao carregar perfil:', profileError);
          setUser({
            id: 'unknown',
            name: 'Usuário',
            email: 'santosray62@gmail.com',
            role: 'user',
            status: 'active'
          });
        }
        
      } catch (error) {
        console.error('❌ Erro na autenticação:', error);
        localStorage.removeItem('auth_token');
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Buscar tarefas
  const fetchAllTasks = async (token?: string) => {
    const authToken = token || localStorage.getItem('auth_token');
    if (!authToken) {
      throw new Error('Token não disponível');
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token inválido');
        }
        throw new Error(`Erro: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setAllTasks(data);
      } else if (data.tasks && Array.isArray(data.tasks)) {
        setAllTasks(data.tasks);
      } else {
        setAllTasks([]);
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar tarefas:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const isCompleted = task.column?.title?.toLowerCase().includes('concluído') || 
                       task.column?.title?.toLowerCase().includes('finalizado') ||
                       task.column?.title?.toLowerCase().includes('pronto');
    return dueDate < today && !isCompleted;
  };

  const isTaskDueSoon = (task: Task) => {
    if (!task.dueDate || isTaskOverdue(task)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  const hasAttachments = (task: Task) => {
    return task.taskImages.length > 0 || task.taskAudios.length > 0 || task.taskVideos.length > 0;
  };

  const getFilteredTasks = () => {
    let filtered = allTasks;
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
      default:
        filtered = allTasks;
    }
    if (search) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase()) ||
        task.column?.title?.toLowerCase().includes(search.toLowerCase()) ||
        task.assignedTo?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return filtered;
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      localStorage.removeItem('auth_token');
      router.push('/login');
    }
  };

  const navigateToAgenda = (task: Task) => {
    const taskData = {
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      column: task.column,
      priority: task.priority,
      assignedTo: task.assignedTo,
      taskImages: task.taskImages,
      taskAudios: task.taskAudios,
      taskVideos: task.taskVideos
    };
    const encodedTask = encodeURIComponent(JSON.stringify(taskData));
    router.push(`/agenda?task=${encodedTask}`);
  };

  const navigateToTaskDetails = (task: Task) => {
    router.push(`/tasks/${task.id}`);
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

  const filteredTasks = getFilteredTasks();
  const overdueTasksCount = allTasks.filter(task => isTaskOverdue(task)).length;
  const dueSoonTasksCount = allTasks.filter(task => isTaskDueSoon(task)).length;
  const withAttachmentsCount = allTasks.filter(task => hasAttachments(task)).length;
  const highPriorityCount = allTasks.filter(task => task.priority >= 4).length;
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(task => 
    task.column?.title?.toLowerCase().includes('concluído') || 
    task.column?.title?.toLowerCase().includes('finalizado') ||
    task.column?.title?.toLowerCase().includes('pronto')
  ).length;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-500 mt-2">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">ELO PRODUTIVO</h1>
            <p className="text-lg text-gray-600">
              Bem-vindo, <strong>{user.name}</strong>
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
            {user.company && (
              <p className="text-sm text-gray-500">Empresa: {user.company.name}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => fetchAllTasks()}
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              {loading ? 'Carregando...' : 'Recarregar'}
            </Button>
            <Button onClick={logout} variant="outline" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total de Tarefas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{overdueTasksCount}</div>
              <div className="text-sm text-gray-600">Atrasadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{dueSoonTasksCount}</div>
              <div className="text-sm text-gray-600">Próximas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-sm text-gray-600">Concluídas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{highPriorityCount}</div>
              <div className="text-sm text-gray-600">Alta Prioridade</div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
            <Button onClick={() => fetchAllTasks()} variant="outline" size="sm" className="mt-2">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Filtros e Busca */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar tarefas por título, descrição, status ou responsável..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Todas</Button>
                <Button variant={filter === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('overdue')} className={overdueTasksCount > 0 ? 'bg-red-100 text-red-800 hover:bg-red-200' : ''}>
                  <AlertTriangle className="h-4 w-4 mr-1" />Atrasadas {overdueTasksCount > 0 && `(${overdueTasksCount})`}
                </Button>
                <Button variant={filter === 'due-soon' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('due-soon')} className={dueSoonTasksCount > 0 ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' : ''}>
                  <Clock className="h-4 w-4 mr-1" />Próximas ({dueSoonTasksCount})
                </Button>
                <Button variant={filter === 'with-attachments' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('with-attachments')}>
                  <Image className="h-4 w-4 mr-1" />Anexos ({withAttachmentsCount})
                </Button>
                <Button variant={filter === 'high-priority' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('high-priority')} className={highPriorityCount > 0 ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' : ''}>
                  <AlertTriangle className="h-4 w-4 mr-1" />Alta Prioridade ({highPriorityCount})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo principal */}
        {!error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ATIVIDADES */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />ATIVIDADES</CardTitle>
                <p className="text-sm text-gray-600">{loading ? 'Carregando...' : `${filteredTasks.length} tarefas`}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Carregando...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma tarefa encontrada</p>
                    <Button onClick={() => {setFilter('all'); setSearch('');}} variant="outline" size="sm" className="mt-2">
                      Limpar filtros
                    </Button>
                  </div>
                ) : (
                  filteredTasks.slice(0, 8).map((task) => (
                    <div 
                      key={task.id} 
                      className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group ${
                        isTaskOverdue(task) ? 'border-red-200 bg-red-50' : 
                        isTaskDueSoon(task) ? 'border-orange-200 bg-orange-50' : 
                        task.priority >= 4 ? 'border-purple-200 bg-purple-50' : ''
                      }`} 
                      onClick={() => navigateToTaskDetails(task)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900 group-hover:text-blue-600 truncate">
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
                          {(task.taskImages.length > 0 || task.taskAudios.length > 0 || task.taskVideos.length > 0) && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              {task.taskImages.length > 0 && <Image className="h-3 w-3" />}
                              {/* {task.taskAudios.length > 0 &&S <span> <} */}
                              {task.taskVideos.length > 0 && <Video className="h-3 w-3" />}
                              <span>
                                {task.taskImages.length + task.taskAudios.length + task.taskVideos.length}
                              </span>
                            </div>
                          )}
                          
                          {/* Data de vencimento */}
                          {task.dueDate && (
                            <div className={`flex items-center gap-1 text-xs ${
                              isTaskOverdue(task) ? 'text-red-600 font-semibold' : 
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
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* AGENDA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />AGENDA</CardTitle>
                <p className="text-sm text-gray-600">Próximos vencimentos</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  </div>
                ) : allTasks
                  .filter(task => task.dueDate)
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                  .slice(0, 6)
                  .map((task) => (
                  <div 
                    key={task.id} 
                    className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group ${
                      isTaskOverdue(task) ? 'border-red-200 bg-red-50' : 
                      isTaskDueSoon(task) ? 'border-orange-200 bg-orange-50' : ''
                    }`} 
                    onClick={() => navigateToTaskDetails(task)}
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2">
                          {task.title}
                        </p>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 ml-2 flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className={`h-3 w-3 ${
                          isTaskOverdue(task) ? 'text-red-500' : 
                          isTaskDueSoon(task) ? 'text-orange-500' : 
                          'text-gray-400'
                        }`} />
                        <span className={`text-xs ${
                          isTaskOverdue(task) ? 'text-red-600 font-semibold' : 
                          isTaskDueSoon(task) ? 'text-orange-600 font-semibold' : 
                          'text-gray-500'
                        }`}>
                          {new Date(task.dueDate!).toLocaleDateString('pt-BR', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                          {isTaskOverdue(task) && ' ⚠️'}
                          {isTaskDueSoon(task) && !isTaskOverdue(task) && ' ⏳'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {task.column && (
                          <Badge variant="outline" className={getStatusColor(task.column.title)}>
                            {task.column.title}
                          </Badge>
                        )}
                        {task.assignedTo && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            {task.assignedTo.name}
                          </div>
                        )}
                        <Badge variant="outline" className={getPriorityColor(task.priority)}>
                          {getPriorityText(task.priority)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {!loading && allTasks.filter(task => task.dueDate).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma tarefa com data de vencimento</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Área para coleções */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>COLECÕES EM DESENVOLVIMENTO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Área para novas coleções e produtos</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => router.push('/collections')}
              >
                Gerenciar Coleções
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
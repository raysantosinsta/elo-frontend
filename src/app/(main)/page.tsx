/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Calendar, Clock, LogOut, Search, User, ArrowRight, Image, Video, Music, Users, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react'; // Importei useCallback
import { useAuth } from '@/contexts/AuthContext'; // ajuste o caminho conforme sua estrutura

// Tipos: Mantidos (melhorando legibilidade com TypeScript)
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

const API_BASE_URL = process.env.NEXT_PUBLIC_NESTJS_API_URL || 'http://localhost:3000';

// Definição de Cores da Paleta (Mantida para referência)
const PALETTE = {
  GRAPHITE: '#2D3436', 
  ALGODAO_CRU: '#F5F0E6', 
  TERRACOTA: '#D35400', 
  AREIA: '#95A5A6', 
  AZUL_PETROLEO: '#2C3E50', 
};

// Funções de Estilo (Mantidas)
const getStatusClasses = (columnTitle?: string) => {
  // ... lógica de cores de status
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
  // ... lógica de cores de prioridade
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
  // ... lógica de texto de prioridade
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
  const { authFetch } = useAuth(); // Hook de autenticação

  // Lógicas de Negócio (Mantidas)
  const isTaskOverdue = (task: Task) => {
    // ...
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
    // ...
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
    // ...
    const imagesCount = task.taskImages?.length || 0;
    const audiosCount = task.taskAudios?.length || 0;
    const videosCount = task.taskVideos?.length || 0;
    return imagesCount > 0 || audiosCount > 0 || videosCount > 0;
  };

  const formatDate = (dateString: string) => {
    // ...
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    // ...
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 🚨 CORREÇÃO: Definição de fetchAllTasks usando useCallback para estabilidade
  const fetchAllTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authFetch(`${API_BASE_URL}/tasks`);
      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          setAllTasks([]);
          return;
        }
        throw new Error(`Erro ao buscar tarefas: ${response.status}`);
      }
      const data = await response.json();
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
      if (error.message.includes('401') || error.message.includes('Autenticação') || error.message.includes('token')) {
        localStorage.removeItem('accessToken');
        router.push('/login');
        return;
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        setError('Erro de conexão. Verifique se o servidor está rodando.');
      } else if (error.message.includes('404') || error.message.includes('400')) {
        setAllTasks([]);
      } else {
        setError(error.message || 'Erro ao carregar tarefas');
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, router]); // Adicionando dependências: authFetch e router

  // Efeito para Carregar Dados (Agora chama fetchAllTasks corretamente)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const profileResponse = await authFetch(`${API_BASE_URL}/auth/profile`);
        if (profileResponse.ok) {
          setUser(await profileResponse.json());
        } else {
          setUser({ id: 'unknown', name: 'Usuário', email: 'usuario@empresa.com', role: 'user', status: 'active' });
        }
        
        // Chamada da função fetchAllTasks
        await fetchAllTasks(); 

      } catch (error) {
        console.error('❌ Erro na autenticação:', error);
        localStorage.removeItem('accessToken');
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router, authFetch, fetchAllTasks]); // fetchAllTasks agora é uma dependência do useEffect

  // Funções de Navegação (Mantidas)
  const navigateToAgenda = (task: Task) => {
    // ...
    const focusDate = task.dueDate || task.createdAt
      ? new Date(task.dueDate || task.createdAt!).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    router.push(`/agenda?focusDate=${focusDate}&highlightTask=${task.id}`);
  };

  const navigateToKanban = () => {
    router.push('/Kanban');
  };

  const navigateToUserManagement = () => {
    router.push('/signup');
  };

  const logout = async () => {
    // ...
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
    } catch (error) {
      console.log('ℹ️ Erro (esperado) ou Endpoint de logout não disponível, continuando...');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  };

  // Funções de Busca e Filtro (Mantidas)
  const getFilteredTasks = () => {
    // ...
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

  // Estatísticas e Retorno JSX (Mantidos)
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
      <div className="flex items-center justify-center min-h-screen bg-algodao-cru">
        <div className="text-center" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-azul-petroleo mx-auto"></div>
          <p className="text-grafite mt-3 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-algodao-cru p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" role="banner">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-extrabold text-grafite mb-2 tracking-tight">
              ELO PRODUTIVO
            </h1>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <p className="text-lg text-grafite">
                Bem-vindo(a), <strong className="font-semibold text-azul-petroleo">{user.name}</strong>
              </p>
              <Badge 
                className={`text-sm font-medium ${
                  user.role === 'ADMIN' || user.role === 'MASTER' 
                    ? 'bg-terracota text-white hover:bg-terracota/80' 
                    : 'bg-areia/50 text-grafite hover:bg-areia/80'
                }`}
                aria-label={`Nível de acesso: ${user.role}`}
              >
                {user.role}
              </Badge>
            </div>
            <p className="text-sm text-areia-escuro">{user.email}</p>
            {user.company && (
              <p className="text-sm text-areia-escuro">Empresa: {user.company.name}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(user.role === 'ADMIN' || user.role === 'MASTER') && (
              <Button
                onClick={navigateToUserManagement}
                aria-label="Gerenciar Usuários"
                className="flex items-center gap-2 bg-azul-petroleo text-white hover:bg-azul-petroleo/90 transition-all duration-300"
              >
                <Users className="h-4 w-4" />
                Gerenciar Usuários
              </Button>
            )}
            <Button
              onClick={navigateToKanban}
              aria-label="Ver Kanban (Quadro de Tarefas)"
              className="flex items-center gap-2 bg-terracota text-white hover:bg-terracota/90 transition-all duration-300"
            >
              <Plus className="h-4 w-4" />
              Novo / Kanban
            </Button>
            <Button
              onClick={fetchAllTasks} 
              variant="outline"
              size="sm"
              disabled={loading}
              aria-label="Atualizar lista de tarefas"
              className={`border-areia text-grafite hover:bg-areia/30 transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
            <Button 
              onClick={logout} 
              variant="outline" 
              className="flex items-center gap-2 border-areia text-grafite hover:bg-areia/30 transition-all duration-300"
              aria-label="Sair da aplicação"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </header>

        <hr className="border-areia mb-6" />

        {/* Estatísticas */}
        <h2 className="sr-only">Estatísticas do Dashboard</h2>
        {/* ... (Conteúdo de Estatísticas) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <Card className="bg-white border-b-2 border-azul-petroleo hover:shadow-lg transition-shadow duration-300" role="region" aria-label="Total de Tarefas">
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-grafite">{totalTasks}</div>
              <div className="text-xs md:text-sm text-areia-escuro mt-1">Total</div>
            </CardContent>
          </Card>
          <Card className={`bg-white border-b-2 ${overdueTasksCount > 0 ? 'border-red-500' : 'border-areia'} hover:shadow-lg transition-shadow duration-300`} role="region" aria-label={`Tarefas Atrasadas: ${overdueTasksCount}`}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl md:text-3xl font-extrabold ${overdueTasksCount > 0 ? 'text-red-600' : 'text-grafite'}`}>
                {overdueTasksCount}
              </div>
              <div className="text-xs md:text-sm text-areia-escuro mt-1">Atrasadas</div>
            </CardContent>
          </Card>
          <Card className={`bg-white border-b-2 ${dueSoonTasksCount > 0 ? 'border-orange-500' : 'border-areia'} hover:shadow-lg transition-shadow duration-300`} role="region" aria-label={`Tarefas Próximas do Vencimento: ${dueSoonTasksCount}`}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl md:text-3xl font-extrabold ${dueSoonTasksCount > 0 ? 'text-orange-600' : 'text-grafite'}`}>
                {dueSoonTasksCount}
              </div>
              <div className="text-xs md:text-sm text-areia-escuro mt-1">Próximas</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-b-2 border-green-500 hover:shadow-lg transition-shadow duration-300" role="region" aria-label={`Tarefas Concluídas: ${completedTasks}`}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-green-600">{completedTasks}</div>
              <div className="text-xs md:text-sm text-areia-escuro mt-1">Concluídas</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-b-2 border-purple-500 hover:shadow-lg transition-shadow duration-300" role="region" aria-label={`Tarefas de Alta Prioridade: ${highPriorityCount}`}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-purple-600">{highPriorityCount}</div>
              <div className="text-xs md:text-sm text-areia-escuro mt-1">Alta Prioridade</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-b-2 border-indigo-500 hover:shadow-lg transition-shadow duration-300" role="region" aria-label={`Minhas Tarefas: ${myTasksCount}`}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-indigo-600">{myTasksCount}</div>
              <div className="text-xs md:text-sm text-areia-escuro mt-1">Minhas Tarefas</div>
            </CardContent>
          </Card>
        </div>
        {/* Fim Conteúdo de Estatísticas */}

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
        {/* ... (Conteúdo de Filtros e Busca) */}
        <Card className="mb-8 bg-white shadow-md border-t-4 border-azul-petroleo/50" role="search" aria-label="Busca e Filtros de Tarefas">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-areia" />
                  <Input
                    placeholder="Buscar por título, status, responsável..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-algodao-cru/70 border-areia focus:border-azul-petroleo text-grafite placeholder:text-areia-escuro transition-all duration-300"
                    aria-label="Campo de busca de tarefas"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-start sm:justify-end">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                  className={filter === 'all' ? 'bg-azul-petroleo hover:bg-azul-petroleo/90 text-white transition-colors duration-300' : 'border-areia text-grafite hover:bg-areia/30 transition-colors duration-300'}
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
        {/* Fim Conteúdo de Filtros e Busca */}


        {/* Conteúdo principal */}
        {!error && (
          <main className="grid grid-cols-1 xl:grid-cols-2 gap-6" role="main">
            {/* ATIVIDADES RECENTES */}
            <Card className="bg-white shadow-xl rounded-xl" role="region" aria-labelledby="heading-recentes">
              <CardHeader className="pb-3 border-b border-areia/50">
                <CardTitle id="heading-recentes" className="flex items-center gap-2 text-xl font-bold text-grafite">
                  <Clock className="h-5 w-5 text-azul-petroleo" />
                  ATIVIDADES RECENTES
                </CardTitle>
                <p className="text-sm text-areia-escuro">
                  {loading ? 'Carregando...' : `${filteredTasks.length} tarefas ${filter !== 'all' ? 'filtradas' : 'recentes'}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8" role="status" aria-live="polite">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-petroleo mx-auto"></div>
                    <p className="text-areia-escuro mt-2">Carregando tarefas...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-areia-escuro">
                    <p className="mb-2">Nenhuma tarefa encontrada com os filtros/busca atuais.</p>
                    <Button
                      onClick={() => { setFilter('all'); setSearch(''); }}
                      variant="outline"
                      size="sm"
                      className="mt-2 border-areia text-grafite hover:bg-areia/30 transition-colors duration-300"
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
                          className={`flex items-start gap-4 p-3 border rounded-lg transition-all duration-300 shadow-sm block focus:outline-none focus:ring-2 focus:ring-terracota/50 group 
                            ${isTaskOverdue(task) ? 'border-red-300 bg-red-50/70 hover:bg-red-100' :
                              isTaskDueSoon(task) ? 'border-orange-300 bg-orange-50/70 hover:bg-orange-100' :
                                task.priority >= 4 ? 'border-purple-300 bg-purple-50/70 hover:bg-purple-100' :
                                  'border-areia/50 bg-white hover:shadow-md'
                            }`}
                          role="link"
                          aria-label={`Ver detalhes da tarefa: ${task.title}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-grafite group-hover:text-azul-petroleo line-clamp-2 transition-colors duration-300">
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-sm text-areia-escuro mt-1 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              <ArrowRight className="h-4 w-4 text-areia-escuro group-hover:text-terracota ml-2 flex-shrink-0 mt-1 transition-colors duration-300" />
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
                                <div className="flex items-center gap-1 text-xs text-areia-escuro">
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
                                      'text-areia-escuro'
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
                                <div className="flex items-center gap-1 text-xs text-areia-escuro" aria-label={`Responsável: ${task.assignedTo.name}`}>
                                  <User className="h-3 w-3" />
                                  {task.assignedTo.name}
                                </div>
                              )}
                            </div>

                            {/* Criador e data de criação */}
                            <div className="flex items-center gap-2 mt-2 text-xs text-areia">
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
              <CardHeader className="pb-3 border-b border-areia/50">
                <CardTitle id="heading-vencimentos" className="flex items-center gap-2 text-xl font-bold text-grafite">
                  <Calendar className="h-5 w-5 text-terracota" />
                  PRÓXIMOS VENCIMENTOS
                </CardTitle>
                <p className="text-sm text-areia-escuro">
                  Tarefas não concluídas com datas de vencimento próximas
                </p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8" role="status">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terracota mx-auto"></div>
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
                            className={`flex items-start gap-4 p-3 border rounded-lg transition-all duration-300 shadow-sm block focus:outline-none focus:ring-2 focus:ring-terracota/50 group
                              ${isTaskDueSoon(task) ? 'border-orange-300 bg-orange-50/70 hover:bg-orange-100' : 'border-areia/50 bg-white hover:shadow-md'
                              }`}
                            role="link"
                            aria-label={`Ver detalhes da tarefa: ${task.title}, Vencimento: ${formatDate(task.dueDate!)}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-1">
                                <p className="font-semibold text-grafite group-hover:text-terracota line-clamp-2 flex-1 transition-colors duration-300">
                                  {task.title}
                                </p>
                                <ArrowRight className="h-4 w-4 text-areia-escuro group-hover:text-terracota ml-2 flex-shrink-0 transition-colors duration-300" />
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
                                <div className="flex items-center gap-1 mt-1 text-xs text-areia-escuro" aria-label={`Responsável: ${task.assignedTo.name}`}>
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


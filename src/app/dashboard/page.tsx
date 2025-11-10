// /* eslint-disable @typescript-eslint/no-explicit-any */
// 'use client';

// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Checkbox } from '@/components/ui/checkbox';
// import { Input } from '@/components/ui/input';
// import { supabase } from '@/lib/supabaseClient';
// import { AlertTriangle, Calendar, Clock, LogOut, Search, User } from 'lucide-react';
// import { useRouter } from 'next/navigation';
// import { useEffect, useState } from 'react';

// interface Task {
//   id: string;
//   title: string;
//   description?: string;
//   status: string;
//   dueDate?: string;
//   assignedTo?: {
//     id: string;
//     name: string;
//   };
//   createdAt: string;
// }

// // URL base da sua API NestJS
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// export default function DashboardPage() {
//   const [user, setUser] = useState<any>(null);
//   const [allTasks, setAllTasks] = useState<Task[]>([]); // Todas as tarefas
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [filter, setFilter] = useState('all');
//   const [error, setError] = useState<string>('');
//   const router = useRouter();

//   // Verificar autenticação
//   useEffect(() => {
//     const checkAuth = async () => {
//       console.log('🔐 Verificando autenticação...');
//       const { data: { user }, error } = await supabase.auth.getUser();
      
//       if (error) {
//         console.error('❌ Erro na autenticação:', error);
//         router.push('/login');
//         return;
//       }
      
//       if (!user) {
//         console.log('❌ Usuário não autenticado');
//         router.push('/login');
//         return;
//       }
      
//       console.log('✅ Usuário autenticado:', user.email);
//       setUser(user);
//       await fetchAllTasks(); // Buscar todas as tarefas
//     };

//     checkAuth();
//   }, [router]);

//   // Buscar TODAS as tarefas da API NestJS
//   const fetchAllTasks = async () => {
//     if (!user) return;
    
//     setLoading(true);
//     setError('');
//     console.log('📡 Buscando todas as tarefas...');
    
//     try {
//       const url = `${API_BASE_URL}/tasks`;
//       console.log('🌐 Fazendo request para:', url);
      
//       const response = await fetch(url);
//       console.log('📨 Response status:', response.status);
      
//       if (!response.ok) {
//         throw new Error(`Erro HTTP: ${response.status}`);
//       }
      
//       const data = await response.json();
//       console.log('📦 Dados recebidos:', data);
      
//       // Ajuste baseado na estrutura do seu backend
//       if (Array.isArray(data)) {
//         setAllTasks(data);
//         console.log(`✅ ${data.length} tarefas carregadas`);
//       } else if (data.tasks && Array.isArray(data.tasks)) {
//         setAllTasks(data.tasks);
//         console.log(`✅ ${data.tasks.length} tarefas carregadas`);
//       } else {
//         console.warn('⚠️ Formato de dados inesperado:', data);
//         setAllTasks([]);
//       }
//     } catch (error) {
//       console.error('❌ Erro ao buscar tarefas:', error);
//       setError('Erro ao carregar tarefas. Verifique se o servidor NestJS está rodando na porta 3001.');
//     } finally {
//       setLoading(false);
//       console.log('🏁 Carregamento finalizado');
//     }
//   };

//   // Verificar se uma tarefa está atrasada
//   const isTaskOverdue = (task: Task) => {
//     if (!task.dueDate) return false;
    
//     const today = new Date();
//     today.setHours(0, 0, 0, 0); // Começo do dia de hoje
    
//     const dueDate = new Date(task.dueDate);
//     dueDate.setHours(0, 0, 0, 0);
    
//     return dueDate < today && task.status !== 'Concluído';
//   };

//   // Filtrar tarefas baseado no filtro selecionado
//   const getFilteredTasks = () => {
//     let filtered = allTasks;

//     // Aplicar filtro
//     switch (filter) {
//       case 'overdue':
//         filtered = allTasks.filter(task => isTaskOverdue(task));
//         break;
//       case 'todo':
//         filtered = allTasks.filter(task => task.status === 'A Fazer');
//         break;
//       case 'doing':
//         filtered = allTasks.filter(task => task.status === 'Em Andamento');
//         break;
//       case 'done':
//         filtered = allTasks.filter(task => task.status === 'Concluído');
//         break;
//       default:
//         // 'all' - mostra todas
//         filtered = allTasks;
//     }

//     // Aplicar busca
//     if (search) {
//       filtered = filtered.filter(task =>
//         task.title.toLowerCase().includes(search.toLowerCase()) ||
//         task.description?.toLowerCase().includes(search.toLowerCase())
//       );
//     }

//     return filtered;
//   };

//   // Recarregar tarefas quando o filtro mudar
//   useEffect(() => {
//     if (user && allTasks.length === 0) {
//       fetchAllTasks();
//     }
//   }, [filter, user]);

//   // Logout
//   const logout = async () => {
//     await supabase.auth.signOut();
//     router.push('/login');
//   };

//   // Atualizar status da tarefa
//   const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
//     try {
//       const newStatus = currentStatus === 'Concluído' ? 'A Fazer' : 'Concluído';
      
//       const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ status: newStatus }),
//       });

//       if (response.ok) {
//         fetchAllTasks(); // Recarrega todas as tarefas
//       }
//     } catch (error) {
//       console.error('Erro ao atualizar status:', error);
//     }
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'Concluído': return 'bg-green-100 text-green-800';
//       case 'Em Andamento': return 'bg-blue-100 text-blue-800';
//       case 'A Fazer': return 'bg-gray-100 text-gray-800';
//       default: return 'bg-gray-100 text-gray-800';
//     }
//   };

//   const filteredTasks = getFilteredTasks();
//   const overdueTasksCount = allTasks.filter(task => isTaskOverdue(task)).length;

//   // Se ainda está carregando ou não tem usuário
//   if (!user) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
//           <p className="text-gray-500 mt-2">Verificando autenticação...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-6xl mx-auto">
        
//         {/* Header com informações do usuário */}
//         <div className="mb-8 flex justify-between items-center">
//           <div>
//             <h1 className="text-4xl font-bold text-gray-900 mb-2">
//               ELO PRODUTIVO
//             </h1>
//             <p className="text-lg text-gray-600">
//               Bem-vindo, <strong>{user.user_metadata?.name || user.email}</strong>
//             </p>
//             <p className="text-sm text-gray-500">
//               {user.email}
//             </p>
//           </div>
          
//           <div className="flex items-center gap-4">
//             <Button 
//               onClick={fetchAllTasks}
//               variant="outline" 
//               size="sm"
//               disabled={loading}
//             >
//               {loading ? 'Carregando...' : 'Recarregar'}
//             </Button>
//             <Button 
//               onClick={logout} 
//               variant="outline" 
//               className="flex items-center gap-2"
//             >
//               <LogOut className="h-4 w-4" />
//               Sair
//             </Button>
//           </div>
//         </div>

//         {/* Mensagem de erro */}
//         {error && (
//           <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
//             <p className="text-red-700">{error}</p>
//             <div className="mt-2 space-y-2">
//               <p className="text-sm text-red-600">
//                 Verifique se:
//               </p>
//               <ul className="text-sm text-red-600 list-disc list-inside">
//                 <li>O servidor NestJS está rodando na porta 3001</li>
//                 <li>A URL da API está correta: {API_BASE_URL}</li>
//                 <li>O CORS está configurado no NestJS</li>
//               </ul>
//             </div>
//             <Button 
//               onClick={fetchAllTasks}
//               variant="outline" 
//               size="sm" 
//               className="mt-2"
//             >
//               Tentar novamente
//             </Button>
//           </div>
//         )}

//         {/* Filtros e Busca */}
//         <Card className="mb-6">
//           <CardContent className="p-4">
//             <div className="flex flex-col sm:flex-row gap-4 items-center">
//               <div className="flex-1 w-full">
//                 <div className="relative">
//                   <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//                   <Input
//                     placeholder="Buscar tarefas..."
//                     value={search}
//                     onChange={(e) => setSearch(e.target.value)}
//                     className="pl-10"
//                   />
//                 </div>
//               </div>
              
//               <div className="flex gap-2 flex-wrap">
//                 <Button
//                   variant={filter === 'all' ? 'default' : 'outline'}
//                   size="sm"
//                   onClick={() => setFilter('all')}
//                 >
//                   Todas
//                 </Button>
//                 <Button
//                   variant={filter === 'overdue' ? 'default' : 'outline'}
//                   size="sm"
//                   onClick={() => setFilter('overdue')}
//                   className={overdueTasksCount > 0 ? 'bg-red-100 text-red-800 hover:bg-red-200' : ''}
//                 >
//                   <AlertTriangle className="h-4 w-4 mr-1" />
//                   Atrasadas {overdueTasksCount > 0 && `(${overdueTasksCount})`}
//                 </Button>
//                 <Button
//                   variant={filter === 'todo' ? 'default' : 'outline'}
//                   size="sm"
//                   onClick={() => setFilter('todo')}
//                 >
//                   A Fazer
//                 </Button>
//                 <Button
//                   variant={filter === 'doing' ? 'default' : 'outline'}
//                   size="sm"
//                   onClick={() => setFilter('doing')}
//                 >
//                   Em Andamento
//                 </Button>
//                 <Button
//                   variant={filter === 'done' ? 'default' : 'outline'}
//                   size="sm"
//                   onClick={() => setFilter('done')}
//                 >
//                   Concluídas
//                 </Button>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Conteúdo principal */}
//         {!error && (
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
//             {/* Coluna 1 - ATIVIDADES */}
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <Clock className="h-5 w-5" />
//                   ATIVIDADES
//                 </CardTitle>
//                 <p className="text-sm text-gray-600">
//                   {loading ? 'Carregando...' : `${filteredTasks.length} tarefas encontradas`}
//                   {filter === 'overdue' && overdueTasksCount > 0 && (
//                     <span className="text-red-600 font-semibold ml-2">
//                       ⚠️ {overdueTasksCount} tarefas atrasadas
//                     </span>
//                   )}
//                 </p>
//               </CardHeader>
//               <CardContent className="space-y-3">
//                 {loading ? (
//                   <div className="text-center py-8">
//                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
//                     <p className="text-gray-500 mt-2">Carregando tarefas...</p>
//                   </div>
//                 ) : filteredTasks.length === 0 ? (
//                   <div className="text-center py-8 text-gray-500">
//                     <p>Nenhuma tarefa encontrada</p>
//                     <Button 
//                       onClick={fetchAllTasks}
//                       variant="outline" 
//                       size="sm" 
//                       className="mt-2"
//                     >
//                       Recarregar
//                     </Button>
//                   </div>
//                 ) : (
//                   filteredTasks.slice(0, 8).map((task) => (
//                     <div
//                       key={task.id}
//                       className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
//                         isTaskOverdue(task) ? 'border-red-200 bg-red-50' : ''
//                       }`}
//                     >
//                       <Checkbox
//                         checked={task.status === 'Concluído'}
//                         onCheckedChange={() => toggleTaskStatus(task.id, task.status)}
//                       />
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-start justify-between">
//                           <p className={`font-medium ${
//                             task.status === 'Concluído' ? 'line-through text-gray-500' : 'text-gray-900'
//                           }`}>
//                             {task.title}
//                           </p>
//                           {isTaskOverdue(task) && (
//                             <Badge variant="destructive" className="ml-2 flex-shrink-0">
//                               <AlertTriangle className="h-3 w-3 mr-1" />
//                               Atrasada
//                             </Badge>
//                           )}
//                         </div>
//                         {task.description && (
//                           <p className="text-sm text-gray-600 mt-1">{task.description}</p>
//                         )}
//                         <div className="flex items-center gap-4 mt-2">
//                           <Badge variant="outline" className={getStatusColor(task.status)}>
//                             {task.status}
//                           </Badge>
//                           {task.dueDate && (
//                             <div className={`flex items-center gap-1 text-xs ${
//                               isTaskOverdue(task) ? 'text-red-600 font-semibold' : 'text-gray-500'
//                             }`}>
//                               <Calendar className="h-3 w-3" />
//                               {new Date(task.dueDate).toLocaleDateString('pt-BR')}
//                               {isTaskOverdue(task) && ' ⚠️'}
//                             </div>
//                           )}
//                           {task.assignedTo && (
//                             <div className="flex items-center gap-1 text-xs text-gray-500">
//                               <User className="h-3 w-3" />
//                               {task.assignedTo.name}
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   ))
//                 )}
//               </CardContent>
//             </Card>

//             {/* Coluna 2 - CALENDÁRIO */}
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <Calendar className="h-5 w-5" />
//                   CALENDÁRIO
//                 </CardTitle>
//                 <p className="text-sm text-gray-600">Próximos compromissos e vencimentos</p>
//               </CardHeader>
//               <CardContent className="space-y-3">
//                 {loading ? (
//                   <div className="text-center py-8">
//                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
//                   </div>
//                 ) : (
//                   allTasks
//                     .filter(task => task.dueDate)
//                     .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
//                     .slice(0, 6)
//                     .map((task) => (
//                       <div
//                         key={task.id}
//                         className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
//                           isTaskOverdue(task) ? 'border-red-200 bg-red-50' : ''
//                         }`}
//                       >
//                         <Checkbox
//                           checked={task.status === 'Concluído'}
//                           onCheckedChange={() => toggleTaskStatus(task.id, task.status)}
//                         />
//                         <div className="flex-1">
//                           <div className="flex items-start justify-between">
//                             <p className={`font-medium ${
//                               task.status === 'Concluído' ? 'line-through text-gray-500' : 'text-gray-900'
//                             }`}>
//                               {task.title}
//                             </p>
//                             {isTaskOverdue(task) && (
//                               <Badge variant="destructive" className="ml-2 flex-shrink-0">
//                                 Atrasada
//                               </Badge>
//                             )}
//                           </div>
//                           <div className="flex items-center gap-2 mt-1">
//                             <Calendar className={`h-3 w-3 ${
//                               isTaskOverdue(task) ? 'text-red-500' : 'text-gray-400'
//                             }`} />
//                             <span className={`text-xs ${
//                               isTaskOverdue(task) ? 'text-red-600 font-semibold' : 'text-gray-500'
//                             }`}>
//                               {new Date(task.dueDate!).toLocaleDateString('pt-BR', {
//                                 weekday: 'long',
//                                 day: 'numeric',
//                                 month: 'long'
//                               })}
//                               {isTaskOverdue(task) && ' ⚠️'}
//                             </span>
//                           </div>
//                         </div>
//                       </div>
//                     ))
//                 )}
//               </CardContent>
//             </Card>
//           </div>
//         )}

//         {/* COLECÕES EM DESENVOLVIMENTO */}
//         <Card className="mt-6">
//           <CardHeader>
//             <CardTitle>COLECÕES EM DESENVOLVIMENTO</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="text-center py-8 text-gray-500">
//               <p>Área para novas coleções e projetos em desenvolvimento</p>
//             </div>
//           </CardContent>
//         </Card>

//       </div>
//     </div>
//   );
// }

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { AlertTriangle, Calendar, Clock, LogOut, Search, User, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Task {
  id: string;
  title: string;
  description?: string;
  statusId?: string | null;
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
  code?: string;
  imageUrl?: string;
  audioUrl?: string;
  fichaTecnica: boolean;
}

// URL base da sua API NestJS
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
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
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ Erro na autenticação:', error);
        router.push('/login');
        return;
      }
      
      if (!user) {
        console.log('❌ Usuário não autenticado');
        router.push('/login');
        return;
      }
      
      console.log('✅ Usuário autenticado:', user.email);
      setUser(user);
      await fetchAllTasks();
    };

    checkAuth();
  }, [router]);

  // Buscar TODAS as tarefas da API NestJS
  const fetchAllTasks = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    console.log('📡 Buscando todas as tarefas...');
    
    try {
      const url = `${API_BASE_URL}/tasks`;
      console.log('🌐 Fazendo request para:', url);
      
      const response = await fetch(url);
      console.log('📨 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Dados recebidos:', data);
      
      if (Array.isArray(data)) {
        setAllTasks(data);
        console.log(`✅ ${data.length} tarefas carregadas`);
      } else if (data.tasks && Array.isArray(data.tasks)) {
        setAllTasks(data.tasks);
        console.log(`✅ ${data.tasks.length} tarefas carregadas`);
      } else {
        console.warn('⚠️ Formato de dados inesperado:', data);
        setAllTasks([]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar tarefas:', error);
      setError('Erro ao carregar tarefas. Verifique se o servidor NestJS está rodando.');
    } finally {
      setLoading(false);
      console.log('🏁 Carregamento finalizado');
    }
  };

  // Verificar se uma tarefa está atrasada
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

  // Verificar se uma tarefa está próxima do vencimento (3 dias)
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

  // Filtrar tarefas baseado no filtro selecionado
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
        filtered = allTasks.filter(task => task.imageUrl || task.audioUrl);
        break;
      default:
        filtered = allTasks;
    }

    if (search) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase()) ||
        task.code?.toLowerCase().includes(search.toLowerCase()) ||
        task.column?.title?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  };

  // Recarregar tarefas quando o filtro mudar
  useEffect(() => {
    if (user && allTasks.length === 0) {
      fetchAllTasks();
    }
  }, [filter, user]);

  // Logout
  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Navegar para a agenda com a tarefa selecionada
  const navigateToAgenda = (task: Task) => {
    const taskData = {
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      code: task.code,
      column: task.column?.title
    };
    
    // Codificar os dados da tarefa para passar via URL
    const encodedTask = encodeURIComponent(JSON.stringify(taskData));
    router.push(`/agenda?task=${encodedTask}`);
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
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTasks = getFilteredTasks();
  const overdueTasksCount = allTasks.filter(task => isTaskOverdue(task)).length;
  const dueSoonTasksCount = allTasks.filter(task => isTaskDueSoon(task)).length;
  const withAttachmentsCount = allTasks.filter(task => task.imageUrl || task.audioUrl).length;

  // Estatísticas para o dashboard
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(task => 
    task.column?.title?.toLowerCase().includes('concluído') || 
    task.column?.title?.toLowerCase().includes('finalizado') ||
    task.column?.title?.toLowerCase().includes('pronto')
  ).length;

  // Se ainda está carregando ou não tem usuário
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header com informações do usuário */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              ELO PRODUTIVO
            </h1>
            <p className="text-lg text-gray-600">
              Bem-vindo, <strong>{user.user_metadata?.name || user.email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              {user.email}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              onClick={fetchAllTasks}
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              {loading ? 'Carregando...' : 'Recarregar'}
            </Button>
            <Button 
              onClick={logout} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total de Tarefas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{overdueTasksCount}</div>
              <div className="text-sm text-gray-600">Tarefas Atrasadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{dueSoonTasksCount}</div>
              <div className="text-sm text-gray-600">Próximas do Vencimento</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-sm text-gray-600">Concluídas</div>
            </CardContent>
          </Card>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
            <Button 
              onClick={fetchAllTasks}
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
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
                    placeholder="Buscar tarefas por título, descrição, código ou coluna..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
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
                  variant={filter === 'overdue' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('overdue')}
                  className={overdueTasksCount > 0 ? 'bg-red-100 text-red-800 hover:bg-red-200' : ''}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Atrasadas {overdueTasksCount > 0 && `(${overdueTasksCount})`}
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
                  variant={filter === 'with-attachments' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('with-attachments')}
                >
                  Com Anexos ({withAttachmentsCount})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo principal */}
        {!error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Coluna 1 - ATIVIDADES */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  ATIVIDADES
                </CardTitle>
                <p className="text-sm text-gray-600">
                  {loading ? 'Carregando...' : `${filteredTasks.length} tarefas encontradas`}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Carregando tarefas...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma tarefa encontrada</p>
                    <Button 
                      onClick={fetchAllTasks}
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                    >
                      Recarregar
                    </Button>
                  </div>
                ) : (
                  filteredTasks.slice(0, 8).map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group ${
                        isTaskOverdue(task) ? 'border-red-200 bg-red-50' : 
                        isTaskDueSoon(task) ? 'border-orange-200 bg-orange-50' : ''
                      }`}
                      onClick={() => navigateToAgenda(task)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 group-hover:text-blue-600">
                              {task.title}
                            </p>
                            {task.code && (
                              <span className="text-xs text-blue-600 font-mono">#{task.code}</span>
                            )}
                          </div>
                          <div className="flex gap-1 items-center">
                            {isTaskOverdue(task) && (
                              <Badge variant="destructive" className="flex-shrink-0">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Atrasada
                              </Badge>
                            )}
                            {isTaskDueSoon(task) && !isTaskOverdue(task) && (
                              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                                <Clock className="h-3 w-3 mr-1" />
                                Próxima
                              </Badge>
                            )}
                            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 ml-2" />
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          {task.column && (
                            <Badge variant="outline" className={getStatusColor(task.column.title)}>
                              {task.column.title}
                            </Badge>
                          )}
                          {!task.column && (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800">
                              Sem coluna
                            </Badge>
                          )}
                          {task.dueDate && (
                            <div className={`flex items-center gap-1 text-xs ${
                              isTaskOverdue(task) ? 'text-red-600 font-semibold' : 
                              isTaskDueSoon(task) ? 'text-orange-600 font-semibold' : 'text-gray-500'
                            }`}>
                              <Calendar className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                              {isTaskOverdue(task) && ' ⚠️'}
                              {isTaskDueSoon(task) && !isTaskOverdue(task) && ' ⏳'}
                            </div>
                          )}
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

            {/* Coluna 2 - AGENDA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  AGENDA
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Clique em uma tarefa para ver na agenda completa
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  </div>
                ) : (
                  allTasks
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
                        onClick={() => navigateToAgenda(task)}
                      >
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <p className="font-medium text-gray-900 group-hover:text-blue-600">
                              {task.title}
                            </p>
                            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 ml-2 flex-shrink-0" />
                          </div>
                          {task.code && (
                            <span className="text-xs text-blue-600 font-mono">#{task.code}</span>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className={`h-3 w-3 ${
                              isTaskOverdue(task) ? 'text-red-500' : 
                              isTaskDueSoon(task) ? 'text-orange-500' : 'text-gray-400'
                            }`} />
                            <span className={`text-xs ${
                              isTaskOverdue(task) ? 'text-red-600 font-semibold' : 
                              isTaskDueSoon(task) ? 'text-orange-600 font-semibold' : 'text-gray-500'
                            }`}>
                              {new Date(task.dueDate!).toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                              })}
                              {isTaskOverdue(task) && ' ⚠️'}
                              {isTaskDueSoon(task) && !isTaskOverdue(task) && ' ⏳'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
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
                          </div>
                        </div>
                      </div>
                    ))
                )}
                {!loading && allTasks.filter(task => task.dueDate).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma tarefa com data definida</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* COLECÕES EM DESENVOLVIMENTO */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>COLECÕES EM DESENVOLVIMENTO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Área para novas coleções e projetos em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
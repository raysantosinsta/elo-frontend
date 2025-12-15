/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api'; // <--- IMPORTANTE: Importando a instância do Axios
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  FilterIcon,
  LayoutListIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

// Interfaces
interface TaskReportItem {
  id: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  priority: number;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  assignedTo?: {
    name: string;
    email: string;
  };
  column?: {
    title: string;
  };
}

interface TaskReportSummary {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgCompletionTime: string;
  byStatus: Array<{ name: string; value: number; color: string }>;
  byPriority: Array<{ name: string; value: number }>;
}

export default function TasksReportPage() {
  // 1. CORREÇÃO: Removemos authFetch daqui
  const { user } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskReportItem[]>([]);
  const [summary, setSummary] = useState<TaskReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Verificar permissão
  useEffect(() => {
    if (user && !['MASTER', 'ADMIN'].includes(user.role)) {
      // router.push('/unauthorized'); 
    }
  }, [user, router]);

  // 2. CORREÇÃO: Usando useCallback e api.get
  const fetchReport = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Construção dos params para o Axios
      const params: any = {};
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter && priorityFilter !== "all") params.priority = priorityFilter;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      // Chamada simplificada
      const { data } = await api.get('/reports-tasks/tasks', { params });
      
      setTasks(data.tasks);
      setSummary(data.summary);
    } catch (error) {
      console.error("Erro ao buscar relatório de tarefas:", error);
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, priorityFilter, startDate, endDate]);

  // Buscar dados do relatório
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge className="bg-green-500 hover:bg-green-600">Concluída</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-blue-500 hover:bg-blue-600">Em Andamento</Badge>;
      case 'PENDING': return <Badge variant="outline" className="bg-gray-100">Pendente</Badge>;
      case 'FAILED': return <Badge variant="destructive">Falhou</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return "text-red-500 bg-red-50 border-red-200";
    if (priority === 3) return "text-amber-500 bg-amber-50 border-amber-200";
    return "text-green-500 bg-green-50 border-green-200";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Gerando relatório de tarefas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Tarefas</h1>
          <p className="text-muted-foreground">
            Visão geral de produtividade, status e prazos da sua equipe.
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{summary?.totalTasks || 0}</div>
              <LayoutListIcon className="h-6 w-6 text-muted-foreground opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">{summary?.completedTasks || 0}</div>
              <CheckCircle2Icon className="h-6 w-6 text-green-500 opacity-80" />
            </div>
            <Progress value={summary?.completionRate || 0} className="mt-2 h-1.5" />
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.completionRate.toFixed(1)}% taxa de conclusão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">{summary?.pendingTasks || 0}</div>
              <ClockIcon className="h-6 w-6 text-blue-500 opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pendentes ou em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-600">{summary?.overdueTasks || 0}</div>
              <AlertTriangleIcon className="h-6 w-6 text-red-500 opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tarefas com prazo vencido
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-8 bg-muted/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FilterIcon className="h-4 w-4" /> Filtros Avançados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                  <SelectItem value="COMPLETED">Concluída</SelectItem>
                  <SelectItem value="FAILED">Falhou</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="1">Baixa (1)</SelectItem>
                  <SelectItem value="3">Média (3)</SelectItem>
                  <SelectItem value="5">Alta (5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="ghost" size="sm" onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setStartDate(undefined);
              setEndDate(undefined);
            }}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo Principal */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">Gráficos e Métricas</TabsTrigger>
          <TabsTrigger value="list">Lista Detalhada</TabsTrigger>
        </TabsList>

        {/* TAB: GRÁFICOS */}
        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de Status */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary?.byStatus || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {summary?.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Prioridade */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Prioridade</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.byPriority || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: LISTA */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Listagem de Tarefas</CardTitle>
              <CardDescription>Visualização detalhada das tarefas filtradas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.length > 0 ? (
                    tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="font-medium">{task.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Criado em: {format(new Date(task.createdAt), 'dd/MM/yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPriorityColor(task.priority)}>
                            Nível {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {task.assignedTo.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.assignedTo.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Não atribuído</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.dueDate ? (
                            <div className={cn("text-sm", 
                              task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date() ? "text-red-600 font-medium" : "text-gray-600"
                            )}>
                              {format(new Date(task.dueDate), 'dd/MM/yyyy')}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/Kanban`)}>
                            <EyeIcon className="h-4 w-4 mr-2" /> Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma tarefa encontrada com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
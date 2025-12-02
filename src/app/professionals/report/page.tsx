// app/professionals/report/page.tsx
'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircleIcon, ClockIcon, DownloadIcon, EyeIcon, FilterIcon, UsersIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  professionalRole?: string;
  company?: {
    id: string;
    name: string;
  };
  createdAt: string;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    pendingTasks: number;
    inProgressTasks: number;
    // REMOVA ESTAS LINHAS:
    // totalBudgets: number;
    // approvedBudgets: number;
  };
  taskStats: Array<{
    status: string;
    _count: number;
  }>;
  recentCompletedTasks: Array<{
    id: string;
    title: string;
    completedAt: string;
    column: {
      title: string;
    };
  }>;
}

interface ReportSummary {
  totalProfessionals: number;
  activeProfessionals: number;
  inactiveProfessionals: number;
  companies: string[];
}

export default function ProfessionalsReportPage() {
  const { user, authFetch } = useAuth();
  const router = useRouter();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filtros
  const [companyId, setCompanyId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);

  // Verificar permissão
  useEffect(() => {
    if (user && !['MASTER', 'ADMIN'].includes(user.role)) {
      router.push('/unauthorized');
    }
  }, [user, router]);

  // Buscar empresas disponíveis (para MASTER)
  useEffect(() => {
    if (user?.role === 'MASTER') {
      fetchCompanies();
    }
  }, [user]);

  // Buscar relatório
  useEffect(() => {
    if (user) {
      fetchReport();
    }
  }, [user, companyId, statusFilter, startDate, endDate]);

  const fetchCompanies = async () => {
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_NESTJS_API_URL}/auth/companies/master`);
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  // Alterar a função fetchReport:
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Enviar companyId apenas se não for "all"
      if (companyId && companyId !== "all") {
        params.append("companyId", companyId);
      }
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_NESTJS_API_URL}/reports/professionals?${params.toString()}`
      );
      const data = await response.json();

      setProfessionals(data.professionals);
      setSummary(data.summary);
    } catch (error) {
      console.error("Erro ao buscar relatório:", error);
      // toast de erro...
    } finally {
      setLoading(false);
    }
  };

  // E também corrigir a limpeza de filtros:
  <Button variant="outline" onClick={() => {
    setCompanyId("");
    setStatusFilter("");
    setStartDate(undefined);
    setEndDate(undefined);
  }}>
    Limpar Filtros
  </Button>

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_NESTJS_API_URL}/reports/professionals/export?${params.toString()}`
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-profissionais-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // toast({
      //   title: 'Sucesso',
      //   description: 'Relatório exportado com sucesso.',
      // });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      // toast({
      //   title: 'Erro',
      //   description: 'Não foi possível exportar o relatório.',
      //   variant: 'destructive',
      // });
    } finally {
      setExporting(false);
    }
  };

  const handleViewDetails = (professionalId: string) => {
    router.push(`/professionals/report/${professionalId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'INACTIVE':
        return <Badge variant="destructive">Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'MASTER':
        return <Badge className="bg-purple-500">Master</Badge>;
      case 'ADMIN':
        return <Badge className="bg-blue-500">Admin</Badge>;
      case 'EMPLOYER':
        return <Badge className="bg-amber-500">Profissional</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando relatório...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Profissionais</h1>
          <p className="text-muted-foreground">
            Análise completa do desempenho e atividades dos profissionais
          </p>
        </div>

        {/* <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            {exporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div> */}
      </div>

      {/* Cartões de Resumo */}
      {/* Cartões de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Profissionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{summary?.totalProfessionals || 0}</div>
              <UsersIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.activeProfessionals || 0} ativos • {summary?.inactiveProfessionals || 0} inativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {professionals.length > 0
                ? Math.round(
                  professionals.reduce((acc, p) => acc + p.metrics.completionRate, 0) / professionals.length
                )
                : 0}%
            </div>
            <Progress
              value={
                professionals.length > 0
                  ? professionals.reduce((acc, p) => acc + p.metrics.completionRate, 0) / professionals.length
                  : 0
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {professionals.reduce((acc, p) => acc + p.metrics.pendingTasks, 0)}
              </div>
              <ClockIcon className="h-6 w-6 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {professionals.reduce((acc, p) => acc + p.metrics.inProgressTasks, 0)} em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle> {/* NOVO CARTAO */}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {professionals.reduce((acc, p) => acc + p.metrics.completedTasks, 0)}
              </div>
              <CheckCircleIcon className="h-6 w-6 text-green-500" /> {/* NOVO ÍCONE */}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total: {professionals.reduce((acc, p) => acc + p.metrics.totalTasks, 0)} tarefas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Empresa (apenas para MASTER) */}
            {user?.role === 'MASTER' && (
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as empresas</SelectItem> {/* CORREÇÃO: mudar de "" para "all" */}
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem> {/* CORREÇÃO: mudar de "" para "all" */}
                  <SelectItem value="ACTIVE">Ativos</SelectItem>
                  <SelectItem value="INACTIVE">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Inicial */}
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Final */}
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => {
              setCompanyId('');
              setStatusFilter('');
              setStartDate(undefined);
              setEndDate(undefined);
            }}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Profissionais */}
      <Tabs defaultValue="list" className="mb-8">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="performance">Desempenho</TabsTrigger>
          <TabsTrigger value="activities">Atividades Recentes</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Profissionais</CardTitle>
              <CardDescription>
                {professionals.length} profissionais encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Cargo/Status</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Métricas</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professionals.map((professional) => (
                    <TableRow key={professional.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {professional.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{professional.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {professional.email}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {professional.phone}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{professional.professionalRole || 'Não informado'}</div>
                          <div className="flex gap-2">
                            {getRoleBadge(professional.role)}
                            {getStatusBadge(professional.status)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Desde {format(new Date(professional.createdAt), 'dd/MM/yyyy')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {professional.company ? (
                          <div>
                            <div className="font-medium">{professional.company.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {professional.company.id.substring(0, 8)}...
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sem empresa</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Tarefas:</span>
                            <span className="font-medium">
                              {professional.metrics.completedTasks}/{professional.metrics.totalTasks}
                            </span>
                          </div>
                          <Progress value={professional.metrics.completionRate} />
                          <div className="flex items-center justify-between text-sm">
                            <span>Conclusão:</span>
                            <span className="font-medium">{professional.metrics.completionRate}%</span>
                          </div>
                          {/* REMOVA ESTA LINHA: */}
                          {/* <div className="text-xs text-muted-foreground">
      {professional.metrics.totalBudgets} orçamentos
    </div> */}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(professional.id)}
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Profissional</CardTitle>
              <CardDescription>
                Comparativo de produtividade e eficiência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {professionals.map((professional) => (
                  <Card key={professional.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{professional.name}</CardTitle>
                      <CardDescription>{professional.professionalRole}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Taxa de Conclusão</span>
                            <span className="font-medium">{professional.metrics.completionRate}%</span>
                          </div>
                          <Progress value={professional.metrics.completionRate} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm"> {/* MUDOU DE 4 PARA 3 COLUNAS */}
                          <div className="bg-muted p-2 rounded">
                            <div className="font-medium">{professional.metrics.totalTasks}</div>
                            <div className="text-xs text-muted-foreground">Total Tarefas</div>
                          </div>
                          <div className="bg-muted p-2 rounded">
                            <div className="font-medium">{professional.metrics.completedTasks}</div>
                            <div className="text-xs text-muted-foreground">Concluídas</div>
                          </div>
                          <div className="bg-muted p-2 rounded">
                            <div className="font-medium">{professional.metrics.pendingTasks}</div>
                            <div className="text-xs text-muted-foreground">Pendentes</div>
                          </div>
                          {/* REMOVIDA A COLUNA DE ORÇAMENTOS */}
                        </div>

                        <div className="text-xs text-muted-foreground pt-2">
                          <div className="flex justify-between">
                            <span>Em andamento:</span>
                            <span className="font-medium">{professional.metrics.inProgressTasks}</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleViewDetails(professional.id)}
                        >
                          Ver detalhes completos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
              <CardDescription>
                Últimas tarefas concluídas pelos profissionais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {professionals.map((professional) => (
                  <Card key={professional.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {professional.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{professional.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {professional.professionalRole}
                            </div>
                          </div>
                        </div>
                        <Badge>{professional.recentCompletedTasks.length} concluídas</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {professional.recentCompletedTasks.length > 0 ? (
                        <div className="space-y-2">
                          {professional.recentCompletedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-2 bg-muted rounded"
                            >
                              <div className="flex items-center gap-3">
                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                <div>
                                  <div className="font-medium">{task.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {task.column.title} • {format(new Date(task.completedAt), 'dd/MM/yyyy HH:mm')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          Nenhuma tarefa concluída recentemente
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
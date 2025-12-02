/* eslint-disable @typescript-eslint/no-explicit-any */
// app/professionals/report/[id]/page.tsx
'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AlertCircleIcon, ArrowLeftIcon, BuildingIcon, CalendarIcon, CheckCircleIcon, ClockIcon, MailIcon, PhoneIcon, TargetIcon, TrendingUpIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface ProfessionalDetails {
    professional: {
        id: string;
        name: string;
        email: string;
        phone: string;
        role: string;
        status: string;
        professionalRole?: string;
        document?: string;
        createdAt: string;
        company?: {
            id: string;
            name: string;
            email: string;
            telefone: string;
        };
    };
    statistics: {
        tasks: {
            byStatus: Array<{ status: string; _count: number; _avg: { priority: number } }>;
            byPriority: Array<{ priority: number; _count: number }>;
            total: number;
            completed: number;
            completionRate: number;
            averagePriority: number;
        };
        productivity: Array<{
            month: string;
            total_tasks: number;
            completed_tasks: number;
            avg_priority: number;
        }>;
    };
    recentActivities: Array<{
        id: string;
        title: string;
        status: string;
        priority: number;
        updatedAt: string;
        column: {
            title: string;
        };
    }>;
    timeline: Array<{
        type: 'task';
        id: string;
        title: string;
        status: string;
        date: string;
        description: string;
        icon: string;
    }>;
}

export default function ProfessionalDetailsPage() {
    const { id } = useParams();
    const { user, authFetch } = useAuth();
    const router = useRouter();

    const [details, setDetails] = useState<ProfessionalDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

    useEffect(() => {
        if (user && !['MASTER', 'ADMIN'].includes(user.role)) {
            router.push('/unauthorized');
        }
    }, [user, router]);

    useEffect(() => {
        if (user) {
            fetchDetails();
        }
    }, [user, id, startDate, endDate]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate.toISOString());
            if (endDate) params.append('endDate', endDate.toISOString());

            const url = `${process.env.NEXT_PUBLIC_NESTJS_API_URL}/reports/professionals/${id}/details?${params.toString()}`;

            console.log('🔗 Chamando API:', url);
            console.log('👤 ID do profissional:', id);

            const response = await authFetch(url);

            console.log('✅ Resposta recebida:', {
                status: response.status,
                ok: response.ok,
            });

            const data = await response.json();
            console.log('📦 Dados recebidos:', data);

            setDetails(data);
        } catch (error: any) {
            console.error('❌ Erro completo:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
            });

            // toast de erro...
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return '#10b981';
            case 'PENDING':
                return '#f59e0b';
            case 'IN_PROGRESS':
                return '#3b82f6';
            case 'REJECTED':
            case 'FAILED':
                return '#ef4444';
            default:
                return '#6b7280';
        }
    };

    const getPriorityColor = (priority: number) => {
        if (priority <= 2) return '#10b981';
        if (priority <= 4) return '#f59e0b';
        return '#ef4444';
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Carregando detalhes...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!details) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Profissional não encontrado</h1>
                    <Button onClick={() => router.push('/professionals/report')}>
                        <ArrowLeftIcon className="mr-2 h-4 w-4" />
                        Voltar para relatório
                    </Button>
                </div>
            </div>
        );
    }

    const { professional, statistics, recentActivities, timeline } = details;

    // Preparar dados para gráficos
    const taskStatusData = statistics.tasks.byStatus.map(item => ({
        name: item.status,
        value: item._count,
        color: getStatusColor(item.status),
    }));

    const productivityData = statistics.productivity.map(item => ({
        month: item.month,
        tasks: item.total_tasks,
        completed: item.completed_tasks,
        rate: item.total_tasks > 0 ? (item.completed_tasks / item.total_tasks) * 100 : 0,
    }));

    return (
        <div className="container mx-auto py-8">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/professionals/report')}
                        className="mb-2"
                    >
                        <ArrowLeftIcon className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">{professional.name}</h1>
                    <p className="text-muted-foreground">
                        Detalhes completos e métricas de desempenho
                    </p>
                </div>
            </div>

            {/* Perfil e Filtros */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Perfil */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Perfil do Profissional</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarFallback className="text-lg">
                                        {professional.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-xl font-bold">{professional.name}</h3>
                                    <p className="text-muted-foreground">{professional.professionalRole}</p>
                                    <div className="flex gap-2 mt-2">
                                        <Badge>{professional.role}</Badge>
                                        <Badge className={
                                            professional.status === 'ACTIVE'
                                                ? 'bg-green-500'
                                                : 'bg-red-500'
                                        }>
                                            {professional.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Email</div>
                                        <div>{professional.email}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Telefone</div>
                                        <div>{professional.phone}</div>
                                    </div>
                                </div>

                                {professional.document && (
                                    <div className="flex items-center gap-3">
                                        <ClockIcon className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-sm text-muted-foreground">Documento</div>
                                            <div>{professional.document}</div>
                                        </div>
                                    </div>
                                )}

                                {professional.company && (
                                    <div className="flex items-center gap-3">
                                        <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-sm text-muted-foreground">Empresa</div>
                                            <div className="font-medium">{professional.company.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {professional.company.email}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4">
                                    <div className="text-sm text-muted-foreground">Membro desde</div>
                                    <div>{format(new Date(professional.createdAt), 'dd/MM/yyyy')}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Métricas Principais */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{statistics.tasks.completionRate}%</div>
                                <Progress value={statistics.tasks.completionRate} className="mt-2" />
                                <div className="text-sm text-muted-foreground mt-2">
                                    {statistics.tasks.completed}/{statistics.tasks.total} tarefas
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Produtividade</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {statistics.tasks.completed}
                                </div>
                                <div className="text-sm text-muted-foreground mt-2">
                                    Tarefas concluídas
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <TrendingUpIcon className="h-4 w-4 text-green-500" />
                                    <span className="text-sm text-muted-foreground">
                                        {productivityData.length > 0 ? 
                                            `Últimos ${productivityData.length} meses` : 
                                            'Sem dados históricos'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Prioridade Média</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{statistics.tasks.averagePriority.toFixed(1)}</div>
                                <div className="mt-2">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-2 flex-1 rounded ${i <= statistics.tasks.averagePriority
                                                    ? getPriorityColor(i) === '#10b981'
                                                        ? 'bg-green-500'
                                                        : getPriorityColor(i) === '#f59e0b'
                                                            ? 'bg-amber-500'
                                                            : 'bg-red-500'
                                                    : 'bg-muted'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground mt-2">
                                    {statistics.tasks.byPriority.length} níveis de prioridade
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filtros de Data */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtrar por Período</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Data Inicial</label>
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

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Data Final</label>
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
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Gráficos e Detalhes */}
            <Tabs defaultValue="charts" className="mb-8">
                <TabsList>
                    <TabsTrigger value="charts">Gráficos</TabsTrigger>
                    <TabsTrigger value="activities">Atividades</TabsTrigger>
                    <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
                    <TabsTrigger value="tasks">Tarefas</TabsTrigger>
                </TabsList>

                <TabsContent value="charts">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Gráfico de Status das Tarefas */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Status das Tarefas</CardTitle>
                                <CardDescription>Distribuição por status</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={taskStatusData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {taskStatusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Produtividade Mensal */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Produtividade Mensal</CardTitle>
                                <CardDescription>Tarefas concluídas por mês</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={productivityData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="completed"
                                                stroke="#10b981"
                                                name="Concluídas"
                                                strokeWidth={2}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="tasks"
                                                stroke="#3b82f6"
                                                name="Total"
                                                strokeWidth={2}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tarefas por Prioridade */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Tarefas por Prioridade</CardTitle>
                                <CardDescription>Distribuição por nível de prioridade</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={statistics.tasks.byPriority}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="priority" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar 
                                                dataKey="_count" 
                                                name="Quantidade"
                                                fill="#8884d8"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Desempenho por Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Desempenho por Status</CardTitle>
                                <CardDescription>Comparativo entre status</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={taskStatusData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            {/* <Bar 
                                                dataKey="value" 
                                                name="Quantidade" 
                                                fill={(entry: any) => getStatusColor(entry.name)}
                                            /> */}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="activities">
                    <Card>
                        <CardHeader>
                            <CardTitle>Atividades Recentes</CardTitle>
                            <CardDescription>Últimas atualizações nas tarefas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentActivities.length > 0 ? (
                                    recentActivities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-full ${activity.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                                                    activity.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-amber-100 text-amber-600'
                                                    }`}>
                                                    {activity.status === 'COMPLETED' ? (
                                                        <CheckCircleIcon className="h-5 w-5" />
                                                    ) : (
                                                        <AlertCircleIcon className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{activity.title}</h4>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                        <span>Status: {activity.status}</span>
                                                        <span>Prioridade: {activity.priority}</span>
                                                        <span>Coluna: {activity.column.title}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Atualizado em {format(new Date(activity.updatedAt), 'dd/MM/yyyy HH:mm')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <TargetIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>Nenhuma atividade recente encontrada</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="timeline">
                    <Card>
                        <CardHeader>
                            <CardTitle>Linha do Tempo</CardTitle>
                            <CardDescription>Cronologia de atividades</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {timeline.length > 0 ? (
                                    timeline.map((item, index) => (
                                        <div key={item.id} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                </div>
                                                {index < timeline.length - 1 && (
                                                    <div className="w-0.5 h-full bg-muted my-2" />
                                                )}
                                            </div>
                                            <div className="pb-4 flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-medium">{item.title}</h4>
                                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {format(new Date(item.date), 'dd/MM/yyyy HH:mm')}
                                                    </div>
                                                </div>
                                                <Badge className="mt-2" variant="outline">
                                                    Tarefa • {item.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <ClockIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>Nenhuma atividade na linha do tempo</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tasks">
                    <Card>
                        <CardHeader>
                            <CardTitle>Estatísticas de Tarefas</CardTitle>
                            <CardDescription>Detalhamento completo</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Por Status</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {statistics.tasks.byStatus.map((stat) => (
                                            <Card key={stat.status}>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium">
                                                        {stat.status === 'COMPLETED' ? 'Concluídas' : 
                                                         stat.status === 'IN_PROGRESS' ? 'Em Progresso' :
                                                         stat.status === 'PENDING' ? 'Pendentes' : stat.status}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{stat._count}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {stat._count > 0 ? (
                                                            <>Prioridade média: {stat._avg.priority.toFixed(1)}</>
                                                        ) : 'Sem dados'}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Por Prioridade</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {[1, 2, 3, 4, 5].map((priority) => {
                                            const stat = statistics.tasks.byPriority.find(p => p.priority === priority);
                                            const count = stat?._count || 0;
                                            const percentage = statistics.tasks.total > 0 ? 
                                                Math.round((count / statistics.tasks.total) * 100) : 0;
                                            
                                            return (
                                                <Card key={priority}>
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-medium">
                                                            Nível {priority}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-2xl font-bold">{count}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {percentage}% do total
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">{statistics.tasks.total}</div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">{statistics.tasks.completed}</div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">{statistics.tasks.completionRate}%</div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
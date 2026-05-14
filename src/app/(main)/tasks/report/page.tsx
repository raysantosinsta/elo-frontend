/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  FilterIcon,
  LayoutListIcon,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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
  YAxis,
} from "recharts";

// Interfaces
interface TaskReportItem {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
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

// --- CONSTANTES DE CORES ELO PRODUTIVO ---
const COLORS = {
  textMain: "#353A40",
  background: "#F5F6FA",
  primary: "#2F80ED",
  primaryDark: "#1E5CB8",
  secondaryText: "#7A7E83",
  white: "#FFFFFF",
  border: "#E2E8F0",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};

export default function TasksReportPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskReportItem[]>([]);
  const [summary, setSummary] = useState<TaskReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Verificar permissão
  useEffect(() => {
    if (user && !["MASTER", "ADMIN"].includes(user.role)) {
      // router.push('/unauthorized');
    }
  }, [user, router]);

  const fetchReport = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter && priorityFilter !== "all")
        params.priority = priorityFilter;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const { data } = await api.get("/reports-tasks/tasks", { params });

      setTasks(data.tasks);
      setSummary(data.summary);
    } catch (error) {
      console.error("Erro ao buscar relatório de tarefas:", error);
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, priorityFilter, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            Concluída
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white">
            Em Andamento
          </Badge>
        );
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="border-[#CBD5E1] text-[#7A7E83] bg-white"
          >
            Pendente
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 text-white">
            Falhou
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-[#CBD5E1] text-[#7A7E83]">
            {status}
          </Badge>
        );
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return "text-red-600 bg-red-50 border-red-200";
    if (priority === 3) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 4) return "Alta";
    if (priority === 3) return "Média";
    return "Baixa";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#2F80ED]" />
          <p className="text-[#353A40] font-medium">
            Gerando relatório de tarefas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-4 md:p-8 font-sans">
      <div className="container mx-auto max-w-7xl">
        {/* Cabeçalho */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-[#E2E8F0] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#353A40]">
              Relatório de Tarefas
            </h1>
            <p className="text-[#7A7E83] mt-1">
              Visão geral de produtividade, status e prazos da sua equipe.
            </p>
          </div>
        </header>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card
            className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => router.push("/Kanban")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[#7A7E83] group-hover:text-[#2F80ED] transition-colors">
                Total de Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-extrabold text-[#353A40] group-hover:text-[#2F80ED] transition-colors">
                  {summary?.totalTasks || 0}
                </div>
                <LayoutListIcon className="h-6 w-6 text-[#7A7E83] opacity-50 group-hover:opacity-100 group-hover:text-[#2F80ED] transition-all" />
              </div>
              <p className="text-xs text-[#7A7E83] mt-2">
                No período selecionado
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[#7A7E83]">
                Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-extrabold text-green-600">
                  {summary?.completedTasks || 0}
                </div>
                <CheckCircle2Icon className="h-6 w-6 text-green-500 opacity-80" />
              </div>
              <Progress
                value={summary?.completionRate || 0}
                className="mt-2 h-1.5 bg-[#F5F6FA]"
              />
              <p className="text-xs text-[#7A7E83] mt-2">
                {summary?.completionRate.toFixed(1)}% taxa de conclusão
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[#7A7E83]">
                Em Aberto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-extrabold text-[#2F80ED]">
                  {summary?.pendingTasks || 0}
                </div>
                <ClockIcon className="h-6 w-6 text-[#2F80ED] opacity-80" />
              </div>
              <p className="text-xs text-[#7A7E83] mt-2">
                Pendentes ou em andamento
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[#7A7E83]">
                Atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-extrabold text-red-600">
                  {summary?.overdueTasks || 0}
                </div>
                <AlertTriangleIcon className="h-6 w-6 text-red-500 opacity-80" />
              </div>
              <p className="text-xs text-[#7A7E83] mt-2">
                Tarefas com prazo vencido
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-8 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
          <CardHeader className="pb-4 border-b border-[#E2E8F0]">
            <CardTitle className="flex items-center gap-2 text-base text-[#353A40]">
              <FilterIcon className="h-4 w-4 text-[#2F80ED]" /> Filtros
              Avançados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#353A40] font-medium">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-[#CBD5E1] bg-white focus:ring-[#2F80ED]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
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
                <Label className="text-[#353A40] font-medium">Prioridade</Label>
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="border-[#CBD5E1] bg-white focus:ring-[#2F80ED]">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setStartDate(undefined);
                  setEndDate(undefined);
                }}
                className="text-[#7A7E83] hover:text-[#2F80ED] hover:bg-[#F5F6FA]"
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo Principal */}
        <Tabs defaultValue="charts" className="space-y-4">
          <TabsList className="bg-white border border-[#E2E8F0] p-1 rounded-lg">
            <TabsTrigger
              value="charts"
              className="data-[state=active]:bg-[#2F80ED] data-[state=active]:text-white rounded-md text-[#353A40]"
            >
              Gráficos e Métricas
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-[#2F80ED] data-[state=active]:text-white rounded-md text-[#353A40]"
            >
              Lista Detalhada
            </TabsTrigger>
          </TabsList>

          {/* TAB: GRÁFICOS */}
          <TabsContent
            value="charts"
            className="animate-in fade-in-50 duration-500"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfico de Status */}
              <Card className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#353A40] font-bold">
                    Distribuição por Status
                  </CardTitle>
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
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "white",
                          color: "#353A40",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Prioridade */}
              <Card className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#353A40] font-bold">
                    Distribuição por Prioridade
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary?.byPriority || []}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E2E8F0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#7A7E83" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#7A7E83" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "white",
                          color: "#353A40",
                        }}
                        cursor={{ fill: "#F5F6FA" }}
                      />
                      <Bar
                        dataKey="value"
                        name="Quantidade"
                        fill={COLORS.primary}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: LISTA */}
          <TabsContent
            value="list"
            className="animate-in fade-in-50 duration-500"
          >
            <Card className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm">
              <CardHeader className="border-b border-[#E2E8F0]">
                <CardTitle className="text-[#353A40] font-bold">
                  Listagem de Tarefas
                </CardTitle>
                <CardDescription className="text-[#7A7E83]">
                  Visualização detalhada das tarefas filtradas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      <TableHead className="text-[#353A40] font-bold">
                        Tarefa
                      </TableHead>
                      <TableHead className="text-[#353A40] font-bold">
                        Status
                      </TableHead>
                      <TableHead className="text-[#353A40] font-bold">
                        Prioridade
                      </TableHead>
                      <TableHead className="text-[#353A40] font-bold">
                        Responsável
                      </TableHead>
                      <TableHead className="text-[#353A40] font-bold">
                        Prazo
                      </TableHead>
                      <TableHead className="text-[#353A40] font-bold">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                        <TableRow
                          key={task.id}
                          className="border-b border-[#E2E8F0] hover:bg-[#F5F6FA] transition-colors"
                        >
                          <TableCell>
                            <div className="font-semibold text-[#353A40]">
                              {task.title}
                            </div>
                            <div className="text-xs text-[#7A7E83]">
                              Criado em:{" "}
                              {format(new Date(task.createdAt), "dd/MM/yyyy")}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-0",
                                getPriorityColor(task.priority),
                              )}
                            >
                              {getPriorityLabel(task.priority)} ({task.priority}
                              )
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.assignedTo ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px] bg-[#2F80ED] text-white">
                                    {task.assignedTo.name
                                      .substring(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-[#353A40]">
                                  {task.assignedTo.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-[#7A7E83] italic">
                                Não atribuído
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {task.dueDate ? (
                              <div
                                className={cn(
                                  "text-sm",
                                  task.status !== "COMPLETED" &&
                                    new Date(task.dueDate) < new Date()
                                    ? "text-red-600 font-semibold"
                                    : "text-[#7A7E83]",
                                )}
                              >
                                {format(new Date(task.dueDate), "dd/MM/yyyy")}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/Kanban`)}
                              className="text-[#2F80ED] hover:text-[#1E5CB8] hover:bg-[#F5F6FA]"
                            >
                              <EyeIcon className="h-4 w-4 mr-2" /> Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12 text-[#7A7E83]"
                        >
                          <div className="flex flex-col items-center">
                            <LayoutListIcon className="h-10 w-10 mb-2 opacity-20" />
                            <p>
                              Nenhuma tarefa encontrada com os filtros
                              selecionados.
                            </p>
                          </div>
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
    </div>
  );
}

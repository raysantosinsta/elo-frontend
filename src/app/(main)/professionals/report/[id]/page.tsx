"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// UI Components
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  MailIcon,
  PhoneIcon,
  TargetIcon,
  Loader2,
  BriefcaseIcon,
  DollarSignIcon,
  FileTextIcon,
} from "lucide-react";

// Charts
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
} from "recharts";

// --- THEME CONSTANTS ---
const THEME = {
  grafite: "#2D3436",
  bege: "#F5F0E6",
  terracota: "#D35400",
  areia: "#95A5A6",
  azulPetroleo: "#2C3E50",
  white: "#FFFFFF",
  success: "#27AE60",
  warning: "#F39C12",
  danger: "#C0392B",
};

// --- TYPES (Sincronizado com ReportsService) ---
interface ProfessionalDetails {
  professional: {
    id: string;
    name: string;
    email: string;
    contact: string;
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
      byStatus: Array<{
        status: string;
        _count: number;
        _avg: { priority: number };
      }>;
      byPriority: Array<{ priority: number; _count: number }>;
      total: number;
      completed: number;
      completionRate: number;
      averagePriority: number;
    };
    // Adicionado conforme seu Service retorna budgets
    budgets: {
      byStatus: Array<{ status: string; _count: number }>;
      total: number;
      totalValue: number;
      averageValue: number;
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
    column: { title: string };
  }>;
  timeline: Array<{
    type: "task" | "budget";
    id: string;
    title: string;
    status: string;
    date: string;
    description: string;
    icon: string;
  }>;
}

// --- SUB-COMPONENTS ---

const StatCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  progress,
  color,
}: any) => (
  <Card
    className="border-l-4 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm"
    style={{ borderLeftColor: color || THEME.azulPetroleo }}
  >
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold tracking-wide uppercase text-[#95A5A6] flex justify-between items-center">
        {title}
        {Icon && <Icon className="h-4 w-4 opacity-50" />}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-[#2D3436]">{value}</div>
      {progress !== undefined && (
        <Progress value={progress} className="mt-2 h-1.5 bg-[#F5F0E6]" />
      )}
      {subtext && (
        <div className="text-xs text-[#95A5A6] mt-2 font-medium">{subtext}</div>
      )}
    </CardContent>
  </Card>
);

const ActivityItem = ({
  activity,
}: {
  activity: ProfessionalDetails["recentActivities"][0];
}) => {
  const isCompleted = activity.status === "COMPLETED";

  return (
    <div className="flex items-center justify-between p-4 border border-[#95A5A6]/20 rounded-lg hover:bg-[#F5F0E6]/50 transition-colors bg-white">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "p-2 rounded-full",
            isCompleted
              ? "bg-[#27AE60]/10 text-[#27AE60]"
              : "bg-[#2C3E50]/10 text-[#2C3E50]"
          )}
        >
          {isCompleted ? (
            <CheckCircleIcon className="h-5 w-5" />
          ) : (
            <ClockIcon className="h-5 w-5" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-[#2D3436]">{activity.title}</h4>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-[#95A5A6]">
            <Badge
              variant="outline"
              className="text-xs font-normal border-[#95A5A6]/40"
            >
              {activity.status}
            </Badge>
            <span className="flex items-center gap-1">
              <TargetIcon className="h-3 w-3" /> Prio: {activity.priority}
            </span>
          </div>
          <div className="text-xs text-[#95A5A6] mt-1">
            Atualizado em{" "}
            {format(new Date(activity.updatedAt), "dd/MM/yyyy HH:mm")}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper para ícones da Timeline
const getTimelineIcon = (iconName: string) => {
  switch (iconName) {
    case "check-circle":
      return <CheckCircleIcon className="w-5 h-5" />;
    case "dollar-sign":
      return <DollarSignIcon className="w-5 h-5" />;
    case "clock":
      return <ClockIcon className="w-5 h-5" />;
    case "file-text":
      return <FileTextIcon className="w-5 h-5" />;
    default:
      return <ClockIcon className="w-5 h-5" />;
  }
};

// --- MAIN PAGE ---

export default function ProfessionalReportPage() {
  // O [id] da pasta é capturado aqui
  const { id } = useParams(); 
  const { user, authFetch } = useAuth();
  const router = useRouter();

  // State
  const [details, setDetails] = useState<ProfessionalDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // --- LOGIC ---

  useEffect(() => {
    // Validação básica de acesso (opcional no front, já tem no back)
    if (user && !["MASTER", "ADMIN"].includes(user.role)) {
      // router.push('/unauthorized');
    }
  }, [user, router]);

  const fetchDetails = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());

      // Chamada para o Controller: @Get('professionals/:userId/details')
      const url = `${
        process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000"
      }/reports/professionals/${id}/details?${params.toString()}`;
      
      const response = await authFetch(url);

      if (response.ok) {
        const data = await response.json();
        setDetails(data);
      } else {
        console.error("Erro ao buscar detalhes:", response.status);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch, id, startDate, endDate, user]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // --- HELPERS ---

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return THEME.success;
      case "APPROVED":
        return THEME.success; // Orçamentos
      case "PENDING":
        return THEME.areia;
      case "IN_PROGRESS":
        return THEME.azulPetroleo;
      case "FAILED":
        return THEME.danger;
      case "REJECTED":
        return THEME.danger; // Orçamentos
      default:
        return THEME.grafite;
    }
  };

  const chartData = useMemo(() => {
    if (!details) return { taskStatusData: [], productivityData: [] };

    return {
      taskStatusData: details.statistics.tasks.byStatus.map((item) => ({
        name: item.status,
        value: item._count,
        color: getStatusColor(item.status),
      })),
      productivityData: details.statistics.productivity.map((item) => ({
        month: item.month,
        tasks: item.total_tasks,
        completed: item.completed_tasks,
      })),
    };
  }, [details]);

  // --- RENDER ---

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F0E6]">
        <Loader2 className="h-12 w-12 animate-spin text-[#D35400]" />
        <p className="mt-4 text-[#2D3436] font-medium animate-pulse">
          Carregando relatório do profissional...
        </p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F0E6] p-4">
        <AlertCircleIcon className="h-16 w-16 text-[#D35400] mb-4" />
        <h1 className="text-2xl font-bold text-[#2D3436] mb-2">
          Profissional não encontrado
        </h1>
        <Button
          onClick={() => router.back()}
          className="bg-[#2C3E50] hover:bg-[#34495E]"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const { professional, statistics, recentActivities, timeline } = details;

  return (
    <main className="min-h-screen bg-[#F5F0E6] p-4 md:p-8 font-sans">
      <div className="container mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-2 text-[#95A5A6] hover:text-[#D35400] hover:bg-transparent pl-0"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" /> Voltar para lista
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-[#2D3436]">
              {professional.name}
            </h1>
            <p className="text-[#95A5A6] mt-1 text-lg">
              Relatório Detalhado de Performance
            </p>
          </div>

          {/* DATE FILTER */}
          <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
            <CardContent className="p-2 flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "border-[#95A5A6]/30 text-[#2D3436]",
                      !startDate && "text-[#95A5A6]"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#D35400]" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Início"}
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "border-[#95A5A6]/30 text-[#2D3436]",
                      !endDate && "text-[#95A5A6]"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#D35400]" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Fim"}
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
            </CardContent>
          </Card>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* PROFILE CARD */}
          <Card className="lg:col-span-1 shadow-md border-t-4 border-t-[#2C3E50] bg-white">
            <CardHeader>
              <CardTitle className="text-[#2C3E50]">
                Perfil Profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-24 w-24 border-4 border-[#F5F0E6] shadow-sm mb-4">
                  <AvatarFallback className="text-2xl bg-[#2C3E50] text-white">
                    {professional.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold text-[#2D3436]">
                  {professional.name}
                </h3>
                <p className="text-[#95A5A6]">
                  {professional.professionalRole || "Cargo não definido"}
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge
                    variant="secondary"
                    className="bg-[#F5F0E6] text-[#2C3E50]"
                  >
                    {professional.role}
                  </Badge>
                  <Badge
                    className={cn(
                      "text-white",
                      professional.status === "ACTIVE"
                        ? "bg-[#27AE60]"
                        : "bg-[#C0392B]"
                    )}
                  >
                    {professional.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>

              <Separator className="bg-[#95A5A6]/20 my-4" />

              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3 text-[#2D3436]">
                  <MailIcon className="h-4 w-4 text-[#D35400]" />
                  <span className="truncate">{professional.email}</span>
                </div>
                <div className="flex items-center gap-3 text-[#2D3436]">
                  <PhoneIcon className="h-4 w-4 text-[#D35400]" />
                  <span>{professional.contact}</span>
                </div>
                {professional.company && (
                  <div className="flex items-start gap-3 text-[#2D3436]">
                    <BuildingIcon className="h-4 w-4 text-[#D35400] mt-1" />
                    <div>
                      <div className="font-medium">
                        {professional.company.name}
                      </div>
                      <div className="text-xs text-[#95A5A6]">
                        {professional.company.email}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[#2D3436]">
                  <BriefcaseIcon className="h-4 w-4 text-[#D35400]" />
                  <span>
                    Membro desde{" "}
                    {format(new Date(professional.createdAt), "MM/yyyy")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KEY METRICS */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Conclusão"
                value={`${statistics.tasks.completionRate}%`}
                subtext={`${statistics.tasks.completed} / ${statistics.tasks.total} tarefas`}
                icon={CheckCircleIcon}
                progress={statistics.tasks.completionRate}
                color={THEME.success}
              />
              <StatCard
                title="Volume Total"
                value={statistics.tasks.total}
                subtext="Tarefas atribuídas no período"
                icon={BriefcaseIcon}
                color={THEME.azulPetroleo}
              />
              <StatCard
                title="Orçamentos Aprovados"
                value={statistics.budgets.total}
                subtext={`R$ ${statistics.budgets.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} total`}
                icon={DollarSignIcon}
                color={THEME.terracota}
              />
            </div>

            {/* CHART: PRODUCTIVITY */}
            <Card className="shadow-sm border-none bg-white">
              <CardHeader>
                <CardTitle className="text-[#2D3436]">
                  Produtividade Mensal
                </CardTitle>
                <CardDescription>
                  Volume de tarefas e entregas ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.productivityData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e0e0e0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#95A5A6" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#95A5A6" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="tasks"
                      name="Total"
                      stroke={THEME.azulPetroleo}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="Concluídas"
                      stroke={THEME.terracota}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* DETAILED TABS */}
        <Tabs defaultValue="charts" className="space-y-4">
          <TabsList className="bg-white border border-[#95A5A6]/20 p-1 w-full md:w-auto">
            <TabsTrigger
              value="charts"
              className="data-[state=active]:bg-[#2C3E50] data-[state=active]:text-white"
            >
              Análise Gráfica
            </TabsTrigger>
            <TabsTrigger
              value="activities"
              className="data-[state=active]:bg-[#2C3E50] data-[state=active]:text-white"
            >
              Atividades Recentes
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="data-[state=active]:bg-[#2C3E50] data-[state=active]:text-white"
            >
              Linha do Tempo
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="charts"
            className="animate-in fade-in-50 duration-500"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.taskStatusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Carga por Prioridade</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statistics.tasks.byPriority}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="priority" />
                      <YAxis />
                      <Tooltip cursor={{ fill: "#F5F0E6" }} />
                      <Bar
                        dataKey="_count"
                        name="Tarefas"
                        fill={THEME.azulPetroleo}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent
            value="activities"
            className="animate-in fade-in-50 duration-500"
          >
            <Card>
              <CardHeader>
                <CardTitle>Últimas Movimentações</CardTitle>
                <CardDescription>
                  Registro em tempo real das atualizações de tarefas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="text-center py-12 text-[#95A5A6]">
                    <TargetIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>Nenhuma atividade registrada no período.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent
            value="timeline"
            className="animate-in fade-in-50 duration-500"
          >
            <Card>
              <CardHeader>
                <CardTitle>Linha do Tempo Completa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#95A5A6]/30 before:to-transparent">
                  {timeline.length > 0 ? (
                    timeline.map((item, index) => (
                      <div
                        key={item.id}
                        className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                      >
                        {/* Icon Wrapper */}
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10",
                            item.type === "budget"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-[#F5F0E6] text-[#D35400]"
                          )}
                        >
                          {getTimelineIcon(item.icon)}
                        </div>

                        {/* Content */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-[#95A5A6]/20 bg-white shadow-sm">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                            <div className="font-bold text-[#2D3436] truncate">
                              {item.title}
                            </div>
                            <time className="font-caveat font-medium text-[#D35400] text-xs whitespace-nowrap">
                              {format(new Date(item.date), "dd/MM HH:mm")}
                            </time>
                          </div>
                          <div className="text-[#95A5A6] text-sm">
                            {item.description}
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "mt-2 text-[10px]",
                              item.type === "budget"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-[#F5F0E6] text-[#2C3E50]"
                            )}
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-[#95A5A6] py-10">
                      Sem histórico disponível.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
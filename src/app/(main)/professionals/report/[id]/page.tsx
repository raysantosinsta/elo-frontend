/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

// 1. CORREÇÃO: Importar api e useAuth (sem authFetch)
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

// UI Components
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BriefcaseIcon,
  BuildingIcon,
  CheckCircleIcon,
  ClockIcon,
  Loader2,
  MailIcon,
  PhoneIcon,
  TargetIcon,
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

// --- THEME CONSTANTS (ELO PRODUTIVO) ---
const THEME = {
  textMain: "#353A40",      // Cinza escuro principal
  background: "#F5F6FA",    // Fundo claro
  primary: "#2F80ED",       // Azul ELO
  primaryDark: "#1E5CB8",   // Azul escuro hover
  secondaryText: "#7A7E83", // Cinza médio
  white: "#FFFFFF",
  border: "#E2E8F0",        // Bordas
  success: "#10B981",       // Verde
  warning: "#F59E0B",       // Amarelo
  danger: "#EF4444",        // Vermelho
  orange: "#F97316",        // Laranja
};

// --- TYPES ---
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

// --- FUNÇÕES HELPER PARA RENDERIZAÇÃO SEGURA ---

/**
 * Converte qualquer valor para string de forma segura
 * Evita erro "Objects are not valid as a React child"
 */
const safeString = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value.name && typeof value.name === "string") return value.name;
    if (value.title && typeof value.title === "string") return value.title;
    if (value.label && typeof value.label === "string") return value.label;
    console.warn("Objeto não pôde ser convertido para string:", value);
    return "";
  }
  return String(value);
};

/**
 * Obtém o nome da empresa de forma segura
 */
const getCompanyName = (
  company?: { id: string; name: string } | null,
): string => {
  if (!company) return "";
  if (typeof company === "object") return company.name || "";
  return safeString(company);
};

/**
 * Obtém o título da coluna de forma segura
 */
const getColumnTitle = (column?: { title: string } | null): string => {
  if (!column) return "";
  if (typeof column === "object") return column.title || "";
  return safeString(column);
};

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
    className="border-l-4 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-xl"
    style={{ borderLeftColor: color || THEME.primary }}
  >
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold tracking-wide uppercase text-[#7A7E83] flex justify-between items-center">
        {safeString(title)}
        {Icon && <Icon className="h-4 w-4 opacity-50" />}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-extrabold text-[#353A40]">
        {safeString(value)}
      </div>
      {progress !== undefined && (
        <Progress value={progress} className="mt-2 h-1.5 bg-[#F5F6FA]" />
      )}
      {subtext && (
        <div className="text-xs text-[#7A7E83] mt-2 font-medium">
          {safeString(subtext)}
        </div>
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
    <div className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-xl hover:bg-[#F5F6FA] transition-colors bg-white">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "p-2 rounded-full",
            isCompleted
              ? "bg-green-100 text-green-600"
              : "bg-[#2F80ED]/10 text-[#2F80ED]",
          )}
        >
          {isCompleted ? (
            <CheckCircleIcon className="h-5 w-5" />
          ) : (
            <ClockIcon className="h-5 w-5" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-[#353A40]">
            {safeString(activity.title)}
          </h4>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-[#7A7E83]">
            <Badge
              variant="outline"
              className="text-xs font-normal border-[#E2E8F0] text-[#7A7E83]"
            >
              {safeString(activity.status)}
            </Badge>
            <span className="flex items-center gap-1">
              <TargetIcon className="h-3 w-3" /> Prio:{" "}
              {safeString(activity.priority)}
            </span>
          </div>
          <div className="text-xs text-[#7A7E83] mt-1">
            Atualizado em{" "}
            {format(new Date(activity.updatedAt), "dd/MM/yyyy HH:mm")}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---

export default function ProfessionalReportPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  // State
  const [details, setDetails] = useState<ProfessionalDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // --- LOGIC ---

  useEffect(() => {
    if (user && !["MASTER", "ADMIN"].includes(user.role)) {
      // router.push('/unauthorized');
    }
  }, [user, router]);

  const fetchDetails = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/professionals/${id}/details`);
      setDetails(data);
    } catch (error) {
      console.error("Erro na requisição:", error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // --- HELPERS ---

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return THEME.success;
      case "APPROVED":
        return THEME.success;
      case "PENDING":
        return THEME.secondaryText;
      case "IN_PROGRESS":
        return THEME.primary;
      case "FAILED":
        return THEME.danger;
      case "REJECTED":
        return THEME.danger;
      default:
        return THEME.textMain;
    }
  };

  const chartData = useMemo(() => {
    if (!details) return { taskStatusData: [], productivityData: [] };

    return {
      taskStatusData: details.statistics.tasks.byStatus.map((item) => ({
        name: safeString(item.status),
        value: item._count,
        color: getStatusColor(item.status),
      })),
      productivityData: details.statistics.productivity.map((item) => ({
        month: safeString(item.month),
        tasks: item.total_tasks,
        completed: item.completed_tasks,
      })),
    };
  }, [details]);

  // --- RENDER ---

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F6FA]">
        <Loader2 className="h-12 w-12 animate-spin text-[#2F80ED]" />
        <p className="mt-4 text-[#353A40] font-medium animate-pulse">
          Carregando relatório do profissional...
        </p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F6FA] p-4">
        <AlertCircleIcon className="h-16 w-16 text-[#2F80ED] mb-4" />
        <h1 className="text-2xl font-bold text-[#353A40] mb-2">
          Profissional não encontrado
        </h1>
        <Button
          onClick={() => router.back()}
          className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const { professional, statistics, recentActivities } = details;

  return (
    <main className="min-h-screen bg-[#F5F6FA] p-4 md:p-8 font-sans">
      <div className="container mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push("/professionals/report")}
              className="mb-2 text-[#7A7E83] hover:text-[#2F80ED] hover:bg-transparent pl-0"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" /> Voltar para lista
            </Button>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#353A40]">
              {safeString(professional.name)}
            </h1>
            <p className="text-[#7A7E83] mt-1 text-lg">
              Relatório Detalhado de Performance
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* PROFILE CARD */}
          <Card className="lg:col-span-1 shadow-md border-t-4 border-t-[#2F80ED] bg-white rounded-xl">
            <CardHeader>
              <CardTitle className="text-[#353A40] font-bold">
                Perfil Profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-24 w-24 border-4 border-[#F5F6FA] shadow-sm mb-4">
                  <AvatarFallback className="text-2xl bg-[#2F80ED] text-white">
                    {safeString(
                      professional.name.substring(0, 2).toUpperCase(),
                    )}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold text-[#353A40]">
                  {safeString(professional.name)}
                </h3>
                <p className="text-[#7A7E83]">
                  {safeString(
                    professional.professionalRole || "Cargo não definido",
                  )}
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge
                    variant="secondary"
                    className="bg-[#F5F6FA] text-[#353A40] border border-[#E2E8F0]"
                  >
                    {safeString(professional.role)}
                  </Badge>
                  <Badge
                    className={cn(
                      "text-white",
                      professional.status === "ACTIVE"
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-red-500 hover:bg-red-600",
                    )}
                  >
                    {professional.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>

              <Separator className="bg-[#E2E8F0] my-4" />

              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3 text-[#353A40]">
                  <MailIcon className="h-4 w-4 text-[#2F80ED]" />
                  <span className="truncate">
                    {safeString(professional.email)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[#353A40]">
                  <PhoneIcon className="h-4 w-4 text-[#2F80ED]" />
                  <span>{safeString(professional.contact)}</span>
                </div>
                {professional.company && (
                  <div className="flex items-start gap-3 text-[#353A40]">
                    <BuildingIcon className="h-4 w-4 text-[#2F80ED] mt-1" />
                    <div>
                      <div className="font-medium">
                        {getCompanyName(professional.company)}
                      </div>
                      <div className="text-xs text-[#7A7E83]">
                        {safeString(professional.company.email)}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[#353A40]">
                  <BriefcaseIcon className="h-4 w-4 text-[#2F80ED]" />
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
            <div className="grid grid-cols-1 gap-4">
              <StatCard
                title="Conclusão"
                value={`${statistics.tasks.completionRate}%`}
                subtext={`${statistics.tasks.completed} / ${statistics.tasks.total} tarefas`}
                icon={CheckCircleIcon}
                progress={statistics.tasks.completionRate}
                color={THEME.success}
              />
            </div>

            {/* CHART: PRODUCTIVITY */}
            <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
              <CardHeader>
                <CardTitle className="text-[#353A40] font-bold">
                  Produtividade Mensal
                </CardTitle>
                <CardDescription className="text-[#7A7E83]">
                  Volume de tarefas e entregas ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.productivityData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
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
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        backgroundColor: "white",
                        color: "#353A40",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="tasks"
                      name="Total"
                      stroke={THEME.primary}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="Concluídas"
                      stroke={THEME.success}
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
          <TabsList className="bg-white border border-[#E2E8F0] p-1 w-full md:w-auto rounded-lg">
            <TabsTrigger
              value="charts"
              className="data-[state=active]:bg-[#2F80ED] data-[state=active]:text-white rounded-md text-[#353A40]"
            >
              Análise Gráfica
            </TabsTrigger>
            <TabsTrigger
              value="activities"
              className="data-[state=active]:bg-[#2F80ED] data-[state=active]:text-white rounded-md text-[#353A40]"
            >
              Atividades Recentes
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="charts"
            className="animate-in fade-in-50 duration-500"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Status Distribution */}
              <Card className="border border-[#E2E8F0] bg-white rounded-xl">
                <CardHeader>
                  <CardTitle className="text-[#353A40] font-bold">
                    Distribuição por Status
                  </CardTitle>
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
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "white",
                          color: "#353A40",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card className="border border-[#E2E8F0] bg-white rounded-xl">
                <CardHeader>
                  <CardTitle className="text-[#353A40] font-bold">
                    Carga por Prioridade
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statistics.tasks.byPriority}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis 
                        dataKey="priority" 
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
                        cursor={{ fill: "#F5F6FA" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "white",
                          color: "#353A40",
                        }}
                      />
                      <Bar
                        dataKey="_count"
                        name="Tarefas"
                        fill={THEME.primary}
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
            <Card className="border border-[#E2E8F0] bg-white rounded-xl">
              <CardHeader>
                <CardTitle className="text-[#353A40] font-bold">
                  Últimas Movimentações
                </CardTitle>
                <CardDescription className="text-[#7A7E83]">
                  Registro em tempo real das atualizações de tarefas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="text-center py-12 text-[#7A7E83]">
                    <TargetIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>Nenhuma atividade registrada no período.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
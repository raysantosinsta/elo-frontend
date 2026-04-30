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
    className="border-l-4 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm"
    style={{ borderLeftColor: color || THEME.azulPetroleo }}
  >
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold tracking-wide uppercase text-[#95A5A6] flex justify-between items-center">
        {safeString(title)}
        {Icon && <Icon className="h-4 w-4 opacity-50" />}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-[#2D3436]">
        {safeString(value)}
      </div>
      {progress !== undefined && (
        <Progress value={progress} className="mt-2 h-1.5 bg-[#F5F0E6]" />
      )}
      {subtext && (
        <div className="text-xs text-[#95A5A6] mt-2 font-medium">
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
    <div className="flex items-center justify-between p-4 border border-[#95A5A6]/20 rounded-lg hover:bg-[#F5F0E6]/50 transition-colors bg-white">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "p-2 rounded-full",
            isCompleted
              ? "bg-[#27AE60]/10 text-[#27AE60]"
              : "bg-[#2C3E50]/10 text-[#2C3E50]",
          )}
        >
          {isCompleted ? (
            <CheckCircleIcon className="h-5 w-5" />
          ) : (
            <ClockIcon className="h-5 w-5" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-[#2D3436]">
            {safeString(activity.title)}
          </h4>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-[#95A5A6]">
            <Badge
              variant="outline"
              className="text-xs font-normal border-[#95A5A6]/40"
            >
              {safeString(activity.status)}
            </Badge>
            <span className="flex items-center gap-1">
              <TargetIcon className="h-3 w-3" /> Prio:{" "}
              {safeString(activity.priority)}
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
        return THEME.areia;
      case "IN_PROGRESS":
        return THEME.azulPetroleo;
      case "FAILED":
        return THEME.danger;
      case "REJECTED":
        return THEME.danger;
      default:
        return THEME.grafite;
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

  const { professional, statistics, recentActivities } = details;

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
              {safeString(professional.name)}
            </h1>
            <p className="text-[#95A5A6] mt-1 text-lg">
              Relatório Detalhado de Performance
            </p>
          </div>
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
                    {safeString(
                      professional.name.substring(0, 2).toUpperCase(),
                    )}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold text-[#2D3436]">
                  {safeString(professional.name)}
                </h3>
                <p className="text-[#95A5A6]">
                  {safeString(
                    professional.professionalRole || "Cargo não definido",
                  )}
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge
                    variant="secondary"
                    className="bg-[#F5F0E6] text-[#2C3E50]"
                  >
                    {safeString(professional.role)}
                  </Badge>
                  <Badge
                    className={cn(
                      "text-white",
                      professional.status === "ACTIVE"
                        ? "bg-[#27AE60]"
                        : "bg-[#C0392B]",
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
                  <span className="truncate">
                    {safeString(professional.email)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[#2D3436]">
                  <PhoneIcon className="h-4 w-4 text-[#D35400]" />
                  <span>{safeString(professional.contact)}</span>
                </div>
                {professional.company && (
                  <div className="flex items-start gap-3 text-[#2D3436]">
                    <BuildingIcon className="h-4 w-4 text-[#D35400] mt-1" />
                    <div>
                      <div className="font-medium">
                        {getCompanyName(professional.company)}
                      </div>
                      <div className="text-xs text-[#95A5A6]">
                        {safeString(professional.company.email)}
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
        </Tabs>
      </div>
    </main>
  );
}

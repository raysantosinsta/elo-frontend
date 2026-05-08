/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { api } from "@/services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  Filter,
  Loader2,
  Package,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// --- INTERFACES ---

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  items: any[];
  _count?: { items: number };
}

interface Flow {
  id: string;
  name: string;
  color: string;
  stages: Stage[];
  _count: { items: number };
}

interface FlowOption {
  id: string;
  name: string;
  color: string;
  itemCount: number;
}

interface FlowItem {
  id: string;
  title: string;
  description?: string;
  productRef?: string;
  orderNumber?: string;
  quantity: number;
  priority: number;
  status: string;
  dueDate?: string;
  productionStartedAt?: string;
  deliveryAt?: string;
  stage?: { id: string; name: string; color: string };
  flow?: { id: string; name: string; color: string };
  assignedTo?: { id: string; name: string };
  supplier?: { id: string; name: string };
}

export default function RealTimeFlowDashboard() {
  const { user } = useAuth();
  const [selectedFlowId, setSelectedFlowId] = useState<string>("all");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: companySettings, isLoading: loadingSettings } =
    useCompanySettings(user?.company?.id || "");

  const notificationDays = companySettings?.notificationDays ?? 7;
  const FINALIZED_STATUSES = [
    "CONCLUIDO",
    "ENTREGUE",
    "FINALIZADO",
    "CANCELADO",
  ];

  const fetchData = async (endpoint: string) => {
    try {
      const response = await api.get(endpoint);
      return response.data;
    } catch (error: any) {
      console.error(`[DASHBOARD] ❌ Erro em ${endpoint}:`, error);
      throw error;
    }
  };

  const {
    data: allFlows = [],
    isLoading: loadingFlows,
    error: flowsError,
  } = useQuery<Flow[]>({
    queryKey: ["all-flows"],
    queryFn: async () => {
      const flows = await fetchData("/flow");
      return Promise.all(
        flows.map(async (f: any) => await fetchData(`/flow/${f.id}/board`)),
      );
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  const {
    data: selectedFlow,
    isLoading: loadingSelected,
    refetch: refetchSelected,
  } = useQuery<Flow>({
    queryKey: ["selected-flow", selectedFlowId, allFlows],
    queryFn: async () => {
      if (selectedFlowId === "all") return aggregateAllFlows(allFlows);
      return await fetchData(`/flow/${selectedFlowId}/board`);
    },
    enabled: !!user && allFlows.length > 0,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const {
    data: allItems = [],
    isLoading: loadingItems,
    refetch: refetchItems,
  } = useQuery<FlowItem[]>({
    queryKey: ["all-items", selectedFlowId],
    queryFn: async () => {
      const endpoint =
        selectedFlowId === "all"
          ? "/flow/filter/items"
          : `/flow/${selectedFlowId}/filter/items`;
      return await fetchData(endpoint);
    },
    enabled: !!user && allFlows.length > 0,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const notificationLimit = new Date();
  notificationLimit.setDate(today.getDate() + notificationDays);
  const notificationLimitStr = notificationLimit.toISOString().split("T")[0];

  const overdueItems = allItems.filter((item) => {
    if (!item.dueDate || FINALIZED_STATUSES.includes(item.status)) return false;
    return item.dueDate.split("T")[0] < todayStr;
  });

  const upcomingItems = allItems.filter((item) => {
    if (!item.dueDate || FINALIZED_STATUSES.includes(item.status)) return false;
    const date = item.dueDate.split("T")[0];
    return date >= todayStr && date <= notificationLimitStr;
  });

  const productionItems = allItems.filter((item) => {
    return !FINALIZED_STATUSES.includes(item.status);
  });

  useEffect(() => {
    if (allItems.length > 0) {
      const finalizedItems = allItems.filter((item) =>
        FINALIZED_STATUSES.includes(item.status),
      );
      console.log(`📊 Total de itens: ${allItems.length}`);
      console.log(`📊 Itens FINALIZADOS: ${finalizedItems.length}`);
      console.log(`📊 Atrasados: ${overdueItems.length}`);
      console.log(
        `📊 Próximos ${notificationDays} dias: ${upcomingItems.length}`,
      );
      console.log(`📊 Em Produção: ${productionItems.length}`);
    }
  }, [
    allItems,
    overdueItems,
    upcomingItems,
    productionItems,
    notificationDays,
  ]);

  const handleCardClick = (filterType: "overdue" | "upcoming") => {
    const params = new URLSearchParams();

    params.set("filter", filterType);
    params.set("dateType", "dueDate");

    const sourceItems = filterType === "overdue" ? overdueItems : upcomingItems;

    const uniqueFlowIds = Array.from(
      new Set(sourceItems.map((item) => item.flow?.id).filter(Boolean)),
    );

    console.log(
      `🔗 [Dashboard] Redirecionando. Filtro: ${filterType}, Fluxos afetados:`,
      uniqueFlowIds,
    );

    if (selectedFlowId !== "all") {
      params.set("flowId", selectedFlowId);
    } else if (uniqueFlowIds.length > 0) {
      params.set("flowIds", uniqueFlowIds.join(","));
    }

    if (filterType === "upcoming") {
      const todayStr = new Date().toISOString().split("T")[0];
      const target = new Date();
      target.setDate(target.getDate() + notificationDays);
      const targetStr = target.toISOString().split("T")[0];
      params.set("startDate", todayStr);
      params.set("endDate", targetStr);
    }

    router.push(`/kanban-flow?${params.toString()}`);
  };

  const chartData = (selectedFlow?.stages || [])
    .map((s) => ({
      name: s.name,
      total:
        s.items?.filter(
          (item: any) => !FINALIZED_STATUSES.includes(item.status),
        )?.length ||
        s._count?.items ||
        0,
      color: s.color || "#2F80ED",
      order: s.order,
    }))
    .sort((a, b) => a.order - b.order);

  const getMetrics = () => {
    if (!selectedFlow?.stages?.length)
      return {
        totalItems: 0,
        totalStages: 0,
      };

    const stages = selectedFlow.stages;
    const lastStage = [...stages].sort((a, b) => b.order - a.order)[0];

    const totalItems = stages.reduce((acc, s) => {
      const itemsCount =
        s.items?.filter(
          (item: any) => !FINALIZED_STATUSES.includes(item.status),
        )?.length ||
        s._count?.items ||
        0;

      return s.id === lastStage.id ? acc : acc + itemsCount;
    }, 0);

    return { totalItems, totalStages: stages.length };
  };

  const metrics = getMetrics();

  function aggregateAllFlows(flows: Flow[]): Flow {
    const stageGroups: Record<string, Stage> = {};
    flows.forEach((f) => {
      f.stages?.forEach((s) => {
        const nonFinalizedItems =
          s.items?.filter(
            (item: any) => !FINALIZED_STATUSES.includes(item.status),
          ) || [];

        if (!stageGroups[s.name]) {
          stageGroups[s.name] = {
            ...s,
            items: [...nonFinalizedItems],
            _count: { items: nonFinalizedItems.length },
          };
        } else {
          stageGroups[s.name].items.push(...nonFinalizedItems);
          stageGroups[s.name]._count!.items += nonFinalizedItems.length;
        }
      });
    });
    return {
      id: "all",
      name: "Todos os Fluxos",
      color: "#7A7E83",
      stages: Object.values(stageGroups),
      _count: { items: 0 },
    };
  }

  const flowOptions: FlowOption[] = [
    {
      id: "all",
      name: "Todos os Fluxos",
      color: "#7A7E83",
      itemCount: allFlows.reduce((acc, f) => {
        const flowTotal =
          f.stages?.reduce((sum, stage) => {
            const itemsCount =
              stage.items?.filter(
                (item: any) => !FINALIZED_STATUSES.includes(item.status),
              )?.length ||
              stage._count?.items ||
              0;
            return sum + itemsCount;
          }, 0) || 0;
        return acc + flowTotal;
      }, 0),
    },
    ...allFlows.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      itemCount:
        f.stages?.reduce((acc, stage) => {
          const itemsCount =
            stage.items?.filter(
              (item: any) => !FINALIZED_STATUSES.includes(item.status),
            )?.length ||
            stage._count?.items ||
            0;
          return acc + itemsCount;
        }, 0) || 0,
    })),
  ];

  const handleManualRefresh = () => {
    console.log("🔄 [Dashboard] Atualização manual solicitada");
    refetchSelected();
    refetchItems();
  };

  if (loadingFlows || loadingItems)
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center gap-4 bg-[#F5F6FA]">
        <Loader2 className="h-10 w-10 animate-spin text-[#2F80ED]" />
        <p className="text-[#7A7E83] animate-pulse">
          Carregando indicadores...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#353A40] mb-2">
              Dashboard de Fluxo
            </h1>
            <p className="text-[#7A7E83]">
              {selectedFlowId === "all"
                ? "Visão consolidada de todos os fluxos"
                : `Fluxo: ${selectedFlow?.name}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
              <SelectTrigger className="w-[280px] bg-white border-[#CBD5E1] text-[#353A40]">
                <Filter className="h-4 w-4 mr-2 text-[#7A7E83]" />
                <SelectValue placeholder="Selecionar fluxo" />
              </SelectTrigger>
              <SelectContent>
                {flowOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span className="text-[#353A40]">{opt.name}</span>
                      </div>
                      <span className="text-xs text-[#7A7E83]">
                        {opt.itemCount} {opt.itemCount === 1 ? "item" : "itens"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#CBD5E1] rounded-lg hover:bg-gray-50 shadow-sm text-sm font-medium text-[#353A40] transition-all"
            >
              <RefreshCw className="h-4 w-4 text-[#2F80ED]" /> Atualizar
            </button>
          </div>
        </header>

        <hr className="border-[#E2E8F0] mb-6" />

        {/* METRIC CARDS */}
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Atrasados"
            value={overdueItems.length}
            icon={<AlertCircle className="h-5 w-5 text-red-500" />}
            onClick={() => handleCardClick("overdue")}
            subtitle="Itens com prazo vencido"
            variant="overdue"
          />
          <MetricCard
            title={`Vencem em ${notificationDays} dias`}
            value={upcomingItems.length}
            icon={<CalendarClock className="h-5 w-5 text-yellow-500" />}
            onClick={() => handleCardClick("upcoming")}
            subtitle={`Próximos ${notificationDays} dias`}
            variant="upcoming"
          />
          <MetricCard
            title="Em Produção"
            value={productionItems.length}
            icon={<Package className="h-5 w-5 text-[#2F80ED]" />}
            subtitle="Total em andamento"
            variant="production"
          />
          <MetricCard
            title="Etapas"
            value={metrics.totalStages}
            icon={<Package className="h-5 w-5 text-[#7A7E83]" />}
            subtitle="Fases do processo"
            variant="stages"
          />
        </div>

        {/* CHART CARD */}
        <Card className="bg-white shadow-lg rounded-xl border-t-4 border-t-[#2F80ED]/20">
          <CardHeader className="border-b border-[#E2E8F0] pb-3">
            <CardTitle className="text-lg text-[#353A40]">
              Distribuição por Etapa
            </CardTitle>
            <CardDescription className="text-[#7A7E83]">
              Quantidade de produtos em cada fase do processo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: "#7A7E83" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    fontSize={12}
                    allowDecimals={false}
                    tick={{ fill: "#7A7E83" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F5F6FA" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      backgroundColor: "white",
                      color: "#353A40",
                    }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={45}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- METRIC CARD COMPONENT ATUALIZADO ---
function MetricCard({ title, value, icon, onClick, subtitle, variant }: any) {
  const getBorderColor = () => {
    switch (variant) {
      case "overdue":
        return "border-l-red-500";
      case "upcoming":
        return "border-l-yellow-500";
      case "production":
        return "border-l-[#2F80ED]";
      default:
        return "border-l-[#7A7E83]";
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case "overdue":
        return value > 0 ? "text-red-600" : "text-[#353A40]";
      case "upcoming":
        return value > 0 ? "text-yellow-600" : "text-[#353A40]";
      case "production":
        return "text-[#2F80ED]";
      default:
        return "text-[#353A40]";
    }
  };

  return (
    <Card
      className={`bg-white border-l-4 ${getBorderColor()} shadow-sm transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#7A7E83]">
          {title}
        </CardTitle>
        <div>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getValueColor()}`}>{value}</div>
        <p className="text-[10px] text-[#7A7E83] mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

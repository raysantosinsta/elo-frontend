/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Package,
  Loader2,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Filter,
  CalendarClock,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useCompanySettings } from "@/hooks/use-company-settings";

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

   // 🔥 NOVO: Buscar configuração da empresa
  const { data: companySettings, isLoading: loadingSettings } = useCompanySettings(
    user?.company?.id || ""
  );

  const notificationDays = companySettings?.notificationDays ?? 7; // fallback 7
  // Adicione isso no topo do componente, após as interfaces
const FINALIZED_STATUSES = ['CONCLUIDO', 'ENTREGUE', 'FINALIZADO', 'CANCELADO'];

  // --- SERVIÇOS DE BUSCA ---
  const fetchData = async (endpoint: string) => {
    try {
      const response = await api.get(endpoint);
      return response.data;
    } catch (error: any) {
      console.error(`[DASHBOARD] ❌ Erro em ${endpoint}:`, error);
      throw error;
    }
  };

  // --- QUERIES (React Query) ---
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
  staleTime: 0, // 🔥 FORÇA SEMPRE BUSCAR DADOS NOVOS
  refetchOnMount: true, // 🔥 REFETCH AO MONTAR
  refetchOnWindowFocus: true, // 🔥 REFETCH AO FOCAR NA JANELA
  });

  

  // --- LÓGICA DE FILTRAGEM (O React Compiler otimiza isso automaticamente) ---
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

useEffect(() => {
  if (allItems.length > 0) {
    const finalizedItems = allItems.filter(item => 
      FINALIZED_STATUSES.includes(item.status)
    );
    console.log(`📊 Total de itens: ${allItems.length}`);
    console.log(`📊 Itens FINALIZADOS (${FINALIZED_STATUSES.join(', ')}): ${finalizedItems.length}`);
    console.log(`📊 Atrasados: ${overdueItems.length}`);
    console.log(`📊 Próximos 7 dias: ${upcomingItems.length}`);
    
    if (finalizedItems.length > 0) {
      console.warn('⚠️ ATENÇÃO: Itens finalizados sendo retornados!');
      console.log('Status encontrados:', [...new Set(allItems.map(i => i.status))]);
    }
  }
}, [allItems, overdueItems, upcomingItems]);

  const handleCardClick = (filterType: "overdue" | "upcoming") => {
    const params = new URLSearchParams();

    // 1. Define o tipo de filtro
    params.set("filter", filterType);
    params.set("dateType", "dueDate");

    // 2. Seleciona os itens baseados no filtro para extrair os IDs de fluxo
    const sourceItems = filterType === "overdue" ? overdueItems : upcomingItems;

    // 3. Extrai IDs únicos de fluxos que possuem itens nesse estado
    const uniqueFlowIds = Array.from(
      new Set(sourceItems.map((item) => item.flow?.id).filter(Boolean))
    );

    console.log(`🔗 [Dashboard] Redirecionando. Filtro: ${filterType}, Fluxos afetados:`, uniqueFlowIds);

    // 4. Lógica de navegação
    if (selectedFlowId !== "all") {
      // Se o usuário já filtrou o Dashboard por um fluxo específico, mantém só ele
      params.set("flowId", selectedFlowId);
    } else if (uniqueFlowIds.length > 0) {
      // Se está em "Todos os Fluxos", envia a lista de quem tem itens atrasados
      params.set("flowIds", uniqueFlowIds.join(","));
    }

    // Se for "upcoming", já envia o range de datas
    if (filterType === "upcoming") {
      const todayStr = new Date().toISOString().split("T")[0];
      const target = new Date();
      target.setDate(target.getDate() + notificationDays); // 🔥 USAR notificationDays
      const targetStr = target.toISOString().split("T")[0];
      params.set("startDate", todayStr);
      params.set("endDate", targetStr);
    }

    router.push(`/kanban-flow?${params.toString()}`);
  };

  // --- PROCESSAMENTO DE DADOS ---
  const chartData = (selectedFlow?.stages || [])
    .map((s) => ({
      name: s.name,
      total: s.items?.length || s._count?.items || 0,
      color: s.color || "#3b82f6",
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

    const totalItems = stages.reduce(
      (acc, s) =>
        s.id === lastStage.id
          ? acc
          : acc + (s.items?.length || s._count?.items || 0),
      0,
    );

    return { totalItems, totalStages: stages.length };
  };

  const metrics = getMetrics();

  function aggregateAllFlows(flows: Flow[]): Flow {
    const stageGroups: Record<string, Stage> = {};
    flows.forEach((f) => {
      f.stages?.forEach((s) => {
        if (!stageGroups[s.name]) {
          stageGroups[s.name] = {
            ...s,
            items: [...(s.items || [])],
            _count: { items: s.items?.length || 0 },
          };
        } else {
          stageGroups[s.name].items.push(...(s.items || []));
          stageGroups[s.name]._count!.items += s.items?.length || 0;
        }
      });
    });
    return {
      id: "all",
      name: "Todos os Fluxos",
      color: "#64748b",
      stages: Object.values(stageGroups),
      _count: { items: 0 },
    };
  }

  const flowOptions: FlowOption[] = [
    {
      id: "all",
      name: "Todos os Fluxos",
      color: "#64748b",
      itemCount: allFlows.reduce((acc, f) => {
        // Soma os itens de todos os fluxos
        const flowTotal = f.stages?.reduce(
          (sum, stage) => sum + (stage.items?.length || stage._count?.items || 0),
          0
        ) || 0;
        return acc + flowTotal;
      }, 0),
    },
    ...allFlows.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      itemCount: f.stages?.reduce(
        (acc, stage) => acc + (stage.items?.length || stage._count?.items || 0),
        0
      ) || 0,
    })),
  ];

  if (loadingFlows || loadingItems)
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Carregando indicadores...
        </p>
      </div>
    );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard de Fluxo
          </h1>
          <p className="text-muted-foreground">
            {selectedFlowId === "all"
              ? "Visão consolidada"
              : `Fluxo: ${selectedFlow?.name}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
            <SelectTrigger className="w-[280px]">
              <Filter className="h-4 w-4 mr-2" />
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
                      <span>{opt.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {opt.itemCount} {opt.itemCount === 1 ? "item" : "itens"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => {
              refetchSelected();
              refetchItems();
               window.location.reload();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-slate-50 shadow-sm text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Atrasados"
          value={overdueItems.length}
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          onClick={() => handleCardClick("overdue")}
          subtitle="Itens com prazo vencido"
        />
        <MetricCard
          title={`Vencem em ${notificationDays} dias`} // 🔥 DINÂMICO
          value={upcomingItems.length}
          icon={<CalendarClock className="h-5 w-5 text-yellow-500" />}
          onClick={() => handleCardClick("upcoming")}
          subtitle={`Próximos ${notificationDays} dias`} // 🔥 DINÂMICO
        />
        <MetricCard
          title="Em Produção"
          value={metrics.totalItems}
          icon={<Package className="h-5 w-5 text-blue-500" />}
          subtitle="Total em andamento"
        />
        <MetricCard
          title="Etapas"
          value={metrics.totalStages}
          icon={<Package className="h-5 w-5 text-green-500" />}
          subtitle="Fases do processo"
        />
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Distribuição por Etapa</CardTitle>
          <CardDescription>
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
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
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
  );
}

function MetricCard({ title, value, icon, onClick, subtitle }: any) {
  return (
    <Card
      className={`border-l-4 border-l-gray-400 shadow-sm transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
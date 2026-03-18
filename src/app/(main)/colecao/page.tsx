/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
// Adicione este import no início do arquivo
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
  stage?: {
    id: string;
    name: string;
    color: string;
  };
  flow?: {
    id: string;
    name: string;
    color: string;
  };
  assignedTo?: {
    id: string;
    name: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
}

export default function RealTimeFlowDashboard() {
  const { user } = useAuth();
  const [selectedFlowId, setSelectedFlowId] = useState<string>("all");

  // Dentro do componente RealTimeFlowDashboard, adicione:
  const router = useRouter();

  // Adicione esta função para navegar com os filtros
  const handleCardClick = (filterType: "overdue" | "upcoming") => {
    const params = new URLSearchParams();

    if (filterType === "overdue") {
      params.set("filter", "overdue");
      params.set("dateType", "dueDate");
    } else if (filterType === "upcoming") {
      params.set("filter", "upcoming");
      params.set("dateType", "dueDate");

      // Adiciona o intervalo de 7 dias
      const today = new Date();
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      params.set("startDate", today.toISOString().split("T")[0]);
      params.set("endDate", sevenDaysFromNow.toISOString().split("T")[0]);
    }

    // Se não estiver em "Todos os Fluxos", adiciona o flowId
    if (selectedFlowId !== "all") {
      params.set("flowId", selectedFlowId);
    }

    router.push(`/kanban-flow?${params.toString()}`);
  };

  // --- FUNÇÃO DE FETCH ---
  const fetchData = async (endpoint: string) => {
    console.log(`[DASHBOARD] 📡 Buscando: ${endpoint}`);

    try {
      const response = await api.get(endpoint);
      return response.data;
    } catch (error: any) {
      console.error(`[DASHBOARD] ❌ Erro em ${endpoint}:`, error);
      throw error;
    }
  };

  // --- BUSCAR TODOS OS FLUXOS (para o seletor) ---
  const {
    data: allFlows = [],
    isLoading: loadingFlows,
    error: flowsError,
  } = useQuery<Flow[]>({
    queryKey: ["all-flows"],
    queryFn: async () => {
      const flows = await fetchData("/flow");

      // Buscar board de cada flow para ter os itens
      const flowsWithDetails = await Promise.all(
        flows.map(async (flow: any) => {
          try {
            const board = await fetchData(`/flow/${flow.id}/board`);
            return board;
          } catch (error) {
            console.error(`Erro ao buscar board do flow ${flow.id}:`, error);
            return { ...flow, stages: [] };
          }
        }),
      );

      return flowsWithDetails;
    },
    enabled: !!user,
  });

  // --- BUSCAR DADOS DO FLUXO SELECIONADO ---
  const {
    data: selectedFlow,
    isLoading: loadingSelected,
    refetch: refetchSelected,
  } = useQuery<Flow>({
    queryKey: ["selected-flow", selectedFlowId],
    queryFn: async () => {
      if (selectedFlowId === "all") {
        return aggregateAllFlows(allFlows);
      }
      return await fetchData(`/flow/${selectedFlowId}/board`);
    },
    enabled: !!user && allFlows.length > 0,
  });

  // --- BUSCAR TODOS OS ITENS (sem filtro) ---
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
      const data = await fetchData(endpoint);
      console.log(`📦 Todos os itens (${data.length}):`, data);
      return data;
    },
    enabled: !!user && allFlows.length > 0,
  });

  // ===========================================================================
  // 🔥 FILTROS NO FRONTEND (igual ao Kanban)
  // ===========================================================================

  // Obter data atual no formato YYYY-MM-DD (ignora timezone)
  const todayStr = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // 🔥 Calcular data daqui a 7 dias
  const sevenDaysFromNowStr = useMemo(() => {
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    const year = sevenDays.getFullYear();
    const month = String(sevenDays.getMonth() + 1).padStart(2, "0");
    const day = String(sevenDays.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Filtrar itens atrasados (no frontend)
  const overdueItems = useMemo(() => {
    if (!allItems.length) return [];

    return allItems.filter((item) => {
      if (!item.dueDate) return false;
      if (item.status === "CONCLUIDO") return false;

      const itemDateStr = item.dueDate.split("T")[0];
      return itemDateStr < todayStr;
    });
  }, [allItems, todayStr]);

  // 🔥 Filtrar itens que vencem em até 7 dias (baseado no prazo final)
  const upcomingItems = useMemo(() => {
    if (!allItems.length) return [];

    console.log(
      `🔍 Filtrando itens que vencem em até 7 dias (${todayStr} até ${sevenDaysFromNowStr})...`,
    );

    const filtered = allItems.filter((item) => {
      // 🔥 AGORA USA dueDate em vez de productionStartedAt
      if (!item.dueDate) return false;
      if (item.status === "CONCLUIDO") return false;

      const itemDateStr = item.dueDate.split("T")[0];

      // Verifica se a data está entre hoje e 7 dias no futuro
      const isWithin7Days =
        itemDateStr >= todayStr && itemDateStr <= sevenDaysFromNowStr;

      if (isWithin7Days) {
        console.log(
          `✅ Item encontrado: ${item.title} - vence em: ${itemDateStr}`,
        );
      }

      return isWithin7Days;
    });

    console.log(`📊 Total para os próximos 7 dias: ${filtered.length}`);
    return filtered;
  }, [allItems, todayStr, sevenDaysFromNowStr]);

  // Debug
  useEffect(() => {
    console.log("📅 todayStr:", todayStr);
    console.log("📅 sevenDaysFromNowStr:", sevenDaysFromNowStr);
    console.log("📦 allItems:", allItems.length);
    console.log("🔴 overdueItems:", overdueItems.length);
    console.log("🟡 upcomingItems (7 dias):", upcomingItems.length);

    if (upcomingItems.length > 0) {
      upcomingItems.forEach((item) => {
        console.log(`   - ${item.title}: vence em ${item.dueDate}`);
      });
    }
  }, [allItems, overdueItems, upcomingItems, todayStr, sevenDaysFromNowStr]);

  // --- PROCESSAR DADOS PARA O GRÁFICO ---
  const chartData = useMemo(() => {
    if (!selectedFlow || !selectedFlow.stages) return [];

    const stageData = selectedFlow.stages.map((stage) => {
      const itemCount = stage.items?.length || stage._count?.items || 0;
      return {
        name: stage.name,
        total: itemCount,
        color: stage.color || "#3b82f6",
        order: stage.order,
      };
    });

    return stageData.sort((a, b) => a.order - b.order);
  }, [selectedFlow]);

  // --- CALCULAR MÉTRICAS DO FLUXO SELECIONADO ---
  const metrics = useMemo(() => {
    if (!selectedFlow)
      return {
        totalItems: 0,
        totalStages: 0,
        bottleneck: { name: "N/A", count: 0 },
      };

    // 🔥 IDENTIFICAR A ÚLTIMA COLUNA (maior order)
    const lastStage = selectedFlow.stages?.reduce((prev, current) => {
      return prev.order > current.order ? prev : current;
    }, selectedFlow.stages[0]);

    // 🔥 CALCULAR TOTAL DE ITENS EXCLUINDO A ÚLTIMA COLUNA
    const totalItemsInProgress =
      selectedFlow.stages?.reduce((acc, stage) => {
        // Pula a última coluna (não conta itens que já chegaram lá)
        if (lastStage && stage.id === lastStage.id) {
          return acc;
        }
        return acc + (stage.items?.length || stage._count?.items || 0);
      }, 0) || 0;

    const totalStages = selectedFlow.stages?.length || 0;

    let bottleneck = { name: "Estável", count: 0 };
    if (selectedFlow.stages) {
      selectedFlow.stages.forEach((stage) => {
        const count = stage.items?.length || stage._count?.items || 0;
        if (count > bottleneck.count) {
          bottleneck = {
            name: stage.name,
            count,
          };
        }
      });
    }

    return {
      totalItems: totalItemsInProgress,
      totalStages,
      bottleneck,
    };
  }, [selectedFlow]);

  // --- AGREGAR TODOS OS FLUXOS ---
  const aggregateAllFlows = (flows: Flow[]): Flow => {
    const allStages: Record<string, Stage> = {};

    flows.forEach((flow) => {
      flow.stages?.forEach((stage) => {
        if (!allStages[stage.name]) {
          allStages[stage.name] = {
            ...stage,
            items: [...(stage.items || [])],
            _count: { items: stage.items?.length || 0 },
          };
        } else {
          allStages[stage.name].items = [
            ...(allStages[stage.name].items || []),
            ...(stage.items || []),
          ];
          allStages[stage.name]._count = {
            items:
              (allStages[stage.name]._count?.items || 0) +
              (stage.items?.length || 0),
          };
        }
      });
    });

    return {
      id: "all",
      name: "Todos os Fluxos",
      color: "#64748b",
      stages: Object.values(allStages),
      _count: {
        items: Object.values(allStages).reduce(
          (acc, s) => acc + (s._count?.items || 0),
          0,
        ),
      },
    };
  };

  // --- OPÇÕES PARA O SELECT ---
  const flowOptions: FlowOption[] = useMemo(() => {
    const options = allFlows.map((flow) => ({
      id: flow.id,
      name: flow.name,
      color: flow.color,
      itemCount:
        flow.stages?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0,
    }));

    return [
      {
        id: "all",
        name: "Todos os Fluxos",
        color: "#64748b",
        itemCount: options.reduce((acc, f) => acc + f.itemCount, 0),
      },
      ...options,
    ];
  }, [allFlows]);

  // --- FORMATAR DATA ---
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";

    // Extrair apenas a parte da data (YYYY-MM-DD)
    const datePart = dateString.split("T")[0];

    // Converter para formato brasileiro
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  };

  // Calcular dias restantes
  const calculateDaysRemaining = (dueDate?: string): number | null => {
    if (!dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // --- LOADING ---
  if (loadingFlows || loadingItems) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Carregando fluxos de produção...
        </p>
      </div>
    );
  }

  if (flowsError) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Erro ao carregar dados</h3>
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os fluxos de produção
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-md text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-700">
      {/* HEADER COM FILTRO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard de Fluxo
          </h1>
          <p className="text-muted-foreground">
            {selectedFlowId === "all"
              ? "Visão consolidada de todos os fluxos"
              : `Análise detalhada do fluxo: ${selectedFlow?.name}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* FILTRO POR FLUXO */}
          <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
            <SelectTrigger className="w-[280px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Selecionar fluxo" />
            </SelectTrigger>
            <SelectContent>
              {flowOptions.map((flow) => (
                <SelectItem key={flow.id} value={flow.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: flow.color }}
                      />
                      <span>{flow.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {flow.itemCount} itens
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
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-slate-50 transition-all shadow-sm text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* CARDS DE MÉTRICAS PRINCIPAIS */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Card de Itens Atrasados - TORNE-O CLICÁVEL */}
        <Card
          className="border-l-4 border-l-red-500 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => handleCardClick("overdue")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Atrasados
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {overdueItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedFlowId === "all"
                ? "Produtos com prazo vencido"
                : "Atrasados neste fluxo"}
            </p>
          </CardContent>
        </Card>

        {/* Card de Itens a Vencer em 7 Dias - TORNE-O CLICÁVEL */}
        <Card
          className="border-l-4 border-l-yellow-500 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => handleCardClick("upcoming")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Vencem em 7 dias
            </CardTitle>
            <CalendarClock className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {upcomingItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Prazo final nos próximos 7 dias
            </p>
          </CardContent>
        </Card>

        {/* Card de Total de Itens */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          {/* Dentro do CardHeader, após o CardTitle */}
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Atrasados
              </CardTitle>
              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                clicar para filtrar
              </span>
            </div>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingSelected ? "..." : metrics.totalItems}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de itens em andamento
            </p>
          </CardContent>
        </Card>

        {/* Card de Gargalo */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Gargalo
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">
              {metrics.bottleneck.name}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.bottleneck.count} itens acumulados
            </p>
          </CardContent>
        </Card>

        {/* Card de Etapas */}
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Etapas
            </CardTitle>
            <Package className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalStages}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de fases no processo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICO DE DISTRIBUIÇÃO */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>
            {selectedFlowId === "all"
              ? "Distribuição por Etapa (Todos os Fluxos)"
              : `Distribuição por Etapa - ${selectedFlow?.name}`}
          </CardTitle>
          <CardDescription>
            Quantidade de produtos em cada fase do processo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-4 min-w-[300px] min-h-[300px]">
            {loadingSelected ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : chartData.length > 0 ? (
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
                    tick={{ fill: "#64748b" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    fontSize={12}
                    tick={{ fill: "#64748b" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number) => [
                      `${value} itens`,
                      "Quantidade",
                    ]}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={45}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Nenhum dado disponível para este fluxo
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* LISTA DE ITENS ATRASADOS */}
      {overdueItems.length > 0 && (
        <Card className="shadow-md border-red-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Itens Atrasados
            </CardTitle>
            <CardDescription>
              Produtos com prazo de produção vencido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueItems.slice(0, 5).map((item) => {
                const daysRemaining = calculateDaysRemaining(item.dueDate);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.title}</p>
                        {item.productRef && (
                          <span className="text-xs bg-red-200 px-2 py-0.5 rounded-full text-red-800">
                            {item.productRef}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-muted-foreground">
                          Etapa: {item.stage?.name || "N/A"}
                        </p>
                        {item.flow && selectedFlowId === "all" && (
                          <p className="text-sm text-muted-foreground">
                            Fluxo: {item.flow.name}
                          </p>
                        )}
                        {item.dueDate && (
                          <p className="text-xs text-red-600">
                            Venceu em: {formatDate(item.dueDate)} (
                            {Math.abs(daysRemaining || 0)} dias atrás)
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-medium bg-red-200 text-red-800 px-2 py-1 rounded-full">
                      Atrasado
                    </span>
                  </div>
                );
              })}
              {overdueItems.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  E mais {overdueItems.length - 5} itens atrasados...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🔥 LISTA DE ITENS QUE VENCEM EM 7 DIAS (MODIFICADO) */}
      {upcomingItems.length > 0 && (
        <Card className="shadow-md border-yellow-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-yellow-500" />
              Itens a Vencer em 7 Dias
            </CardTitle>
            <CardDescription>
              Produtos com prazo final nos próximos 7 dias (
              {formatDate(todayStr)} até {formatDate(sevenDaysFromNowStr)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingItems.slice(0, 5).map((item) => {
                const daysRemaining = calculateDaysRemaining(item.dueDate);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.title}</p>
                        {item.productRef && (
                          <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded-full text-yellow-800">
                            {item.productRef}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-muted-foreground">
                          Etapa: {item.stage?.name || "N/A"}
                        </p>
                        {item.flow && selectedFlowId === "all" && (
                          <p className="text-sm text-muted-foreground">
                            Fluxo: {item.flow.name}
                          </p>
                        )}
                        {item.assignedTo && (
                          <p className="text-sm text-muted-foreground">
                            Resp: {item.assignedTo.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {item.dueDate && (
                        <span className="text-xs text-yellow-600 font-medium">
                          {formatDate(item.dueDate)}
                        </span>
                      )}
                      <span className="text-xs font-bold bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                        {daysRemaining === 0
                          ? "Hoje!"
                          : `${daysRemaining} dias`}
                      </span>
                    </div>
                  </div>
                );
              })}
              {upcomingItems.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  E mais {upcomingItems.length - 5} itens para vencer nos
                  próximos dias...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MENSAGEM QUANDO NÃO HÁ DADOS */}
      {!loadingSelected &&
        overdueItems.length === 0 &&
        upcomingItems.length === 0 &&
        chartData.length === 0 && (
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhum dado disponível
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedFlowId === "all"
                  ? "Não há itens em produção no momento"
                  : "Este fluxo não possui itens cadastrados"}
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

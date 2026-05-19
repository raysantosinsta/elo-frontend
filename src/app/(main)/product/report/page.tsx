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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  AlertCircle,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Shirt,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import Link from "next/link";

// --- Interfaces ---
interface FlowReportItem {
  id: string;
  title: string;
  orderNumber: string;
  productRef: string;
  quantity: number;
  priority: number;
  dueDate: string | null;
  stageName: string;
  stageColor: string | null;
  flowName: string;
  assignedTo?: string;
  assignedToId?: string;
}

interface FlowReportSummary {
  totalCards: number;
  totalPieces: number;
  overdueItems: number;
  byStage: Array<{
    name: string;
    count: number;
    pieces: number;
    color: string;
  }>;
  byPriority: Array<{ name: string; value: number }>;
}

interface FlowOption {
  id: string;
  name: string;
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
  inputBorder: "#CBD5E1",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export default function ProductionReportsPage() {
  const { user } = useAuth();

  const [items, setItems] = useState<FlowReportItem[]>([]);
  const [summary, setSummary] = useState<FlowReportSummary | null>(null);
  const [flows, setFlows] = useState<FlowOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [flowId, setFlowId] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const fetchFlows = useCallback(async () => {
    try {
      const { data } = await api.get("/reports-flow/flows-list");
      setFlows(data);
    } catch (error) {
      console.error("Erro ao buscar fluxos:", error);
    }
  }, []);

  const fetchReport = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params: any = {};
        if (flowId && flowId !== "all") params.flowId = flowId;
        if (search) params.search = search;
        if (startDate) params.startDate = startDate.toISOString();
        if (endDate) params.endDate = endDate.toISOString();

        const { data } = await api.get("/reports-flow/analytics", { params });

        setItems(data.items);
        setSummary(data.summary);
      } catch (error) {
        console.error("Erro ao buscar analytics:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [flowId, search, startDate, endDate],
  );

  console.log('Itens recebidos:', items.map(i => ({ 
  id: i.id, 
  assignedTo: i.assignedTo, 
  assignedToId: i.assignedToId 
})));

  useEffect(() => {
    if (user) {
      fetchFlows();
    }
  }, [user, fetchFlows]);

  useEffect(() => {
    if (user) {
      const delayDebounceFn = setTimeout(() => {
        fetchReport();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [user, fetchReport]);

  const getPriorityBadge = (priority: number) => {
    if (priority >= 4)
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
          Alta
        </Badge>
      );
    if (priority === 3)
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">
          Média
        </Badge>
      );
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
        Baixa
      </Badge>
    );
  };

  const handleRefresh = () => {
    fetchReport(true);
  };

  const handleClearFilters = () => {
    setFlowId("all");
    setSearch("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#2F80ED]" />
          <p className="text-[#353A40] font-medium">
            Carregando dados da produção...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 space-y-6 sm:space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E2E8F0] pb-4 sm:pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#353A40]">
              Esteira de Produção
            </h1>
            <p className="text-sm sm:text-base text-[#7A7E83]">
              Acompanhamento de lotes, quantidades e gargalos no fluxo
              produtivo.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full sm:w-auto border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA] gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 text-[#2F80ED]" />
            )}
            Atualizar Dados
          </Button>
        </header>

        {/* Cards de KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm border-l-4 border-l-[#2F80ED]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#7A7E83]">
                Total de Peças
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#353A40]">
                  {summary?.totalPieces.toLocaleString("pt-BR") || 0}
                </div>
                <Shirt className="h-5 w-5 text-[#2F80ED] opacity-70" />
              </div>
              <p className="text-xs text-[#7A7E83] mt-1">
                Soma das quantidades
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm border-l-4 border-l-[#2F80ED]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#7A7E83]">
                Fluxos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#353A40]">
                  {flows.length}
                </div>
                <Layers className="h-5 w-5 text-[#2F80ED] opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm border-l-4 border-l-red-500 sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#7A7E83]">
                Atrasados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl sm:text-3xl font-extrabold text-red-600">
                  {summary?.overdueItems || 0}
                </div>
                <AlertCircle className="h-5 w-5 text-red-500 opacity-70" />
              </div>
              <p className="text-xs text-[#7A7E83] mt-1">Lotes fora do prazo</p>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros */}
        <Card className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-2 lg:col-span-5 space-y-2">
                <Label className="text-[#353A40] font-medium text-sm sm:text-base">
                  Buscar Referência, OP ou Título
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A7E83]" />
                  <Input
                    placeholder="Ex: REF-2024, OP-001..."
                    className="pl-9 border-[#CBD5E1] bg-white focus:ring-[#2F80ED] focus:border-[#2F80ED] h-10 sm:h-11"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-4 space-y-2">
                <Label className="text-[#353A40] font-medium text-sm sm:text-base">
                  Fluxo de Produção
                </Label>
                <Select value={flowId} onValueChange={setFlowId}>
                  <SelectTrigger className="border-[#CBD5E1] bg-white focus:ring-[#2F80ED] h-10 sm:h-11">
                    <SelectValue placeholder="Selecione o fluxo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os fluxos</SelectItem>
                    {flows.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <Button
                  variant="ghost"
                  className="w-full text-[#7A7E83] hover:text-[#2F80ED] hover:bg-[#F5F6FA] h-10 sm:h-11"
                  onClick={handleClearFilters}
                >
                  Limpar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-white border border-[#E2E8F0] p-1 rounded-lg w-full sm:w-auto">
            <TabsTrigger
              value="overview"
              className="flex-1 sm:flex-initial data-[state=active]:bg-[#2F80ED] data-[state=active]:text-white rounded-md text-[#353A40] text-sm sm:text-base"
            >
              Visão Gráfica
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="flex-1 sm:flex-initial data-[state=active]:bg-[#2F80ED] data-[state=active]:text-white rounded-md text-[#353A40] text-sm sm:text-base"
            >
              Lista Detalhada
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GRÁFICOS */}
          <TabsContent
            value="overview"
            className="space-y-4 animate-in fade-in-50 duration-500"
          >
            <div className="grid grid-cols-1 gap-4">
              <Card className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#353A40] font-bold text-lg sm:text-xl">
                    Volume de Produção por Etapa
                  </CardTitle>
                  <CardDescription className="text-[#7A7E83] text-sm">
                    Comparativo entre quantidade de ordens e quantidade total de
                    peças.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] sm:h-[350px] lg:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={summary?.byStage || []}
                      margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E2E8F0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#7A7E83", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke={COLORS.primary}
                        tick={{ fill: "#7A7E83", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke={COLORS.success}
                        tick={{ fill: "#7A7E83", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          value,
                          name === "count" ? "Ordens (Cards)" : "Peças (Qtd)",
                        ]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "white",
                          color: "#353A40",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar
                        yAxisId="left"
                        dataKey="count"
                        name="Ordens"
                        fill={COLORS.primary}
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="pieces"
                        name="Total Peças"
                        fill={COLORS.success}
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: TABELA - SEM MARGENS LATERAIS */}
          <TabsContent
            value="list"
            className="animate-in fade-in-50 duration-500 -mx-4 sm:-mx-6 lg:-mx-8"
          >
            <Card className="bg-white border border-[#E2E8F0] rounded-none sm:rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="border-b border-[#E2E8F0] pb-3 px-4 sm:px-6">
                <CardTitle className="text-[#353A40] font-bold text-lg sm:text-xl">
                  Ordens de Produção
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <div className="min-w-[900px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <TableHead className="text-[#353A40] font-bold text-xs sm:text-sm px-4 py-3">
                          Referência
                        </TableHead>
                        <TableHead className="text-[#353A40] font-bold text-xs sm:text-sm px-4 py-3">
                          Título
                        </TableHead>
                        <TableHead className="text-[#353A40] font-bold text-xs sm:text-sm px-4 py-3">
                          Fluxo
                        </TableHead>
                        <TableHead className="text-[#353A40] font-bold text-xs sm:text-sm px-4 py-3">
                          Etapa Atual
                        </TableHead>
                        <TableHead className="text-right text-[#353A40] font-bold text-xs sm:text-sm px-4 py-3">
                          Qtd. Peças
                        </TableHead>
                        <TableHead className="text-center text-[#353A40] font-bold text-xs sm:text-sm px-4 py-3">
                          Prioridade
                        </TableHead>
                        <TableHead className="text-center text-[#353A40] font-bold text-xs sm:text-sm px-4 py-3">
                          Entrega
                        </TableHead>
                        <TableHead className="text-[#353A40] font-bold text-xs sm:text-sm px-4 py-3">
                          Responsável
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin text-[#2F80ED]" />
                              <span className="text-[#7A7E83] text-sm">
                                Carregando dados...
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center h-24 text-[#7A7E83]"
                          >
                            <div className="flex flex-col items-center">
                              <Search className="h-10 w-10 mb-2 opacity-20" />
                              <p className="text-sm">Nenhum item encontrado.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow
                            key={item.id}
                            className="border-b border-[#E2E8F0] hover:bg-[#F5F6FA] transition-colors"
                          >
                            <TableCell className="px-4 py-3">
                              <div className="font-semibold text-[#353A40] text-sm">
                                {item.productRef}
                              </div>
                            </TableCell>
                            <TableCell className="text-[#353A40] text-sm px-4 py-3">
                              {item.title}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className="border-[#CBD5E1] text-[#7A7E83] text-xs"
                              >
                                {item.flowName}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor:
                                      item.stageColor || COLORS.primary,
                                  }}
                                />
                                <span className="text-[#353A40] text-sm">
                                  {item.stageName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-[#353A40] text-sm px-4 py-3">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-center px-4 py-3">
                              {getPriorityBadge(item.priority)}
                            </TableCell>
                            <TableCell className="text-center px-4 py-3">
                              {item.dueDate ? (
                                <div
                                  className={cn(
                                    "text-sm",
                                    new Date(item.dueDate) < new Date()
                                      ? "text-red-600 font-semibold"
                                      : "text-[#7A7E83]",
                                  )}
                                >
                                  {format(new Date(item.dueDate), "dd/MM/yyyy")}
                                </div>
                              ) : (
                                <span className="text-[#7A7E83] text-sm">-</span>
                              )}
                            </TableCell>
                           <TableCell className="px-4 py-3">
  {item.assignedTo ? (
    <Link
      href={`/chats?user=${encodeURIComponent(item.assignedTo)}`}
      className="text-[#2F80ED] hover:text-[#1E5CB8] hover:underline font-medium text-sm transition-colors"
    >
      {item.assignedTo}
    </Link>
  ) : (
    <span className="text-[#7A7E83] text-sm italic">
      Não atribuído
    </span>
  )}
</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
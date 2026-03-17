/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GenericTable, Column } from "@/components/generic-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  Factory,
  X,
  Image as ImageIcon,
  Hash,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CompletedItem {
  id: string;
  title: string;
  productRef: string;
  quantity: number;
  orderNumber: string;
  flowId: string;
  flowName: string;
  flowColor: string;
  assignedToName?: string;
  supplierName?: string;
  completedAt: string;
  stageName?: string;
  imageUrl?: string;
}

interface CompletionStats {
  period: string;
  total: number;
  byFlow: Record<string, number>;
  byResponsible: Record<string, number>;
}

interface FlowOption {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface ResponsibleOption {
  id: string;
  name: string;
  count: number;
}

// Componente de paginação
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}) => {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between py-4 border-t border-[#95A5A6]/20 mt-4">
      <div className="flex-1">
        <span className="text-sm text-[#95A5A6]">
          Mostrando{" "}
          <span className="font-medium text-[#2D3436]">
            {start}-{end}
          </span>{" "}
          de <span className="font-medium text-[#2D3436]">{totalItems}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436]"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <span className="sr-only">Primeira página</span>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436]"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <span className="sr-only">Página anterior</span>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Button>
        <span className="text-sm font-medium text-[#2D3436] min-w-[4rem] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436]"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <span className="sr-only">Próxima página</span>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436]"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <span className="sr-only">Última página</span>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </Button>
      </div>
    </div>
  );
};

// Skeleton da tabela
function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-[#F5F0E6]/50 rounded-t-lg">
        <Skeleton className="h-4 w-[250px] bg-slate-300 animate-pulse" />
        <Skeleton className="h-4 w-[100px] bg-slate-300 animate-pulse" />
        <Skeleton className="h-4 w-[120px] bg-slate-300 animate-pulse" />
        <Skeleton className="h-4 w-[150px] bg-slate-300 animate-pulse" />
        <Skeleton className="h-4 w-[80px] bg-slate-300 animate-pulse" />
      </div>

      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border-b border-[#95A5A6]/20"
        >
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-md bg-slate-300 animate-pulse" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px] bg-slate-300 animate-pulse" />
              <Skeleton className="h-3 w-[150px] bg-slate-300 animate-pulse" />
            </div>
          </div>
          <Skeleton className="h-6 w-[100px] rounded-full bg-slate-300 animate-pulse" />
          <Skeleton className="h-4 w-[120px] bg-slate-300 animate-pulse" />
          <Skeleton className="h-4 w-[150px] bg-slate-300 animate-pulse" />
          <Skeleton className="h-6 w-[80px] rounded-full bg-slate-300 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function CompletedItemsDashboard() {
  const [items, setItems] = useState<CompletedItem[]>([]);
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [flows, setFlows] = useState<FlowOption[]>([]);
  const [responsibles, setResponsibles] = useState<ResponsibleOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchRefInput, setSearchRefInput] = useState("");
  const [searchRefClean, setSearchRefClean] = useState("");
  const [selectedFlowId, setSelectedFlowId] = useState<string>("all");
  const [selectedResponsibleId, setSelectedResponsibleId] =
    useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month" | "year"
  >("week");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const hasActiveFilters = () => {
    return (
      searchRefClean !== "" ||
      selectedFlowId !== "all" ||
      selectedResponsibleId !== "all" ||
      selectedPeriod !== "week"
    );
  };

  const clearFilters = () => {
    setSearchRefInput("");
    setSearchRefClean("");
    setSelectedFlowId("all");
    setSelectedResponsibleId("all");
    setSelectedPeriod("week");
    setCurrentPage(1);
    toast.success("Filtros limpos com sucesso");
  };

  useEffect(() => {
    loadData();
  }, [
    currentPage,
    selectedFlowId,
    selectedResponsibleId,
    selectedPeriod,
    searchRefClean,
    itemsPerPage,
  ]);

  const loadData = async () => {
    setLoading(true);

    try {
      console.log("📊 Carregando dados com filtros:", {
        searchRef: searchRefClean,
        flowId: selectedFlowId,
        responsibleId: selectedResponsibleId,
        period: selectedPeriod,
        page: currentPage,
        limit: itemsPerPage,
      });

      // Carregar estatísticas
      const statsResponse = await api.get(
        `/flow/completed-items/stats?period=${selectedPeriod}`,
      );
      setStats(statsResponse.data);

      // Carregar fluxos
      try {
        const flowsResponse = await api.get("/flow");
        if (Array.isArray(flowsResponse.data)) {
          const flowList = flowsResponse.data.map((flow: any) => ({
            id: flow.id,
            name: flow.name,
            color: flow.color,
            count: statsResponse.data?.byFlow?.[flow.name] || 0,
          }));
          setFlows(flowList);
        }
      } catch (error) {
        console.error("Erro ao carregar fluxos:", error);
      }

      // 🔥 Carregar responsáveis - APENAS QUEM JÁ CONCLUIU ITENS (qualquer cargo)
      try {
        console.log("🔍 Buscando usuários que já concluíram itens...");

        let allUsers: any[] = [];
        const limit = 100;

        // 🔥 CORREÇÃO: usar const em vez de let
        const firstResponse = await api.get(
          `/users?status=ACTIVE&page=1&limit=${limit}`,
        );

        if (firstResponse.data && Array.isArray(firstResponse.data)) {
          allUsers = [...firstResponse.data];
        } else if (
          firstResponse.data &&
          firstResponse.data.data &&
          Array.isArray(firstResponse.data.data)
        ) {
          allUsers = [...firstResponse.data.data];
        }

        // Calcular total de páginas
        const total = firstResponse.data?.total || allUsers.length;
        const totalPages = Math.ceil(total / limit);

        console.log(`📊 Total de usuários: ${total}, Páginas: ${totalPages}`);

        // Buscar páginas restantes (começando da página 2)
        for (let page = 2; page <= totalPages; page++) {
          console.log(`📄 Buscando página ${page} de ${totalPages}...`);
          const response = await api.get(
            `/users?status=ACTIVE&page=${page}&limit=${limit}`,
          );

          if (response.data && Array.isArray(response.data)) {
            allUsers = [...allUsers, ...response.data];
          } else if (
            response.data &&
            response.data.data &&
            Array.isArray(response.data.data)
          ) {
            allUsers = [...allUsers, ...response.data.data];
          }
        }

        console.log(`✅ Total de usuários carregados: ${allUsers.length}`);

        // 🔥 PEGAR LISTA DE QUEM JÁ CONCLUIU ITENS DAS ESTATÍSTICAS
        const responsaveisQueConcluiram = statsResponse.data?.byResponsible
          ? Object.keys(statsResponse.data.byResponsible)
          : [];

        console.log(
          "📊 Responsáveis que já concluíram itens (das estatísticas):",
          responsaveisQueConcluiram,
        );

        // 🔥 FILTRAR APENAS USUÁRIOS QUE APARECEM NAS ESTATÍSTICAS
        const filteredUsers = allUsers.filter((user: any) => {
          const concluiuItens = responsaveisQueConcluiram.includes(user.name);
          if (concluiuItens) {
            console.log(
              `✅ ${user.name} (${user.role}) - concluiu ${statsResponse.data?.byResponsible?.[user.name] || 0} itens`,
            );
          }
          return concluiuItens;
        });

        console.log(
          `\n🎯 Total de usuários que já concluíram itens: ${filteredUsers.length}`,
        );

        // Mapear para o formato que precisamos
        const responsibleList = filteredUsers.map((user: any) => ({
          id: user.id,
          name: user.name,
          role: user.role,
          professionalRole: user.professionalRole,
          count: statsResponse.data?.byResponsible?.[user.name] || 0,
        }));

        // Ordenar por quantidade de itens concluídos (maior primeiro)
        responsibleList.sort((a, b) => b.count - a.count);

        console.log(
          "📋 Lista final de responsáveis (ordenada por conclusões):",
          responsibleList,
        );
        setResponsibles(responsibleList);
      } catch (error) {
        console.error("❌ Erro ao carregar responsáveis:", error);

        // Fallback: usar as estatísticas diretamente
        if (statsResponse.data?.byResponsible) {
          console.log("⚠️ Usando fallback com estatísticas");
          const fallbackList = Object.entries(
            statsResponse.data.byResponsible,
          ).map(([name, count]) => ({
            id: `fallback-${name}`,
            name: name,
            count: count as number,
          }));
          setResponsibles(fallbackList);
        }
      }

      // Carregar itens com paginação
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", itemsPerPage.toString());
      params.set("period", selectedPeriod);

      if (searchRefClean) {
        params.set("productRef", searchRefClean);
      }

      if (selectedFlowId && selectedFlowId !== "all") {
        params.set("flowId", selectedFlowId);
      }

      // 🔥 Envia o ID do responsável, não o nome
      if (selectedResponsibleId && selectedResponsibleId !== "all") {
        params.set("assignedToId", selectedResponsibleId);
      }

      const url = `/flow/completed-items?${params.toString()}`;
      console.log("🔍 URL:", url);

      const response = await api.get(url);
      console.log("📦 Resposta da API:", response.data);

      if (response.data && response.data.data) {
        setItems(response.data.data);
        setTotalPages(response.data.pages || 1);
        setTotalItems(response.data.total || 0);
      } else {
        setItems(response.data);
        setTotalPages(Math.ceil(response.data.length / itemsPerPage));
        setTotalItems(response.data.length);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPeriodLabel = (period: string) => {
    const labels = {
      today: "Hoje",
      week: "Últimos 7 dias",
      month: "Último mês",
      year: "Último ano",
    };
    return labels[period as keyof typeof labels] || period;
  };

  const getSelectedFlowName = () => {
    if (selectedFlowId === "all") return "Todos os fluxos";
    const flow = flows.find((f) => f.id === selectedFlowId);
    return flow ? flow.name : "Carregando...";
  };

  const getSelectedResponsibleName = () => {
    if (selectedResponsibleId === "all") return "Todos os responsáveis";
    const responsible = responsibles.find(
      (r) => r.id === selectedResponsibleId,
    );
    return responsible ? responsible.name : "Carregando...";
  };

  const handleSearchChange = (value: string) => {
    setSearchRefInput(value);
    const trimmed = value.trim();
    setSearchRefClean(trimmed);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchRefInput("");
    setSearchRefClean("");
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    console.log("📄 Mudando para página:", page);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    console.log("📄 Mudando items por página para:", newLimit);
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const columns: Column<CompletedItem>[] = [
    {
      header: "Item",
      cell: (item: any) => (
        <div className="flex items-center gap-3">
          {item.imageUrl ? (
            <Avatar className="h-10 w-10 rounded-md">
              <AvatarImage src={item.imageUrl} alt={item.title} />
              <AvatarFallback className="rounded-md bg-[#F5F0E6]">
                <ImageIcon size={16} className="text-[#95A5A6]" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-10 w-10 rounded-md bg-[#F5F0E6] flex items-center justify-center">
              <Package size={16} className="text-[#95A5A6]" />
            </div>
          )}
          <div>
            <p className="font-medium text-[#2D3436]">{item.title}</p>
            <p className="text-xs text-[#95A5A6]">
              Ref: {item.productRef} • Qtd: {item.quantity}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Fluxo",
      cell: (item: any) => (
        <Badge
          style={{ backgroundColor: item.flowColor, color: "#fff" }}
          className="font-normal"
        >
          {item.flowName}
        </Badge>
      ),
    },
    {
      header: "Responsável",
      cell: (item: any) => (
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[#95A5A6]" />
          <span className="text-sm text-[#2D3436]">
            {item.assignedToName || item.supplierName || "Não atribuído"}
          </span>
        </div>
      ),
    },
    {
      header: "Concluído em",
      cell: (item: any) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[#95A5A6]" />
          <span className="text-sm text-[#2D3436]">
            {formatDate(item.completedAt)}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      cell: () => (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          <CheckCircle size={12} className="mr-1" />
          Concluído
        </Badge>
      ),
      className: "text-center",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-orange-500" size={24} />
            Itens Concluídos
          </h1>
          <p className="text-sm text-slate-500">
            Acompanhe todos os itens que finalizaram o fluxo de produção
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="gap-2">
          <Clock size={16} />
          Atualizar
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Concluídos</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {getPeriodLabel(selectedPeriod)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Factory size={16} />
                Por Fluxo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {Object.entries(stats.byFlow).map(([flow, count]) => (
                  <div
                    key={flow}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate max-w-[150px]">{flow}</span>
                    <span className="font-bold ml-2">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users size={16} />
                Por Responsável
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {Object.entries(stats.byResponsible).map(([name, count]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate max-w-[150px]">{name}</span>
                    <span className="font-bold ml-2">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Filtro por Referência */}
            <div className="flex-1 min-w-[250px]">
              <label className="text-xs text-slate-500 mb-1 block">
                Referência do Produto
              </label>
              <div className="relative">
                <Hash
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <Input
                  placeholder="Digite a referência..."
                  value={searchRefInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
                {searchRefInput && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                )}
              </div>

              {searchRefInput && searchRefInput !== searchRefClean && (
                <div className="flex items-center gap-1 mt-1">
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
                  >
                    ⚠️ Espaços ignorados
                  </Badge>
                  {searchRefClean && (
                    <span className="text-xs text-amber-600">
                      Buscando por: &quot;{searchRefClean}&quot;
                    </span>
                  )}
                </div>
              )}

              {searchRefClean && !searchRefInput.includes("  ") && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Buscando por: &quot;{searchRefClean}&quot;
                </p>
              )}
            </div>

            {/* Filtro por Fluxo */}
            <div className="w-[220px]">
              <label className="text-xs text-slate-500 mb-1 block">Fluxo</label>
              <Select
                value={selectedFlowId}
                onValueChange={(value) => {
                  setSelectedFlowId(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <Factory size={16} className="mr-2" />
                  <SelectValue placeholder="Todos os fluxos">
                    {getSelectedFlowName()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fluxos</SelectItem>
                  {flows.map((flow) => (
                    <SelectItem key={flow.id} value={flow.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{flow.name}</span>
                        {flow.count > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {flow.count}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 🔥 Filtro por Responsável - CORRIGIDO */}
            <div className="w-[180px]">
              <label className="text-xs text-slate-500 mb-1 block">
                Responsável
              </label>
              <Select
                value={selectedResponsibleId}
                onValueChange={(value) => {
                  setSelectedResponsibleId(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <Users size={16} className="mr-2" />
                  <SelectValue placeholder="Todos">
                    {getSelectedResponsibleName()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  {responsibles.map((responsible) => (
                    <SelectItem key={responsible.id} value={responsible.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{responsible.name}</span>
                        {responsible.count > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {responsible.count}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Período */}
            <div className="w-[160px]">
              <label className="text-xs text-slate-500 mb-1 block">
                Data de Conclusão
              </label>
              <Select
                value={selectedPeriod}
                onValueChange={(value: "today" | "week" | "month" | "year") => {
                  setSelectedPeriod(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <Calendar size={16} className="mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                  <SelectItem value="year">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão Limpar Filtros */}
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="gap-2 text-slate-500 mb-[2px]"
              >
                <RotateCcw size={16} />
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Tags com filtros ativos */}
          {hasActiveFilters() && (
            <div className="flex flex-wrap gap-2 mt-4">
              {searchRefClean && (
                <Badge variant="secondary" className="gap-1">
                  Referência: {searchRefClean}
                  <X
                    size={14}
                    className="cursor-pointer hover:text-red-500"
                    onClick={clearSearch}
                  />
                </Badge>
              )}

              {selectedFlowId !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Fluxo: {getSelectedFlowName()}
                  <X
                    size={14}
                    className="cursor-pointer hover:text-red-500"
                    onClick={() => setSelectedFlowId("all")}
                  />
                </Badge>
              )}

              {selectedResponsibleId !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Responsável: {getSelectedResponsibleName()}
                  <X
                    size={14}
                    className="cursor-pointer hover:text-red-500"
                    onClick={() => setSelectedResponsibleId("all")}
                  />
                </Badge>
              )}

              {selectedPeriod !== "week" && (
                <Badge variant="secondary" className="gap-1">
                  Período: {getPeriodLabel(selectedPeriod)}
                  <X
                    size={14}
                    className="cursor-pointer hover:text-red-500"
                    onClick={() => setSelectedPeriod("week")}
                  />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela com Paginação */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-[#2D3436]">
            Itens Concluídos
          </CardTitle>

          {/* Selector de itens por página */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Itens por página:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => handleItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : (
            <>
              <GenericTable
                title=""
                data={items}
                columns={columns}
                isLoading={false}
                searchTerm=""
                onSearchChange={() => {}}
                emptyMessage={
                  searchRefClean ||
                  selectedFlowId !== "all" ||
                  selectedResponsibleId !== "all"
                    ? "Nenhum item encontrado com os filtros aplicados"
                    : "Nenhum item concluído no período selecionado"
                }
                pagination={{
                  currentPage,
                  totalPages,
                  onPageChange: handlePageChange,
                  totalItems,
                  itemsPerPage,
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

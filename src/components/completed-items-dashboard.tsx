/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Column, GenericTable } from "@/components/generic-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api";
import {
  Calendar,
  CheckCircle,
  Factory,
  Hash,
  Image as ImageIcon,
  Package,
  RefreshCcw,
  RotateCcw,
  Users,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

// Componente de paginação com o novo design
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
    <div className="flex items-center justify-between py-3 border-t border-[#E2E8F0]">
      <div className="flex-1">
        <span className="text-sm text-[#7A7E83]">
          Mostrando{" "}
          <span className="font-medium text-[#353A40]">
            {start}-{end}
          </span>{" "}
          de <span className="font-medium text-[#353A40]">{totalItems}</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-[#CBD5E1] text-[#353A40] hover:bg-gray-50"
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
          className="h-8 w-8 border-[#CBD5E1] text-[#353A40] hover:bg-gray-50"
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
        <span className="text-sm font-medium text-[#353A40] min-w-[4rem] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-[#CBD5E1] text-[#353A40] hover:bg-gray-50"
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
          className="h-8 w-8 border-[#CBD5E1] text-[#353A40] hover:bg-gray-50"
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

// Skeleton da tabela com novo design
function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 p-3 bg-[#F5F6FA] rounded-t-lg">
        <Skeleton className="h-4 w-[250px] bg-[#E2E8F0] animate-pulse" />
        <Skeleton className="h-4 w-[100px] bg-[#E2E8F0] animate-pulse" />
        <Skeleton className="h-4 w-[120px] bg-[#E2E8F0] animate-pulse" />
        <Skeleton className="h-4 w-[150px] bg-[#E2E8F0] animate-pulse" />
        <Skeleton className="h-4 w-[80px] bg-[#E2E8F0] animate-pulse" />
      </div>

      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 border-b border-[#E2E8F0]"
        >
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-md bg-[#E2E8F0] animate-pulse" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px] bg-[#E2E8F0] animate-pulse" />
              <Skeleton className="h-3 w-[150px] bg-[#E2E8F0] animate-pulse" />
            </div>
          </div>
          <Skeleton className="h-6 w-[100px] rounded-full bg-[#E2E8F0] animate-pulse" />
          <Skeleton className="h-4 w-[120px] bg-[#E2E8F0] animate-pulse" />
          <Skeleton className="h-4 w-[150px] bg-[#E2E8F0] animate-pulse" />
          <Skeleton className="h-6 w-[80px] rounded-full bg-[#E2E8F0] animate-pulse" />
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

      const statsUrl =
        selectedFlowId !== "all"
          ? `/flow/completed-items/stats?period=${selectedPeriod}&flowId=${selectedFlowId}`
          : `/flow/completed-items/stats?period=${selectedPeriod}`;

      const statsResponse = await api.get(statsUrl);
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

      // Carregar responsáveis
      try {
        let allUsers: any[] = [];
        const limit = 100;

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

        const total = firstResponse.data?.total || allUsers.length;
        const totalPages = Math.ceil(total / limit);

        for (let page = 2; page <= totalPages; page++) {
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

        const responsaveisQueConcluiram = statsResponse.data?.byResponsible
          ? Object.keys(statsResponse.data.byResponsible)
          : [];

        const filteredUsers = allUsers.filter((user: any) =>
          responsaveisQueConcluiram.includes(user.name),
        );

        const responsibleList = filteredUsers.map((user: any) => ({
          id: user.id,
          name: user.name,
          role: user.role,
          professionalRole: user.professionalRole,
          count: statsResponse.data?.byResponsible?.[user.name] || 0,
        }));

        responsibleList.sort((a, b) => b.count - a.count);
        setResponsibles(responsibleList);
      } catch (error) {
        console.error("❌ Erro ao carregar responsáveis:", error);
        if (statsResponse.data?.byResponsible) {
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

      if (selectedResponsibleId && selectedResponsibleId !== "all") {
        params.set("assignedToId", selectedResponsibleId);
      }

      const url = `/flow/completed-items?${params.toString()}`;
      const response = await api.get(url);

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSelectedFlowName = () => {
    if (selectedFlowId === "all") return "Todos os fluxos";
    const flow = flows.find((f) => f.id === selectedFlowId);
    return flow ? flow.name : "Carregando...";
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
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (newLimit: number) => {
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
              <AvatarFallback className="rounded-md bg-[#F5F6FA]">
                <ImageIcon size={16} className="text-[#7A7E83]" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-10 w-10 rounded-md bg-[#F5F6FA] flex items-center justify-center">
              <Package size={16} className="text-[#7A7E83]" />
            </div>
          )}
          <div>
            <p className="font-semibold text-[#353A40]">{item.title}</p>
            <p className="text-xs text-[#7A7E83]">
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
          style={{
            backgroundColor: item.flowColor || "#2F80ED",
            color: "#fff",
          }}
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
          <Users size={14} className="text-[#7A7E83]" />
          <span className="text-sm text-[#353A40]">
            {item.assignedToName || item.supplierName || "Não atribuído"}
          </span>
        </div>
      ),
    },
    {
      header: "Concluído em",
      cell: (item: any) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[#7A7E83]" />
          <span className="text-sm text-[#353A40]">
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
    <div className="min-h-screen bg-[#F5F6FA] p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <header className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#353A40] mb-2">
              Itens Finalizados
            </h1>
            <p className="text-[#7A7E83]">
              Acompanhe todos os itens que finalizaram o fluxo de produção
            </p>
          </div>

          <Button
            onClick={loadData}
            variant="outline"
            size="default"
            className="border-[#CBD5E1] text-[#353A40] bg-white hover:bg-gray-50 gap-2"
          >
            <RefreshCcw className="h-4 w-4 text-[#2F80ED]" />
            Atualizar
          </Button>
        </header>

        <hr className="border-[#E2E8F0] mb-6" />

        {/* FILTROS */}
        <Card className="bg-white border-t-4 border-t-[#2F80ED]/20 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              {/* Filtro por Referência */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7E83] mb-1 block">
                  Referência do Produto
                </label>
                <div className="relative">
                  <Hash
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7A7E83]"
                    size={16}
                  />
                  <Input
                    placeholder="Digite a referência..."
                    value={searchRefInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 bg-[#F5F6FA] border-[#E2E8F0]"
                  />
                  {searchRefInput && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <X
                        size={16}
                        className="text-[#7A7E83] hover:text-[#353A40]"
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* Filtro por Fluxo */}
              <div className="col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7E83] mb-1 block">
                  Fluxo
                </label>
                <Select
                  value={selectedFlowId}
                  onValueChange={(value) => {
                    setSelectedFlowId(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="bg-[#F5F6FA] border-[#E2E8F0] text-[#353A40]">
                    <Factory size={16} className="mr-2 text-[#7A7E83]" />
                    <SelectValue placeholder="Todos os fluxos">
                      {getSelectedFlowName()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os fluxos</SelectItem>
                    {flows.map((flow) => (
                      <SelectItem key={flow.id} value={flow.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: flow.color || "#2F80ED",
                              }}
                            />
                            <span className="text-[#353A40]">{flow.name}</span>
                          </div>
                          {flow.count > 0 && (
                            <Badge
                              variant="secondary"
                              className="bg-[#F5F6FA] text-[#7A7E83]"
                            >
                              {flow.count}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Período */}
              <div className="col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7E83] mb-1 block">
                  Data de Conclusão
                </label>
                <Select
                  value={selectedPeriod}
                  onValueChange={(
                    value: "today" | "week" | "month" | "year",
                  ) => {
                    setSelectedPeriod(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="bg-[#F5F6FA] border-[#E2E8F0] text-[#353A40]">
                    <Calendar size={16} className="mr-2 text-[#7A7E83]" />
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
              <div className="col-span-1">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="gap-2 w-full border-[#CBD5E1] text-[#353A40] hover:bg-gray-50"
                  disabled={!hasActiveFilters()}
                >
                  <RotateCcw size={16} className="text-[#2F80ED]" />
                  Limpar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABELA */}
        <Card className="bg-white shadow-lg rounded-xl">
          <CardHeader className="border-b border-[#E2E8F0] pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#353A40]">
              Itens Finalizados
            </CardTitle>

            <div className="flex items-center gap-3">
              <span className="text-sm text-[#7A7E83]">Itens por página:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) =>
                  handleItemsPerPageChange(Number(value))
                }
              >
                <SelectTrigger className="w-[80px] bg-[#F5F6FA] border-[#E2E8F0]">
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
          <CardContent className="pt-4">
            {loading ? (
              <TableSkeleton />
            ) : (
              <>
                <GenericTable
                  title=""
                  data={items}
                  columns={columns}
                  isLoading={false}
                  emptyMessage={
                    searchRefClean ||
                    selectedFlowId !== "all" ||
                    selectedResponsibleId !== "all"
                      ? "Nenhum item encontrado com os filtros aplicados"
                      : "Nenhum item concluído no período selecionado"
                  }
                />
                {totalItems > 0 && (
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

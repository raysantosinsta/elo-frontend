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
import {
  Package,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  Factory,
  Search,
  X,
} from "lucide-react";
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

export function CompletedItemsDashboard() {
  const [items, setItems] = useState<CompletedItem[]>([]);
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">(
    "week",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFlow, setSelectedFlow] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, [period, selectedFlow]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar estatísticas
      const statsResponse = await api.get(
        `/flow/completed-items/stats?period=${period}`,
      );
      setStats(statsResponse.data);

      // Carregar itens com filtros
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (selectedFlow && selectedFlow !== "all") {
        params.set("flowId", selectedFlow);
      }

      const itemsResponse = await api.get(
        `/flow/completed-items?${params.toString()}`,
      );
      setItems(itemsResponse.data);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
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

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productRef.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

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

      {/* Card de Estatísticas - Apenas Total */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Concluídos</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {getPeriodLabel(period)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Espaço vazio ou poderia adicionar outro card aqui no futuro */}
          <div></div>
        </div>
      )}

      {/* Gráficos Simples - Por Fluxo e Por Responsável */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Factory size={16} />
                Por Fluxo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.byFlow).map(([flow, count]) => (
                  <div key={flow} className="flex items-center justify-between">
                    <span className="text-sm">{flow}</span>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users size={16} />
                Por Responsável
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.byResponsible).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm">{name}</span>
                    <span className="text-sm font-bold">{count}</span>
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
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <Input
                  placeholder="Buscar por título ou referência..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            <Select
              value={period}
              onValueChange={(value: "today" | "week" | "month" | "year") =>
                setPeriod(value)
              }
            >
              <SelectTrigger className="w-[180px]">
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

            <Select value={selectedFlow} onValueChange={setSelectedFlow}>
              <SelectTrigger className="w-[180px]">
                <Factory size={16} className="mr-2" />
                <SelectValue placeholder="Todos os fluxos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fluxos</SelectItem>
                {/* Aqui você pode mapear os fluxos disponíveis */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Itens Concluídos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            {item.imageUrl && (
              <div className="h-32 overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="h-1" style={{ backgroundColor: item.flowColor }} />
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-xs text-slate-500">
                    Ref: {item.productRef} • Qtd: {item.quantity}
                  </p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  ✓ Concluído
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Factory size={14} className="text-slate-400" />
                  <span
                    className="px-2 py-0.5 rounded-full text-white text-xs"
                    style={{ backgroundColor: item.flowColor }}
                  >
                    {item.flowName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-xs">
                    {item.assignedToName ||
                      item.supplierName ||
                      "Não atribuído"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-xs">
                    {formatDate(item.completedAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700">
                Nenhum item concluído
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm
                  ? "Tente buscar com outros termos"
                  : "Os itens aparecerão aqui quando forem concluídos"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
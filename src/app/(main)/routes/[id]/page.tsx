/* eslint-disable @typescript-eslint/no-explicit-any */
// app/routes/[id]/page.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoutes } from "@/hooks/useRoutes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  Loader2,
  MessageSquareIcon,
  Navigation,
  RulerIcon,
  UserIcon,
  MapPinIcon,
  ArrowUpDownIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  IN_PROGRESS: "bg-[#D35400]/20 text-[#D35400] border border-[#D35400]/30",
  FINISHED: "bg-green-500/20 text-green-300 border border-green-500/30",
  CANCELED: "bg-white/10 text-[#9CA3AF] border border-white/10",
};

const statusText: Record<string, string> = {
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em Andamento",
  FINISHED: "Finalizada",
  CANCELED: "Cancelada",
};

// Mapeamento para o tipo de ordenação
const orderByText: Record<string, string> = {
  DISTANCE: "Proximidade",
  PRIORITY: "Prioridade",
};

const orderByIcon: Record<string, any> = {
  DISTANCE: MapPinIcon,
  PRIORITY: ArrowUpDownIcon,
};

const orderByColor: Record<string, string> = {
  DISTANCE: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  PRIORITY: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function RouteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const {
    useGetRouteById,
    useUpdateRoute,
  } = useRoutes();

  const { data: route, isLoading } = useGetRouteById(routeId);
  const updateRoute = useUpdateRoute();

  const orderedStops = useMemo(() => {
    if (!route?.stops) return [];
    return [...route.stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [route?.stops]);

  const handleStartNavigation = async () => {
    if (route?.status === "SCHEDULED") {
      try {
        await updateRoute.mutateAsync({
          id: routeId,
          data: { status: "IN_PROGRESS" as any },
        });
      } catch (error) {
        console.error("Erro ao atualizar status da rota", error);
      }
    }
    router.push(`/driver?routeId=${routeId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2C3E50]">
        <Loader2 className="animate-spin h-8 w-8 text-[#D35400]" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-[#2C3E50] flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-[#9CA3AF]">Rota não encontrada</p>
        <Button
          className="bg-[#D35400] hover:bg-[#b84700] text-white border-none"
          onClick={() => router.push("/routes")}
        >
          Lista de Rotas
        </Button>
      </div>
    );
  }

  const visitedCount =
    route.stops?.filter((stop: any) => stop.visited).length || 0;
  const totalStops = route.stops?.length || 0;
  
  // Tipo de ordenação da rota
  const orderByType = route.orderBy || "DISTANCE";
  const OrderIcon = orderByIcon[orderByType];

  return (
    <div className="min-h-screen bg-[#2C3E50] text-white">
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="-ml-4 h-8 text-[#9CA3AF] hover:text-white hover:bg-white/10"
              onClick={() => router.push("/routes")}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar para lista
            </Button>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              {route.title}
            </h1>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge
                className={`${statusColors[route.status as keyof typeof statusColors]} text-xs font-medium shadow-none`}
              >
                {statusText[route.status as keyof typeof statusText]}
              </Badge>
              
              {/* Badge do tipo de ordenação */}
              <Badge
                className={`${orderByColor[orderByType]} text-xs font-medium shadow-none flex items-center gap-1`}
              >
                {OrderIcon && <OrderIcon className="h-3 w-3" />}
                {orderByText[orderByType]}
              </Badge>
              
              {route.routeDate && (
                <span className="flex items-center text-sm text-[#9CA3AF]">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {format(new Date(route.routeDate), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              )}
              <span className="text-sm text-[#6B7280]">•</span>
              <span className="text-sm text-[#D1D5DB] font-medium">
                {visitedCount} / {totalStops} concluído
              </span>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Button
              onClick={handleStartNavigation}
              className="flex-1 md:flex-none bg-[#D35400] hover:bg-[#b84700] text-white border-none"
              disabled={updateRoute.isPending}
            >
              {updateRoute.isPending ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              Navegação
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* ── Cards de Informações da Rota ────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Distância Total */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <RulerIcon className="h-4 w-4 text-[#D35400]" />
                <span className="text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">
                  Distância Total
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {route.formattedDistance || "Não calculado"}
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                {route.totalDistanceMeters 
                  ? `${(route.totalDistanceMeters / 1000).toFixed(2)} km` 
                  : "Distância não calculada"}
              </p>
            </div>

            {/* Duração Estimada */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="h-4 w-4 text-[#D35400]" />
                <span className="text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">
                  Duração Estimada
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {route.formattedDuration || "Não calculado"}
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                {route.totalDurationSeconds 
                  ? `${Math.floor(route.totalDurationSeconds / 60)} minutos` 
                  : "Tempo não calculado"}
              </p>
            </div>

            {/* Data de Criação */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDaysIcon className="h-4 w-4 text-[#D35400]" />
                <span className="text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">
                  Criado em
                </span>
              </div>
              <p className="text-lg font-bold text-white">
                {route.createdAt
                  ? format(new Date(route.createdAt), "dd/MM/yyyy", {
                      locale: ptBR,
                    })
                  : "-"}
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                {route.createdAt
                  ? format(new Date(route.createdAt), "HH:mm", {
                      locale: ptBR,
                    })
                  : ""}
              </p>
            </div>

            {/* Total de Paradas */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileTextIcon className="h-4 w-4 text-[#D35400]" />
                <span className="text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">
                  Total de Paradas
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{totalStops}</p>
              <p className="text-xs text-[#6B7280] mt-1">
                {visitedCount} concluídas • {totalStops - visitedCount} restantes
              </p>
            </div>
          </div>

          {/* ── Descrição ─────────────────────────────────────────────────────── */}
          {route.description && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileTextIcon className="h-4 w-4 text-[#D35400]" />
                <span className="text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">
                  Descrição
                </span>
              </div>
              <p className="text-sm text-[#D1D5DB] whitespace-pre-wrap">
                {route.description}
              </p>
            </div>
          )}

          {/* ── Responsável ─────────────────────────────────────────────────────── */}
          {route.userAssigned && (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
              <div className="h-10 w-10 rounded-full bg-[#D35400]/20 border border-[#D35400]/30 flex items-center justify-center flex-shrink-0">
                <UserIcon className="h-5 w-5 text-[#D35400]" />
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">
                  Responsável
                </p>
                <p className="text-base font-medium text-white">
                  {route.userAssigned.name}
                </p>
                {route.userAssigned.contact && (
                  <p className="text-xs text-[#6B7280] mt-1">
                    {route.userAssigned.contact}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Itinerário ────────────────────────────────────────────────────── */}
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xl text-white">Itinerário</CardTitle>
              <p className="text-sm text-[#9CA3AF]">
                Sequência de paradas da rota
                {orderByType === "DISTANCE" && (
                  <span className="ml-2 text-purple-300">
                    (Ordenado por proximidade)
                  </span>
                )}
                {orderByType === "PRIORITY" && (
                  <span className="ml-2 text-amber-300">
                    (Ordenado por prioridade)
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-3">
                {orderedStops.map((stop: any, index: number) => (
                  <div
                    key={stop.id || index}
                    className={cn(
                      "group flex flex-col gap-4 p-4 rounded-xl border transition-all",
                      stop.visited
                        ? "bg-white/5 border-white/5 opacity-80"
                        : "bg-white/5 border-white/10 hover:border-[#D35400]/40",
                    )}
                  >
                    {/* Cabeçalho da parada */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Indicador numérico */}
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2",
                          stop.visited
                            ? "bg-green-500/20 border-green-500/40 text-green-300"
                            : "bg-[#D35400]/20 border-[#D35400]/50 text-[#D35400]",
                        )}
                      >
                        {stop.visited ? (
                          <CheckCircleIcon className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      {/* Dados da parada */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-white truncate">
                          {stop.name || `Ponto ${index + 1}`}
                        </h3>
                        <p className="text-xs text-[#9CA3AF] truncate">
                          {stop.address}, {stop.city} - {stop.state}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex-shrink-0">
                        {stop.visited ? (
                          <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 shadow-none text-xs">
                            Visitado em {stop.visitedAt ? format(new Date(stop.visitedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-none text-xs">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Observações da visita */}
                    {stop.notes && (
                      <div className="ml-12 pl-4 border-l-2 border-[#D35400]/30">
                        <div className="flex items-start gap-2">
                          <MessageSquareIcon className="h-4 w-4 text-[#D35400] mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-[#9CA3AF] font-medium mb-1">
                              Observações da visita:
                            </p>
                            <p className="text-sm text-[#D1D5DB] whitespace-pre-wrap">
                              {stop.notes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
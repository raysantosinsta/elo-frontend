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
  Edit2Icon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, memo, useCallback } from "react";

// ─── Constantes ──────────────────────────────────────────────────────────────
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

// 🎯 Componente de Skeleton Loading
const DetailsSkeleton = () => (
  <div className="min-h-screen bg-[#2C3E50]">
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse mb-4" />
        <div className="h-12 w-64 bg-white/10 rounded-lg animate-pulse mb-3" />
        <div className="flex gap-3">
          <div className="h-6 w-24 bg-white/10 rounded-full animate-pulse" />
          <div className="h-6 w-24 bg-white/10 rounded-full animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex gap-4">
              <div className="h-8 w-8 bg-white/10 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 🎯 Componente de Card de Informação memoizado
const InfoCard = memo(({ icon: Icon, title, value, subtitle, color = "#D35400" }: any) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#D35400]/30 transition-all duration-200">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4" style={{ color }} />
      <span className="text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">
        {title}
      </span>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    {subtitle && <p className="text-xs text-[#6B7280] mt-1">{subtitle}</p>}
  </div>
));

InfoCard.displayName = "InfoCard";

// 🎯 Componente de Stop Item memoizado
const StopItem = memo(({ stop, index, orderByType }: any) => {
  const isVisited = stop.visited;
  
  return (
    <div
      className={cn(
        "group flex flex-col gap-4 p-4 rounded-xl border transition-all duration-200",
        isVisited
          ? "bg-white/5 border-white/5 opacity-80"
          : "bg-white/5 border-white/10 hover:border-[#D35400]/40 hover:bg-white/10",
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Indicador numérico */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all",
            isVisited
              ? "bg-green-500/20 border-green-500/40 text-green-300"
              : "bg-[#D35400]/20 border-[#D35400]/50 text-[#D35400] group-hover:scale-105",
          )}
        >
          {isVisited ? (
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
          {isVisited ? (
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
  );
});

StopItem.displayName = "StopItem";

export default function RouteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const { useGetRouteById, useUpdateRoute } = useRoutes();
  const { data: route, isLoading } = useGetRouteById(routeId);
  const updateRoute = useUpdateRoute();

  // 🔥 Memoização dos stops ordenados
  const orderedStops = useMemo(() => {
    if (!route?.stops) return [];
    return [...route.stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [route?.stops]);

  // 🔥 Estatísticas memoizadas
  const stats = useMemo(() => {
    if (!route) return { visitedCount: 0, totalStops: 0, progress: 0 };
    const visitedCount = route.stops?.filter((stop: any) => stop.visited).length || 0;
    const totalStops = route.stops?.length || 0;
    return {
      visitedCount,
      totalStops,
      progress: totalStops > 0 ? (visitedCount / totalStops) * 100 : 0,
    };
  }, [route]);

  // 🔥 Callback para iniciar navegação
  const handleStartNavigation = useCallback(async () => {
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
  }, [route?.status, updateRoute, router, routeId]);

  // 🔥 Prefetch da lista de rotas
  const prefetchRoutes = useCallback(() => {
    router.prefetch("/routes");
  }, [router]);

  // 🔥 Prefetch da página do driver
  const prefetchDriver = useCallback(() => {
    router.prefetch(`/driver?routeId=${routeId}`);
  }, [router, routeId]);

  // 🔥 Prefetch da página de edição
  const prefetchEdit = useCallback(() => {
    router.prefetch(`/routes/${routeId}/edit`);
  }, [router, routeId]);

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-[#2C3E50] flex flex-col items-center justify-center gap-4 text-white">
        <div className="text-center">
          <MapPinIcon className="mx-auto h-16 w-16 text-[#6B7280] mb-4" />
          <p className="text-[#9CA3AF] text-lg">Rota não encontrada</p>
          <p className="text-[#6B7280] text-sm mt-1">Verifique o ID da rota ou tente novamente</p>
        </div>
        <Button
          className="bg-[#D35400] hover:bg-[#b84700] text-white border-none transition-all active:scale-95"
          onClick={() => router.push("/routes")}
          onMouseEnter={prefetchRoutes}
        >
          Voltar para lista de rotas
        </Button>
      </div>
    );
  }

  const orderByType = route.orderBy || "DISTANCE";
  const OrderIcon = orderByIcon[orderByType];

  return (
    <div className="min-h-screen bg-[#2C3E50] text-white">
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* ── Header com progresso ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="-ml-4 h-8 text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all"
              onClick={() => router.push("/routes")}
              onMouseEnter={prefetchRoutes}
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
              
              <Badge
                className={`${orderByColor[orderByType]} text-xs font-medium shadow-none flex items-center gap-1`}
              >
                {OrderIcon && <OrderIcon className="h-3 w-3" />}
                {orderByText[orderByType]}
              </Badge>
              
              {route.routeDate && (
                <span className="flex items-center text-sm text-[#9CA3AF]">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {format(new Date(route.routeDate), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
              <span className="text-sm text-[#6B7280]">•</span>
              <span className="text-sm text-[#D1D5DB] font-medium">
                {stats.visitedCount} / {stats.totalStops} concluído
              </span>
            </div>
            
            {/* Barra de progresso */}
            {stats.totalStops > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                  <span>Progresso da rota</span>
                  <span>{Math.round(stats.progress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#D35400] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${stats.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Apenas o botão de navegação */}
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              onClick={handleStartNavigation}
              className="flex-1 md:flex-none bg-[#D35400] hover:bg-[#b84700] text-white border-none transition-all active:scale-95"
              disabled={updateRoute.isPending}
              onMouseEnter={prefetchDriver}
            >
              {updateRoute.isPending ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              Iniciar Navegação
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* ── Cards de Informações da Rota ────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoCard
              icon={RulerIcon}
              title="Distância Total"
              value={route.formattedDistance || "Não calculado"}
              subtitle={route.totalDistanceMeters ? `${(route.totalDistanceMeters / 1000).toFixed(2)} km` : "Distância não calculada"}
            />
            <InfoCard
              icon={ClockIcon}
              title="Duração Estimada"
              value={route.formattedDuration || "Não calculado"}
              subtitle={route.totalDurationSeconds ? `${Math.floor(route.totalDurationSeconds / 60)} minutos` : "Tempo não calculado"}
            />
            <InfoCard
              icon={CalendarDaysIcon}
              title="Criado em"
              value={route.createdAt ? format(new Date(route.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "-"}
              subtitle={route.createdAt ? format(new Date(route.createdAt), "HH:mm", { locale: ptBR }) : ""}
            />
            <InfoCard
              icon={FileTextIcon}
              title="Total de Paradas"
              value={stats.totalStops}
              subtitle={`${stats.visitedCount} concluídas • ${stats.totalStops - stats.visitedCount} restantes`}
            />
          </div>

          {/* ── Descrição ─────────────────────────────────────────────────────── */}
          {route.description && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 transition-all hover:border-[#D35400]/30">
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
            <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 transition-all hover:border-[#D35400]/30">
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
                    (Ordenado por proximidade - reordenado pelo GPS)
                  </span>
                )}
                {orderByType === "PRIORITY" && (
                  <span className="ml-2 text-amber-300">
                    (Ordenado por prioridade - ordem manual)
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-3">
                {orderedStops.map((stop: any, index: number) => (
                  <StopItem
                    key={stop.id || index}
                    stop={stop}
                    index={index}
                    orderByType={orderByType}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Footer com botão de editar melhorado ───────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              className="border-white/20 bg-[#374859] hover:bg-white/10 hover:text-white hover:border-[#D35400]/50 transition-all"
              onClick={() => router.push(`/routes/${routeId}/edit`)}
              onMouseEnter={prefetchEdit}
            >
              <Edit2Icon className="h-4 w-4 mr-2 text-[#D35400]" />
              Editar Rota
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRoutes } from "@/hooks/useRoutes";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  Edit2Icon,
  FileTextIcon,
  Loader2,
  MapPinIcon,
  Navigation,
  RulerIcon,
  Trash2Icon,
  UserIcon,
  MoreHorizontalIcon,
  RefreshCcw,
  FuelIcon,
  GaugeIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, memo, useCallback, useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 border border-blue-200",
  IN_PROGRESS: "bg-[#2F80ED]/10 text-[#2F80ED] border border-[#2F80ED]/20",
  FINISHED: "bg-green-100 text-green-700 border border-green-200",
  CANCELED: "bg-gray-100 text-gray-500 border border-gray-200",
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

const DetailsSkeleton = () => (
  <div className="min-h-screen bg-[#F5F6FA] p-4 md:p-8">
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2F80ED]"></div>
      </div>
    </div>
  </div>
);

const InfoCard = memo(({ icon: Icon, title, value }: any) => (
  <Card className="bg-white shadow-lg rounded-xl border-0">
    <CardContent className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-[#2F80ED]" />
        <span className="text-sm font-medium text-[#7A7E83] uppercase tracking-wider">
          {title}
        </span>
      </div>
      <p className="text-2xl font-extrabold text-[#353A40]">{value}</p>
    </CardContent>
  </Card>
));

InfoCard.displayName = "InfoCard";

const StopItem = memo(({ stop, index }: any) => {
  const isVisited = stop.visited;

  return (
    <div
      className={cn(
        "group hover:bg-gray-50 transition-colors border-b border-[#E2E8F0] last:border-0",
      )}
    >
      <div className="flex items-start gap-4 p-4">
        <div
          className={cn(
            "mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
            isVisited
              ? "bg-green-100 text-green-600"
              : "bg-[#2F80ED]/10 text-[#2F80ED]",
          )}
        >
          {isVisited ? (
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          ) : (
            index + 1
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-[#353A40] truncate">
              {stop.name || `Ponto ${index + 1}`}
            </h3>
            {isVisited ? (
              <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs">
                Visitado
              </Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">
                Pendente
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#7A7E83] mt-1 flex items-center gap-1">
            <MapPinIcon className="h-3 w-3" />
            {stop.address}, {stop.city} - {stop.state}
          </p>
          {stop.notes && (
            <p className="text-sm text-[#7A7E83] mt-2 italic">
              📝 {stop.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

StopItem.displayName = "StopItem";

export default function RouteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const { useGetRouteById, useUpdateRoute, useDeleteRoute } = useRoutes();
  const { data: route, isLoading, refetch } = useGetRouteById(routeId);
  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const orderedStops = useMemo(() => {
    if (!route?.stops) return [];
    return [...route.stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [route?.stops]);

  const stats = useMemo(() => {
    if (!route) return { visitedCount: 0, totalStops: 0 };
    const visitedCount =
      route.stops?.filter((stop: any) => stop.visited).length || 0;
    const totalStops = route.stops?.length || 0;
    return { visitedCount, totalStops };
  }, [route]);

  const isOverdue = useMemo(() => {
    if (!route?.routeDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const routeDate = new Date(route.routeDate);
    return routeDate < today && route.status !== "FINISHED";
  }, [route?.routeDate, route?.status]);

  const formatDurationFromSeconds = useCallback((seconds: number | null | undefined): string => {
    if (!seconds || seconds === 0) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  }, []);

  const getDifferenceColor = (difference: number | null): string => {
    if (difference === null) return "text-[#7A7E83]";
    if (difference > 0) return "text-red-500";
    if (difference < 0) return "text-green-500";
    return "text-[#7A7E83]";
  };

  const formatDifference = (difference: number | null, unit: string): string => {
    if (difference === null) return "-";
    const prefix = difference > 0 ? "+" : "";
    return `${prefix}${difference.toFixed(1)}${unit}`;
  };

  const hasValidDistance = useMemo(() => {
    if (!route?.formattedDistance) return false;
    const value = route.formattedDistance;
    return (
      value !== "—" && value !== "Distância não calculada" && value !== "0 km"
    );
  }, [route?.formattedDistance]);

  const hasValidDuration = useMemo(() => {
    if (!route?.formattedDuration) return false;
    const value = route.formattedDuration;
    return (
      value !== "—" && value !== "Duração não calculada" && value !== "0 min"
    );
  }, [route?.formattedDuration]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success("Dados atualizados", { duration: 1500 });
  }, [refetch]);

  const handleStartNavigation = useCallback(async () => {
    if (route?.status === "SCHEDULED") {
      try {
        await updateRoute.mutateAsync({
          id: routeId,
          data: { status: "IN_PROGRESS" as any },
        });
        toast.success("Rota iniciada com sucesso", { duration: 1500 });
      } catch {
        toast.error("Erro ao iniciar rota", { duration: 1500 });
      }
    }
    router.push(`/driver?routeId=${routeId}`);
  }, [route?.status, updateRoute, router, routeId]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteRoute.mutateAsync(routeId);
      toast.success("Rota excluída com sucesso", { duration: 1500 });
      router.push("/routes");
    } catch {
      toast.error("Erro ao excluir rota", { duration: 1500 });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [deleteRoute, routeId, router]);

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] p-4 md:p-8 flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <MapPinIcon className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" />
          <p className="text-[#353A40] text-lg font-medium">
            Rota não encontrada
          </p>
          <p className="text-[#7A7E83] text-sm mt-1">
            Verifique o ID da rota ou tente novamente
          </p>
        </div>
        <Button
          className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white rounded-full"
          onClick={() => router.push("/routes")}
        >
          Voltar para lista de rotas
        </Button>
      </div>
    );
  }

  const orderByType = route.orderBy || "DISTANCE";
  const previstoCombustivel = route.estimatedFuel ? `${route.estimatedFuel.toFixed(1)} L` : "-";
  const realizadoCombustivel = route.actualFuel ? `${route.actualFuel.toFixed(1)} L` : "-";
  const combustivelDiff = route.actualFuel && route.estimatedFuel
    ? route.actualFuel - route.estimatedFuel
    : null;

  const previstoDuracao = route.formattedDuration || "-";
  const realizadoDuracao = route.actualTime ? formatDurationFromSeconds(route.actualTime) : "-";
  const duracaoDiff = route.actualTime && route.totalDurationSeconds
    ? route.actualTime - route.totalDurationSeconds
    : null;
  const duracaoDiffMinutes = duracaoDiff !== null ? Math.round(duracaoDiff / 60) : null;

  const previstoDistancia = route.formattedDistance || "-";
  const realizadoDistancia = route.actualDistance ? `${route.actualDistance.toFixed(1)} km` : "-";
  const distanciaDiff = route.actualDistance && route.totalDistanceMeters
    ? route.actualDistance - (route.totalDistanceMeters / 1000)
    : null;

  const eficiencia = route.actualDistance && route.actualFuel
    ? (route.actualDistance / route.actualFuel).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#7A7E83] hover:text-[#2F80ED] -ml-2"
                onClick={() => router.push("/routes")}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#353A40] mb-2">
              {route.title}
            </h1>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge className={statusColors[route.status]}>
                {statusText[route.status]}
              </Badge>
              {isOverdue && route.status !== "FINISHED" && (
                <Badge className="bg-red-100 text-red-700 border border-red-200">
                  Atrasada
                </Badge>
              )}
              <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                {orderByText[orderByType]}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="border-[#CBD5E1] text-[#353A40] bg-white hover:bg-gray-50 rounded-full"
                  >
                    <RefreshCcw
                      className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atualizar dados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleStartNavigation}
                    className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white rounded-full"
                    disabled={updateRoute.isPending}
                  >
                    {updateRoute.isPending ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <Navigation className="h-4 w-4 mr-2" />
                    )}
                    Iniciar Rota
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Iniciar navegação</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-full border-[#CBD5E1]"
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white border-gray-200"
              >
                <DropdownMenuItem
                  onClick={() => router.push(`/routes/${routeId}/edit`)}
                  className="cursor-pointer"
                >
                  <Edit2Icon className="mr-2 h-4 w-4 text-[#7A7E83]" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <hr className="border-[#E2E8F0] mb-6" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {hasValidDistance && (
            <InfoCard
              icon={RulerIcon}
              title="Distância"
              value={previstoDistancia}
            />
          )}
          {hasValidDuration && (
            <InfoCard
              icon={ClockIcon}
              title="Duração"
              value={previstoDuracao}
            />
          )}
          <InfoCard
            icon={FuelIcon}
            title="Consumo"
            value={previstoCombustivel}
          />
          <InfoCard
            icon={CalendarIcon}
            title="Data Agendada"
            value={
              route.routeDate
                ? format(new Date(route.routeDate), "dd/MM/yyyy", {
                    locale: ptBR,
                  })
                : "—"
            }
          />
          <InfoCard
            icon={MapPinIcon}
            title="Total de Paradas"
            value={stats.totalStops}
          />
          {eficiencia && (
            <InfoCard
              icon={GaugeIcon}
              title="Eficiência"
              value={`${eficiencia} km/L`}
            />
          )}
        </div>

        {/* ── CARDS DE COMPARAÇÃO (Previsto x Real) ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Distância */}
          <Card className="bg-white shadow-lg rounded-xl border-0">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                <RulerIcon className="h-5 w-5 text-[#2F80ED]" />
                Distância
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#7A7E83]">Prevista:</span>
                  <span className="font-semibold text-[#353A40]">{previstoDistancia}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#7A7E83]">Realizada:</span>
                  <span className="font-semibold text-[#353A40]">{realizadoDistancia}</span>
                </div>
                {distanciaDiff !== null && (
                  <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                    <span className="text-sm text-[#7A7E83]">Diferença:</span>
                    <span className={cn("font-semibold", getDifferenceColor(distanciaDiff))}>
                      {distanciaDiff > 0 ? "+" : ""}{distanciaDiff.toFixed(1)} km
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Duração */}
          <Card className="bg-white shadow-lg rounded-xl border-0">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                <ClockIcon className="h-5 w-5 text-[#2F80ED]" />
                Duração
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#7A7E83]">Prevista:</span>
                  <span className="font-semibold text-[#353A40]">{previstoDuracao}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#7A7E83]">Realizada:</span>
                  <span className="font-semibold text-[#353A40]">{realizadoDuracao}</span>
                </div>
                {duracaoDiffMinutes !== null && (
                  <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                    <span className="text-sm text-[#7A7E83]">Diferença:</span>
                    <span className={cn("font-semibold", getDifferenceColor(duracaoDiffMinutes))}>
                      {duracaoDiffMinutes > 0 ? "+" : ""}{duracaoDiffMinutes} min
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Consumo */}
          <Card className="bg-white shadow-lg rounded-xl border-0">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                <FuelIcon className="h-5 w-5 text-[#2F80ED]" />
                Consumo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#7A7E83]">Previsto:</span>
                  <span className="font-semibold text-[#353A40]">{previstoCombustivel}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#7A7E83]">Realizado:</span>
                  <span className="font-semibold text-[#353A40]">{realizadoCombustivel}</span>
                </div>
                {combustivelDiff !== null && (
                  <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                    <span className="text-sm text-[#7A7E83]">Diferença:</span>
                    <span className={cn("font-semibold", getDifferenceColor(combustivelDiff))}>
                      {combustivelDiff > 0 ? "+" : ""}{combustivelDiff.toFixed(1)} L
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {route.userAssigned && (
          <Card className="bg-white shadow-lg rounded-xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-[#2F80ED]/10 flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-[#2F80ED]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#7A7E83] uppercase tracking-wider">
                    Responsável
                  </p>
                  <p className="text-lg font-semibold text-[#353A40]">
                    {route.userAssigned.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {route.description && (
          <Card className="bg-white shadow-lg rounded-xl border-0">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                <FileTextIcon className="h-5 w-5 text-[#2F80ED]" />
                Descrição
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-[#7A7E83] whitespace-pre-wrap">
                {route.description}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white shadow-lg rounded-xl border-0">
          <CardHeader className="border-b pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
              <MapPinIcon className="h-5 w-5 text-[#2F80ED]" />
              Percurso
              <span className="text-sm font-normal text-[#7A7E83] ml-auto">
                {orderedStops.length}{" "}
                {orderedStops.length === 1 ? "parada" : "paradas"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {orderedStops.length > 0 ? (
              <div className="divide-y divide-[#E2E8F0]">
                {orderedStops.map((stop: any, index: number) => (
                  <StopItem key={stop.id || index} stop={stop} index={index} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <MapPinIcon className="mx-auto h-12 w-12 text-[#CBD5E1] mb-3" />
                <p className="text-[#7A7E83]">
                  Nenhuma parada cadastrada nesta rota
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {stats.totalStops > 0 && (
          <Card className="bg-white shadow-lg rounded-xl border-0">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                Progresso
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A7E83]">Concluído</span>
                  <span className="font-semibold text-[#353A40]">
                    {stats.visitedCount} de {stats.totalStops}
                  </span>
                </div>
                <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2F80ED] to-[#00E5FF] transition-all duration-500"
                    style={{
                      width: `${(stats.visitedCount / stats.totalStops) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[#7A7E83] text-right">
                  {Math.round((stats.visitedCount / stats.totalStops) * 100)}%
                  completo
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white border border-gray-200 rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#353A40]">
              Excluir Rota
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#7A7E83]">
              Tem certeza que deseja excluir a rota{" "}
              <span className="font-semibold text-[#353A40]">
                {route.title}
              </span>
              ?
              <br />
              Esta ação não pode ser desfeita e todos os dados da rota serão
              removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-full border-[#CBD5E1]"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Confirmar Exclusão"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
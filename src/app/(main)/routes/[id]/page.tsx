/* eslint-disable @typescript-eslint/no-explicit-any */
// app/routes/[id]/page.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRoutes } from "@/hooks/useRoutes";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  Loader2,
  MapPinIcon,
  Navigation,
  RulerIcon,
  UserIcon,
  Edit2Icon,
  Trash2Icon,
  MoreHorizontalIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, memo, useCallback, useState } from "react";
import { toast } from "sonner";
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

// ─── Constantes de Status (alinhadas com RoutesPage) ─────────────────────────
const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border border-blue-200",
  IN_PROGRESS: "bg-[#D35400]/10 text-[#D35400] border border-[#D35400]/20",
  FINISHED: "bg-green-50 text-green-700 border border-green-200",
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

// Componente de toast customizado
const CustomToast = ({
  message,
  type = "success",
}: {
  message: string;
  type?: "success" | "error";
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 bg-white rounded-lg shadow-lg p-3 border-l-4",
        type === "success" ? "border-green-500" : "border-red-500",
      )}
    >
      {type === "success" ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500" />
      ) : (
        <FileTextIcon className="h-5 w-5 text-red-500" />
      )}
      <span className="text-sm text-gray-700">{message}</span>
    </div>
  );
};

// 🎯 Componente de Skeleton Loading
const DetailsSkeleton = () => (
  <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-8">
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-32 bg-gray-200 rounded" />
        <div className="h-12 w-64 bg-gray-200 rounded" />
        <div className="flex gap-3">
          <div className="h-6 w-24 bg-gray-200 rounded-full" />
          <div className="h-6 w-24 bg-gray-200 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex gap-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 🎯 Componente de Info Card
const InfoCard = memo(({ icon: Icon, title, value }: any) => (
  <Card className="border-0 shadow-md rounded-xl hover:shadow-lg transition-all duration-200">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-[#D35400]" />
        <span className="text-xs font-medium text-[#95A5A6] uppercase tracking-wider">
          {title}
        </span>
      </div>
      <p className="text-2xl font-bold text-[#2C3E50]">{value}</p>
    </CardContent>
  </Card>
));

InfoCard.displayName = "InfoCard";

// 🎯 Componente de Stop Item
const StopItem = memo(({ stop, index }: any) => {
  const isVisited = stop.visited;

  return (
    <Card
      className={cn(
        "border transition-all duration-200 hover:shadow-md",
        isVisited
          ? "bg-gray-50/50 border-gray-200"
          : "border-gray-100 hover:border-[#D35400]/20",
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Indicador numérico */}
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all",
              isVisited
                ? "bg-green-50 border-green-300 text-green-600"
                : "bg-[#D35400]/10 border-[#D35400]/30 text-[#D35400]",
            )}
          >
            {isVisited ? (
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            ) : (
              index + 1
            )}
          </div>

          {/* Dados da parada */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#2C3E50] truncate">
              {stop.name || `Ponto ${index + 1}`}
            </h3>
            <p className="text-sm text-[#95A5A6] truncate">
              {stop.address}, {stop.city} - {stop.state}
            </p>
          </div>

          {/* Status */}
          <div className="flex-shrink-0">
            {isVisited ? (
              <Badge className="bg-green-50 text-green-700 border border-green-200 shadow-none text-xs">
                Visitado
              </Badge>
            ) : (
              <Badge className="bg-blue-50 text-blue-700 border border-blue-200 shadow-none text-xs">
                Pendente
              </Badge>
            )}
          </div>
        </div>

        {/* Observações da visita */}
        {stop.notes && (
          <div className="mt-3 ml-12 pl-4 border-l-2 border-[#D35400]/20">
            <p className="text-sm text-[#95A5A6]">
              <span className="font-medium text-[#2C3E50]">Observações:</span>{" "}
              {stop.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

StopItem.displayName = "StopItem";

export default function RouteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const { useGetRouteById, useUpdateRoute, useDeleteRoute } = useRoutes();
  const { data: route, isLoading } = useGetRouteById(routeId);
  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Memoização dos stops ordenados
  const orderedStops = useMemo(() => {
    if (!route?.stops) return [];
    return [...route.stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [route?.stops]);

  // Estatísticas memoizadas
  const stats = useMemo(() => {
    if (!route) return { visitedCount: 0, totalStops: 0 };
    const visitedCount =
      route.stops?.filter((stop: any) => stop.visited).length || 0;
    const totalStops = route.stops?.length || 0;
    return { visitedCount, totalStops };
  }, [route]);

  // Verificar se rota está atrasada
  const isOverdue = useMemo(() => {
    if (!route?.routeDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const routeDate = new Date(route.routeDate);
    return routeDate < today && route.status !== "FINISHED";
  }, [route?.routeDate, route?.status]);

  // 🔥 Função para verificar se o valor da distância é válido (não zero e não "—")
  const hasValidDistance = useMemo(() => {
    if (!route?.formattedDistance) return false;
    const value = route.formattedDistance;
    return value !== "—" && value !== "Distância não calculada" && value !== "0 km";
  }, [route?.formattedDistance]);

  // 🔥 Função para verificar se o valor da duração é válido (não zero e não "—")
  const hasValidDuration = useMemo(() => {
    if (!route?.formattedDuration) return false;
    const value = route.formattedDuration;
    return value !== "—" && value !== "Duração não calculada" && value !== "0 min";
  }, [route?.formattedDuration]);

  // Callback para iniciar navegação
  const handleStartNavigation = useCallback(async () => {
    if (route?.status === "SCHEDULED") {
      try {
        await updateRoute.mutateAsync({
          id: routeId,
          data: { status: "IN_PROGRESS" as any },
        });
        toast.custom(
          (t) => (
            <CustomToast message="Rota iniciada com sucesso" type="success" />
          ),
          { duration: 1500 },
        );
      } catch {
        toast.custom(
          (t) => <CustomToast message="Erro ao iniciar rota" type="error" />,
          { duration: 1500 },
        );
      }
    }
    router.push(`/driver?routeId=${routeId}`);
  }, [route?.status, updateRoute, router, routeId]);

  // Callback para excluir rota
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteRoute.mutateAsync(routeId);
      toast.custom(
        (t) => (
          <CustomToast message="Rota excluída com sucesso" type="success" />
        ),
        { duration: 1500 },
      );
      router.push("/routes");
    } catch {
      toast.custom(
        (t) => <CustomToast message="Erro ao excluir rota" type="error" />,
        { duration: 1500 },
      );
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
      <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-8 flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <MapPinIcon className="mx-auto h-16 w-16 text-[#95A5A6] mb-4" />
          <p className="text-[#2C3E50] text-lg font-medium">
            Rota não encontrada
          </p>
          <p className="text-[#95A5A6] text-sm mt-1">
            Verifique o ID da rota ou tente novamente
          </p>
        </div>
        <Button
          className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-full"
          onClick={() => router.push("/routes")}
        >
          Voltar para lista de rotas
        </Button>
      </div>
    );
  }

  const orderByType = route.orderBy || "DISTANCE";

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header com ações ─────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="-ml-4 h-8 text-[#95A5A6] hover:text-[#2C3E50] hover:bg-transparent"
              onClick={() => router.push("/routes")}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar para lista
            </Button>
            <h1 className="text-3xl font-bold text-[#2C3E50]">{route.title}</h1>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge className={statusColors[route.status]}>
                {statusText[route.status]}
              </Badge>
              {isOverdue && route.status !== "FINISHED" && (
                <Badge className="bg-red-50 text-red-700 border border-red-200">
                  Atrasada
                </Badge>
              )}
              <Badge className="bg-purple-50 text-purple-700 border border-purple-200">
                {orderByText[orderByType]}
              </Badge>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleStartNavigation}
                    className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-full"
                    disabled={updateRoute.isPending}
                  >
                    {updateRoute.isPending ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <Navigation className="h-4 w-3 mr-1" />
                    )}
                    Iniciar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Iniciar navegação</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => router.push(`/routes/${routeId}/edit`)}
                >
                  <Edit2Icon className="mr-2 h-4 w-4 text-[#95A5A6]" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Cards de Informações da Rota ────────────────────────────────────── */}
        {/* 🔥 Só mostra os cards se os valores forem válidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {hasValidDistance && (
            <InfoCard
              icon={RulerIcon}
              title="Distância Total"
              value={route.formattedDistance}
            />
          )}
          {hasValidDuration && (
            <InfoCard
              icon={ClockIcon}
              title="Duração Estimada"
              value={route.formattedDuration}
            />
          )}
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
        </div>

        {/* ── Descrição ───────────────────────────────────────────────────────── */}
        {route.description && (
          <Card className="border-0 shadow-md rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileTextIcon className="h-4 w-4 text-[#D35400]" />
                <span className="text-xs font-medium text-[#95A5A6] uppercase tracking-wider">
                  Descrição
                </span>
              </div>
              <p className="text-sm text-[#2C3E50] whitespace-pre-wrap">
                {route.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Responsável ─────────────────────────────────────────────────────── */}
        {route.userAssigned && (
          <Card className="border-0 shadow-md rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-[#D35400]/10 flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-[#D35400]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#95A5A6] uppercase tracking-wider">
                    Responsável
                  </p>
                  <p className="text-base font-semibold text-[#2C3E50]">
                    {route.userAssigned.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Percurso ──────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#2C3E50]">Percurso</h2>
          </div>
          <div className="space-y-3">
            {orderedStops.length > 0 ? (
              orderedStops.map((stop: any, index: number) => (
                <StopItem key={stop.id || index} stop={stop} index={index} />
              ))
            ) : (
              <Card className="border-0 shadow-md rounded-xl">
                <CardContent className="p-8 text-center">
                  <MapPinIcon className="mx-auto h-12 w-12 text-[#95A5A6] mb-3" />
                  <p className="text-[#95A5A6]">
                    Nenhuma parada cadastrada nesta rota
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white border border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#2C3E50]">
              Excluir Rota
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#95A5A6]">
              Tem certeza que deseja excluir a rota{" "}
              <span className="font-semibold text-[#2C3E50]">
                {route.title}
              </span>
              ?
              <br />
              Esta ação não pode ser desfeita e todos os dados da rota serão
              removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-full">
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
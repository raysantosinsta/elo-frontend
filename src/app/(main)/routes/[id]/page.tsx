/* eslint-disable @typescript-eslint/no-explicit-any */
// app/routes/[id]/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRoutes } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  CopyIcon,
  Navigation,
  Loader2,
  UserIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function RouteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const {
    useGetRouteById,
    useMarkStopVisited,
    useDuplicateRoute,
    useUpdateRoute,
  } = useRoutes();

  const { data: route, isLoading, refetch } = useGetRouteById(routeId);
  const markStopVisited = useMarkStopVisited();
  const duplicateRoute = useDuplicateRoute();
  const updateRoute = useUpdateRoute();

  const [selectedStop, setSelectedStop] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [notes, setNotes] = useState("");

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

  const handleMarkVisited = async (stopId: string, stopNotes?: string) => {
    try {
      await markStopVisited.mutateAsync({
        routeId,
        stopId,
        notes: stopNotes || notes,
      });
      toast.success("Parada marcada como visitada!");
      setSelectedStop(null);
      setNotes("");
      refetch();
    } catch (error: any) {
      toast.error("Erro ao marcar parada");
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateRoute.mutateAsync({
        id: routeId,
        data: { title: duplicateTitle || `${route?.title} (Cópia)` },
      });
      toast.success("Rota duplicada com sucesso!");
      setShowDuplicateDialog(false);
      router.push("/routes");
    } catch (error: any) {
      toast.error("Erro ao duplicar rota");
    }
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
            <Button
              onClick={() => setShowDuplicateDialog(true)}
              className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 text-[#D1D5DB] border border-white/10"
            >
              <CopyIcon className="h-4 w-4 mr-2" />
              Duplicar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* ── Descrição ─────────────────────────────────────────────────────── */}
          {route.description && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-[#D1D5DB]">
              <strong className="text-[#9CA3AF]">Descrição:</strong>{" "}
              {route.description}
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
              </div>
            </div>
          )}

          {/* ── Itinerário ────────────────────────────────────────────────────── */}
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xl text-white">Itinerário</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-3">
                {orderedStops.map((stop: any, index: number) => (
                  <div
                    key={stop.id || index}
                    className={cn(
                      "group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border transition-all",
                      stop.visited
                        ? "bg-white/5 border-white/5 opacity-60"
                        : "bg-white/5 border-white/10 hover:border-[#D35400]/40",
                    )}
                  >
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
                        {stop.address}, {stop.city}
                      </p>
                    </div>

                    {/* Ação */}
                    <div className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                      {stop.visited ? (
                        <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 shadow-none text-xs">
                          Visitado
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setSelectedStop(stop)}
                          className="w-full sm:w-auto h-8 text-xs bg-white/5 hover:bg-[#D35400] hover:text-white text-[#D1D5DB] border border-white/10 hover:border-[#D35400] transition-all"
                          disabled={
                            route.status === "FINISHED" ||
                            route.status === "CANCELED"
                          }
                        >
                          Marcar Visitada
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Dialog: Marcar Visitada ────────────────────────────────────────── */}
        <Dialog
          open={!!selectedStop}
          onOpenChange={() => setSelectedStop(null)}
        >
          <DialogContent className="bg-[#2C3E50] border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Confirmar Visita</DialogTitle>
              <DialogDescription className="text-[#9CA3AF]">
                {selectedStop?.address}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Observações da visita</Label>
                <Textarea
                  placeholder="Ex: Entregue para recepcionista..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-[#6B7280] focus-visible:ring-[#D35400]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setSelectedStop(null)}
                className="text-[#D1D5DB] hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleMarkVisited(selectedStop?.id)}
                className="bg-[#D35400] hover:bg-[#b84700] text-white border-none"
              >
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Duplicar ──────────────────────────────────────────────── */}
        <Dialog
          open={showDuplicateDialog}
          onOpenChange={setShowDuplicateDialog}
        >
          <DialogContent className="bg-[#2C3E50] border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Duplicar Rota</DialogTitle>
              <DialogDescription className="text-[#9CA3AF]">
                Crie uma cópia exata deste itinerário.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Nome da nova rota</Label>
                <Input
                  placeholder={`${route.title} (Cópia)`}
                  value={duplicateTitle}
                  onChange={(e) => setDuplicateTitle(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-[#6B7280] focus-visible:ring-[#D35400]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setShowDuplicateDialog(false)}
                className="text-[#D1D5DB] hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDuplicate}
                disabled={duplicateRoute.isPending}
                className="bg-[#D35400] hover:bg-[#b84700] text-white border-none"
              >
                {duplicateRoute.isPending ? "Copiando..." : "Duplicar Rota"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

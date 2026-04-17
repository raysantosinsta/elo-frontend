/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
"use client";

import { useRoutes } from "@/hooks/useRoutes";
import { CreateRouteDto } from "@/services/api";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarPlus,
  CheckCircle,
  Copy,
  FileText,
  LeafIcon,
  Loader2,
  MapPin,
  Play,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Importação dinâmica do mapa
const RouteMap = dynamic(() => import("@/components/DriverMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 flex-col gap-2">
      <Loader2 className="animate-spin text-[#D35400]" size={32} />
      <span className="text-slate-500 font-medium">Carregando Mapa...</span>
    </div>
  ),
});

// 🎯 Componente de Skeleton Loading
const DriverSkeleton = () => (
  <div className="h-screen w-full bg-slate-100">
    <div className="absolute top-4 left-4 right-4 z-[500]">
      <div className="bg-white/95 rounded-2xl p-4 shadow-lg">
        <div className="flex justify-between mb-3">
          <div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse" />
          <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
        </div>
        <div className="h-7 w-48 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-5 w-64 bg-slate-200 rounded animate-pulse" />
      </div>
    </div>
    <div className="h-full w-full bg-slate-200 animate-pulse" />
  </div>
);

// 🎯 Componente de Header memoizado
const DriverHeader = memo(
  ({
    completedStops,
    totalStops,
    currentStop,
    currentStopIndex,
    isGPSActive,
    isSimulating,
    onResumeGPS,
    onStartSimulation,
    onBack,
  }: any) => {
    const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

    return (
      <div className="absolute top-4 left-4 right-4 z-[500] pointer-events-none">
        <div className="bg-white/95 backdrop-blur shadow-lg rounded-2xl p-4 border border-slate-200 pointer-events-auto transition-all hover:shadow-xl">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                {completedStops}/{totalStops}
              </span>
            </div>
            <div className="flex gap-2">
              {!isGPSActive && !isSimulating && (
                <button
                  onClick={onResumeGPS}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-2 py-1.5 rounded-full transition-colors"
                >
                  <LeafIcon size={12} /> GPS
                </button>
              )}
              {!isSimulating && (
                <button
                  onClick={onStartSimulation}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
                >
                  <Play size={12} fill="currentColor" /> Simular
                </button>
              )}
            </div>
          </div>

          <h2 className="font-bold text-lg text-slate-800 line-clamp-1">
            {currentStop?.name || `Parada ${currentStopIndex + 1}`}
          </h2>

          <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm">
            <MapPin size={14} className="text-[#D35400] shrink-0" />
            <span className="truncate">{currentStop?.address}</span>
          </div>

          <div className="flex gap-3 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {currentStop?.city}/{currentStop?.state}
            </span>
            <span className="flex items-center gap-1">
              <FileText size={12} /> CEP: {currentStop?.zipCode}
            </span>
          </div>

          {/* Barra de progresso */}
          {totalStops > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Progresso da rota</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D35400] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

DriverHeader.displayName = "DriverHeader";

export default function DriverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = searchParams.get("routeId");

  const {
    useGetRouteById,
    useMarkStopVisited,
    useUpdateRoute,
    useCreateRoute,
  } = useRoutes();
  const {
    data: route,
    isLoading: isLoadingRoute,
    refetch,
  } = useGetRouteById(routeId || "");
  const markStopVisited = useMarkStopVisited();
  const updateRoute = useUpdateRoute();
  const createRoute = useCreateRoute();

  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<
    [number, number] | null
  >(null);
  const [visitedStops, setVisitedStops] = useState<string[]>([]);
  const [failedStops, setFailedStops] = useState<string[]>([]); // 🆕 Para rastrear falhas
  const [isGPSActive, setIsGPSActive] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visitStatus, setVisitStatus] = useState<"success" | "error" | null>(
    null,
  );

  // Estados para o novo fluxo de criar rota (Agendar)
  const [showNewRouteOption, setShowNewRouteOption] = useState(false);
  const [newRouteDate, setNewRouteDate] = useState("");
  const [newRouteObservations, setNewRouteObservations] = useState("");
  const [newRouteTitle, setNewRouteTitle] = useState("");
  const [isCreatingNewRoute, setIsCreatingNewRoute] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Estados para reagendamento em caso de falha
  const [showRescheduleOption, setShowRescheduleOption] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleObservations, setRescheduleObservations] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Estado para armazenar as paradas otimizadas por proximidade
  const [optimizedStops, setOptimizedStops] = useState<any[]>([]);
  // Flag para evitar reordenação desnecessária
  const [isReordering, setIsReordering] = useState(false);
  const lastReorderedRef = useRef<string>("");

  const watchIdRef = useRef<number | null>(null);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  // Carregar estado salvo do localStorage
  useEffect(() => {
    if (routeId) {
      const savedIndex = localStorage.getItem(`driver_route_${routeId}_index`);
      const savedVisited = localStorage.getItem(
        `driver_route_${routeId}_visited`,
      );
      const savedFailed = localStorage.getItem(
        `driver_route_${routeId}_failed`,
      );

      if (savedIndex) setCurrentStopIndex(parseInt(savedIndex));
      if (savedVisited) setVisitedStops(JSON.parse(savedVisited));
      if (savedFailed) setFailedStops(JSON.parse(savedFailed));
    }
  }, [routeId]);

  // Salvar estado no localStorage
  useEffect(() => {
    if (routeId && route) {
      localStorage.setItem(
        `driver_route_${routeId}_index`,
        String(currentStopIndex),
      );
      localStorage.setItem(
        `driver_route_${routeId}_visited`,
        JSON.stringify(visitedStops),
      );
      localStorage.setItem(
        `driver_route_${routeId}_failed`,
        JSON.stringify(failedStops),
      );
    }
  }, [routeId, currentStopIndex, visitedStops, failedStops, route]);

  // Monitorar GPS
  useEffect(() => {
    if (!navigator.geolocation || !isGPSActive) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn("GPS Init Error:", err),
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    return () => {
      if (watchIdRef.current)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isGPSActive]);

  // Função para calcular distância entre dois pontos (em metros)
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [],
  );

  // 🔥 FUNÇÃO PRINCIPAL: Reordenar paradas por proximidade
  const reorderStopsByProximity = useCallback(
    (stops: any[], currentLatLng: [number, number], visitedIds: string[]) => {
      if (!stops.length) return [];

      const notVisited = stops.filter((stop) => !visitedIds.includes(stop.id));
      const alreadyVisited = stops.filter((stop) =>
        visitedIds.includes(stop.id),
      );

      if (notVisited.length === 0) return alreadyVisited;

      const ordered: any[] = [];
      const remaining = [...notVisited];
      let currentPos = {
        lat: currentLatLng[0],
        lng: currentLatLng[1],
      };

      let iteration = 0;
      const maxIterations = remaining.length;

      while (remaining.length > 0 && iteration < maxIterations) {
        iteration++;
        let nearestIndex = 0;
        let minDistance = Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const stop = remaining[i];
          const distance = calculateDistance(
            currentPos.lat,
            currentPos.lng,
            stop.latitude,
            stop.longitude,
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
          }
        }

        const nearest = remaining[nearestIndex];
        ordered.push(nearest);
        currentPos = {
          lat: nearest.latitude,
          lng: nearest.longitude,
        };
        remaining.splice(nearestIndex, 1);
      }

      return [...ordered, ...alreadyVisited];
    },
    [calculateDistance],
  );

  // 🔥 EFEITO: Reordenar paradas apenas quando necessário
  useEffect(() => {
    if (!route || !route.stops) {
      setOptimizedStops([]);
      return;
    }

    if (route.orderBy === "PRIORITY") {
      if (JSON.stringify(optimizedStops) !== JSON.stringify(route.stops)) {
        setOptimizedStops(route.stops);
        setCurrentStopIndex(0);
      }
      return;
    }

    if (route.orderBy === "DISTANCE") {
      if (currentPosition) {
        const reorderKey = `${currentPosition[0].toFixed(4)},${currentPosition[1].toFixed(4)}|${visitedStops.join(",")}`;

        if (lastReorderedRef.current !== reorderKey && !isReordering) {
          setIsReordering(true);

          const reordered = reorderStopsByProximity(
            route.stops,
            currentPosition,
            visitedStops,
          );

          const currentOrderIds = optimizedStops.map((s) => s.id).join(",");
          const newOrderIds = reordered.map((s) => s.id).join(",");

          if (currentOrderIds !== newOrderIds) {
            setOptimizedStops(reordered);
            setCurrentStopIndex(0);
          } else if (optimizedStops.length === 0) {
            setOptimizedStops(reordered);
            setCurrentStopIndex(0);
          }

          lastReorderedRef.current = reorderKey;
          setIsReordering(false);
        }
      } else if (optimizedStops.length === 0) {
        const firstStopPos = {
          lat: route.stops[0]?.latitude || 0,
          lng: route.stops[0]?.longitude || 0,
        };

        if (firstStopPos.lat !== 0 && firstStopPos.lng !== 0) {
          const initialPos: [number, number] = [
            firstStopPos.lat,
            firstStopPos.lng,
          ];
          const reordered = reorderStopsByProximity(
            route.stops,
            initialPos,
            visitedStops,
          );
          setOptimizedStops(reordered);
          setCurrentStopIndex(0);
        } else {
          setOptimizedStops(route.stops);
          setCurrentStopIndex(0);
        }
      }
    }
  }, [
    route,
    currentPosition,
    visitedStops,
    currentStopIndex,
    reorderStopsByProximity,
    optimizedStops,
    isReordering,
  ]);

  // Memoização dos valores derivados
  const displayStops = useMemo(
    () => (optimizedStops.length ? optimizedStops : route?.stops || []),
    [optimizedStops, route?.stops],
  );

  const currentStop = displayStops[currentStopIndex];
  const totalStops = displayStops.length;
  const completedStops = visitedStops.length + failedStops.length; // Total de paradas finalizadas (sucesso + falha)

  const isFinished =
    route?.status === "FINISHED" ||
    (completedStops === totalStops && totalStops > 0);

  // Verificar chegada ao destino
  const previousStopIdRef = useRef<string>("");

  useEffect(() => {
    if (!currentPosition || !currentStop) return;
    if (previousStopIdRef.current === currentStop.id) return;

    const distance = calculateDistance(
      currentPosition[0],
      currentPosition[1],
      currentStop.latitude,
      currentStop.longitude,
    );

    const ARRIVAL_RADIUS_METERS = 50;
    const isVisited = visitedStops.includes(currentStop.id);
    const isFailed = failedStops.includes(currentStop.id);

    if (
      distance <= ARRIVAL_RADIUS_METERS &&
      !isVisited &&
      !isFailed &&
      !isModalOpen
    ) {
      previousStopIdRef.current = currentStop.id;
      toast.success(
        `✅ Você chegou em: ${currentStop.name || `Parada ${currentStopIndex + 1}`}`,
        { duration: 3000 },
      );
      setIsModalOpen(true);
      setShowNewRouteOption(false);
      setShowRescheduleOption(false);
      setNewRouteDate("");
      setNewRouteObservations("");
      setNewRouteTitle("");
      setRescheduleDate("");
      setRescheduleObservations("");
      setVisitStatus(null);
      setComment("");
    }
  }, [
    currentPosition,
    currentStop,
    visitedStops,
    failedStops,
    isModalOpen,
    currentStopIndex,
    calculateDistance,
  ]);

  const startSimulation = useCallback(() => {
    const targetStop = displayStops[currentStopIndex];

    if (!targetStop) {
      toast.warning("Destino não encontrado");
      return;
    }

    if (!currentPosition) {
      toast.warning("Aguardando sinal de GPS");
      return;
    }

    setIsGPSActive(false);
    setIsSimulating(true);

    const steps = 150;
    const speed = 20;
    let step = 0;
    const startLat = currentPosition[0];
    const startLng = currentPosition[1];
    const endLat = targetStop.latitude;
    const endLng = targetStop.longitude;

    if (simulationInterval.current) clearInterval(simulationInterval.current);

    simulationInterval.current = setInterval(() => {
      step++;
      const progress = step / steps;
      const newLat = startLat + (endLat - startLat) * progress;
      const newLng = startLng + (endLng - startLng) * progress;
      setCurrentPosition([newLat, newLng]);

      if (step >= steps) {
        if (simulationInterval.current)
          clearInterval(simulationInterval.current);
        setCurrentPosition([endLat, endLng]);
        setIsSimulating(false);
        toast.success(`Simulação concluída! Chegou em: ${targetStop.name}`, {
          duration: 2000,
        });
      }
    }, speed);
  }, [displayStops, currentStopIndex, currentPosition]);

  const resumeRealGPS = useCallback(() => {
    setIsGPSActive(true);
    setIsSimulating(false);
    if (simulationInterval.current) clearInterval(simulationInterval.current);
    toast.info("GPS em tempo real ativado", { duration: 2000 });
  }, []);

  // ✅ Confirmar visita com sucesso (marca como concluído e avança)
  const confirmSuccess = useCallback(async () => {
    if (!currentStop) return;

    setIsSubmitting(true);
    setVisitStatus("success");
    try {
      const successNote = comment
        ? `✅ VISITA CONCLUÍDA COM SUCESSO: ${comment}`
        : `✅ VISITA CONCLUÍDA COM SUCESSO`;

      await markStopVisited.mutateAsync({
        routeId: routeId!,
        stopId: currentStop.id!,
        notes: successNote,
      });

      const newVisitedStops = [...visitedStops, currentStop.id!];
      setVisitedStops(newVisitedStops);
      previousStopIdRef.current = "";

      const nextIndex = currentStopIndex + 1;

      if (nextIndex >= totalStops) {
        await updateRoute.mutateAsync({
          id: routeId!,
          data: { status: "FINISHED" },
        });

        localStorage.removeItem(`driver_route_${routeId}_index`);
        localStorage.removeItem(`driver_route_${routeId}_visited`);
        localStorage.removeItem(`driver_route_${routeId}_failed`);

        toast.success("🎉 Rota finalizada com sucesso!", {
          duration: 3000,
          icon: "✅",
        });

        setTimeout(() => {
          router.push("/routes");
        }, 1500);
      } else {
        setCurrentStopIndex(nextIndex);
        toast.success(
          `✅ Visita concluída com sucesso! Próximo destino: ${displayStops[nextIndex]?.name || `Parada ${nextIndex + 1}`}`,
          { duration: 3000 },
        );

        setIsModalOpen(false);
        setComment("");
        setShowNewRouteOption(false);
        setShowRescheduleOption(false);
        setNewRouteDate("");
        setNewRouteObservations("");
        setNewRouteTitle("");
        setRescheduleDate("");
        setRescheduleObservations("");
        setVisitStatus(null);
      }

      refetch();
    } catch (error) {
      console.error("Erro ao finalizar:", error);
      toast.error("Erro ao registrar visita. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentStop,
    markStopVisited,
    routeId,
    comment,
    visitedStops,
    currentStopIndex,
    totalStops,
    updateRoute,
    router,
    refetch,
    displayStops,
  ]);

  // 🔥 FUNÇÃO CORRIGIDA: Reagendar visita em caso de falha - Marca como FAILED
  const handleReschedule = useCallback(async () => {
    if (!currentStop) return;

    if (!rescheduleDate) {
      toast.warning("Selecione uma data para o reagendamento");
      return;
    }

    setIsRescheduling(true);
    const loadingToast = toast.loading("Reagendando visita...", {
      duration: Infinity,
    });

    try {
      const formattedDate = new Date(rescheduleDate).toLocaleDateString(
        "pt-BR",
      );

      // 🆕 NOTA DE FALHA (não como sucesso)
      const failureNote =
        `❌ VISITA COM FALHA - REAGENDADA\n` +
        `Data original: ${new Date(route?.routeDate || "").toLocaleDateString("pt-BR")}\n` +
        `Nova data agendada: ${formattedDate}\n` +
        `Motivo da falha: ${rescheduleObservations || "Não informado"}\n` +
        `Comentário original: ${comment || "Nenhum"}\n` +
        `Status: FAILED - Visita não concluída, reagendada para futuro.`;

      // ✅ MARCAR COMO FAILED (NÃO como concluída)
      await markStopVisited.mutateAsync({
        routeId: routeId!,
        stopId: currentStop.id!,
        notes: failureNote,
      });

      // Adicionar aos failed stops (NÃO aos visited stops)
      const newFailedStops = [...failedStops, currentStop.id!];
      setFailedStops(newFailedStops);
      previousStopIdRef.current = "";

      // Criar nova rota para o futuro com o mesmo destino
      const newTitle = `[REAGENDADO - FALHA] ${currentStop.name}`;

      const createRoutePayload: CreateRouteDto = {
        title: newTitle,
        description: `⚠️ VISITA REAGENDADA POR FALHA\nMotivo: ${rescheduleObservations || "Não informado"}\nEndereço: ${currentStop.address}, ${currentStop.city}/${currentStop.state}`,
        routeDate: rescheduleDate,
        userAssignedId: route?.userAssignedId || undefined,
        orderBy: "DISTANCE",
        stops: [
          {
            name: currentStop.name,
            address: currentStop.address,
            complement: currentStop.complement || "",
            neighborhood: currentStop.neighborhood || "",
            city: currentStop.city,
            state: currentStop.state,
            zipCode: currentStop.zipCode,
            latitude: currentStop.latitude,
            longitude: currentStop.longitude,
            notes: `⚠️ Reagendado por falha. Motivo: ${rescheduleObservations || "Não informado"}`,
          },
        ],
      };

      await createRoute.mutateAsync(createRoutePayload);

      // Avançar para próxima parada
      const nextIndex = currentStopIndex + 1;

      if (nextIndex >= totalStops) {
        await updateRoute.mutateAsync({
          id: routeId!,
          data: { status: "FINISHED" },
        });
        localStorage.removeItem(`driver_route_${routeId}_index`);
        localStorage.removeItem(`driver_route_${routeId}_visited`);
        localStorage.removeItem(`driver_route_${routeId}_failed`);
        toast.success("🎉 Rota finalizada!", { duration: 3000 });
        setTimeout(() => router.push("/routes"), 1500);
      } else {
        setCurrentStopIndex(nextIndex);
        toast.warning(
          `⚠️ Falha registrada! Visita reagendada para ${formattedDate}. Próximo destino: ${displayStops[nextIndex]?.name || `Parada ${nextIndex + 1}`}`,
          { duration: 4000 },
        );
      }

      toast.dismiss(loadingToast);
      toast.warning("⚠️ Visita registrada como FALHA e reagendada!", {
        duration: 4000,
        description: `Status: FAILED | Nova data: ${formattedDate}`,
      });

      // Fechar modal e limpar estados
      setIsModalOpen(false);
      setComment("");
      setShowNewRouteOption(false);
      setShowRescheduleOption(false);
      setNewRouteDate("");
      setNewRouteObservations("");
      setNewRouteTitle("");
      setRescheduleDate("");
      setRescheduleObservations("");
      setVisitStatus(null);

      await refetch();
    } catch (error) {
      console.error("Erro ao reagendar:", error);
      toast.dismiss(loadingToast);
      toast.error("❌ Erro ao reagendar visita", {
        description: "Tente novamente ou contate o suporte.",
      });
    } finally {
      setIsRescheduling(false);
    }
  }, [
    currentStop,
    rescheduleDate,
    rescheduleObservations,
    comment,
    routeId,
    route,
    failedStops,
    markStopVisited,
    createRoute,
    updateRoute,
    router,
    currentStopIndex,
    totalStops,
    displayStops,
    refetch,
  ]);

  // 🔥 FUNÇÃO AUXILIAR: Converter data local para UTC mantendo o mesmo dia
  const convertLocalDateToUTC = (dateString: string): string => {
    // Exemplo: "2026-04-17" -> "2026-04-17T00:00:00-03:00"
    const [year, month, day] = dateString.split("-");
    // Criar data no fuso horário local
    const localDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
    );
    // Retornar como string ISO mantendo o offset local
    return localDate.toISOString().split("T")[0]; // Retorna "2026-04-17"
  };

  // 🔥 FUNÇÃO: Criar nova rota (Agendar) - Marca como concluída
  const handleCreateNewRoute = useCallback(async () => {
    if (!route || !currentStop) return;

    if (!newRouteTitle.trim()) {
      toast.warning("Digite um título para a nova rota");
      return;
    }

    if (!newRouteDate) {
      toast.warning("Selecione uma data para a nova rota");
      return;
    }

    setIsCreatingNewRoute(true);
    const loadingToast = toast.loading("Criando nova rota...", {
      duration: Infinity,
    });

    try {
      // 🔥 CORREÇÃO: Manter a data exata que o usuário selecionou
      // Não converter para UTC, enviar como string YYYY-MM-DD
      const selectedDate = newRouteDate; // Já está no formato YYYY-MM-DD
      const formattedDate = new Date(selectedDate).toLocaleDateString("pt-BR");
      const finalTitle = newRouteTitle.trim();

      let description = `Destino agendado da rota original: ${route.title}\n`;
      description += `Endereço: ${currentStop.address}, ${currentStop.city}/${currentStop.state}\n`;
      if (currentStop.notes) {
        description += `Observações originais: ${currentStop.notes}\n`;
      }
      if (newRouteObservations) {
        description += `\n📝 Observações do agendamento: ${newRouteObservations}`;
      }

      const createRoutePayload: CreateRouteDto = {
        title: finalTitle,
        description: description,
        routeDate: selectedDate,
        userAssignedId: route.userAssignedId || undefined,
        orderBy: "DISTANCE",
        stops: [
          {
            name: currentStop.name,
            address: currentStop.address,
            complement: currentStop.complement || "",
            neighborhood: currentStop.neighborhood || "",
            city: currentStop.city,
            state: currentStop.state,
            zipCode: currentStop.zipCode,
            latitude: currentStop.latitude,
            longitude: currentStop.longitude,
            notes: currentStop.notes || "",
          },
        ],
      };

      await createRoute.mutateAsync(createRoutePayload);

      // ✅ MARCAR A PARADA ATUAL COMO CONCLUÍDA (AGENDADA - SUCESSO)
      if (
        !visitedStops.includes(currentStop.id!) &&
        !failedStops.includes(currentStop.id!)
      ) {
        await markStopVisited.mutateAsync({
          routeId: routeId!,
          stopId: currentStop.id!,
          notes: `📅 AGENDADO: Nova rota criada para ${formattedDate} com título: ${finalTitle}. Visita registrada como concluída para seguir rota atual.`,
        });

        const newVisitedStops = [...visitedStops, currentStop.id!];
        setVisitedStops(newVisitedStops);

        const nextIndex = currentStopIndex + 1;
        if (nextIndex < totalStops) {
          setCurrentStopIndex(nextIndex);
          toast.success(
            `✅ Destino agendado e marcado como concluído! Próximo destino: ${displayStops[nextIndex]?.name || `Parada ${nextIndex + 1}`}`,
            { duration: 4000 },
          );
        } else {
          await updateRoute.mutateAsync({
            id: routeId!,
            data: { status: "FINISHED" },
          });
          localStorage.removeItem(`driver_route_${routeId}_index`);
          localStorage.removeItem(`driver_route_${routeId}_visited`);
          localStorage.removeItem(`driver_route_${routeId}_failed`);
          toast.success("🎉 Rota finalizada com sucesso!", { duration: 3000 });
          setTimeout(() => router.push("/routes"), 1500);
        }
      }

      toast.dismiss(loadingToast);
      toast.success("✅ Nova rota criada com sucesso!", {
        duration: 4000,
        description: `Título: ${finalTitle} | Data: ${formattedDate}`,
      });

      // Limpar estados
      setIsModalOpen(false);
      setShowNewRouteOption(false);
      setComment("");
      setNewRouteDate("");
      setNewRouteObservations("");
      setNewRouteTitle("");
      setVisitStatus(null);

      await refetch();

      if (route.orderBy === "DISTANCE" && currentPosition) {
        const reordered = reorderStopsByProximity(
          route.stops,
          currentPosition,
          [...visitedStops, currentStop.id!],
        );
        setOptimizedStops(reordered);
      }
    } catch (error) {
      console.error("Erro ao criar nova rota:", error);
      toast.dismiss(loadingToast);
      toast.error("❌ Erro ao criar nova rota", {
        description: "Tente novamente ou contate o suporte.",
      });
    } finally {
      setIsCreatingNewRoute(false);
    }
  }, [
    route,
    currentStop,
    currentStopIndex,
    totalStops,
    displayStops,
    currentPosition,
    newRouteTitle,
    newRouteDate,
    newRouteObservations,
    markStopVisited,
    updateRoute,
    routeId,
    visitedStops,
    failedStops,
    createRoute,
    refetch,
    reorderStopsByProximity,
    router,
  ]);

  // Efeito para marcar rota como concluída
  useEffect(() => {
    const checkAndFinishRoute = async () => {
      if (isFinishing || !route || route.status === "FINISHED") return;
      if (completedStops === totalStops && totalStops > 0) {
        setIsFinishing(true);
        try {
          await updateRoute.mutateAsync({
            id: routeId!,
            data: { status: "FINISHED" },
          });
          localStorage.removeItem(`driver_route_${routeId}_index`);
          localStorage.removeItem(`driver_route_${routeId}_visited`);
          localStorage.removeItem(`driver_route_${routeId}_failed`);
          toast.success("🎉 Rota finalizada com sucesso!", {
            duration: 4000,
            icon: "✅",
          });
          setTimeout(() => router.push("/routes"), 2000);
        } catch (error) {
          console.error("Erro ao finalizar rota:", error);
          setIsFinishing(false);
        }
      }
    };
    checkAndFinishRoute();
  }, [
    completedStops,
    totalStops,
    route,
    routeId,
    updateRoute,
    router,
    isFinishing,
  ]);

  // Prefetch da lista de rotas
  const prefetchRoutes = useCallback(() => {
    router.prefetch("/routes");
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoadingRoute) {
    return <DriverSkeleton />;
  }

  if (!route) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Rota não encontrada</h2>
          <button
            onClick={() => router.push("/routes")}
            className="px-4 py-2 bg-[#D35400] text-white rounded-lg hover:bg-[#b84700] transition-all active:scale-95"
            onMouseEnter={prefetchRoutes}
          >
            Voltar para rotas
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md animate-in fade-in zoom-in duration-300">
          <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
          <h2 className="text-2xl font-bold mb-2">Rota Finalizada!</h2>
          <p className="text-gray-600 mb-6">
            Parabéns! Você completou todas as {totalStops} paradas desta rota.
            {failedStops.length > 0 && (
              <span className="block text-amber-600 mt-2">
                ⚠️ {failedStops.length} parada(s) foram registradas como FALHA e
                reagendada(s)
              </span>
            )}
          </p>
          <button
            onClick={() => router.push("/routes")}
            className="px-6 py-2 bg-[#D35400] text-white rounded-lg hover:bg-[#b84700] transition-all active:scale-95"
            onMouseEnter={prefetchRoutes}
          >
            Voltar para rotas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full flex flex-col bg-slate-100 overflow-hidden">
      <DriverHeader
        completedStops={completedStops}
        totalStops={totalStops}
        currentStop={currentStop}
        currentStopIndex={currentStopIndex}
        isGPSActive={isGPSActive}
        isSimulating={isSimulating}
        onResumeGPS={resumeRealGPS}
        onStartSimulation={startSimulation}
        onBack={handleBack}
      />

      <div className="flex-1 z-0">
        <RouteMap
          stops={displayStops}
          currentStopIndex={currentStopIndex}
          myLocation={currentPosition}
          visitedStops={visitedStops}
          onStopClick={(stop, index) => {
            if (
              !visitedStops.includes(stop.id!) &&
              !failedStops.includes(stop.id!)
            ) {
              setCurrentStopIndex(index);
            }
          }}
        />
      </div>

      {/* Modal de Finalização */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl max-h-[90vh] overflow-y-auto">
            {!showNewRouteOption && !showRescheduleOption ? (
              <>
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-emerald-600">
                    Chegou ao Destino!
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {currentStop?.name || `Parada ${currentStopIndex + 1}`}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                    Observações
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                    placeholder="Adicione observações sobre a visita..."
                    rows={3}
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={confirmSuccess}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && visitStatus === "success" ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} /> Concluir
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowRescheduleOption(true)}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} /> Falha
                  </button>

                  <button
                    onClick={() => setShowNewRouteOption(true)}
                    className="w-full py-3 border-2 border-blue-600 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  >
                    📅 Agendar
                  </button>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </>
            ) : showRescheduleOption ? (
              // MODAL DE REAGENDAMENTO (FALHA)
              <>
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-red-600">
                    ❌ Falha na Visita
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>{currentStop?.name}</strong>
                  </p>
                  <div className="mt-2 p-2 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600">
                      ⚠️ A visita não pôde ser concluída. A parada será marcada
                      como <strong>FAILED</strong> e uma nova rota será criada.
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                    Nova Data para Visita *
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                    min={new Date().toISOString().split("T")[0]}
                  />
                  {!rescheduleDate && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ Selecione uma data para o reagendamento
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                    Motivo da Falha *
                  </label>
                  <textarea
                    value={rescheduleObservations}
                    onChange={(e) => setRescheduleObservations(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                    placeholder="Descreva o motivo da falha (ex: cliente ausente, endereço incorreto, etc.)..."
                    rows={3}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleReschedule}
                    disabled={
                      isRescheduling ||
                      !rescheduleDate ||
                      !rescheduleObservations.trim()
                    }
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {isRescheduling ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Registrando Falha...
                      </>
                    ) : (
                      <>
                        <XCircle size={18} />
                        Confirmar Falha e Reagendar
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setShowRescheduleOption(false);
                      setRescheduleDate("");
                      setRescheduleObservations("");
                    }}
                    className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    Voltar
                  </button>
                </div>
              </>
            ) : (
              // MODAL DE AGENDAMENTO (NOVA ROTA)
              <>
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-blue-600">
                    📅 Agendar Nova Rota
                  </h3>

                  <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-700">
                      📍 Destino atual: <strong>{currentStop?.name}</strong>
                      <br />
                      Endereço: {currentStop?.address}, {currentStop?.city}
                    </p>
                    
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                    Título  *
                  </label>
                  <input
                    type="text"
                    value={newRouteTitle}
                    onChange={(e) => setNewRouteTitle(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                    placeholder="Ex: VISITAR - Cliente XPTO"
                    autoFocus
                  />
                 
                </div>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={newRouteDate}
                    onChange={(e) => setNewRouteDate(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                    Observações
                  </label>
                  <textarea
                    value={newRouteObservations}
                    onChange={(e) => setNewRouteObservations(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                    placeholder="Adicionar Informações..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleCreateNewRoute}
                    disabled={
                      isCreatingNewRoute ||
                      !newRouteDate ||
                      !newRouteTitle.trim()
                    }
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {isCreatingNewRoute ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Criando...
                      </>
                    ) : (
                      <>
                        <CalendarPlus size={18} />
                        Agendar
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setShowNewRouteOption(false);
                      setNewRouteDate("");
                      setNewRouteObservations("");
                      setNewRouteTitle("");
                    }}
                    className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    Voltar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

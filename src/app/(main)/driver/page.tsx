/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/jsx-no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
"use client";

import { useRoutes } from "@/hooks/useRoutes";
import api, { CreateTaskDto } from "@/services/api";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarPlus,
  CheckCircle,
  LeafIcon,
  Loader2,
  MapPin,
  Play,
  RotateCcw,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocationWebSocket } from "@/hooks/useLocationWebSocket";

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

// 🎯 COMPONENTE: Modal de criação de tarefa
const TaskCreationModal = memo(
  ({
    isOpen,
    onClose,
    onSubmit,
    defaultAddress,
    isSubmitting,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
      title: string;
      description: string;
      dueDate: string;
    }) => Promise<void>;
    defaultAddress: any;
    isSubmitting: boolean;
  }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");

    useEffect(() => {
      if (isOpen) {
        setTitle("");
        setDescription("");
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDueDate(tomorrow.toISOString().split("T")[0]);
      }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        toast.warning("Digite um título para a tarefa");
        return;
      }
      if (!dueDate) {
        toast.warning("Selecione uma data para a tarefa");
        return;
      }
      await onSubmit({ title: title.trim(), description, dueDate });
    };

    return (
      <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-blue-600">
              ✨ Criar Nova Tarefa
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              O endereço será reaproveitado do destino atual
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                Título da Tarefa *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                placeholder="Ex: Segunda visita ao cliente"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                placeholder="Adicione detalhes sobre a nova tarefa..."
                rows={3}
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {defaultAddress && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-500 mb-1 uppercase">
                  📍 Endereço (reaproveitado)
                </p>
                <p className="text-sm text-slate-700">
                  {defaultAddress.address}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {defaultAddress.city}/{defaultAddress.state} - CEP:{" "}
                  {defaultAddress.zipCode}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !dueDate}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Criando...
                  </>
                ) : (
                  <>
                    <CalendarPlus size={18} />
                    Criar Tarefa
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  },
);

TaskCreationModal.displayName = "TaskCreationModal";

// 🎯 COMPONENTE: Modal de reagendamento de tarefa (para falha)
const TaskRescheduleModal = memo(
  ({
    isOpen,
    onClose,
    onSubmit,
    taskTitle,
    isSubmitting,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
      dueDate: string;
      observations: string;
    }) => Promise<void>;
    taskTitle: string;
    isSubmitting: boolean;
  }) => {
    const [dueDate, setDueDate] = useState("");
    const [observations, setObservations] = useState("");

    useEffect(() => {
      if (isOpen) {
        setDueDate("");
        setObservations("");
      }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!dueDate) {
        toast.warning("Selecione uma nova data para a tarefa");
        return;
      }
      if (!observations.trim()) {
        toast.warning("Descreva o motivo da falha");
        return;
      }
      await onSubmit({ dueDate, observations });
    };

    return (
      <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-red-600">
              ❌ Falha na Visita
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Tarefa: <strong>{taskTitle}</strong>
            </p>
            <p className="text-xs text-amber-600 mt-2">
              A tarefa será mantida com os mesmos dados, apenas a data será
              atualizada.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                Nova Data para a Tarefa *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                Motivo da Falha *
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                placeholder="Descreva o motivo da falha (ex: cliente ausente, endereço incorreto, etc.)..."
                rows={3}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !dueDate || !observations.trim()}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Reagendando...
                  </>
                ) : (
                  <>
                    <RotateCcw size={18} />
                    Reagendar Tarefa
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  },
);

TaskRescheduleModal.displayName = "TaskRescheduleModal";

export default function DriverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = searchParams.get("routeId");

  const {
    useGetRouteById,
    useMarkStopVisited,
    useUpdateRoute,
    useCreateTask,
    useUpdateTask,
    useGetTasksByRoute,
    useFinalizeTask,
  } = useRoutes();

  const {
    data: route,
    isLoading: isLoadingRoute,
    refetch,
  } = useGetRouteById(routeId || "");

  const markStopVisited = useMarkStopVisited();
  const updateRoute = useUpdateRoute();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const finalizeTask = useFinalizeTask();

  const { data: routeTasks, refetch: refetchTasks } = useGetTasksByRoute(
    routeId || "",
  );

  // Estados
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<
    [number, number] | null
  >(null);
  const [visitedStops, setVisitedStops] = useState<string[]>([]);
  const [failedStops, setFailedStops] = useState<string[]>([]);
  const [isGPSActive, setIsGPSActive] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isReschedulingTask, setIsReschedulingTask] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<
    "main" | "confirm" | "create" | "reschedule" | null
  >(null);
  const [optimizedStops, setOptimizedStops] = useState<any[]>([]);
  const [isReordering, setIsReordering] = useState(false);

  const {
    sendLocation,
    emitRouteFinished,
    isConnected: wsConnected,
  } = useLocationWebSocket({
    routeId: routeId || "",
    driverId: route?.userAssigned?.id || `driver_${routeId}`,
    onLocationUpdate: (location) => {
      console.log("📍 [WS] Localização enviada com sucesso");
    },
    onDriverOffline: () => {
      console.warn("⚠️ [WS] Conexão WebSocket perdida");
    },
    onRouteFinished: (data) => {
      console.log("🎉 [WS] Rota finalizada confirmada!", data);
    },
  });

  // Refs
  const lastReorderedRef = useRef<string>("");
  const watchIdRef = useRef<number | null>(null);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const previousStopIdRef = useRef<string>("");

  // 🔥 Declarar displayStops e currentStop
  const displayStops = useMemo(
    () => (optimizedStops.length ? optimizedStops : route?.stops || []),
    [optimizedStops, route?.stops],
  );

  const currentStop = displayStops[currentStopIndex];
  const totalStops = displayStops.length;
  const completedStops = visitedStops.length + failedStops.length;
  const isFinished =
    route?.status === "FINISHED" ||
    (completedStops === totalStops && totalStops > 0);

  // 🔥 NOVO: Enviar localização sempre que currentPosition mudar
  const lastSentLocationRef = useRef<string>("");
  const lastSendTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!currentPosition || !wsConnected) return;

    // Limitar frequência de envio (máximo a cada 1 segundo)
    const now = Date.now();
    if (now - lastSendTimeRef.current < 1000) return;

    // Verificar se a posição mudou significativamente (mais de 5 metros)
    const locationKey = `${currentPosition[0].toFixed(6)},${currentPosition[1].toFixed(6)}`;
    if (lastSentLocationRef.current === locationKey) return;

    // Enviar via WebSocket (indicando se está em simulação ou GPS real)
    sendLocation(currentPosition[0], currentPosition[1], isSimulating);

    lastSentLocationRef.current = locationKey;
    lastSendTimeRef.current = now;

    console.log(
      `📡 [WS] Enviando posição: ${locationKey} (${isSimulating ? "simulação" : "GPS real"})`,
    );
  }, [currentPosition, wsConnected, sendLocation, isSimulating]);

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

  // 🔥 CORRIGIDO: Buscar task associada à parada atual - sem dependência problemática
  useEffect(() => {
    if (routeTasks && currentStop && currentStop.name) {
      const task = routeTasks.find((t: any) => t.title === currentStop.name);
      const newTaskId = task?.id || null;
      if (newTaskId !== currentTaskId) {
        setCurrentTaskId(newTaskId);
      }
    }
  }, [routeTasks, currentStop]); // currentTaskId removido das dependências

  // Função para fechar todos os modais
  const closeAllModals = useCallback(() => {
    setActiveModal(null);
    setComment("");
  }, []);

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

  // Calcular distância
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

  // Reordenar paradas por proximidade
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
      let currentPos = { lat: currentLatLng[0], lng: currentLatLng[1] };

      while (remaining.length > 0) {
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
        currentPos = { lat: nearest.latitude, lng: nearest.longitude };
        remaining.splice(nearestIndex, 1);
      }

      return [...ordered, ...alreadyVisited];
    },
    [calculateDistance],
  );

  // 🔥 CORRIGIDO: Efeito de reordenação - otimizado para evitar loops
  useEffect(() => {
    if (!route || !route.stops) {
      if (optimizedStops.length !== 0) setOptimizedStops([]);
      return;
    }

    if (route.orderBy === "PRIORITY") {
      const currentIds = JSON.stringify(optimizedStops.map((s) => s.id));
      const routeIds = JSON.stringify(route.stops.map((s: any) => s.id));
      if (currentIds !== routeIds) {
        setOptimizedStops(route.stops);
        setCurrentStopIndex(0);
      }
      return;
    }

    if (route.orderBy === "DISTANCE" && currentPosition && !isReordering) {
      const reorderKey = `${currentPosition[0].toFixed(4)},${currentPosition[1].toFixed(4)}|${visitedStops.join(",")}`;

      if (lastReorderedRef.current !== reorderKey) {
        setIsReordering(true);
        const reordered = reorderStopsByProximity(
          route.stops,
          currentPosition,
          visitedStops,
        );

        const currentIds = optimizedStops.map((s) => s.id).join(",");
        const newIds = reordered.map((s) => s.id).join(",");

        if (currentIds !== newIds) {
          setOptimizedStops(reordered);
          setCurrentStopIndex(0);
        }

        lastReorderedRef.current = reorderKey;
        setIsReordering(false);
      }
    } else if (optimizedStops.length === 0 && route.stops) {
      setOptimizedStops(route.stops);
    }
  }, [route, currentPosition, visitedStops, reorderStopsByProximity]);

  // 🔥 CORRIGIDO: Verificar chegada ao destino
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
      activeModal === null
    ) {
      previousStopIdRef.current = currentStop.id;
      toast.success(
        `✅ Você chegou em: ${currentStop.name || `Parada ${currentStopIndex + 1}`}`,
        { duration: 3000 },
      );
      setActiveModal("main");
      setComment("");
    }
  }, [
    currentPosition,
    currentStop,
    visitedStops,
    failedStops,
    currentStopIndex,
    calculateDistance,
  ]);

  // Concluir tarefa (apenas concluir) - COM ATUALIZAÇÃO DA ROTA
  const completeTaskOnly = useCallback(async () => {
    if (!currentStop) return;

    setIsSubmitting(true);
    try {
      const successNote = comment
        ? `✅ VISITA CONCLUÍDA COM SUCESSO (COMPLETED): ${comment}`
        : `✅ VISITA CONCLUÍDA COM SUCESSO (COMPLETED)`;

      await markStopVisited.mutateAsync({
        routeId: routeId!,
        stopId: currentStop.id!,
        notes: successNote,
      });

      const newVisitedStops = [...visitedStops, currentStop.id!];
      setVisitedStops(newVisitedStops);
      previousStopIdRef.current = "";

      const nextIndex = currentStopIndex + 1;

      if (nextIndex >= totalStops && wsConnected) {
        emitRouteFinished(); // 🔥 Usar a função, não o socket diretamente

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
        setTimeout(() => router.push("/routes"), 1500);
      } else {
        setCurrentStopIndex(nextIndex);

        window.dispatchEvent(new Event("route-updated"));

        // 🔥 Dispara evento para o mapa recalcular a rota para o próximo destino
        window.dispatchEvent(new Event("route-updated"));

        toast.success(
          `✅ Visita concluída (COMPLETED)! Próximo destino: ${displayStops[nextIndex]?.name || `Parada ${nextIndex + 1}`}`,
          { duration: 3000 },
        );
      }

      closeAllModals();
      await refetch();
      await refetchTasks();
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
    refetchTasks,
    displayStops,
    closeAllModals,
  ]);

  // Criar nova tarefa
  const handleCreateNewTask = useCallback(
    async (taskData: {
      title: string;
      description: string;
      dueDate: string;
    }) => {
      if (!currentStop) return;

      setIsCreatingTask(true);
      const loadingToast = toast.loading("Criando nova tarefa...", {
        duration: Infinity,
      });

      try {
        let defaultColumnId = (route as any)?.columnId;

        if (!defaultColumnId) {
          const columnsResponse = await api.get("/kanban-columns");
          const columns = Array.isArray(columnsResponse.data)
            ? columnsResponse.data
            : columnsResponse.data.columns || [];

          const pendingColumn = columns.find(
            (col: any) =>
              col.title.toLowerCase().includes("pendente") ||
              col.title.toLowerCase().includes("pending"),
          );

          defaultColumnId = pendingColumn?.id || columns[0]?.id;

          if (!defaultColumnId) {
            throw new Error("Nenhuma coluna Kanban encontrada");
          }
        }

        const taskAddress = {
          cep: currentStop.zipCode || "",
          endereco: currentStop.address || "",
          numero: "",
          bairro: currentStop.neighborhood || "",
          cidade: currentStop.city || "",
          estado: currentStop.state || "",
          complemento: currentStop.complement || "",
          latitude: currentStop.latitude,
          longitude: currentStop.longitude,
        };

        const createTaskPayload: CreateTaskDto = {
          title: taskData.title,
          description: taskData.description,
          dueDate: taskData.dueDate,
          address: JSON.stringify(taskAddress), // 🔥 CORREÇÃO AQUI
          companyId: (route as any)?.companyId,
          columnId: defaultColumnId,
          priority: 1,
        };

        await createTask.mutateAsync(createTaskPayload);

        const successNote = comment
          ? `✅ VISITA CONCLUÍDA (COMPLETED). Nova tarefa criada: "${taskData.title}"\nObservações: ${comment}`
          : `✅ VISITA CONCLUÍDA (COMPLETED). Nova tarefa criada: "${taskData.title}"`;

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
          toast.success("🎉 Rota finalizada com sucesso!", { duration: 3000 });
          setTimeout(() => router.push("/routes"), 1500);
        } else {
          setCurrentStopIndex(nextIndex);
          toast.success(
            `✅ Tarefa "${taskData.title}" criada! Próximo destino: ${displayStops[nextIndex]?.name || `Parada ${nextIndex + 1}`}`,
            { duration: 4000 },
          );
        }

        toast.dismiss(loadingToast);
        toast.success("✅ Nova tarefa criada com sucesso!", {
          duration: 4000,
          description: `Título: ${taskData.title} | Data: ${new Date(taskData.dueDate).toLocaleDateString("pt-BR")}`,
        });

        closeAllModals();
        await refetch();
        await refetchTasks();

        if (route?.orderBy === "DISTANCE" && currentPosition) {
          const reordered = reorderStopsByProximity(
            route.stops,
            currentPosition,
            [...visitedStops, currentStop.id!],
          );
          setOptimizedStops(reordered);
        }
      } catch (error) {
        console.error("Erro ao criar nova tarefa:", error);
        toast.dismiss(loadingToast);
        toast.error("❌ Erro ao criar nova tarefa", {
          description: "Tente novamente ou contate o suporte.",
        });
      } finally {
        setIsCreatingTask(false);
      }
    },
    [
      currentStop,
      route,
      comment,
      visitedStops,
      currentStopIndex,
      totalStops,
      displayStops,
      currentPosition,
      markStopVisited,
      updateRoute,
      routeId,
      createTask,
      refetch,
      refetchTasks,
      reorderStopsByProximity,
      router,
      closeAllModals,
    ],
  );

  // Reagendar tarefa em caso de falha
  const handleRescheduleTask = useCallback(
    async (data: { dueDate: string; observations: string }) => {
      if (!currentTaskId) {
        toast.error("Tarefa não encontrada para reagendamento");
        return;
      }

      setIsReschedulingTask(true);
      const loadingToast = toast.loading("Reagendando tarefa...", {
        duration: Infinity,
      });

      try {
        await finalizeTask.mutateAsync({
          taskId: currentTaskId,
          data: {
            status: "RESCHEDULED",
            finalComment: `🔄 TAREFA REAGENDADA (RESCHEDULED)\nMotivo da falha: ${data.observations}\nNova data agendada: ${new Date(data.dueDate).toLocaleDateString("pt-BR")}\n${comment ? `Comentário original: ${comment}` : ""}`,
            dueDate: data.dueDate,
          },
        });

        const failureNote = `❌ VISITA REAGENDADA\nMotivo: ${data.observations}\nNova data: ${new Date(data.dueDate).toLocaleDateString("pt-BR")}`;

        await markStopVisited.mutateAsync({
          routeId: routeId!,
          stopId: currentStop.id!,
          notes: failureNote,
        });

        const newFailedStops = [...failedStops, currentStop.id!];
        setFailedStops(newFailedStops);
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
          toast.success("🎉 Rota finalizada com sucesso!", { duration: 3000 });
          setTimeout(() => router.push("/routes"), 1500);
        } else {
          setCurrentStopIndex(nextIndex);
          toast.warning(
            `⚠️ Falha registrada (FAILED)! Tarefa reagendada. Próximo destino: ${displayStops[nextIndex]?.name || `Parada ${nextIndex + 1}`}`,
            { duration: 4000 },
          );
        }

        toast.dismiss(loadingToast);
        toast.warning(
          "⚠️ Falha registrada! Tarefa marcada como FAILED e reagendada.",
          {
            duration: 4000,
          },
        );

        closeAllModals();
        await refetch();
        await refetchTasks();
      } catch (error) {
        console.error("Erro ao reagendar tarefa:", error);
        toast.dismiss(loadingToast);
        toast.error("❌ Erro ao reagendar tarefa", {
          description: "Tente novamente ou contate o suporte.",
        });
      } finally {
        setIsReschedulingTask(false);
      }
    },
    [
      currentTaskId,
      currentStop,
      comment,
      routeId,
      failedStops,
      currentStopIndex,
      totalStops,
      displayStops,
      markStopVisited,
      updateRoute,
      finalizeTask,
      refetch,
      refetchTasks,
      router,
      closeAllModals,
    ],
  );

  // 🔥 FUNÇÃO DE SIMULAÇÃO CORRIGIDA - MAIS DEVAGAR
  const startSimulation = useCallback(() => {
    // Encontrar o PRÓXIMO destino NÃO VISITADO
    let nextPendingIndex = -1;

    for (let i = currentStopIndex; i < displayStops.length; i++) {
      const stop = displayStops[i];
      const isVisited = visitedStops.includes(stop.id);
      const isFailed = failedStops.includes(stop.id);

      if (!isVisited && !isFailed) {
        nextPendingIndex = i;
        break;
      }
    }

    if (nextPendingIndex === -1) {
      if (completedStops === totalStops) {
        toast.success(
          "🎉 Todas as paradas já foram concluídas! Rota finalizada.",
          { duration: 3000 },
        );
      } else {
        toast.warning("⚠️ Não há próximos destinos pendentes.", {
          duration: 3000,
        });
      }
      return;
    }

    if (nextPendingIndex !== currentStopIndex) {
      setCurrentStopIndex(nextPendingIndex);
      setTimeout(() => startSimulation(), 100);
      return;
    }

    const targetStop = displayStops[nextPendingIndex];

    if (!targetStop) {
      toast.warning("Destino não encontrado");
      return;
    }

    if (!currentPosition) {
      toast.warning("Aguardando sinal de GPS");
      return;
    }

    console.log("🎮 Iniciando simulação para:", targetStop.name);
    console.log(
      "   Distância até o destino:",
      calculateDistance(
        currentPosition[0],
        currentPosition[1],
        targetStop.latitude,
        targetStop.longitude,
      ).toFixed(2),
      "km",
    );

    setIsGPSActive(false);
    setIsSimulating(true);

    // Disparar evento de início da simulação
    window.dispatchEvent(new Event("simulation-start"));

    // 🔥 CONFIGURAÇÕES MAIS DEVAGAR
    const totalDistance = calculateDistance(
      currentPosition[0],
      currentPosition[1],
      targetStop.latitude,
      targetStop.longitude,
    );

    // 🔥 VELOCIDADE MUITO MAIS DEVAGAR (1-2 km/h para simulação)
    // Queremos que a simulação demore entre 30 segundos a 2 minutos dependendo da distância
    const DESIRED_SPEED_KMH = 2; // 2 km/h (bem devagar)
    const estimatedDurationSeconds = (totalDistance / DESIRED_SPEED_KMH) * 3600;

    // Número de passos baseado no tempo desejado (atualização a cada 500ms)
    const UPDATE_INTERVAL_MS = 500; // 500ms entre cada atualização
    const steps = Math.max(
      30,
      Math.min(
        200,
        Math.floor(estimatedDurationSeconds / (UPDATE_INTERVAL_MS / 1000)),
      ),
    );
    const speed = UPDATE_INTERVAL_MS;

    console.log(`   Distância: ${totalDistance.toFixed(2)} km`);
    console.log(`   Velocidade simulada: ${DESIRED_SPEED_KMH} km/h`);
    console.log(
      `   Duração estimada: ${Math.round(estimatedDurationSeconds)} segundos`,
    );
    console.log(
      `   Passos: ${steps} (atualizações a cada ${UPDATE_INTERVAL_MS}ms)`,
    );

    let step = 0;
    const startLat = currentPosition[0];
    const startLng = currentPosition[1];
    const endLat = targetStop.latitude;
    const endLng = targetStop.longitude;

    // Limpar intervalo anterior
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }

    // 🔥 USAR INTERVALO MAIS LONGO (500ms) PARA SIMULAÇÃO MAIS DEVAGAR
    simulationInterval.current = setInterval(() => {
      step++;
      const progress = Math.min(1, step / steps);

      // Usar easing linear para movimento suave
      const newLat = startLat + (endLat - startLat) * progress;
      const newLng = startLng + (endLng - startLng) * progress;

      setCurrentPosition([newLat, newLng]);

      // Log a cada 10 passos para não poluir o console
      if (step % 10 === 0 || step === steps) {
        console.log(`   Simulação: ${Math.round(progress * 100)}% concluída`);
      }

      if (step >= steps) {
        if (simulationInterval.current) {
          clearInterval(simulationInterval.current);
          simulationInterval.current = null;
        }

        // Posicionar exatamente no destino
        setCurrentPosition([endLat, endLng]);
        setIsSimulating(false);

        // Disparar evento de fim da simulação
        window.dispatchEvent(new Event("simulation-end"));

        toast.success(
          `✅ Simulação concluída! Você chegou em: ${targetStop.name}`,
          { duration: 4000 },
        );

        // Pequeno delay para garantir que a posição final foi atualizada
        setTimeout(() => {
          // Forçar verificação de chegada
          const distance = calculateDistance(
            endLat,
            endLng,
            targetStop.latitude,
            targetStop.longitude,
          );
          if (distance < 50) {
            toast.info(
              `📍 Você chegou em ${targetStop.name}! Abrindo modal de conclusão...`,
              { duration: 3000 },
            );
          }
        }, 500);
      }
    }, speed);
  }, [
    displayStops,
    currentStopIndex,
    currentPosition,
    visitedStops,
    failedStops,
    completedStops,
    totalStops,
    calculateDistance,
  ]);

  const resumeRealGPS = useCallback(() => {
    setIsGPSActive(true);
    setIsSimulating(false);
    if (simulationInterval.current) clearInterval(simulationInterval.current);

    // 🔥 Dispara evento para o mapa saber que a simulação terminou
    window.dispatchEvent(new Event("simulation-end"));

    toast.info("GPS em tempo real ativado", { duration: 2000 });
  }, []);

  // Finalizar rota automaticamente
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

  const prefetchRoutes = useCallback(
    () => router.prefetch("/routes"),
    [router],
  );
  const handleBack = useCallback(() => router.back(), [router]);

  // Preparar endereço padrão
  const defaultTaskAddress = currentStop
    ? {
        address: currentStop.address,
        city: currentStop.city,
        state: currentStop.state,
        zipCode: currentStop.zipCode,
        neighborhood: currentStop.neighborhood,
        complement: currentStop.complement,
        latitude: currentStop.latitude,
        longitude: currentStop.longitude,
      }
    : null;

  if (isLoadingRoute) return <DriverSkeleton />;

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
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D35400] to-[#e67e22]" />
          <div className="p-8 md:p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle
                className="text-green-500"
                size={48}
                strokeWidth={1.5}
              />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#2C3E50] mb-3">
              Rota Finalizada!
            </h2>
            <p className="text-[#95A5A6] text-sm md:text-base mb-6">
              Todas as paradas foram concluídas com sucesso.
            </p>
            <button
              onClick={() => router.push("/routes")}
              onMouseEnter={prefetchRoutes}
              className="group relative w-full px-6 py-3 bg-[#D35400] text-white rounded-xl font-semibold hover:bg-[#e06714] transition-all duration-300 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>Voltar para rotas</span>
              <motion.span
                initial={{ x: 0 }}
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                className="inline-block"
              >
                →
              </motion.span>
            </button>
          </div>
        </motion.div>
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

      {/* MODAL PRINCIPAL - Concluir ou Falha */}
      {activeModal === "main" && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="text-emerald-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                Você chegou ao destino!
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {currentStop?.name || `Parada ${currentStopIndex + 1}`}
              </p>
              <p className="text-xs text-slate-400 mt-2 truncate">
                📍 {currentStop?.address}
              </p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                Observações (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D35400] outline-none transition-all"
                placeholder="Adicione observações sobre a visita..."
                rows={2}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveModal("confirm")}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} /> Concluir
              </button>

              <button
                onClick={() => setActiveModal("reschedule")}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <XCircle size={18} /> Falha
              </button>

              <button
                onClick={closeAllModals}
                className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: "Deseja criar nova tarefa?" */}
      {activeModal === "confirm" && (
        <div className="fixed inset-0 z-[1010] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarPlus className="text-blue-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Criar nova tarefa?
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Deseja criar uma nova tarefa com o mesmo endereço de{" "}
              <strong>
                {currentStop?.name || `Parada ${currentStopIndex + 1}`}
              </strong>
              ?
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveModal("create")}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CalendarPlus size={18} /> Sim, criar tarefa
              </button>
              <button
                onClick={() => {
                  setActiveModal(null);
                  completeTaskOnly();
                }}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} /> Não, apenas concluir
              </button>
              <button
                onClick={() => setActiveModal("main")}
                className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE TAREFA */}
      <TaskCreationModal
        isOpen={activeModal === "create"}
        onClose={() => setActiveModal("confirm")}
        onSubmit={handleCreateNewTask}
        defaultAddress={defaultTaskAddress}
        isSubmitting={isCreatingTask}
      />

      {/* MODAL DE REAGENDAMENTO (FALHA) */}
      <TaskRescheduleModal
        isOpen={activeModal === "reschedule"}
        onClose={() => setActiveModal("main")}
        onSubmit={handleRescheduleTask}
        taskTitle={currentStop?.name || `Parada ${currentStopIndex + 1}`}
        isSubmitting={isReschedulingTask}
      />
    </div>
  );
}

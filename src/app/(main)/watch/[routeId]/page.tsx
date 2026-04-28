/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRoutes } from "@/hooks/useRoutes";
import { useLocationWebSocket } from "@/hooks/useLocationWebSocket";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  MapPin,
  Signal,
  WifiOff,
  LayoutGrid,
  PartyPopper,
  Trophy,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ObserverMap from "@/components/ObserverMap";
import api from "@/services/api";

// Skelecton de carregamento
const WatchSkeleton = () => (
  <div className="h-screen w-full bg-slate-100">
    <div className="absolute top-4 left-4 right-4 z-[500]">
      <div className="bg-white/95 rounded-2xl p-4 shadow-lg">
        <div className="h-6 w-24 bg-slate-200 rounded-full animate-pulse mb-3" />
        <div className="h-7 w-48 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-5 w-64 bg-slate-200 rounded animate-pulse" />
      </div>
    </div>
    <div className="h-full w-full bg-slate-200 animate-pulse" />
  </div>
);

// Componente de status de conexão
const ConnectionStatus = ({
  isConnected,
  lastUpdate,
}: {
  isConnected: boolean;
  lastUpdate: Date | null;
}) => {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    if (!lastUpdate) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
      if (seconds < 60) {
        setTimeAgo(`${seconds}s atrás`);
      } else {
        setTimeAgo(`${Math.floor(seconds / 60)}min atrás`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
        isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {isConnected ? (
        <>
          <Signal size={12} className="animate-pulse" />
          <span>Live</span>
          {lastUpdate && <span className="text-green-600">· {timeAgo}</span>}
        </>
      ) : (
        <>
          <WifiOff size={12} />
          <span>Motorista offline</span>
        </>
      )}
    </div>
  );
};

// 🔥 COMPONENTE DE MODAL DE FINALIZAÇÃO
const RouteCompleteModal = ({
  isOpen,
  onClose,
  onGoToKanban,
  routeTitle,
  totalStops,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGoToKanban: () => void;
  routeTitle: string;
  totalStops: number;
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4"
            >
              <PartyPopper className="text-green-500" size={40} />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-green-600 mb-2"
            >
              Rota Finalizada! 🎉
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-600 text-sm mb-4"
            >
              O motorista concluiu todas as {totalStops}{" "}
              {totalStops === 1 ? "parada" : "paradas"} da rota
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-50 rounded-xl p-3 mb-6"
            >
              <p className="text-xs text-slate-500 mb-1">Rota concluída</p>
              <p className="font-medium text-slate-800">{routeTitle}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-xs text-green-600">
                  Todas as tarefas foram realizadas
                </span>
              </div>
            </motion.div>

            <div className="flex flex-col gap-2">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={onGoToKanban}
                className="w-full py-3 bg-gradient-to-r from-[#D35400] to-[#e67e22] text-white rounded-xl font-bold hover:from-[#b84700] hover:to-[#d35400] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
              >
                <LayoutGrid size={18} />
                Ver Kanban de Tarefas
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={onClose}
                className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all"
              >
                Fechar
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// 🔥 COMPONENTE DE NOTIFICAÇÃO FLUTUANTE
const FloatingNotification = ({
  message,
  subMessage,
  isVisible,
  onClose,
}: {
  message: string;
  subMessage?: string;
  isVisible: boolean;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed top-20 right-4 z-[600] bg-white rounded-xl shadow-2xl p-4 max-w-sm border-l-4 border-green-500"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Trophy className="text-green-500" size={24} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-800 text-sm">{message}</h4>
          {subMessage && (
            <p className="text-xs text-slate-500 mt-1">{subMessage}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
};

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.routeId as string;

  const { useGetRouteById } = useRoutes();
  const {
    data: route,
    isLoading: isLoadingRoute,
    error,
    refetch,
  } = useGetRouteById(routeId || "");

  // 🔥 ORDENAR AS PARADAS
  const orderedStops = useMemo(() => {
    if (!route?.stops) return [];

    const stopsWithOrder = route.stops.filter(
      (stop: any) => stop.order !== undefined && stop.order !== null,
    );
    const stopsWithoutOrder = route.stops.filter(
      (stop: any) => stop.order === undefined || stop.order === null,
    );

    const sortedWithOrder = [...stopsWithOrder].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    return [...sortedWithOrder, ...stopsWithoutOrder];
  }, [route?.stops]);

  // 🔥 ESTADOS
  const [optimizedRoutePath, setOptimizedRoutePath] = useState<
    [number, number][]
  >([]);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(
    null,
  );
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasReceivedFirstLocation, setHasReceivedFirstLocation] =
    useState(false);
  const [isLoadingRoutePath, setIsLoadingRoutePath] = useState(false);

  // 🔥 ESTADOS PARA FEEDBACK DE FINALIZAÇÃO
  const [isRouteFinished, setIsRouteFinished] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showFloatingNotification, setShowFloatingNotification] =
    useState(false);

  // 🔥 ESTADOS PARA CONTROLE DE ROTA
  const [isRouteLoaded, setIsRouteLoaded] = useState(false);

  // 🔥 GUARDAR A ÚLTIMA ROTA RECEBIDA
  const lastOptimizedRouteRef = useRef<[number, number][]>([]);
  const lastVisitedCountRef = useRef(0);

  const totalStops = orderedStops.length;
  const visitedStops =
    orderedStops
      .filter((stop: any) => stop.visited === true)
      .map((s: any) => s.id) || [];

  // 🔥 VERIFICAR SE A ROTA FOI FINALIZADA
  const isRouteActuallyFinished = useMemo(() => {
    return (
      route?.status === "FINISHED" ||
      (visitedStops.length === totalStops && totalStops > 0)
    );
  }, [route?.status, visitedStops, totalStops]);

  // 🔥 CALLBACKS MEMOIZADOS PARA EVITAR RECONEXÕES
  const handleLocationUpdate = useCallback((location: any) => {
    console.log(
      `📍 [Watch] Motorista em: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
    );
    setDriverLocation([location.latitude, location.longitude]);
    setIsDriverOnline(true);
    setLastUpdate(new Date());
    setIsSimulating(location.isSimulating || false);
    setHasReceivedFirstLocation(true);
  }, []);

  const handleDriverOffline = useCallback(() => {
    console.warn("⚠️ [Watch] Motorista offline");
    setIsDriverOnline(false);
  }, []);

  const handleRouteFinished = useCallback(
    (data: any) => {
      console.log("🎉 [Watch] ROTA FINALIZADA! Mostrando feedback...", data);
      refetch();
      setIsRouteFinished(true);
      setShowFloatingNotification(true);
      setTimeout(() => {
        setShowCompletionModal(true);
      }, 1000);
    },
    [refetch],
  );

  // 🔥 WEBSOCKET - Usando callbacks memoizados
  const { isConnected: wsConnected } = useLocationWebSocket({
    routeId: routeId || "",
    driverId: route?.userAssigned?.id,
    onLocationUpdate: handleLocationUpdate,
    onDriverOffline: handleDriverOffline,
    onRouteFinished: handleRouteFinished,
  });

  // 🔥 FUNÇÃO PARA BUSCAR ROTA UMA ÚNICA VEZ
  const fetchOptimizedRouteOnce = useCallback(
    async (force = false) => {
      if (!force && isRouteLoaded && lastOptimizedRouteRef.current.length > 0) {
        console.log("✅ [Watch] Rota já carregada, pulando recálculo");
        return;
      }

      if (!route?.stops || orderedStops.length === 0) {
        console.log("⚠️ [Watch] Sem paradas para calcular rota");
        return;
      }

      const taskIds = orderedStops
        .map((stop: any) => stop.taskId)
        .filter((id: string) => id);

      if (taskIds.length === 0) {
        console.log("⚠️ [Watch] Nenhum taskId encontrado, usando fallback");
        const fallbackPoints = orderedStops.map(
          (stop: any) => [stop.latitude, stop.longitude] as [number, number],
        );
        setOptimizedRoutePath(fallbackPoints);
        lastOptimizedRouteRef.current = fallbackPoints;
        setIsRouteLoaded(true);
        return;
      }

      setIsLoadingRoutePath(true);

      try {
        let startLat: number;
        let startLng: number;

        if (driverLocation && driverLocation[0] && driverLocation[1]) {
          startLat = driverLocation[0];
          startLng = driverLocation[1];
          console.log("📍 [Watch] Usando localização REAL do motorista");
        } else {
          startLat = orderedStops[0]?.latitude;
          startLng = orderedStops[0]?.longitude;
          console.log("⚠️ [Watch] Sem localização, usando primeira parada");
        }

        console.log("🔄 [Watch] Buscando rota otimizada (APENAS UMA VEZ)...");

        const response = await api.post("/routes/calculate-best-path", {
          taskIds: taskIds,
          driverLatitude: startLat,
          driverLongitude: startLng,
          orderBy: route.orderBy || "DISTANCE",
        });

        const optimizedTasks = response.data.route || [];
        const points: [number, number][] = [];

        if (driverLocation && driverLocation[0] && driverLocation[1]) {
          points.push(driverLocation);
        }

        optimizedTasks.forEach((task: any) => {
          const lat = task.taskAddress?.latitude || task.latitude;
          const lng = task.taskAddress?.longitude || task.longitude;
          if (lat && lng) {
            points.push([lat, lng]);
          }
        });

        console.log(`📍 [Watch] Rota otimizada com ${points.length} pontos`);

        console.log("📋 ORDEM DA ROTA CALCULADA:");
        optimizedTasks.forEach((task: any, idx: number) => {
          console.log(`   ${idx + 1}. ${task.title}`);
        });

        setOptimizedRoutePath(points);
        lastOptimizedRouteRef.current = points;
        setIsRouteLoaded(true);
      } catch (error) {
        console.error("❌ [Watch] Erro ao buscar rota:", error);
        const fallbackPoints = [
          ...(driverLocation ? [driverLocation] : []),
          ...orderedStops.map(
            (stop: any) => [stop.latitude, stop.longitude] as [number, number],
          ),
        ];
        setOptimizedRoutePath(fallbackPoints);
        lastOptimizedRouteRef.current = fallbackPoints;
        setIsRouteLoaded(true);
      } finally {
        setIsLoadingRoutePath(false);
      }
    },
    [route, orderedStops, driverLocation, isRouteLoaded],
  );

  // 🔥 EFECTS (TODOS ANTES DOS EARLY RETURNS)
  useEffect(() => {
    if (driverLocation && orderedStops.length > 0 && !isRouteLoaded) {
      console.log("🚀 [Watch] Primeira carga da rota...");
      fetchOptimizedRouteOnce(true);
    }
  }, [driverLocation, orderedStops, isRouteLoaded, fetchOptimizedRouteOnce]);

  useEffect(() => {
    const currentVisitedCount = visitedStops.length;
    if (
      currentVisitedCount !== lastVisitedCountRef.current &&
      currentVisitedCount > 0
    ) {
      console.log(
        `📊 [Watch] Progresso: ${currentVisitedCount}/${totalStops} paradas concluídas`,
      );
      lastVisitedCountRef.current = currentVisitedCount;
      refetch();
    }
  }, [visitedStops, totalStops, refetch]);

  useEffect(() => {
    if (isRouteActuallyFinished && !isRouteFinished && totalStops > 0) {
      console.log("🎉 [WatchPage] ROTA FINALIZADA! Mostrando feedback...");
      setIsRouteFinished(true);
      setShowFloatingNotification(true);
      setTimeout(() => {
        setShowCompletionModal(true);
      }, 1000);
    }
  }, [isRouteActuallyFinished, isRouteFinished, totalStops]);

  useEffect(() => {
    if (orderedStops.length > 0) {
      console.log("📋 PARADAS RECEBIDAS DO BACKEND (ordem original):");
      orderedStops.forEach((stop: any, idx: number) => {
        console.log(
          `   ${idx + 1}. ${stop.name} - order: ${stop.order}, visited: ${stop.visited}`,
        );
      });
    }
  }, [orderedStops]);

  // 🔥 HANDLERS
  const handleBack = useCallback(() => router.back(), [router]);
  const handleGoToKanban = useCallback(() => {
    setShowCompletionModal(false);
    router.push("/kanban");
  }, [router]);
  const handleCloseModal = useCallback(() => {
    setShowCompletionModal(false);
  }, []);
  const handleCloseNotification = useCallback(() => {
    setShowFloatingNotification(false);
  }, []);
  const prefetchRoutes = useCallback(
    () => router.prefetch("/routes"),
    [router],
  );

  // 🔥 EARLY RETURNS
  if (isLoadingRoute) return <WatchSkeleton />;

  if (error || !route) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Rota não encontrada</h2>
          <p className="text-slate-500 mb-4">ID: {routeId}</p>
          <button
            onClick={() => router.push("/routes")}
            className="px-4 py-2 bg-[#D35400] text-white rounded-lg hover:bg-[#b84700] transition-all"
            onMouseEnter={prefetchRoutes}
          >
            Voltar para rotas
          </button>
        </div>
      </div>
    );
  }

  const progressPercent =
    totalStops > 0 ? (visitedStops.length / totalStops) * 100 : 0;
  const isComplete = progressPercent >= 100;

  // 🔥 RENDER
  return (
    <div className="relative h-screen w-full flex flex-col bg-slate-100 overflow-hidden">
      {/* Header do observador */}
      <div className="absolute top-4 left-4 right-4 z-[500] pointer-events-none">
        <div className="bg-white/95 backdrop-blur shadow-lg rounded-2xl p-4 border border-slate-200 pointer-events-auto transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleBack}
                className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                Observador
              </span>
            </div>
            <ConnectionStatus
              isConnected={isDriverOnline}
              lastUpdate={lastUpdate}
            />
          </div>

          <h2 className="font-bold text-lg text-slate-800 line-clamp-1">
            {route.title}
          </h2>

          <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm">
            <MapPin size={14} className="text-[#D35400] shrink-0" />
            <span className="truncate">
              {totalStops} {totalStops === 1 ? "parada" : "paradas"} na rota
            </span>
          </div>

          <div className="flex gap-3 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Signal size={12} />
              {isDriverOnline ? "Motorista online" : "Aguardando motorista..."}
            </span>
            {isSimulating && (
              <span className="flex items-center gap-1 text-purple-600">
                🎮 Modo simulação
              </span>
            )}
            {isLoadingRoutePath && (
              <span className="flex items-center gap-1 text-amber-600">
                <Loader2 size={12} className="animate-spin" />
                Calculando rota...
              </span>
            )}
          </div>

          {/* Barra de progresso */}
          {totalStops > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Progresso do motorista</span>
                <span className="flex items-center gap-1">
                  {isComplete && (
                    <CheckCircle size={12} className="text-green-500" />
                  )}
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete ? "bg-green-500" : "bg-[#D35400]"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 z-0">
        <ObserverMap
          stops={orderedStops}
          driverLocation={driverLocation}
          routePath={optimizedRoutePath}
          visitedStops={visitedStops}
          isLoading={isLoadingRoutePath}
        />
      </div>

      {/* NOTIFICAÇÃO FLUTUANTE */}
      <FloatingNotification
        isVisible={showFloatingNotification}
        message="🎉 Rota Finalizada!"
        subMessage={`O motorista concluiu todas as ${totalStops} paradas da rota`}
        onClose={handleCloseNotification}
      />

      {/* MODAL DE FINALIZAÇÃO */}
      <RouteCompleteModal
        isOpen={showCompletionModal}
        onClose={handleCloseModal}
        onGoToKanban={handleGoToKanban}
        routeTitle={route.title}
        totalStops={totalStops}
      />

      {/* OVERLAY DE CELEBRAÇÃO */}
      {isComplete && !showCompletionModal && (
        <div className="absolute bottom-20 left-4 right-4 z-[500] pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-3 shadow-lg text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy size={20} className="text-white" />
              <p className="text-white font-bold text-sm">
                Rota finalizada! 🎉 Todas as paradas foram concluídas
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Indicador de aguardando motorista */}
      {!hasReceivedFirstLocation && !driverLocation && !isComplete && (
        <div className="absolute bottom-20 left-4 right-4 z-[500] pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-100/95 backdrop-blur rounded-xl p-3 shadow-lg text-center"
          >
            <Loader2
              className="animate-spin mx-auto mb-2 text-amber-600"
              size={24}
            />
            <p className="text-amber-700 text-sm font-medium">
              Aguardando motorista conectar...
            </p>
            <p className="text-amber-600 text-xs mt-1">
              Quando o motorista iniciar a rota, você verá sua localização em
              tempo real
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

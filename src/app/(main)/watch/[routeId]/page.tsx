/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRoutes } from "@/hooks/useRoutes";
import api from "@/services/api";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MapPin,
  Signal,
  WifiOff,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import ObserverMap from "@/components/ObserverMap";

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

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.routeId as string;

  const { useGetRouteById } = useRoutes();
  const {
    data: route,
    isLoading: isLoadingRoute,
    error,
  } = useGetRouteById(routeId || "");

  // 🔥 ORDENAR AS PARADAS
  const orderedStops = useMemo(() => {
    if (!route?.stops) return [];

    const stopsWithOrder = route.stops.filter(
      (stop: any) => stop.order !== undefined && stop.order !== null
    );
    const stopsWithoutOrder = route.stops.filter(
      (stop: any) => stop.order === undefined || stop.order === null
    );

    const sortedWithOrder = [...stopsWithOrder].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    return [...sortedWithOrder, ...stopsWithoutOrder];
  }, [route?.stops]);

  // 🔥 ESTADOS
  const [optimizedRoutePath, setOptimizedRoutePath] = useState<[number, number][]>([]);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasReceivedFirstLocation, setHasReceivedFirstLocation] = useState(false);
  const [isLoadingRoutePath, setIsLoadingRoutePath] = useState(false);
  
  // 🔥 NOVOS ESTADOS PARA CONTROLE DE ROTA
  const [isRouteLoaded, setIsRouteLoaded] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  
  // 🔥 GUARDAR A ÚLTIMA ROTA RECEBIDA DO BACKEND
  const lastOptimizedRouteRef = useRef<[number, number][]>([]);
  
  // 🔥 GUARDAR O ÚLTIMO ESTADO DE PARADAS VISITADAS
  const lastVisitedCountRef = useRef(0);

  const totalStops = orderedStops.length;
  const visitedStops = orderedStops
    .filter((stop: any) => stop.visited === true)
    .map((s: any) => s.id) || [];

  // 🔥 FUNÇÃO PARA BUSCAR ROTA UMA ÚNICA VEZ (quando necessário)
  const fetchOptimizedRouteOnce = useCallback(async (force = false) => {
    // Se já tem rota carregada e não está forçando, NÃO recalculada
    if (!force && isRouteLoaded && lastOptimizedRouteRef.current.length > 0) {
      console.log("✅ [Watch] Rota já carregada, pulando recálculo desnecessário");
      return;
    }

    if (!route?.stops || orderedStops.length === 0) {
      console.log("⚠️ [Watch] Sem paradas para calcular rota");
      return;
    }

    // Pega os IDs das tarefas associadas às paradas
    const taskIds = orderedStops
      .map((stop: any) => stop.taskId)
      .filter((id: string) => id);

    if (taskIds.length === 0) {
      console.log("⚠️ [Watch] Nenhum taskId encontrado, usando fallback");
      const fallbackPoints = orderedStops.map((stop: any) => [
        stop.latitude,
        stop.longitude,
      ] as [number, number]);
      setOptimizedRoutePath(fallbackPoints);
      lastOptimizedRouteRef.current = fallbackPoints;
      setIsRouteLoaded(true);
      return;
    }

    setIsLoadingRoutePath(true);

    try {
      // Usa a localização atual do motorista (se disponível)
      let startLat: number;
      let startLng: number;

      if (driverLocation && driverLocation[0] && driverLocation[1]) {
        startLat = driverLocation[0];
        startLng = driverLocation[1];
        console.log("📍 [Watch] Usando localização REAL do motorista:", startLat, startLng);
      } else {
        // Fallback: usa a primeira parada
        startLat = orderedStops[0]?.latitude;
        startLng = orderedStops[0]?.longitude;
        console.log("⚠️ [Watch] Sem localização do motorista, usando primeira parada");
      }

      console.log("🔄 [Watch] Buscando rota otimizada do backend (APENAS UMA VEZ)...");
      console.log("   Task IDs:", taskIds.length);
      console.log("   OrderBy:", route.orderBy);

      const response = await api.post("/routes/calculate-best-path", {
        taskIds: taskIds,
        driverLatitude: startLat,
        driverLongitude: startLng,
        orderBy: route.orderBy || "DISTANCE",
      });

      console.log("✅ [Watch] Rota otimizada recebida do backend");

      const optimizedTasks = response.data.route || [];
      
      // Construir a rota: motorista + paradas na ordem otimizada
      const points: [number, number][] = [];
      
      // Primeiro ponto: localização atual do motorista
      if (driverLocation && driverLocation[0] && driverLocation[1]) {
        points.push(driverLocation);
      }
      
      // Depois as paradas na ordem otimizada pelo backend
      optimizedTasks.forEach((task: any) => {
        const lat = task.taskAddress?.latitude || task.latitude;
        const lng = task.taskAddress?.longitude || task.longitude;
        if (lat && lng) {
          points.push([lat, lng]);
        }
      });

      console.log(`📍 [Watch] Rota otimizada com ${points.length} pontos`);
      setOptimizedRoutePath(points);
      lastOptimizedRouteRef.current = points;
      setIsRouteLoaded(true);
    } catch (error) {
      console.error("❌ [Watch] Erro ao buscar rota otimizada:", error);
      // Fallback: usa a ordem das paradas
      const fallbackPoints = [
        ...(driverLocation ? [driverLocation] : []),
        ...orderedStops.map((stop: any) => [stop.latitude, stop.longitude] as [number, number])
      ];
      setOptimizedRoutePath(fallbackPoints);
      lastOptimizedRouteRef.current = fallbackPoints;
      setIsRouteLoaded(true);
    } finally {
      setIsLoadingRoutePath(false);
    }
  }, [route, orderedStops, driverLocation, isRouteLoaded]);

  // 🔥 WEBSOCKET - APENAS ATUALIZA LOCALIZAÇÃO, NÃO RECALCULA ROTA
  useEffect(() => {
    if (!routeId) return;

    import("socket.io-client").then(({ io }) => {
      const driverId = route?.userAssigned?.id;
      if (!driverId) {
        console.log("⚠️ [Watch] Aguardando ID do motorista...");
        return;
      }

      const params = new URLSearchParams({
        routeId,
        driverId,
      });

      const socketUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000"}/locations?${params}`;
      console.log(`🔌 [Watch] Conectando WebSocket como observador`);

      const socket = io(socketUrl, {
        transports: ["websocket"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("✅ [Watch] WebSocket conectado (observador)");
      });

      socket.on("disconnect", () => {
        console.log("❌ [Watch] WebSocket desconectado");
        setIsDriverOnline(false);
      });

      // 🔥 CRÍTICO: Só atualiza a localização do motorista, NUNCA recalcula a rota aqui
      socket.on("location-update", (location: any) => {
        console.log(`📍 [Watch] Motorista em: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
        setDriverLocation([location.latitude, location.longitude]);
        setIsDriverOnline(true);
        setLastUpdate(new Date());
        setIsSimulating(location.isSimulating || false);
        setHasReceivedFirstLocation(true);
      });

      socket.on("driver-offline", () => {
        console.warn("⚠️ [Watch] Motorista offline");
        setIsDriverOnline(false);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    });
  }, [routeId, route?.userAssigned?.id]);

  // 🔥 CARREGAR ROTA PELA PRIMEIRA VEZ (quando tem localização do motorista E paradas)
  useEffect(() => {
    if (driverLocation && orderedStops.length > 0 && !isRouteLoaded) {
      console.log("🚀 [Watch] Primeira carga da rota...");
      fetchOptimizedRouteOnce(true);
    }
  }, [driverLocation, orderedStops, isRouteLoaded, fetchOptimizedRouteOnce]);

  // 🔥 QUANDO UMA PARADA É VISITADA, RECALCULA ROTA (MAS SÓ QUANDO NECESSÁRIO)
  useEffect(() => {
    const currentVisitedCount = visitedStops.length;
    
    // Se o número de paradas visitadas mudou
    if (currentVisitedCount !== lastVisitedCountRef.current && currentVisitedCount > 0) {
      console.log(`🔄 [Watch] Parada concluída! Recalculando rota (${currentVisitedCount}/${totalStops})`);
      lastVisitedCountRef.current = currentVisitedCount;
      
      // Limpar flag para forçar recálculo
      setIsRouteLoaded(false);
      lastOptimizedRouteRef.current = [];
      
      // Pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        fetchOptimizedRouteOnce(true);
      }, 100);
    }
  }, [visitedStops, totalStops, fetchOptimizedRouteOnce]);

  // 🔥 HANDLERS
  const handleBack = useCallback(() => router.back(), [router]);
  const prefetchRoutes = useCallback(() => router.prefetch("/routes"), [router]);

  // 🔥 LOADING E ERROR STATES
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
                <span>
                  {Math.round((visitedStops.length / totalStops) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D35400] rounded-full transition-all duration-500"
                  style={{
                    width: `${(visitedStops.length / totalStops) * 100}%`,
                  }}
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

      {/* 🔥 Indicador de aguardando motorista - SÓ APARECE SE NUNCA RECEBEU LOCALIZAÇÃO */}
      {!hasReceivedFirstLocation && !driverLocation && (
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

      {/* 🔥 Indicador de rota carregada */}
      {isRouteLoaded && hasReceivedFirstLocation && driverLocation && (
        <div className="absolute bottom-20 left-4 right-4 z-[500] pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-100/95 backdrop-blur rounded-xl p-3 shadow-lg text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <MapPin size={18} className="text-green-600" />
              <p className="text-green-700 text-sm font-medium">
                Acompanhando rota em tempo real
              </p>
            </div>
            <p className="text-green-600 text-xs mt-1">
              {isSimulating ? "Motorista em modo simulação" : "GPS ativo"}
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
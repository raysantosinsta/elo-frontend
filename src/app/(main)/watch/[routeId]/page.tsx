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

  // 🔥 1. ORDENAR AS PARADAS
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

  // 🔥 2. ESTADOS
  const [optimizedRoutePath, setOptimizedRoutePath] = useState<[number, number][]>([]);
  const [isLoadingRoutePath, setIsLoadingRoutePath] = useState(false);
  
  // Localização do motorista (vem do WebSocket)
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasReceivedFirstLocation, setHasReceivedFirstLocation] = useState(false); // 🔥 NOVO
  const socketRef = useRef<Socket | null>(null);

  const totalStops = orderedStops.length;
  const visitedStops = orderedStops
    .filter((stop: any) => stop.visited === true)
    .map((s: any) => s.id) || [];

  // 🔥 3. WEBSOCKET - CONECTAR PARA RECEBER LOCALIZAÇÃO DO MOTORISTA
  useEffect(() => {
    if (!routeId) return;

    import("socket.io-client").then(({ io }) => {
      const driverId = route?.userAssigned?.id;
      if (!driverId) {
        console.log("⚠️ Aguardando ID do motorista...");
        return;
      }

      const params = new URLSearchParams({
        routeId,
        driverId,
      });

      const socketUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000"}/locations?${params}`;
      console.log(`🔌 Conectando WebSocket como observador: ${socketUrl}`);

      const socket = io(socketUrl, {
        transports: ["websocket"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("✅ WebSocket conectado (observador)");
      });

      socket.on("disconnect", () => {
        console.log("❌ WebSocket desconectado");
        setIsDriverOnline(false);
      });

      socket.on("location-update", (location: any) => {
        console.log(`📍 Motorista em: ${location.latitude}, ${location.longitude}`);
        setDriverLocation([location.latitude, location.longitude]);
        setIsDriverOnline(true);
        setLastUpdate(new Date());
        setIsSimulating(location.isSimulating || false);
        setHasReceivedFirstLocation(true); // 🔥 Marca que já recebeu a primeira localização
      });

      socket.on("driver-offline", () => {
        console.warn("⚠️ Motorista offline");
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

  // 🔥 4. BUSCAR ROTA OTIMIZADA DO BACKEND (usa a localização REAL do motorista)
  useEffect(() => {
    const fetchOptimizedRoute = async () => {
      if (!route?.stops || orderedStops.length === 0) return;

      // Pega os IDs das tarefas associadas às paradas
      const taskIds = orderedStops
        .map((stop: any) => stop.taskId)
        .filter((id: string) => id);

      if (taskIds.length === 0) {
        console.log("⚠️ Nenhum taskId encontrado nas paradas");
        const fallbackPoints = orderedStops.map((stop: any) => [
          stop.latitude,
          stop.longitude,
        ] as [number, number]);
        setOptimizedRoutePath(fallbackPoints);
        return;
      }

      setIsLoadingRoutePath(true);

      try {
        // 🔥 USAR A LOCALIZAÇÃO REAL DO MOTORISTA (do WebSocket)
        let startLat: number;
        let startLng: number;

        if (driverLocation && driverLocation[0] && driverLocation[1]) {
          startLat = driverLocation[0];
          startLng = driverLocation[1];
          console.log("📍 Usando localização REAL do motorista:", startLat, startLng);
        } else {
          // Fallback: usa a primeira parada (aguardando o motorista conectar)
          startLat = orderedStops[0]?.latitude;
          startLng = orderedStops[0]?.longitude;
          console.log("⚠️ Sem localização do motorista, usando primeira parada:", startLat, startLng);
        }

        console.log("🔄 Buscando rota otimizada do backend...");
        console.log("   Task IDs:", taskIds);
        console.log("   OrderBy:", route.orderBy);
        console.log("   🔥 Driver Lat/Lng:", startLat, startLng);

        const response = await api.post("/routes/calculate-best-path", {
          taskIds: taskIds,
          driverLatitude: startLat,
          driverLongitude: startLng,
          orderBy: route.orderBy || "DISTANCE",
        });

        console.log("✅ Rota otimizada recebida:", response.data);

        const optimizedTasks = response.data.route || [];
        
        // 🔥 Construir a rota: motorista + paradas na ordem otimizada
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

        console.log(`📍 Rota otimizada com ${points.length} pontos`);
        setOptimizedRoutePath(points);
      } catch (error) {
        console.error("❌ Erro ao buscar rota otimizada:", error);
        // Fallback: usa a ordem das paradas
        const fallbackPoints = [
          ...(driverLocation ? [driverLocation] : []),
          ...orderedStops.map((stop: any) => [stop.latitude, stop.longitude] as [number, number])
        ];
        setOptimizedRoutePath(fallbackPoints);
      } finally {
        setIsLoadingRoutePath(false);
      }
    };

    if (orderedStops.length > 0) {
      fetchOptimizedRoute();
    }
  }, [route, orderedStops, driverLocation]);

  // 🔥 5. HANDLERS
  const handleBack = useCallback(() => router.back(), [router]);
  const prefetchRoutes = useCallback(() => router.prefetch("/routes"), [router]);

  // 🔥 6. LOADING E ERROR STATES
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

  // 🔥 7. RENDER
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
    </div>
  );
}
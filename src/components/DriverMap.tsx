/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import "leaflet/dist/leaflet.css";

// --- ÍCONES ---
const iconUrls = {
  default: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadow: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  car: "https://cdn-icons-png.flaticon.com/512/3097/3097180.png",
  green:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  red: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
};

const defaultIcon = L.icon({
  iconUrl: iconUrls.default,
  shadowUrl: iconUrls.shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const activeIcon = L.icon({
  iconUrl: iconUrls.red,
  shadowUrl: iconUrls.shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const visitedIcon = L.icon({
  iconUrl: iconUrls.green,
  shadowUrl: iconUrls.shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const driverIcon = L.icon({
  iconUrl: iconUrls.car,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const GRAPHHOPPER_API_KEY = "ab75310a-f959-4b72-b322-11cce5b18f6a";

// 🔥 COMPONENTE RECENTER MAP CORRIGIDO
function RecenterMap({ location }: { location: [number, number] }) {
  const map = useMap();
  const lastLoc = useRef<string>("");

  useEffect(() => {
    if (!map) return;
    
    const locString = location.join(",");
    if (lastLoc.current !== locString) {
      try {
        map.flyTo(location, map.getZoom(), { animate: true, duration: 0.5 });
        lastLoc.current = locString;
      } catch (error) {
        console.warn("Erro ao centralizar mapa:", error);
      }
    }
  }, [location, map]);
  
  return null;
}

interface RouteStop {
  id?: string;
  name?: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  order?: number;
}

interface RouteMapProps {
  stops: RouteStop[];
  currentStopIndex: number;
  myLocation: [number, number] | null;
  visitedStops?: string[];
  onStopClick?: (stop: RouteStop, index: number) => void;
  preserveOrder?: boolean;
  useBackendRoute?: boolean;
  backendRoute?: [number, number][];
}

export default function RouteMap({
  stops,
  currentStopIndex,
  myLocation,
  visitedStops = [],
  onStopClick,
  preserveOrder = false,
  useBackendRoute = false,
  backendRoute = [],
}: RouteMapProps) {
  const [fullRoutePath, setFullRoutePath] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRouteKeyRef = useRef<string>("");
  const [isSimulating, setIsSimulating] = useState(false);
  const tilesLoadedRef = useRef(false);

  // 🔥 FORÇAR O MAPA COMO PRONTO APÓS 1 SEGUNDO (FALLBACK GARANTIDO)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isMapReady) {
        console.log("🗺️ [RouteMap] Forçando ready state (fallback)");
        setIsMapReady(true);
        tilesLoadedRef.current = true;
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [isMapReady]);

  // 🔥 TAMBÉM FORÇA READY QUANDO MYLOCATION CHEGA
  useEffect(() => {
    if (myLocation && !isMapReady) {
      console.log("🗺️ [RouteMap] MyLocation recebido, forçando ready");
      setTimeout(() => {
        setIsMapReady(true);
        tilesLoadedRef.current = true;
      }, 500);
    }
  }, [myLocation, isMapReady]);

  // 🔥 SE FOR OBSERVADOR, USA A ROTA DO BACKEND
  useEffect(() => {
    if (useBackendRoute && backendRoute.length > 0) {
      console.log(
        "🗺️ [OBSERVADOR] Usando rota pronta do backend:",
        backendRoute.length,
        "pontos",
      );
      setFullRoutePath(backendRoute);
    }
  }, [useBackendRoute, backendRoute]);

  // 🔥 PEGA SOMENTE AS PARADAS NÃO VISITADAS
  const unvisitedStops = useMemo(() => {
    if (preserveOrder) {
      const notVisited = stops.filter(
        (stop, index) => !visitedStops.includes(stop.id || String(index)),
      );
      return notVisited;
    }

    const notVisited = stops.filter(
      (stop, index) => !visitedStops.includes(stop.id || String(index)),
    );
    return notVisited;
  }, [stops, visitedStops, preserveOrder]);

  // 🔥 FUNÇÃO PARA CRIAR ROTA USANDO GRAPHHOPPER
  const fetchRouteFromGraphHopper = async (
    points: string[],
  ): Promise<[number, number][] | null> => {
    try {
      const routePoints = points.join("&point=");
      const url = `https://graphhopper.com/api/1/route?point=${routePoints}&vehicle=car&optimize=false&points_encoded=false&key=${GRAPHHOPPER_API_KEY}`;

      console.log("🌐 Chamando GraphHopper API...");

      const response = await fetch(url, {
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.paths && data.paths.length > 0) {
        const coordinates = data.paths[0].points.coordinates.map(
          (coord: number[]) => [coord[1], coord[0]],
        );
        console.log(`✅ Rota recebida: ${coordinates.length} pontos`);
        return coordinates;
      }

      return null;
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("❌ Erro na requisição GraphHopper:", error.message);
      }
      return null;
    }
  };

  // 🔥 FUNÇÃO PARA CRIAR ROTA COMPLETA
  const fetchCompleteRoute = useCallback(async () => {
    if (isSimulating && fullRoutePath.length > 0) {
      console.log("🎮 Modo simulação ativo, mantendo rota atual");
      return;
    }

    if (!myLocation) {
      console.log("⏳ Aguardando localização do motorista...");
      setFullRoutePath([]);
      return;
    }

    if (unvisitedStops.length === 0) {
      console.log("🏁 Todas as paradas visitadas");
      setFullRoutePath([]);
      return;
    }

    const invalidStop = unvisitedStops.find(
      (stop) =>
        isNaN(stop.latitude) ||
        isNaN(stop.longitude) ||
        stop.latitude === 0 ||
        stop.longitude === 0,
    );
    if (invalidStop) {
      console.error(`❌ Parada com coordenadas inválidas: ${invalidStop.name}`);
      return;
    }

    const routeKey = `${myLocation[0].toFixed(6)},${myLocation[1].toFixed(6)}|${unvisitedStops.map((s) => s.id).join(",")}`;

    if (lastRouteKeyRef.current === routeKey && fullRoutePath.length > 0) {
      console.log("🔄 Rota não mudou, mantendo atual");
      return;
    }

    console.log("🆕 Calculando nova rota...");

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoadingRoute(true);
    abortControllerRef.current = new AbortController();

    try {
      const points: string[] = [];
      points.push(`${myLocation[0]},${myLocation[1]}`);

      unvisitedStops.forEach((stop) => {
        points.push(`${stop.latitude},${stop.longitude}`);
      });

      const routeCoordinates = await fetchRouteFromGraphHopper(points);

      if (routeCoordinates && routeCoordinates.length > 0) {
        setFullRoutePath(routeCoordinates);
        lastRouteKeyRef.current = routeKey;
        console.log(`✅ Rota carregada com sucesso!`);
      } else {
        console.warn("⚠️ Falha ao obter rota da API");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("❌ Erro ao buscar rota:", error);
      }
    } finally {
      setIsLoadingRoute(false);
    }
  }, [myLocation, unvisitedStops, isSimulating, fullRoutePath.length]);

  // 🔥 Eventos de atualização
  useEffect(() => {
    const handleRouteUpdated = () => {
      console.log("🔄 Rota atualizada, recalculando...");
      fetchCompleteRoute();
    };

    window.addEventListener("route-updated", handleRouteUpdated);
    return () => window.removeEventListener("route-updated", handleRouteUpdated);
  }, [fetchCompleteRoute]);

  // 🔥 Quando paradas mudam
  useEffect(() => {
    if (myLocation && unvisitedStops.length > 0) {
      fetchCompleteRoute();
    } else if (unvisitedStops.length === 0) {
      setFullRoutePath([]);
    }
  }, [unvisitedStops, myLocation, fetchCompleteRoute]);

  // 🔥 Quando localização muda
  useEffect(() => {
    if (myLocation && unvisitedStops.length > 0 && !isSimulating) {
      fetchCompleteRoute();
    }
  }, [myLocation, fetchCompleteRoute]);

  // 🔥 Eventos de simulação
  useEffect(() => {
    const handleSimulationStart = () => {
      console.log("🎮 Simulação iniciada, congelando rota");
      setIsSimulating(true);
    };

    const handleSimulationEnd = () => {
      console.log("🎮 Simulação finalizada, recalculando rota");
      setIsSimulating(false);
      setTimeout(() => fetchCompleteRoute(), 500);
    };

    window.addEventListener("simulation-start", handleSimulationStart);
    window.addEventListener("simulation-end", handleSimulationEnd);

    return () => {
      window.removeEventListener("simulation-start", handleSimulationStart);
      window.removeEventListener("simulation-end", handleSimulationEnd);
    };
  }, [fetchCompleteRoute]);

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

  // 🔥 BOUNDS FOCADO NO MOTORISTA
  const navigationBounds = useMemo(() => {
    if (!myLocation) return undefined;

    if (unvisitedStops.length === 0) {
      const padding = 0.002;
      return [
        [myLocation[0] - padding, myLocation[1] - padding],
        [myLocation[0] + padding, myLocation[1] + padding],
      ] as L.LatLngBoundsExpression;
    }

    const nextStop = unvisitedStops[0];
    const distanceToNextStop = calculateDistance(
      myLocation[0],
      myLocation[1],
      nextStop.latitude,
      nextStop.longitude,
    );

    if (distanceToNextStop > 800) {
      const padding = 0.0015;
      return [
        [myLocation[0] - padding, myLocation[1] - padding],
        [myLocation[0] + padding, myLocation[1] + padding],
      ] as L.LatLngBoundsExpression;
    }

    const points = [
      [myLocation[0], myLocation[1]],
      [nextStop.latitude, nextStop.longitude],
    ];

    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const basePadding = Math.min(
      0.008,
      Math.max(0.002, distanceToNextStop / 250000),
    );

    return [
      [minLat - basePadding, minLng - basePadding],
      [maxLat + basePadding, maxLng + basePadding],
    ] as L.LatLngBoundsExpression;
  }, [myLocation, unvisitedStops, calculateDistance]);

  // 🔥 Centro inicial do mapa (São Paulo)
  const defaultCenter: [number, number] = [-23.5505, -46.6333];

  return (
    <div className="relative w-full h-full border rounded-lg overflow-hidden bg-gray-100">
      {/* OVERLAY DE LOADING - SÓ MOSTRA NOS PRIMEIROS 2 SEGUNDOS */}
      {!isMapReady && (
        <div className="absolute inset-0 z-[2000] bg-slate-100 flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-14 h-14 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <p className="text-slate-700 font-medium text-base">
              Carregando mapa...
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Aguarde, estamos preparando sua rota
            </p>
          </div>
        </div>
      )}

      <MapContainer
        center={myLocation || defaultCenter}
        zoom={15}
        className="w-full h-full"
        style={{
          height: "100%",
          width: "100%",
        }}
        whenReady={() => {
          console.log("🗺️ [RouteMap] MapContainer whenReady disparado");
          setIsMapReady(true);
          tilesLoadedRef.current = true;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            load: () => {
              console.log("✅ [RouteMap] TileLayer carregado");
            },
            error: (err) => {
              console.error("❌ [RouteMap] Erro ao carregar tiles:", err);
            },
          }}
        />

        {stops.map((stop, index) => {
          const isVisited = visitedStops.includes(stop.id || String(index));
          const isCurrent = index === currentStopIndex && !isVisited;
          const routePosition =
            unvisitedStops.findIndex((s) => s.id === stop.id) + 1;

          return (
            <Marker
              key={stop.id || index}
              position={[stop.latitude, stop.longitude]}
              icon={
                isVisited ? visitedIcon : isCurrent ? activeIcon : defaultIcon
              }
              eventHandlers={{ click: () => onStopClick?.(stop, index) }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>
                    {isVisited
                      ? "✓"
                      : routePosition > 0
                        ? `${routePosition}.`
                        : "📌"}{" "}
                    {stop.name || "Parada"}
                  </strong>
                  <p>{stop.address}</p>
                  <p>
                    {stop.city}/{stop.state}
                  </p>
                  {isVisited && (
                    <p className="text-green-600 text-xs mt-1">✅ Concluída</p>
                  )}
                  {!isVisited && routePosition === 1 && (
                    <p className="text-orange-600 text-xs mt-1">
                      🎯 Próximo destino!
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {myLocation && (
          <Marker
            position={[myLocation[0], myLocation[1]]}
            icon={driverIcon}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-sm">
                <strong>🚗 Sua localização</strong>
                <p className="text-xs text-gray-500 mt-1">
                  Lat: {myLocation[0].toFixed(6)}
                  <br />
                  Lng: {myLocation[1].toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {fullRoutePath.length > 0 && (
          <Polyline
            positions={fullRoutePath}
            pathOptions={{
              color: "#D35400",
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {myLocation && <RecenterMap location={myLocation} />}

        {isLoadingRoute && (
          <div className="absolute top-4 right-4 bg-white/90 px-3 py-1.5 rounded-full shadow-md z-[1000] text-xs font-bold flex items-center gap-2">
            <div className="animate-spin h-3 w-3 border-2 border-[#D35400] border-t-transparent rounded-full" />
            CALCULANDO ROTA...
          </div>
        )}

        {myLocation &&
          unvisitedStops.length > 0 &&
          fullRoutePath.length === 0 &&
          !isLoadingRoute && (
            <div className="absolute bottom-4 left-4 right-4 bg-yellow-100/90 px-3 py-2 rounded-lg shadow-md z-[1000] text-xs font-medium text-yellow-800 text-center">
              🗺️ Calculando rota para {unvisitedStops.length}{" "}
              {unvisitedStops.length === 1 ? "parada" : "paradas"}...
            </div>
          )}

        {myLocation && fullRoutePath.length > 0 && !isLoadingRoute && (
          <div className="absolute bottom-4 left-4 bg-green-100/90 px-3 py-1.5 rounded-full shadow-md z-[1000] text-xs font-medium text-green-800">
            ✅ Rota na ordem definida pelo sistema
          </div>
        )}

        {isSimulating && fullRoutePath.length > 0 && (
          <div className="absolute top-4 left-4 bg-purple-100/90 px-3 py-1.5 rounded-full shadow-md z-[1000] text-xs font-medium text-purple-800">
            🎮 Modo Simulação - Rota mantida
          </div>
        )}
      </MapContainer>
    </div>
  );
}
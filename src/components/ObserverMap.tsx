/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/ObserverMap.tsx
"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

const GRAPHHOPPER_API_KEY = "ab75310a-f959-4b72-b322-11cce5b18f6a";

// 🔥 CACHE DE ROTAS
interface RouteCacheItem {
  points: [number, number][];
  timestamp: number;
}

let routeCache: Map<string, RouteCacheItem> = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

// 🔥 ÍCONES
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const visitedIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const driverIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3097/3097180.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface ObserverMapProps {
  stops: any[];
  driverLocation: [number, number] | null;
  routePath: [number, number][];
  visitedStops?: string[];
  isLoading?: boolean;
}

export default function ObserverMap({
  stops,
  driverLocation,
  routePath,
  visitedStops = [],
  isLoading = false,
}: ObserverMapProps) {
  const [displayRoute, setDisplayRoute] = useState<[number, number][]>([]);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [routeSource, setRouteSource] = useState<
    "backend" | "graphhopper" | "none"
  >("none");

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestKeyRef = useRef<string>("");
  const lastFetchTimeRef = useRef<number>(0);

  // 🔥 FILTRAR PARADAS NÃO VISITADAS
  const unvisitedStops = useMemo(() => {
    return stops.filter((stop) => !visitedStops.includes(stop.id));
  }, [stops, visitedStops]);

  // 🔥 ORDENAR PARADAS
  const sortedUnvisitedStops = useMemo(() => {
    return [...unvisitedStops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [unvisitedStops]);

  // 🔥 FUNÇÃO PARA BUSCAR ROTA NO GRAPHHOPPER (SEGUINDO RUAS)
  const fetchGraphHopperRoute = useCallback(
    async (points: [number, number][]): Promise<[number, number][] | null> => {
      if (points.length < 2) return points;

      // Construir URL com os pontos
      const pointsStr = points.map((p) => `${p[0]},${p[1]}`).join("&point=");
      const url = `https://graphhopper.com/api/1/route?point=${pointsStr}&vehicle=car&points_encoded=false&key=${GRAPHHOPPER_API_KEY}`;

      console.log("🌐 [ObserverMap] Buscando rota no GraphHopper...");
      console.log(`   URL: ${url.replace(GRAPHHOPPER_API_KEY, "HIDDEN")}`);
      console.log(
        `   Pontos: ${points.length} (motorista + ${points.length - 1} paradas)`,
      );

      try {
        const response = await fetch(url, {
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          console.error(`❌ GraphHopper HTTP Error: ${response.status}`);
          return null;
        }

        const data = await response.json();

        if (data.paths && data.paths.length > 0) {
          const path = data.paths[0];

          // Extrair as coordenadas da rota (lat, lng)
          const coordinates = path.points.coordinates.map(
            (coord: number[]) => [coord[1], coord[0]] as [number, number],
          );

          console.log(`✅ [ObserverMap] Rota GraphHopper carregada:`);
          console.log(`   Pontos: ${coordinates.length}`);
          console.log(`   Distância: ${(path.distance / 1000).toFixed(2)} km`);
          console.log(`   Tempo: ${Math.round(path.time / 60000)} min`);

          return coordinates;
        }

        console.warn("⚠️ Nenhum path encontrado na resposta");
        return null;
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("❌ GraphHopper error:", error.message);
        }
        return null;
      }
    },
    [],
  );

  // 🔥 FUNÇÃO PRINCIPAL PARA CARREGAR A ROTA
  const loadRoute = useCallback(async () => {
    // Validações básicas
    if (!driverLocation || !driverLocation[0] || !driverLocation[1]) {
      setDisplayRoute([]);
      setRouteSource("none");
      return;
    }

    if (sortedUnvisitedStops.length === 0) {
      setDisplayRoute([]);
      setRouteSource("none");
      return;
    }

    // Criar chave única para cache
    const stopsKey = sortedUnvisitedStops
      .map((s) => `${s.latitude.toFixed(5)},${s.longitude.toFixed(5)}`)
      .join("|");
    const cacheKey = `${driverLocation[0].toFixed(5)},${driverLocation[1].toFixed(5)}|${stopsKey}|${visitedStops.length}`;

    // 🔥 VERIFICAR CACHE PRIMEIRO
    const cached = routeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(
        "✅ [ObserverMap] Usando rota em cache:",
        cached.points.length,
        "pontos",
      );
      setDisplayRoute(cached.points);
      setRouteSource("graphhopper");
      return;
    }

    // 🔥 THROTTLE: Evitar requisições muito frequentes
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 3000) {
      // 3 segundos de throttle
      console.log("⏳ [ObserverMap] Throttle ativo, aguardando...");
      return;
    }

    // Evitar requisições duplicadas
    if (lastRequestKeyRef.current === cacheKey && displayRoute.length > 0) {
      console.log("🔄 [ObserverMap] Mesma requisição, ignorando");
      return;
    }

    // Cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsFetchingRoute(true);
    lastRequestKeyRef.current = cacheKey;
    lastFetchTimeRef.current = now;

    abortControllerRef.current = new AbortController();

    try {
      // Construir pontos para a rota: motorista + paradas não visitadas
      const points: [number, number][] = [driverLocation];

      sortedUnvisitedStops.forEach((stop) => {
        if (stop.latitude && stop.longitude) {
          points.push([stop.latitude, stop.longitude]);
        }
      });

      console.log(
        `🎯 [ObserverMap] Calculando rota para ${sortedUnvisitedStops.length} parada(s)`,
      );
      console.log(
        `   Origem: ${driverLocation[0].toFixed(6)}, ${driverLocation[1].toFixed(6)}`,
      );
      console.log(`   Destino: ${sortedUnvisitedStops[0]?.name}`);

      // Buscar rota do GraphHopper
      const graphHopperRoute = await fetchGraphHopperRoute(points);

      if (graphHopperRoute && graphHopperRoute.length > 0) {
        console.log(
          "✅ [ObserverMap] Usando rota do GraphHopper (seguindo ruas)",
        );
        setDisplayRoute(graphHopperRoute);
        setRouteSource("graphhopper");

        // Salvar no cache
        routeCache.set(cacheKey, {
          points: graphHopperRoute,
          timestamp: Date.now(),
        });

        // Limpar cache antigo (manter apenas 20 rotas)
        if (routeCache.size > 20) {
          const oldestKey = Array.from(routeCache.keys())[0];
          routeCache.delete(oldestKey);
        }
      } else {
        console.warn("⚠️ GraphHopper falhou, usando linha reta");
        setDisplayRoute(points);
        setRouteSource("none");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("❌ Erro ao carregar rota:", error.message);
        setDisplayRoute(
          [
            driverLocation,
            sortedUnvisitedStops[0]?.latitude &&
            sortedUnvisitedStops[0]?.longitude
              ? [
                  sortedUnvisitedStops[0].latitude,
                  sortedUnvisitedStops[0].longitude,
                ]
              : driverLocation,
          ].filter(Boolean) as [number, number][],
        );
        setRouteSource("none");
      }
    } finally {
      setIsFetchingRoute(false);
    }
  }, [
    driverLocation,
    sortedUnvisitedStops,
    visitedStops,
    fetchGraphHopperRoute,
    displayRoute.length,
  ]);

  // 🔥 EXECUTAR CARREGAMENTO QUANDO DEPENDÊNCIAS MUDAREM
  useEffect(() => {
    loadRoute();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadRoute]);

  // 🔥 CALCULAR BOUNDS PARA ZOOM AUTOMÁTICO
  const bounds = useMemo(() => {
    const allPoints: [number, number][] = [];

    if (displayRoute.length > 0) {
      allPoints.push(...displayRoute);
    } else {
      sortedUnvisitedStops.forEach((stop) => {
        if (stop.latitude && stop.longitude) {
          allPoints.push([stop.latitude, stop.longitude]);
        }
      });
      if (driverLocation) allPoints.push(driverLocation);
    }

    if (allPoints.length === 0) return undefined;

    const lats = allPoints.map((p) => p[0]);
    const lngs = allPoints.map((p) => p[1]);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latPadding = (maxLat - minLat) * 0.2 || 0.01;
    const lngPadding = (maxLng - minLng) * 0.2 || 0.01;

    return [
      [minLat - latPadding, minLng - lngPadding],
      [maxLat + latPadding, maxLng + lngPadding],
    ] as L.LatLngBoundsExpression;
  }, [displayRoute, sortedUnvisitedStops, driverLocation]);

  const isLoadingRoute = isLoading || isFetchingRoute;
  const hasRoute = displayRoute.length > 0;

  return (
    <div className="relative w-full h-full border rounded-lg overflow-hidden bg-gray-100">
      <MapContainer
        bounds={bounds}
        zoom={13}
        className="w-full h-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🔥 LINHA DA ROTA - SEGUINDO AS RUAS */}
        {hasRoute && (
          <Polyline
            positions={displayRoute}
            pathOptions={{
              color: "#D35400",
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* 🔥 MARCADORES DAS PARADAS NÃO VISITADAS */}
        {sortedUnvisitedStops.map((stop, index) => (
          <Marker
            key={stop.id || index}
            position={[stop.latitude, stop.longitude]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>
                  {index + 1}. {stop.name || "Parada"}
                </strong>
                <p className="text-xs text-gray-500 mt-1">{stop.address}</p>
                <p className="text-xs text-gray-500">
                  {stop.city}/{stop.state}
                </p>
                {index === 0 && (
                  <p className="text-orange-600 text-xs mt-1 font-semibold">
                    🎯 Próximo destino
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 🔥 MARCADORES DAS PARADAS VISITADAS */}
        {stops
          .filter((s) => visitedStops.includes(s.id))
          .map((stop) => (
            <Marker
              key={`visited-${stop.id}`}
              position={[stop.latitude, stop.longitude]}
              icon={visitedIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>✓ {stop.name || "Parada"}</strong>
                  <p className="text-xs text-gray-500 mt-1">{stop.address}</p>
                  <p className="text-green-600 text-xs mt-1 font-semibold">
                    ✅ Concluída
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 🔥 LOCALIZAÇÃO DO MOTORISTA */}
        {driverLocation && (
          <Marker
            position={driverLocation}
            icon={driverIcon}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-sm">
                <strong>🚗 Localização do motorista</strong>
                <p className="text-xs text-gray-500 mt-1">
                  Lat: {driverLocation[0].toFixed(6)}
                  <br />
                  Lng: {driverLocation[1].toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* 🔥 INDICADOR DE CARREGAMENTO */}
      {isLoadingRoute && !hasRoute && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-xl p-4 shadow-lg flex items-center gap-3">
            <Loader2 className="animate-spin text-[#D35400]" size={24} />
            <span className="text-slate-700 font-medium">
              Calculando melhor rota...
            </span>
          </div>
        </div>
      )}

      {/* 🔥 INFORMAÇÕES DA ROTA */}
      {hasRoute && !isLoadingRoute && sortedUnvisitedStops.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-2 shadow-md z-[1000] text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#D35400] rounded-full" />
            <span>
              Rota por ruas • {sortedUnvisitedStops.length} parada(s)
              restante(s)
            </span>
          </div>
        </div>
      )}

      {/* 🔥 LEGENDA */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg p-2 shadow-md z-[1000] text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#D35400] rounded-full" />
            <span>Rota por ruas</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage: `url(https://cdn-icons-png.flaticon.com/512/3097/3097180.png)`,
                backgroundSize: "contain",
              }}
            />
            <span>Motorista</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>Concluída</span>
          </div>
        </div>
      </div>
    </div>
  );
}

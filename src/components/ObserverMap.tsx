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

// Cache de rotas (mais simples, sem persistência longa)
let routeCache: {
  [key: string]: { points: [number, number][]; timestamp: number };
} = {};
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos apenas

// Ícones
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
  const [detailedRoute, setDetailedRoute] = useState<[number, number][]>([]);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestKeyRef = useRef<string>("");

  // 🔥 Guardar a última versão das paradas visitadas para detectar mudanças
  const lastVisitedKeyRef = useRef<string>("");

  // 🔥 Filtrar APENAS as paradas NÃO VISITADAS
  const unvisitedStops = useMemo(() => {
    return stops.filter((stop) => !visitedStops.includes(stop.id));
  }, [stops, visitedStops]);

  // 🔥 Ordenar as paradas NÃO VISITADAS pela ordem original
  const sortedUnvisitedStops = useMemo(() => {
    return [...unvisitedStops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [unvisitedStops]);

  // 🔥 Gerar chave única baseada nas paradas não visitadas
  const generateCacheKey = useCallback((points: [number, number][]) => {
    return points.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join("|");
  }, []);

  // 🔥 Buscar rota detalhada do GraphHopper
  const fetchDetailedRoute = useCallback(async () => {
    // Cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Se não tem localização do motorista, não faz nada
    if (!driverLocation || !driverLocation[0] || !driverLocation[1]) {
      setDetailedRoute([]);
      return;
    }

    // Se não tem paradas não visitadas, limpar rota
    if (sortedUnvisitedStops.length === 0) {
      console.log("🏁 [ObserverMap] Todas as paradas foram visitadas!");
      setDetailedRoute([]);
      return;
    }

    // Construir pontos: motorista + paradas NÃO VISITADAS
    const points: [number, number][] = [driverLocation];

    sortedUnvisitedStops.forEach((stop) => {
      if (stop.latitude && stop.longitude) {
        points.push([stop.latitude, stop.longitude]);
      }
    });

    if (points.length < 2) {
      setDetailedRoute(points);
      return;
    }

    const cacheKey = generateCacheKey(points);
    const visitedKey = `${visitedStops.join(",")}|${sortedUnvisitedStops.length}`;

    // 🔥 Se as paradas visitadas mudaram, limpar cache desta rota
    if (lastVisitedKeyRef.current !== visitedKey) {
      console.log(
        "🔄 [ObserverMap] Paradas visitadas mudaram, limpando cache...",
      );
      delete routeCache[cacheKey];
      lastVisitedKeyRef.current = visitedKey;
    }

    // Verificar cache
    const cached = routeCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(
        "✅ [ObserverMap] Usando rota em cache:",
        cached.points.length,
        "pontos",
      );
      setDetailedRoute(cached.points);
      return;
    }

    // Evitar requisições duplicadas
    if (lastRequestKeyRef.current === cacheKey && detailedRoute.length > 0) {
      return;
    }

    setIsFetchingRoute(true);
    lastRequestKeyRef.current = cacheKey;
    abortControllerRef.current = new AbortController();

    try {
      const pointsStr = points.map((p) => `${p[0]},${p[1]}`).join("&point=");
      const url = `https://graphhopper.com/api/1/route?point=${pointsStr}&vehicle=car&optimize=false&points_encoded=false&key=${GRAPHHOPPER_API_KEY}`;

      console.log("🌐 [ObserverMap] Buscando nova rota detalhada...");
      console.log(`   Paradas restantes: ${sortedUnvisitedStops.length}`);
      console.log(
        `   Próximos destinos: ${sortedUnvisitedStops.map((s) => s.name).join(" → ")}`,
      );

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status}`);
        // Fallback: linha reta entre os pontos
        setDetailedRoute(points);
        return;
      }

      const data = await response.json();

      if (data.paths && data.paths.length > 0) {
        const path = data.paths[0];
        const coordinates = path.points.coordinates.map(
          (coord: number[]) => [coord[1], coord[0]] as [number, number],
        );

        console.log(
          `✅ [ObserverMap] Nova rota carregada: ${coordinates.length} pontos`,
        );
        console.log(`   Distância: ${(path.distance / 1000).toFixed(2)} km`);
        console.log(`   Próximo destino: ${sortedUnvisitedStops[0]?.name}`);

        // Salvar no cache
        routeCache[cacheKey] = {
          points: coordinates,
          timestamp: Date.now(),
        };

        setDetailedRoute(coordinates);
      } else {
        console.warn("⚠️ Nenhuma rota encontrada, usando linha reta");
        setDetailedRoute(points);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("❌ Erro ao buscar rota detalhada:", error.message);
        setDetailedRoute(points);
      }
    } finally {
      setIsFetchingRoute(false);
    }
  }, [
    driverLocation,
    sortedUnvisitedStops,
    visitedStops,
    generateCacheKey,
    detailedRoute.length,
  ]);

  // 🔥 Executar busca quando motorista se mover ou paradas visitadas mudarem
  useEffect(() => {
    fetchDetailedRoute();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDetailedRoute]);

  // 🔥 Usar rota detalhada
  const displayRoute = detailedRoute;
  const hasRoute = displayRoute.length > 0;
  const isLoadingRoute = isLoading || isFetchingRoute;

  // Log para debug
  useEffect(() => {
    if (sortedUnvisitedStops.length > 0) {
      console.log(
        `📍 [ObserverMap] Próximos destinos: ${sortedUnvisitedStops.map((s) => s.name).join(" → ")}`,
      );
    }
  }, [sortedUnvisitedStops]);

  // Calcular bounds
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

        {/* Linha da rota detalhada */}
        {hasRoute && (
          <Polyline
            positions={displayRoute}
            pathOptions={{
              color: "#D35400",
              weight: 4,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* Marcadores das paradas NÃO VISITADAS */}
        {sortedUnvisitedStops.map((stop, index) => {
          return (
            <Marker
              key={stop.id || index}
              position={[stop.latitude, stop.longitude]}
              icon={index === 0 ? defaultIcon : defaultIcon}
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
          );
        })}

        {/* Marcadores das paradas VISITADAS (verdes) */}
        {stops
          .filter((s) => visitedStops.includes(s.id))
          .map((stop, index) => (
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

        {/* Localização do motorista */}
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

      {/* Indicador de carregamento */}
      {isLoadingRoute && !hasRoute && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-xl p-4 shadow-lg flex items-center gap-3">
            <Loader2 className="animate-spin text-[#D35400]" size={24} />
            <span className="text-slate-700 font-medium">
              Calculando nova rota...
            </span>
          </div>
        </div>
      )}

      {/* Informações da rota */}
      {hasRoute && !isLoadingRoute && sortedUnvisitedStops.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-2 shadow-md z-[1000] text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#D35400] rounded-full" />
              <span>Próximo: {sortedUnvisitedStops[0]?.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🚗 Motorista online</span>
            </div>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg p-2 shadow-md z-[1000] text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[#D35400] rounded-full" />
            <span>Rota</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage: `url(https://cdn-icons-png.flaticon.com/512/3097/3097180.png)`,
              }}
            />
            <span>Motorista</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>Concluída</span>
          </div>
        </div>
      </div>
    </div>
  );
}

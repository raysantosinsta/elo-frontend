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
  // 🔥 ROTA TOTALMENTE FIXA - calculada apenas uma vez e NUNCA mais muda
  const [fullFixedRoute, setFullFixedRoute] = useState<[number, number][]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // 🔥 REFS PARA CONTROLE
  const abortControllerRef = useRef<AbortController | null>(null);
  const routeCalculatedRef = useRef(false);
  const initialDriverLocationRef = useRef<[number, number] | null>(null);

  // 🔥 FILTRAR PARADAS NÃO VISITADAS
  const unvisitedStops = useMemo(() => {
    return stops.filter((stop) => !visitedStops.includes(stop.id));
  }, [stops, visitedStops]);

  // 🔥 PARADA ATUAL (próximo destino)
  const currentDestination = useMemo(() => {
    if (unvisitedStops.length === 0) return null;
    return unvisitedStops[0];
  }, [unvisitedStops]);

  // 🔥 FUNÇÃO PARA BUSCAR ROTA COMPLETA (UMA ÚNICA VEZ)
  const fetchCompleteRoute = useCallback(async () => {
    // 🔥 CRÍTICO: Se já calculou a rota, NUNCA recalcular
    if (routeCalculatedRef.current && fullFixedRoute.length > 0) {
      console.log(
        "✅ [ObserverMap] Rota JÁ CALCULADA e FIXA - mantendo inalterada",
      );
      return;
    }

    // Salvar a posição inicial do motorista (para referência)
    if (driverLocation && !initialDriverLocationRef.current) {
      initialDriverLocationRef.current = driverLocation;
    }

    // Se não tem motorista, aguarda
    if (!driverLocation || !driverLocation[0] || !driverLocation[1]) {
      console.log("⏳ [ObserverMap] Aguardando localização do motorista...");
      return;
    }

    // Se não tem paradas, não faz nada
    if (unvisitedStops.length === 0) {
      console.log("🏁 [ObserverMap] Todas as paradas visitadas!");
      return;
    }

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsCalculatingRoute(true);
    setRouteError(null);
    abortControllerRef.current = new AbortController();

    try {
      // 🔥 IMPORTANTE: Usar a localização INICIAL do motorista, não a atual
      const originLat =
        initialDriverLocationRef.current?.[0] || driverLocation[0];
      const originLng =
        initialDriverLocationRef.current?.[1] || driverLocation[1];

      // Construir pontos fixos: posição inicial do motorista + TODAS as paradas não visitadas
      const points: [number, number][] = [[originLat, originLng]];

      // Adicionar todas as paradas na ordem
      unvisitedStops.forEach((stop) => {
        if (stop.latitude && stop.longitude) {
          points.push([stop.latitude, stop.longitude]);
        }
      });

      console.log("🗺️ [ObserverMap] Calculando rota FIXA (UMA ÚNICA VEZ)...");
      console.log(
        `   Posição inicial do motorista: ${originLat.toFixed(6)}, ${originLng.toFixed(6)}`,
      );
      console.log(`   Total de destinos: ${unvisitedStops.length}`);
      console.log(
        `   Rota será mantida permanentemente, mesmo com movimento do motorista`,
      );

      // Montar URL do GraphHopper
      const pointsStr = points.map((p) => `${p[0]},${p[1]}`).join("&point=");
      const url = `https://graphhopper.com/api/1/route?point=${pointsStr}&vehicle=car&points_encoded=false&key=${GRAPHHOPPER_API_KEY}`;

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.paths && data.paths.length > 0) {
        const path = data.paths[0];
        const coordinates = path.points.coordinates.map(
          (coord: number[]) => [coord[1], coord[0]] as [number, number],
        );

        console.log(`✅ [ObserverMap] Rota FIXA calculada com sucesso!`);
        console.log(`   Pontos totais: ${coordinates.length}`);
        console.log(
          `   Distância total: ${(path.distance / 1000).toFixed(2)} km`,
        );
        console.log(`   Tempo estimado: ${Math.round(path.time / 60000)} min`);
        console.log(`   🔒 Esta rota NÃO será alterada durante a simulação`);

        setFullFixedRoute(coordinates);
        routeCalculatedRef.current = true;
        setRouteError(null);
      } else {
        throw new Error("Nenhuma rota encontrada");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("❌ [ObserverMap] Erro ao calcular rota:", error.message);
        setRouteError("Erro ao calcular rota. Recarregue a página.");

        // Fallback: linha reta entre os pontos
        const originLat =
          initialDriverLocationRef.current?.[0] || driverLocation[0];
        const originLng =
          initialDriverLocationRef.current?.[1] || driverLocation[1];
        const fallbackPoints: [number, number][] = [[originLat, originLng]];
        unvisitedStops.forEach((stop) => {
          if (stop.latitude && stop.longitude) {
            fallbackPoints.push([stop.latitude, stop.longitude]);
          }
        });
        setFullFixedRoute(fallbackPoints);
        routeCalculatedRef.current = true;
      }
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [driverLocation, unvisitedStops, fullFixedRoute.length]);

  // 🔥 CALCULAR ROTA APENAS UMA VEZ (quando tiver localização E paradas)
  useEffect(() => {
    if (
      driverLocation &&
      unvisitedStops.length > 0 &&
      !routeCalculatedRef.current
    ) {
      console.log("🚀 [ObserverMap] Iniciando cálculo da rota fixa...");
      fetchCompleteRoute();
    }
  }, [driverLocation, unvisitedStops, fetchCompleteRoute]);

  // 🔥 QUANDO UMA PARADA É VISITADA, NÃO RECALCULA A ROTA
  // Apenas atualizamos a UI, mas a rota permanece a mesma
  useEffect(() => {
    if (unvisitedStops.length > 0 && routeCalculatedRef.current) {
      console.log(
        `📍 [ObserverMap] Próximo destino: ${unvisitedStops[0]?.name}`,
      );
      console.log(`   Rota permanece FIXA e inalterada`);
    }
  }, [unvisitedStops]);

  // 🔥 ROTA EXIBIDA = ROTA FIXA COMPLETA (NÃO corta trecho)
  // Isso garante que a linha sempre aparece completa, igual no motorista
  const displayRoute = fullFixedRoute;
  const hasRoute = displayRoute.length > 0;
  const isLoadingRoute = isLoading || isCalculatingRoute;

  // 🔥 CALCULAR BOUNDS (zoom para mostrar rota completa)
  const bounds = useMemo(() => {
    const allPoints: [number, number][] = [];

    if (displayRoute.length > 0) {
      allPoints.push(...displayRoute);
    } else {
      unvisitedStops.forEach((stop) => {
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
  }, [displayRoute, unvisitedStops, driverLocation]);

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

        {/* 🔥 LINHA DA ROTA - TOTALMENTE FIXA, NUNCA MUDA */}
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
        {unvisitedStops.map((stop, index) => (
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

        {/* 🔥 LOCALIZAÇÃO DO MOTORISTA (móvel) */}
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

      {/* 🔥 INDICADOR DE CARREGAMENTO INICIAL */}
      {isLoadingRoute && !hasRoute && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-xl p-4 shadow-lg flex items-center gap-3">
            <Loader2 className="animate-spin text-[#D35400]" size={24} />
            <span className="text-slate-700 font-medium">
              Calculando rota otimizada...
            </span>
          </div>
        </div>
      )}

      {/* 🔥 INFORMAÇÕES DA ROTA FIXA */}
      {hasRoute && !isLoadingRoute && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-2 shadow-md z-[1000] text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#D35400] rounded-full" />
            <span>
              🔒 Rota fixa • {unvisitedStops.length} parada(s) restante(s)
            </span>
          </div>
          {currentDestination && (
            <div className="text-xs text-slate-500 mt-1">
              🎯 Próximo: {currentDestination.name}
            </div>
          )}
        </div>
      )}

      {/* 🔥 INDICADOR DE QUE A ROTA É FIXA */}
      {hasRoute && routeCalculatedRef.current && (
        <div className="absolute top-4 left-4 bg-green-100/90 backdrop-blur rounded-lg px-2 py-1 shadow-md z-[1000] text-xs">
          <span className="text-green-700 flex items-center gap-1">
            🔒 Rota calculada e fixa
          </span>
        </div>
      )}

      {/* 🔥 INDICADOR DE ERRO */}
      {routeError && !hasRoute && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-100/95 backdrop-blur rounded-lg p-2 shadow-md z-[1000]">
          <p className="text-red-700 text-xs text-center">{routeError}</p>
        </div>
      )}

      {/* 🔥 LEGENDA */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg p-2 shadow-md z-[1000] text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#D35400] rounded-full" />
            <span>Rota fixa (não muda)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage: `url(https://cdn-icons-png.flaticon.com/512/3097/3097180.png)`,
                backgroundSize: "contain",
              }}
            />
            <span>Motorista (se move)</span>
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

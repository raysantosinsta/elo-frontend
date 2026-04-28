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
  // 🔥 ROTA DO BACKEND (já otimizada)
  const [backendRoute, setBackendRoute] = useState<[number, number][]>([]);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  
  const routeLoadedRef = useRef(false);
  const lastRouteKeyRef = useRef<string>("");

  // 🔥 GERAR CHAVE ÚNICA PARA A ROTA (baseada nos stops não visitados)
  const getRouteKey = useCallback(() => {
    const unvisitedIds = stops.filter(s => !visitedStops.includes(s.id)).map(s => s.id);
    return unvisitedIds.join(",");
  }, [stops, visitedStops]);

  // 🔥 ORDEM OTIMIZADA DAS PARADAS (vem do routePath do backend)
  // O routePath já contém a ordem correta: motorista + paradas na ordem otimizada
  const unvisitedStopsInOptimizedOrder = useMemo(() => {
    if (!routePath || routePath.length === 0) return [];
    
    // Extrair as coordenadas das paradas da rota otimizada (ignorando a primeira que é o motorista)
    const routeCoordinates = routePath.slice(1);
    
    // Encontrar as paradas que correspondem a essas coordenadas
    const optimizedStops: any[] = [];
    
    for (const coord of routeCoordinates) {
      const stop = stops.find(s => 
        Math.abs(s.latitude - coord[0]) < 0.001 && 
        Math.abs(s.longitude - coord[1]) < 0.001 &&
        !visitedStops.includes(s.id)
      );
      if (stop && !optimizedStops.find(s => s.id === stop.id)) {
        optimizedStops.push(stop);
      }
    }
    
    // Adicionar as paradas visitadas no final (para manter o marcador verde)
    const visited = stops.filter(s => visitedStops.includes(s.id));
    
    console.log("📋 [ObserverMap] Ordem otimizada do backend:");
    optimizedStops.forEach((stop, idx) => {
      console.log(`   ${idx + 1}. ${stop.name}`);
    });
    
    return [...optimizedStops, ...visited];
  }, [routePath, stops, visitedStops]);

  // 🔥 PARADA ATUAL (primeira não visitada na ordem otimizada)
  const currentDestination = useMemo(() => {
    const notVisited = unvisitedStopsInOptimizedOrder.filter(s => !visitedStops.includes(s.id));
    return notVisited.length > 0 ? notVisited[0] : null;
  }, [unvisitedStopsInOptimizedOrder, visitedStops]);

  // 🔥 FUNÇÃO PARA BUSCAR ROTA DETALHADA DO GRAPHHOPPER (SEGUINDO RUAS)
  const fetchDetailedRoute = useCallback(async () => {
    // Se já tem uma rota carregada e a chave não mudou, mantém
    const currentKey = getRouteKey();
    if (routeLoadedRef.current && lastRouteKeyRef.current === currentKey && backendRoute.length > 0) {
      console.log("✅ [ObserverMap] Rota já carregada, mantendo");
      return;
    }

    if (!driverLocation || !driverLocation[0] || !driverLocation[1]) {
      console.log("⏳ [ObserverMap] Aguardando localização do motorista...");
      return;
    }

    if (unvisitedStopsInOptimizedOrder.length === 0) {
      console.log("🏁 [ObserverMap] Todas as paradas visitadas!");
      return;
    }

    // 🔥 USAR A ORDEM OTIMIZADA DO BACKEND
    const points: [number, number][] = [driverLocation];
    
    // Adicionar apenas as paradas NÃO VISITADAS na ordem otimizada
    const notVisited = unvisitedStopsInOptimizedOrder.filter(s => !visitedStops.includes(s.id));
    
    notVisited.forEach((stop) => {
      if (stop.latitude && stop.longitude) {
        points.push([stop.latitude, stop.longitude]);
      }
    });

    if (points.length < 2) {
      setBackendRoute(points);
      return;
    }

    setIsFetchingRoute(true);
    lastRouteKeyRef.current = currentKey;

    try {
      const pointsStr = points.map((p) => `${p[0]},${p[1]}`).join("&point=");
      // 🔥 optimize=false para manter a ordem exata que passamos
      const url = `https://graphhopper.com/api/1/route?point=${pointsStr}&vehicle=car&optimize=false&points_encoded=false&key=${GRAPHHOPPER_API_KEY}`;

      console.log("🌐 [ObserverMap] Buscando rota detalhada (mantendo ordem otimizada)...");
      console.log(`   Ordem solicitada:`);
      notVisited.forEach((stop, idx) => {
        console.log(`     ${idx + 1}. ${stop.name}`);
      });

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`❌ GraphHopper Error: ${response.status}`);
        // Fallback: linha reta
        setBackendRoute(points);
        routeLoadedRef.current = true;
        return;
      }

      const data = await response.json();

      if (data.paths && data.paths.length > 0) {
        const path = data.paths[0];
        const coordinates = path.points.coordinates.map(
          (coord: number[]) => [coord[1], coord[0]] as [number, number]
        );

        console.log(`✅ [ObserverMap] Rota carregada: ${coordinates.length} pontos`);
        console.log(`   Distância: ${(path.distance / 1000).toFixed(2)} km`);
        
        setBackendRoute(coordinates);
        routeLoadedRef.current = true;
      } else {
        setBackendRoute(points);
        routeLoadedRef.current = true;
      }
    } catch (error) {
      console.error("❌ [ObserverMap] Erro:", error);
      setBackendRoute(points);
      routeLoadedRef.current = true;
    } finally {
      setIsFetchingRoute(false);
    }
  }, [driverLocation, unvisitedStopsInOptimizedOrder, visitedStops, getRouteKey, backendRoute.length]);

  // 🔥 RECALCULAR QUANDO PARADAS MUDAREM
  useEffect(() => {
    if (driverLocation && unvisitedStopsInOptimizedOrder.length > 0) {
      fetchDetailedRoute();
    }
  }, [driverLocation, unvisitedStopsInOptimizedOrder, visitedStops, fetchDetailedRoute]);

  const displayRoute = backendRoute;
  const hasRoute = displayRoute.length > 0;
  const isLoadingRoute = isLoading || isFetchingRoute;

  // 🔥 CALCULAR BOUNDS
  const bounds = useMemo(() => {
    const allPoints: [number, number][] = [];

    if (displayRoute.length > 0) {
      allPoints.push(...displayRoute);
    } else {
      unvisitedStopsInOptimizedOrder.forEach((stop) => {
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
  }, [displayRoute, unvisitedStopsInOptimizedOrder, driverLocation]);

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

        {/* LINHA DA ROTA (ordem otimizada) */}
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

        {/* MARCADORES - NA ORDEM OTIMIZADA */}
        {unvisitedStopsInOptimizedOrder.map((stop, index) => {
          const isVisited = visitedStops.includes(stop.id);
          const isCurrent = !isVisited && index === 0;
          
          return (
            <Marker
              key={stop.id || index}
              position={[stop.latitude, stop.longitude]}
              icon={isVisited ? visitedIcon : defaultIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>
                    {isVisited ? "✓" : `${index + 1}.`} {stop.name || "Parada"}
                  </strong>
                  <p className="text-xs text-gray-500 mt-1">{stop.address}</p>
                  <p className="text-xs text-gray-500">
                    {stop.city}/{stop.state}
                  </p>
                  {isCurrent && (
                    <p className="text-orange-600 text-xs mt-1 font-semibold">
                      🎯 Próximo destino (ordem otimizada)
                    </p>
                  )}
                  {isVisited && (
                    <p className="text-green-600 text-xs mt-1 font-semibold">
                      ✅ Concluída
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* LOCALIZAÇÃO DO MOTORISTA */}
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

      {/* LOADING */}
      {isLoadingRoute && !hasRoute && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-xl p-4 shadow-lg flex items-center gap-3">
            <Loader2 className="animate-spin text-[#D35400]" size={24} />
            <span className="text-slate-700 font-medium">
              Carregando rota otimizada...
            </span>
          </div>
        </div>
      )}

      {/* INFORMAÇÕES DA ORDEM OTIMIZADA */}
      {hasRoute && !isLoadingRoute && currentDestination && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-2 shadow-md z-[1000] text-xs">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#D35400] rounded-full" />
              <span className="font-medium">
                🎯 Próximo: {currentDestination.name}
              </span>
            </div>
            <div className="text-slate-500 text-xs">
              Rota otimizada por {routePath.length > 0 ? "distância" : "ordem original"}
            </div>
          </div>
        </div>
      )}

      {/* LEGENDA */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg p-2 shadow-md z-[1000] text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#D35400] rounded-full" />
            <span>Rota otimizada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-contain bg-no-repeat bg-center" style={{ backgroundImage: `url(https://cdn-icons-png.flaticon.com/512/3097/3097180.png)`, backgroundSize: "contain" }} />
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
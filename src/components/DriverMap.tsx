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

const iconUrls = {
  default: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadow: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  car: "https://cdn-icons-png.flaticon.com/512/3097/3097180.png",
  green:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  red: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
};

let defaultIcon: L.Icon | undefined;
let activeIcon: L.Icon | undefined;
let visitedIcon: L.Icon | undefined;
let driverIcon: L.Icon | undefined;

if (typeof window !== "undefined") {
  defaultIcon = L.icon({
    iconUrl: iconUrls.default,
    shadowUrl: iconUrls.shadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  activeIcon = L.icon({
    iconUrl: iconUrls.red,
    shadowUrl: iconUrls.shadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  visitedIcon = L.icon({
    iconUrl: iconUrls.green,
    shadowUrl: iconUrls.shadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  driverIcon = L.icon({
    iconUrl: iconUrls.car,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// 🔥 FALLBACK: Fortaleza - Centro
const FALLBACK_LOCATION: [number, number] = [-3.7319, -38.5267];

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
  const [apiError, setApiError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRouteKeyRef = useRef<string>("");

  // 🔥 USAR FALLBACK SE NÃO TIVER LOCALIZAÇÃO
  const effectiveLocation = myLocation || FALLBACK_LOCATION;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isMapReady) {
        console.log("🗺️ [RouteMap] Forçando ready state");
        setIsMapReady(true);
      }
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [isMapReady]);

  useEffect(() => {
    if (effectiveLocation && !isMapReady) {
      console.log("🗺️ [RouteMap] Localização efetiva recebida:", effectiveLocation);
      setTimeout(() => {
        setIsMapReady(true);
      }, 500);
    }
  }, [effectiveLocation, isMapReady]);

  useEffect(() => {
    if (useBackendRoute && backendRoute.length > 0) {
      console.log("🗺️ [OBSERVADOR] Usando rota do backend:", backendRoute.length);
      setFullRoutePath(backendRoute);
    }
  }, [useBackendRoute, backendRoute]);

  const unvisitedStops = useMemo(() => {
    if (preserveOrder) {
      return stops.filter(
        (stop, index) => !visitedStops.includes(stop.id || String(index))
      );
    }
    return stops.filter(
      (stop, index) => !visitedStops.includes(stop.id || String(index))
    );
  }, [stops, visitedStops, preserveOrder]);

  // 🔥 FUNÇÃO PARA BUSCAR ROTA NO OSRM (GRATUITO, SEM API KEY)
  const fetchRouteFromOSRM = async (
    coordinates: string
  ): Promise<[number, number][] | null> => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
      
      console.log("🌐 Chamando OSRM API (gratuita):", url.substring(0, 150) + "...");

      const response = await fetch(url, {
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error OSRM: ${response.status}`);
        setApiError(`OSRM Error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const routeCoordinates = data.routes[0].geometry.coordinates.map(
          (coord: number[]) => [coord[1], coord[0]]
        );
        console.log(`✅ Rota OSRM recebida: ${routeCoordinates.length} pontos`);
        setApiError(null);
        return routeCoordinates;
      }

      console.warn("⚠️ Nenhuma rota encontrada no OSRM, code:", data.code);
      setApiError(`OSRM: ${data.code}`);
      return null;
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("❌ Erro na requisição OSRM:", error.message);
        setApiError(`Erro: ${error.message}`);
      }
      return null;
    }
  };

// 🔥 FUNÇÃO PARA CALCULAR ROTA COMPLETA COM LOGS DETALHADOS
const fetchCompleteRoute = useCallback(async () => {
  console.log("=".repeat(60));
  console.log("🚀 [fetchCompleteRoute] INICIANDO CÁLCULO DE ROTA");
  console.log("=".repeat(60));

  if (!effectiveLocation) {
    console.log("⏳ [ERRO] Aguardando localização...");
    setFullRoutePath([]);
    return;
  }

  if (unvisitedStops.length === 0) {
    console.log("🏁 Todas as paradas visitadas");
    setFullRoutePath([]);
    return;
  }

  console.log(`📊 [INFO] Paradas não visitadas: ${unvisitedStops.length}`);
  console.log(`📍 [INFO] Localização efetiva (fallback ou GPS): [${effectiveLocation[0]}, ${effectiveLocation[1]}]`);

  // 🔥 LOG DETALHADO DAS PARADAS
  console.log("\n📋 [LISTA] Paradas não visitadas:");
  unvisitedStops.forEach((stop, idx) => {
    console.log(`   ${idx + 1}. ${stop.name || "Sem nome"}`);
    console.log(`      ID: ${stop.id}`);
    console.log(`      Endereço: ${stop.address}, ${stop.city}/${stop.state}`);
    console.log(`      📍 Coordenada original: lat=${stop.latitude}, lng=${stop.longitude}`);
    
    // Verificar se coordenada está trocada
    const lat = stop.latitude;
    const lng = stop.longitude;
    let isValid = true;
    let warning = "";
    
    if (isNaN(lat) || isNaN(lng)) {
      isValid = false;
      warning = "❌ NaN - coordenada inválida!";
    } else if (lat === 0 && lng === 0) {
      isValid = false;
      warning = "❌ Zero - coordenada não preenchida!";
    } else if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
      isValid = false;
      warning = `⚠️ PROVAVELMENTE TROCADA! Latitude (${lat}) > 90, parece ser Longitude.`;
    } else if (Math.abs(lat) <= 90 && Math.abs(lng) > 180) {
      isValid = false;
      warning = `⚠️ Longitude (${lng}) > 180, inválida!`;
    } else if (lat > 0 && lng < 0 && lat < 90 && lng > -180) {
      warning = `✅ Parece correta (Lat positiva, Lng negativa - hemisfério Norte/Oeste)`;
    } else if (lat < 0 && lng < 0 && lat > -90 && lng > -180) {
      warning = `✅ Parece correta (Lat negativa, Lng negativa - hemisfério Sul/Oeste - Brasil)`;
    } else {
      warning = `⚠️ Verificar: Lat=${lat}, Lng=${lng}`;
    }
    
    console.log(`      🔍 Validação: ${warning}`);
    if (!isValid) {
      console.error(`      ❌ PARADA COM PROBLEMA!`);
    }
  });

  // Validar coordenadas
  const invalidStop = unvisitedStops.find(
    (stop) =>
      isNaN(stop.latitude) ||
      isNaN(stop.longitude) ||
      stop.latitude === 0 ||
      stop.longitude === 0 ||
      Math.abs(stop.latitude) > 90 ||
      Math.abs(stop.longitude) > 180
  );
  
  if (invalidStop) {
    console.error(`❌ Parada com coordenadas inválidas: ${invalidStop.name}`);
    console.error(`   Lat: ${invalidStop.latitude}, Lng: ${invalidStop.longitude}`);
    return;
  }

  const routeKey = `${effectiveLocation[0].toFixed(6)},${effectiveLocation[1].toFixed(6)}|${unvisitedStops.map((s) => s.id).join(",")}`;
  console.log(`🔑 [KEY] RouteKey: ${routeKey}`);

  if (lastRouteKeyRef.current === routeKey && fullRoutePath.length > 0) {
    console.log("🔄 Rota não mudou, mantendo atual (${fullRoutePath.length} pontos)");
    return;
  }

  console.log("🆕 Calculando nova rota com OSRM...");

  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  setIsLoadingRoute(true);
  abortControllerRef.current = new AbortController();

  try {
    // 🔥 CORRIGIR COORDENADAS SE ESTIVEREM TROCADAS
    const points: [number, number][] = [];
    
    // Corrigir ponto inicial
    let startLat = effectiveLocation[0];
    let startLng = effectiveLocation[1];
    
    console.log(`\n🔧 [CORREÇÃO] Validando ponto inicial:`);
    console.log(`   Original: lat=${startLat}, lng=${startLng}`);
    
    // Se latitude for > 90 e longitude <= 90, provavelmente estão trocadas
    if (Math.abs(startLat) > 90 && Math.abs(startLng) <= 90) {
      console.warn(`   ⚠️ Coordenadas iniciais parecem trocadas! Corrigindo...`);
      [startLat, startLng] = [startLng, startLat];
      console.log(`   Corrigido: lat=${startLat}, lng=${startLng}`);
    }
    
    points.push([startLat, startLng]);
    
    // Corrigir cada parada
    unvisitedStops.forEach((stop, idx) => {
      let stopLat = stop.latitude;
      let stopLng = stop.longitude;
      
      console.log(`\n🔧 [CORREÇÃO] Validando parada ${idx + 1}: ${stop.name}`);
      console.log(`   Original: lat=${stopLat}, lng=${stopLng}`);
      
      // Se latitude for > 90 e longitude <= 90, provavelmente estão trocadas
      if (Math.abs(stopLat) > 90 && Math.abs(stopLng) <= 90) {
        console.warn(`   ⚠️ Coordenadas da parada parecem trocadas! Corrigindo...`);
        [stopLat, stopLng] = [stopLng, stopLat];
        console.log(`   Corrigido: lat=${stopLat}, lng=${stopLng}`);
      }
      
      // Validar se está dentro do Brasil (aproximadamente)
      if (stopLat < -33 || stopLat > 5) {
        console.warn(`   ⚠️ Latitude (${stopLat}) fora do esperado para Brasil (-33 a 5)`);
      }
      if (stopLng < -74 || stopLng > -34) {
        console.warn(`   ⚠️ Longitude (${stopLng}) fora do esperado para Brasil (-74 a -34)`);
      }
      
      points.push([stopLat, stopLng]);
    });
    
    console.log(`\n📦 [PONTOS] Total de pontos na rota: ${points.length}`);
    console.log(`📍 Pontos corrigidos:`);
    points.forEach((point, idx) => {
      console.log(`   ${idx}: [${point[0]}, ${point[1]}]`);
    });

    // Formato OSRM: longitude,latitude;longitude,latitude
    const coordinates = points
      .map(point => `${point[1]},${point[0]}`)
      .join(";");

    console.log(`\n🌐 [OSRM] URL (primeiros 300 chars):`);
    console.log(`   https://router.project-osrm.org/route/v1/driving/${coordinates.substring(0, 300)}...`);

    const routeCoordinates = await fetchRouteFromOSRM(coordinates);

    if (routeCoordinates && routeCoordinates.length > 0) {
      setFullRoutePath(routeCoordinates);
      lastRouteKeyRef.current = routeKey;
      console.log(`✅ Rota OSRM carregada! ${routeCoordinates.length} pontos`);
      console.log(`📍 Primeiro ponto da rota: [${routeCoordinates[0][0]}, ${routeCoordinates[0][1]}]`);
      console.log(`📍 Último ponto da rota: [${routeCoordinates[routeCoordinates.length - 1][0]}, ${routeCoordinates[routeCoordinates.length - 1][1]}]`);
    } else {
      console.warn("⚠️ Falha no OSRM, mantendo rota anterior");
    }
  } catch (error: any) {
    if (error.name !== "AbortError") {
      console.error("❌ Erro ao buscar rota:", error);
    }
  } finally {
    setIsLoadingRoute(false);
    console.log("=".repeat(60));
    console.log("🏁 [fetchCompleteRoute] FINALIZADO");
    console.log("=".repeat(60) + "\n");
  }
}, [effectiveLocation, unvisitedStops, fullRoutePath.length]);

  // Quando effectiveLocation mudar
  useEffect(() => {
    if (effectiveLocation && unvisitedStops.length > 0) {
      const timer = setTimeout(() => {
        fetchCompleteRoute();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (unvisitedStops.length === 0) {
      setFullRoutePath([]);
    }
  }, [effectiveLocation, unvisitedStops, fetchCompleteRoute]);

  useEffect(() => {
    const handleRouteUpdated = () => {
      console.log("🔄 Rota atualizada, recalculando...");
      fetchCompleteRoute();
    };

    window.addEventListener("route-updated", handleRouteUpdated);
    return () => window.removeEventListener("route-updated", handleRouteUpdated);
  }, [fetchCompleteRoute]);

  const defaultCenter: [number, number] = FALLBACK_LOCATION;

  return (
    <div className="relative w-full h-full border rounded-lg overflow-hidden bg-gray-100">
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
        center={effectiveLocation || defaultCenter}
        zoom={13}
        className="w-full h-full"
        style={{
          height: "100%",
          width: "100%",
        }}
        whenReady={() => {
          console.log("🗺️ [RouteMap] MapContainer whenReady");
          setIsMapReady(true);
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
          const routePosition = unvisitedStops.findIndex((s) => s.id === stop.id) + 1;

          let iconToUse = defaultIcon;
          if (isVisited) iconToUse = visitedIcon;
          else if (isCurrent) iconToUse = activeIcon;

          return (
            <Marker
              key={stop.id || index}
              position={[stop.latitude, stop.longitude]}
              icon={iconToUse}
              eventHandlers={{ click: () => onStopClick?.(stop, index) }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>
                    {isVisited ? "✓ " : routePosition > 0 ? `${routePosition}. ` : "📌 "}
                    {stop.name || "Parada"}
                  </strong>
                  <p>{stop.address}</p>
                  <p>{stop.city}/{stop.state}</p>
                  {isVisited && <p className="text-green-600 text-xs mt-1">✅ Concluída</p>}
                  {!isVisited && routePosition === 1 && (
                    <p className="text-orange-600 text-xs mt-1">🎯 Próximo destino!</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {myLocation && (
          <Marker position={[myLocation[0], myLocation[1]]} icon={driverIcon} zIndexOffset={1000}>
            <Popup>
              <div className="text-sm">
                <strong>🚗 Sua localização (GPS)</strong>
                <p className="text-xs text-gray-500 mt-1">
                  Lat: {myLocation[0].toFixed(6)}<br />
                  Lng: {myLocation[1].toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {!myLocation && effectiveLocation && (
          <Marker position={[effectiveLocation[0], effectiveLocation[1]]} icon={driverIcon} zIndexOffset={1000}>
            <Popup>
              <div className="text-sm">
                <strong>📍 Localização padrão (Fortaleza)</strong>
                <p className="text-xs text-gray-500 mt-1">
                  Aguardando sinal de GPS...<br />
                  Usando localização padrão
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

        {effectiveLocation && <RecenterMap location={effectiveLocation} />}

        {isLoadingRoute && (
          <div className="absolute top-4 right-4 bg-white/90 px-3 py-1.5 rounded-full shadow-md z-[1000] text-xs font-bold flex items-center gap-2">
            <div className="animate-spin h-3 w-3 border-2 border-[#D35400] border-t-transparent rounded-full" />
            CALCULANDO ROTA OSRM...
          </div>
        )}

        {apiError && (
          <div className="absolute top-4 left-4 bg-red-100/90 px-3 py-1.5 rounded-full shadow-md z-[1000] text-xs font-medium text-red-800">
            ⚠️ {apiError}
          </div>
        )}

        {effectiveLocation && unvisitedStops.length > 0 && fullRoutePath.length === 0 && !isLoadingRoute && (
          <div className="absolute bottom-4 left-4 right-4 bg-yellow-100/90 px-3 py-2 rounded-lg shadow-md z-[1000] text-xs font-medium text-yellow-800 text-center">
            🗺️ Tentando conectar com OSRM para {unvisitedStops.length} {unvisitedStops.length === 1 ? "parada" : "paradas"}...
          </div>
        )}

        {effectiveLocation && fullRoutePath.length > 0 && !isLoadingRoute && (
          <div className="absolute bottom-4 left-4 bg-green-100/90 px-3 py-1.5 rounded-full shadow-md z-[1000] text-xs font-medium text-green-800">
            ✅ Rota OSRM carregada
          </div>
        )}
      </MapContainer>
    </div>
  );
}
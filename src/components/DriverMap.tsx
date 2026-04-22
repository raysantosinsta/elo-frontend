/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';

// --- ÍCONES ---
const iconUrls = {
  default: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadow: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  car: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png',
  green: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  red: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
};

const defaultIcon = L.icon({ iconUrl: iconUrls.default, shadowUrl: iconUrls.shadow, iconSize: [25, 41], iconAnchor: [12, 41] });
const activeIcon = L.icon({ iconUrl: iconUrls.red, shadowUrl: iconUrls.shadow, iconSize: [25, 41], iconAnchor: [12, 41] });
const visitedIcon = L.icon({ iconUrl: iconUrls.green, shadowUrl: iconUrls.shadow, iconSize: [25, 41], iconAnchor: [12, 41] });
const driverIcon = L.icon({ iconUrl: iconUrls.car, iconSize: [40, 40], iconAnchor: [20, 20] });

const GRAPHHOPPER_API_KEY = 'ab75310a-f959-4b72-b322-11cce5b18f6a';

function RecenterMap({ location }: { location: [number, number] }) {
  const map = useMap();
  const lastLoc = useRef<string>("");

  useEffect(() => {
    const locString = location.join(',');
    if (lastLoc.current !== locString) {
      map.flyTo(location, map.getZoom(), { animate: true, duration: 0.5 });
      lastLoc.current = locString;
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
}

export default function RouteMap({ 
  stops, 
  currentStopIndex, 
  myLocation, 
  visitedStops = [],
  onStopClick 
}: RouteMapProps) {
  const [fullRoutePath, setFullRoutePath] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRouteKeyRef = useRef<string>("");
  const [isSimulating, setIsSimulating] = useState(false);

  // 🔥 PEGA SOMENTE AS PARADAS NÃO VISITADAS, MANTENDO A ORDEM ORIGINAL DO BACKEND
  const unvisitedStops = useMemo(() => {
    // Filtra as não visitadas
    const unvisited = stops.filter((stop, index) => !visitedStops.includes(stop.id || String(index)));
    
    // Mantém a ordem original do array (já está na ordem correta do backend)
    console.log('📊 Paradas não visitadas (na ordem do backend):');
    unvisited.forEach((stop, idx) => {
      console.log(`   ${idx + 1}. ${stop.name} - lat: ${stop.latitude}, lng: ${stop.longitude}`);
    });
    
    return unvisited;
  }, [stops, visitedStops]);

  // 🔥 FUNÇÃO PARA CRIAR ROTA USANDO GRAPHHOPPER
  const fetchRouteFromGraphHopper = async (points: string[]): Promise<[number, number][] | null> => {
    try {
      const routePoints = points.join('&point=');
      
      // Usar a API sem optimize=true para garantir a ordem exata
      const url = `https://graphhopper.com/api/1/route?point=${routePoints}&vehicle=car&points_encoded=false&key=${GRAPHHOPPER_API_KEY}`;
      
      console.log('🌐 Chamando GraphHopper API...');
      console.log(`   URL: ${url.replace(GRAPHHOPPER_API_KEY, 'HIDDEN')}`);
      
      const response = await fetch(url, { signal: abortControllerRef.current?.signal });
      
      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} - ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.paths && data.paths.length > 0) {
        const coordinates = data.paths[0].points.coordinates.map(
          (coord: number[]) => [coord[1], coord[0]]
        );
        console.log(`✅ Rota recebida: ${coordinates.length} pontos`);
        console.log(`📏 Distância: ${(data.paths[0].distance / 1000).toFixed(2)} km`);
        return coordinates;
      }
      
      console.warn("⚠️ Nenhum path encontrado na resposta da API");
      return null;
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("❌ Erro na requisição GraphHopper:", error.message);
      }
      return null;
    }
  };

  // 🔥 FUNÇÃO PARA CRIAR ROTA COMPLETA NA ORDEM DO BACKEND
  const fetchCompleteRoute = useCallback(async () => {
    // Se está em simulação e já tem rota carregada, não recalcula
    if (isSimulating && fullRoutePath.length > 0) {
      console.log('🎮 Modo simulação ativo, mantendo rota atual');
      return;
    }
    
    if (!myLocation) {
      console.log('⏳ Aguardando localização do motorista...');
      setFullRoutePath([]);
      return;
    }

    if (unvisitedStops.length === 0) {
      console.log('🏁 Todas as paradas visitadas');
      setFullRoutePath([]);
      return;
    }

    // Valida se todas as coordenadas são válidas
    const invalidStop = unvisitedStops.find(
      stop => isNaN(stop.latitude) || isNaN(stop.longitude) || 
              stop.latitude === 0 || stop.longitude === 0
    );
    if (invalidStop) {
      console.error(`❌ Parada com coordenadas inválidas: ${invalidStop.name}`);
      return;
    }

    // Cria chave única para a rota
    const routeKey = `${myLocation[0].toFixed(6)},${myLocation[1].toFixed(6)}|${unvisitedStops.map(s => s.id).join(',')}`;
    
    // Se a rota não mudou e já temos uma rota carregada, mantém
    if (lastRouteKeyRef.current === routeKey && fullRoutePath.length > 0) {
      console.log('🔄 Rota não mudou, mantendo atual');
      return;
    }

    console.log('🆕 Calculando nova rota...');
    console.log(`📍 Motorista: ${myLocation[0]}, ${myLocation[1]}`);
    console.log(`📍 Próximas paradas (na ordem do backend):`);
    unvisitedStops.forEach((stop, idx) => {
      console.log(`   ${idx + 1}. ${stop.name} (${stop.latitude}, ${stop.longitude})`);
    });

    // Cancela requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoadingRoute(true);
    abortControllerRef.current = new AbortController();

    try {
      const points: string[] = [];
      
      // 🔥 PONTO 0: LOCALIZAÇÃO ATUAL DO MOTORISTA
      points.push(`${myLocation[0]},${myLocation[1]}`);
      console.log(`   Ponto 0 (motorista): ${myLocation[0]}, ${myLocation[1]}`);
      
      // 🔥 ADICIONA PARADAS NA ORDEM DO BACKEND (SEM REORDENAR!)
      unvisitedStops.forEach((stop, idx) => {
        points.push(`${stop.latitude},${stop.longitude}`);
        console.log(`   Ponto ${idx + 1} (${stop.name}): ${stop.latitude}, ${stop.longitude}`);
      });
      
      console.log(`🎯 Total de pontos: ${points.length}`);

      const routeCoordinates = await fetchRouteFromGraphHopper(points);
      
      if (routeCoordinates && routeCoordinates.length > 0) {
        setFullRoutePath(routeCoordinates);
        lastRouteKeyRef.current = routeKey;
        console.log(`✅ Rota carregada com sucesso!`);
      } else {
        console.warn("⚠️ Falha ao obter rota da API");
        // Não limpa a rota existente para não sumir do mapa
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("❌ Erro ao buscar rota:", error);
      }
    } finally {
      setIsLoadingRoute(false);
    }
  }, [myLocation, unvisitedStops, isSimulating, fullRoutePath.length]);

  // 🔥 Escuta evento de rota atualizada
  useEffect(() => {
    const handleRouteUpdated = () => {
      console.log('🔄 Rota atualizada pelo driver, recalculando...');
      fetchCompleteRoute();
    };
    
    window.addEventListener('route-updated', handleRouteUpdated);
    
    return () => {
      window.removeEventListener('route-updated', handleRouteUpdated);
    };
  }, [fetchCompleteRoute]);

  // 🔥 Efeito para quando as paradas não visitadas mudam (parada concluída)
  useEffect(() => {
    if (myLocation && unvisitedStops.length > 0) {
      console.log('📌 Paradas atualizadas, recalculando rota...');
      fetchCompleteRoute();
    } else if (unvisitedStops.length === 0) {
      setFullRoutePath([]);
    }
  }, [unvisitedStops, myLocation, fetchCompleteRoute]);

  // 🔥 Efeito para quando a localização muda significativamente
  useEffect(() => {
    if (myLocation && unvisitedStops.length > 0 && !isSimulating) {
      fetchCompleteRoute();
    }
  }, [myLocation, fetchCompleteRoute]);

  // 🔥 Escuta eventos de simulação
  useEffect(() => {
    const handleSimulationStart = () => {
      console.log('🎮 Simulação iniciada, congelando rota');
      setIsSimulating(true);
    };
    
    const handleSimulationEnd = () => {
      console.log('🎮 Simulação finalizada, recalculando rota');
      setIsSimulating(false);
      setTimeout(() => {
        fetchCompleteRoute();
      }, 500);
    };
    
    window.addEventListener('simulation-start', handleSimulationStart);
    window.addEventListener('simulation-end', handleSimulationEnd);
    
    return () => {
      window.removeEventListener('simulation-start', handleSimulationStart);
      window.removeEventListener('simulation-end', handleSimulationEnd);
    };
  }, [fetchCompleteRoute]);

  // 🔥 CALCULAR BOUNDS
  const bounds = useMemo(() => {
    const allPoints: [number, number][] = [];
    
    if (myLocation) {
      allPoints.push([myLocation[0], myLocation[1]]);
    }
    
    unvisitedStops.forEach(stop => {
      allPoints.push([stop.latitude, stop.longitude]);
    });
    
    if (allPoints.length === 0) return undefined;
    
    const lats = allPoints.map(p => p[0]);
    const lngs = allPoints.map(p => p[1]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const latPadding = (maxLat - minLat) * 0.2;
    const lngPadding = (maxLng - minLng) * 0.2;
    
    return [
      [minLat - latPadding, minLng - lngPadding],
      [maxLat + latPadding, maxLng + lngPadding]
    ] as L.LatLngBoundsExpression;
  }, [unvisitedStops, myLocation]);

  return (
    <div className="relative w-full h-full border rounded-lg overflow-hidden bg-gray-100">
      <MapContainer 
        bounds={bounds}
        zoom={13} 
        className="w-full h-full" 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {stops.map((stop, index) => {
          const isVisited = visitedStops.includes(stop.id || String(index));
          const isCurrent = index === currentStopIndex && !isVisited;
          
          // Mostra a posição na ordem da rota
          const routePosition = unvisitedStops.findIndex(s => s.id === stop.id) + 1;
          
          return (
            <Marker
              key={stop.id || index}
              position={[stop.latitude, stop.longitude]}
              icon={isVisited ? visitedIcon : isCurrent ? activeIcon : defaultIcon}
              eventHandlers={{ click: () => onStopClick?.(stop, index) }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>
                    {isVisited ? '✓' : (routePosition > 0 ? `${routePosition}.` : '📌')} 
                    {' '}{stop.name || 'Parada'}
                  </strong>
                  <p>{stop.address}</p>
                  <p>{stop.city}/{stop.state}</p>
                  {isVisited && <p className="text-green-600 text-xs mt-1">✅ Concluída</p>}
                  {!isVisited && routePosition === 1 && <p className="text-orange-600 text-xs mt-1">🎯 Próximo destino!</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {myLocation && (
          <Marker position={[myLocation[0], myLocation[1]]} icon={driverIcon} zIndexOffset={1000}>
            <Popup>
              <div className="text-sm">
                <strong>🚗 Sua localização</strong>
                <p className="text-xs text-gray-500 mt-1">
                  Lat: {myLocation[0].toFixed(6)}<br />
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
              color: '#D35400', 
              weight: 5, 
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round'
            }} 
          />
        )}

        {isLoadingRoute && (
          <div className="absolute top-4 right-4 bg-white/90 px-3 py-1.5 rounded-full shadow-md z-[1000] text-xs font-bold flex items-center gap-2">
            <div className="animate-spin h-3 w-3 border-2 border-[#D35400] border-t-transparent rounded-full" />
            CALCULANDO ROTA...
          </div>
        )}

        {myLocation && unvisitedStops.length > 0 && fullRoutePath.length === 0 && !isLoadingRoute && (
          <div className="absolute bottom-4 left-4 right-4 bg-yellow-100/90 px-3 py-2 rounded-lg shadow-md z-[1000] text-xs font-medium text-yellow-800 text-center">
            🗺️ Calculando rota para {unvisitedStops.length} {unvisitedStops.length === 1 ? 'parada' : 'paradas'}...
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
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState, useMemo, useRef } from 'react';
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

function RecenterMap({ location }: { location: [number, number] }) {
  const map = useMap();
  const lastLoc = useRef<string>("");

  useEffect(() => {
    const locString = location.join(',');
    if (lastLoc.current !== locString) {
      map.flyTo(location, map.getZoom(), { animate: true, duration: 1 });
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
  const [roadPath, setRoadPath] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const initialCenter = useMemo<[number, number]>(() => {
    if (myLocation) return myLocation;
    if (stops[0]) return [stops[0].latitude, stops[0].longitude];
    return [-23.5505, -46.6333];
  }, []);

  // PEGA TODAS AS PARADAS QUE AINDA NÃO FORAM VISITADAS
  const remainingStops = useMemo(() => {
    return stops.filter((stop, index) => !visitedStops.includes(stop.id || String(index)));
  }, [stops, visitedStops]);

  useEffect(() => {
    // Se não tiver localização ou não houver mais paradas, limpa o caminho
    if (!myLocation || remainingStops.length === 0) {
      setRoadPath([]);
      return;
    }

    const fetchFullRoute = async () => {
      setIsLoadingRoute(true);
      try {
        // Monta a sequência: Minha Localização -> Parada 1 -> Parada 2 -> Parada N...
        const points = [
          `${myLocation[1]},${myLocation[0]}`, // Long,Lat do motorista
          ...remainingStops.map(s => `${s.longitude},${s.latitude}`)
        ];

        const coordinatesString = points.join(';');
        
        // OSRM com overview=full retorna a geometria detalhada passando por todos os pontos
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`
        );
        
        const data = await response.json();

        if (data.routes?.[0]) {
          const coordinates = data.routes[0].geometry.coordinates.map(
            (coord: number[]) => [coord[1], coord[0]] as [number, number]
          );
          setRoadPath(coordinates);
        }
      } catch (error) {
        console.error("Erro ao traçar rota completa:", error);
        // Fallback: Linha reta entre os pontos caso a API falhe
        const fallbackPath: [number, number][] = [
            myLocation,
            ...remainingStops.map(s => [s.latitude, s.longitude] as [number, number])
        ];
        setRoadPath(fallbackPath);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    // Debounce para não sobrecarregar a API enquanto o motorista se move
    const timer = setTimeout(fetchFullRoute, 1500); 
    return () => clearTimeout(timer);
  }, [myLocation?.[0], myLocation?.[1], remainingStops]); // Atualiza se mudar posição ou se uma parada for concluída

  return (
    <div className="relative w-full h-full border rounded-lg overflow-hidden bg-gray-100">
      <MapContainer 
        center={initialCenter} 
        zoom={14} 
        className="w-full h-full" 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {stops.map((stop, index) => {
          const isVisited = visitedStops.includes(stop.id || String(index));
          const isCurrent = index === currentStopIndex && !isVisited;
          
          return (
            <Marker
              key={stop.id || index}
              position={[stop.latitude, stop.longitude]}
              icon={isVisited ? visitedIcon : isCurrent ? activeIcon : defaultIcon}
              eventHandlers={{ click: () => onStopClick?.(stop, index) }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{index + 1}. {stop.name || 'Parada'}</strong>
                  <p>{stop.address}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {myLocation && (
          <>
            <Marker position={myLocation} icon={driverIcon} zIndexOffset={1000} />
            <RecenterMap location={myLocation} />
          </>
        )}

        {/* LINHA DA ROTA COMPLETA */}
        {roadPath.length > 0 && (
          <Polyline 
            positions={roadPath} 
            pathOptions={{ 
                color: '#2563EB', 
                weight: 6, 
                opacity: 0.6, 
                dashArray: '1, 10', // Linha pontilhada estilizada
                lineJoin: 'round'
            }} 
          />
        )}
      </MapContainer>

      {isLoadingRoute && (
        <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full shadow-md z-[1000] text-[10px] font-bold flex items-center gap-2">
          <div className="animate-spin h-2 w-2 border-2 border-blue-600 border-t-transparent rounded-full" />
          ATUALIZANDO TRAJETÓRIA COMPLETA
        </div>
      )}
    </div>
  );
}
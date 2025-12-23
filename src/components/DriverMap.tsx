// components/DriverMap.tsx
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import RoutingMachine from '@/components/RoutingMachine'; 

// ... (Mantenha as definições de ícones como estavam) ...
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';
const carIconUrl = 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png';

const defaultIcon = L.icon({
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const activeIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const driverIcon = L.icon({
  iconUrl: carIconUrl,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Componente auxiliar para recentralizar
function RecenterMap({ location }: { location: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(location, 16, { animate: true });
  }, [location, map]);
  return null;
}

interface DriverMapProps {
  route: { lat: number; lng: number; title: string }[];
  myLocation: [number, number] | null;
  currentStopIndex: number;
}

export default function DriverMap({ route, myLocation, currentStopIndex }: DriverMapProps) {
  // Fallback seguro para o centro inicial
  const defaultCenter: [number, number] = [-23.55052, -46.633309]; 
  const initialCenter = myLocation || (route[0] ? [route[0].lat, route[0].lng] : defaultCenter);

  // Filtra rotas futuras
  const remainingRoute = route.slice(currentStopIndex);

  // Converte para objetos LatLng do Leaflet para garantir integridade
  const routeWaypoints = remainingRoute.map(p => L.latLng(Number(p.lat), Number(p.lng)));
  
  // Adiciona o motorista como ponto de partida (índice 0 da rota)
  const fullWaypoints = myLocation 
    ? [L.latLng(myLocation[0], myLocation[1]), ...routeWaypoints]
    : [];

  return (
    <MapContainer 
      center={initialCenter as L.LatLngExpression} 
      zoom={15} 
      className="w-full h-full" 
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Marcadores das Tarefas (Destinos) */}
      {remainingRoute.map((point, index) => {
        const isCurrentTarget = index === 0; 
        return (
          <Marker
            key={`${point.lat}-${point.lng}-${index}`} // Key única para forçar re-render se mudar
            position={[point.lat, point.lng]}
            icon={isCurrentTarget ? activeIcon : defaultIcon}
          >
            <Popup>
              <strong>{currentStopIndex + index + 1}. {point.title}</strong><br />
              {isCurrentTarget ? "Destino Atual" : "Próxima parada"}
            </Popup>
          </Marker>
        )
      })}

      {/* Marcador e Controle do Motorista */}
      {myLocation && (
        <>
          <Marker position={myLocation} icon={driverIcon} zIndexOffset={1000} />
          <RecenterMap location={myLocation} />
        </>
      )}

      {/* AQUI ESTAVA O ERRO LÓGICO:
         Só renderizamos o RoutingMachine se tivermos o motorista E pelo menos 1 destino.
         O componente RoutingMachine agora lida com atualizações via useEffect.
      */}
      {fullWaypoints.length >= 2 && (
        <RoutingMachine waypoints={fullWaypoints} />
      )}
    </MapContainer>
  );
}
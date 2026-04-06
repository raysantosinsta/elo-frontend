'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

// --- ÍCONES (Mantém igual) ---
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

// Componente para recentralizar
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
  const defaultCenter: [number, number] = [-23.55052, -46.633309]; 
  const initialCenter = myLocation || (route[0] ? [route[0].lat, route[0].lng] : defaultCenter);

  // Estado para guardar o desenho da rua
  const [roadPath, setRoadPath] = useState<[number, number][]>([]);

  // Pega as paradas restantes
  const remainingRoute = route.slice(currentStopIndex);

  // --- EFEITO: BUSCAR ROTA REAL (OSRM) ---
  useEffect(() => {
    if (!myLocation || remainingRoute.length === 0) {
        return;
    }

    const fetchRoadGeometry = async () => {
        try {
            // 1. Define os pontos chaves: [Meu Carro, Destino 1, Destino 2 (se houver)]
            // Limitamos a 2 destinos para não poluir demais o mapa ou estourar a API grátis
            const nextStops = remainingRoute.slice(0, 2); 
            
            const points = [
                { lat: myLocation[0], lng: myLocation[1] }, // Inicio: Carro
                ...nextStops // Meio/Fim: Próximas paradas
            ];

            // 2. Constrói a string da URL: "lon,lat;lon,lat;lon,lat"
            const coordinatesString = points
                .map(p => `${p.lng},${p.lat}`)
                .join(';');
            
            // 3. Chama a API do OSRM
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`
            );
            
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                // A API retorna [lng, lat], o Leaflet quer [lat, lng]. Invertemos:
                const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
                setRoadPath(coordinates);
            }
        } catch (error) {
            console.error("Erro ao buscar rota na rua:", error);
            // Fallback: Linha Reta se a API falhar
            setRoadPath([
               myLocation,
               [remainingRoute[0].lat, remainingRoute[0].lng] as [number, number]
            ]);
        }
    };

    const timer = setTimeout(() => {
        fetchRoadGeometry();
    }, 500); 

    return () => clearTimeout(timer);

  }, [myLocation, remainingRoute]); // Atualiza se andar ou se a lista de paradas mudar

  // Configuração da Linha Azul Tracejada
  const lineOptions = { 
    color: '#2563EB', 
    weight: 6, 
    opacity: 0.8,
    dashArray: '10, 15' 
  };

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

      {/* Marcadores dos Destinos */}
      {remainingRoute.map((point, index) => {
        const isCurrentTarget = index === 0; 
        return (
          <Marker
            key={`${point.lat}-${point.lng}-${index}`}
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

      {/* Marcador do Motorista */}
      {myLocation && (
        <>
          <Marker position={myLocation} icon={driverIcon} zIndexOffset={1000} />
          <RecenterMap location={myLocation} />
        </>
      )}

      {/* LINHA AZUL QUE SEGUE A RUA (Mostrando até a 2ª parada) */}
      {roadPath.length > 0 && (
        <Polyline 
          positions={roadPath as L.LatLngExpression[]} 
          pathOptions={lineOptions} 
        />
      )}

    </MapContainer>
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// 'use client';

// import { useEffect, useRef } from 'react';
// import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
// import L from 'leaflet';
// import { DriverPosition, Delivery } from '../types/delivery';

// // Fix para ícones do Leaflet
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });

// interface RouteMapProps {
//   driverPosition: DriverPosition;
//   destination: Delivery['destination'];
//   polyline: [number, number][];
// }

// const RouteMap: React.FC<RouteMapProps> = ({ 
//   driverPosition, 
//   destination, 
//   polyline 
// }) => {
//   const mapRef = useRef<L.Map>(null);
//   const hasInitializedRef = useRef(false);

//   // Ícones
//   const driverIcon = new L.Icon({
//     iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
//     shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//   });

//   const destinationIcon = new L.Icon({
//     iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
//     shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//   });

//   // Inicializar mapa apenas uma vez
//   useEffect(() => {
//     if (mapRef.current && polyline.length > 0 && !hasInitializedRef.current) {
//       const bounds = L.latLngBounds(polyline);
//       mapRef.current.fitBounds(bounds, { padding: [20, 20] });
//       hasInitializedRef.current = true;
//     }
//   }, [polyline]);

//   // Atualizar posição do motorista sem resetar zoom
//   useEffect(() => {
//     if (mapRef.current && hasInitializedRef.current) {
//       mapRef.current.panTo([driverPosition.lat, driverPosition.lng], {
//         animate: true,
//         duration: 0.5
//       });
//     }
//   }, [driverPosition.lat, driverPosition.lng]);

//   return (
//     <div className="h-96 w-full">
//       <MapContainer
//         center={[driverPosition.lat, driverPosition.lng]}
//         zoom={13}
//         style={{ height: '100%', width: '100%' }}
//         ref={mapRef}
//       >
//         <TileLayer
//           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />
        
//         <Marker position={[driverPosition.lat, driverPosition.lng]} icon={driverIcon}>
//           <Popup>Motorista - {driverPosition.timestamp.toLocaleTimeString()}</Popup>
//         </Marker>

//         <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
//           <Popup>Destino - Centro de Fortaleza</Popup>
//         </Marker>

//         <Polyline
//           positions={polyline}
//           color="blue"
//           weight={4}
//           opacity={0.7}
//         />
//       </MapContainer>
//     </div>
//   );
// };

// export default RouteMap;

// versao nova
'use client';

import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { DriverPosition, Delivery } from '../types/delivery';

// Importar CSS do Leaflet
import 'leaflet/dist/leaflet.css';

// Configuração dos ícones
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

interface RouteMapProps {
  driverPosition: DriverPosition;
  destination: Delivery['destination'];
  polyline: [number, number][];
  clientName?: string;
}

const RouteMap: React.FC<RouteMapProps> = ({ 
  driverPosition, 
  destination, 
  polyline,
  clientName = 'Destino' 
}) => {
  const mapRef = useRef<L.Map>(null);
  const hasInitializedRef = useRef(false);

  // Configurar ícones na primeira renderização
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  // Ícones personalizados com useMemo
  const driverIcon = useMemo(() => new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }), []);

  const destinationIcon = useMemo(() => new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'destination-marker'
  }), []);

  // Inicializar e ajustar visualização
  useEffect(() => {
    if (mapRef.current && polyline.length > 0 && !hasInitializedRef.current) {
      try {
        const bounds = L.latLngBounds(polyline);
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
        hasInitializedRef.current = true;
      } catch (error) {
        console.error('Erro ao ajustar bounds do mapa:', error);
      }
    }
  }, [polyline]);

  // Acompanhar posição do motorista
  useEffect(() => {
    if (mapRef.current && hasInitializedRef.current && driverPosition) {
      try {
        mapRef.current.panTo([driverPosition.lat, driverPosition.lng], {
          animate: true,
          duration: 0.5
        });
      } catch (error) {
        console.error('Erro ao mover mapa:', error);
      }
    }
  }, [driverPosition.lat, driverPosition.lng]);

  // CORREÇÃO: Verificar se temos dados válidos
  if (!driverPosition || !destination) {
    return (
      <div className="h-full w-full rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
        <p className="text-gray-500">Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <MapContainer
        center={[driverPosition.lat, driverPosition.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={[driverPosition.lat, driverPosition.lng]} icon={driverIcon}>
          <Popup>
            <div className="text-sm">
              <strong>🚗 Motorista</strong><br />
              Posição atual<br />
              {new Date(driverPosition.timestamp).toLocaleTimeString('pt-BR')}
            </div>
          </Popup>
        </Marker>

        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup>
            <div className="text-sm">
              <strong>🎯 Destino</strong><br />
              {clientName}
            </div>
          </Popup>
        </Marker>

        {polyline.length > 0 && (
          <Polyline
            positions={polyline}
            color="#3b82f6"
            weight={4}
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default RouteMap;
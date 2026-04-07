// // components/RouteMap.tsx
// 'use client';

// import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
// import L from 'leaflet';
// import { useEffect, useState } from 'react';
// import 'leaflet/dist/leaflet.css';

// // --- ÍCONES ---
// const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
// const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';
// const carIconUrl = 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png';
// const visitedIconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';

// const defaultIcon = L.icon({
//   iconUrl: iconUrl,
//   shadowUrl: shadowUrl,
//   iconSize: [25, 41],
//   iconAnchor: [12, 41]
// });

// const activeIcon = L.icon({
//   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
//   shadowUrl: shadowUrl,
//   iconSize: [25, 41],
//   iconAnchor: [12, 41]
// });

// const visitedIcon = L.icon({
//   iconUrl: visitedIconUrl,
//   shadowUrl: shadowUrl,
//   iconSize: [25, 41],
//   iconAnchor: [12, 41]
// });

// const driverIcon = L.icon({
//   iconUrl: carIconUrl,
//   iconSize: [40, 40],
//   iconAnchor: [20, 20]
// });

// // Componente para recentralizar o mapa
// function RecenterMap({ location }: { location: [number, number] }) {
//   const map = useMap();
//   useEffect(() => {
//     map.flyTo(location, 16, { animate: true, duration: 1 });
//   }, [location, map]);
//   return null;
// }

// interface RouteStop {
//   id?: string;
//   name?: string;
//   address: string;
//   city: string;
//   state: string;
//   latitude: number;
//   longitude: number;
//   visited?: boolean;
//   notes?: string;
// }

// interface RouteMapProps {
//   stops: RouteStop[];
//   currentStopIndex: number;
//   myLocation: [number, number] | null;
//   visitedStops?: string[];
//   onStopClick?: (stop: RouteStop, index: number) => void;
// }

// export default function RouteMap({ 
//   stops, 
//   currentStopIndex, 
//   myLocation, 
//   visitedStops = [],
//   onStopClick 
// }: RouteMapProps) {
//   const defaultCenter: [number, number] = [-23.55052, -46.633309];
  
//   const getInitialCenter = (): [number, number] => {
//     if (myLocation) return myLocation;
//     if (stops[currentStopIndex]) {
//       return [stops[currentStopIndex].latitude, stops[currentStopIndex].longitude];
//     }
//     if (stops[0]) {
//       return [stops[0].latitude, stops[0].longitude];
//     }
//     return defaultCenter;
//   };

//   const [roadPath, setRoadPath] = useState<[number, number][]>([]);
//   const [isLoadingRoute, setIsLoadingRoute] = useState(false);

//   // Paradas restantes (não visitadas)
//   const remainingStops = stops.filter((_, index) => !visitedStops.includes(stops[index].id || String(index)));
//   const currentStop = stops[currentStopIndex];

//   // Buscar rota real usando OSRM
//   useEffect(() => {
//     if (!myLocation || remainingStops.length === 0) {
//       setRoadPath([]);
//       return;
//     }

//     const fetchRoadGeometry = async () => {
//       setIsLoadingRoute(true);
//       try {
//         // Pega até 3 próximos destinos para não sobrecarregar
//         const nextStops = remainingStops.slice(0, 3);
        
//         const points = [
//           { lat: myLocation[0], lng: myLocation[1] },
//           ...nextStops.map(stop => ({ lat: stop.latitude, lng: stop.longitude }))
//         ];

//         const coordinatesString = points
//           .map(p => `${p.lng},${p.lat}`)
//           .join(';');
        
//         const response = await fetch(
//           `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`
//         );
        
//         const data = await response.json();

//         if (data.routes && data.routes.length > 0) {
//           const coordinates = data.routes[0].geometry.coordinates.map(
//             (coord: number[]) => [coord[1], coord[0]] as [number, number]
//           );
//           setRoadPath(coordinates);
//         } else {
//           // Fallback: linha reta
//           setRoadPath([
//             myLocation,
//             [remainingStops[0].latitude, remainingStops[0].longitude]
//           ]);
//         }
//       } catch (error) {
//         console.error("Erro ao buscar rota:", error);
//         if (remainingStops[0]) {
//           setRoadPath([
//             myLocation,
//             [remainingStops[0].latitude, remainingStops[0].longitude]
//           ]);
//         }
//       } finally {
//         setIsLoadingRoute(false);
//       }
//     };

//     const timer = setTimeout(fetchRoadGeometry, 500);
//     return () => clearTimeout(timer);
//   }, [myLocation, remainingStops]);

//   const lineOptions = { 
//     color: '#2563EB', 
//     weight: 5, 
//     opacity: 0.8,
//     dashArray: '8, 12'
//   };

//   const visitedLineOptions = {
//     color: '#10B981',
//     weight: 3,
//     opacity: 0.5,
//     dashArray: '5, 5'
//   };

//   return (
//     <MapContainer 
//       center={getInitialCenter()} 
//       zoom={14} 
//       className="w-full h-full" 
//       zoomControl={true}
//     >
//       <TileLayer
//         attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
//         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//       />

//       {/* Marcadores das Paradas */}
//       {stops.map((stop, index) => {
//         const isVisited = visitedStops.includes(stop.id || String(index));
//         const isCurrent = index === currentStopIndex && !isVisited;
        
//         let icon = defaultIcon;
//         if (isVisited) icon = visitedIcon;
//         if (isCurrent) icon = activeIcon;
        
//         return (
//           <Marker
//             key={stop.id || `${stop.latitude}-${stop.longitude}-${index}`}
//             position={[stop.latitude, stop.longitude]}
//             icon={icon}
//             eventHandlers={{
//               click: () => onStopClick?.(stop, index)
//             }}
//           >
//             <Popup>
//               <div className="p-2 min-w-[200px]">
//                 <strong className="text-sm block mb-1">
//                   {index + 1}. {stop.name || `Parada ${index + 1}`}
//                 </strong>
//                 <p className="text-xs text-gray-600 mb-1">{stop.address}</p>
//                 <p className="text-xs text-gray-500">{stop.city}/{stop.state}</p>
//                 {isVisited && (
//                   <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
//                     ✓ Visitada
//                   </p>
//                 )}
//                 {isCurrent && (
//                   <p className="text-xs text-red-600 mt-1 font-semibold">
//                     📍 Destino atual
//                   </p>
//                 )}
//                 {stop.notes && (
//                   <p className="text-xs text-gray-500 mt-2 border-t pt-1">
//                     📝 {stop.notes}
//                   </p>
//                 )}
//               </div>
//             </Popup>
//           </Marker>
//         );
//       })}

//       {/* Marcador do Motorista */}
//       {myLocation && (
//         <>
//           <Marker position={myLocation} icon={driverIcon} zIndexOffset={1000}>
//             <Popup>
//               <div className="p-1">
//                 <strong>Sua localização</strong>
//               </div>
//             </Popup>
//           </Marker>
//           <RecenterMap location={myLocation} />
//         </>
//       )}

//       {/* Rota até o próximo destino */}
//       {roadPath.length > 0 && !isLoadingRoute && (
//         <Polyline 
//           positions={roadPath as L.LatLngExpression[]} 
//           pathOptions={lineOptions} 
//         />
//       )}

//       {/* Indicador de loading da rota */}
//       {isLoadingRoute && (
//         <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-lg shadow-lg z-[1000]">
//           <div className="flex items-center gap-2 text-sm text-gray-600">
//             <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
//             Calculando rota...
//           </div>
//         </div>
//       )}
//     </MapContainer>
//   );
// }
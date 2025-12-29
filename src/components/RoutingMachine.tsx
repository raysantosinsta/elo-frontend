// /* eslint-disable @typescript-eslint/no-explicit-any */
// 'use client';

// import { useEffect } from 'react';
// import { useMap } from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet-routing-machine';
// import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// interface RoutingMachineProps {
//   waypoints: L.LatLng[];
// }

// export default function RoutingMachine({ waypoints }: RoutingMachineProps) {
//   const map = useMap();

//   useEffect(() => {
//     if (!map) return;

//     // Cria o controle de rota
//     const routingControl = (L as any).Routing.control({
//       waypoints: waypoints,
//       lineOptions: {
//         styles: [
//           // CONFIGURAÇÃO DA LINHA AZUL TRACEJADA
//           { 
//             color: '#2563EB', // Azul forte (Tailwind blue-600)
//             weight: 6,        // Espessura
//             opacity: 0.8,     // Transparência
//             dashArray: '10, 15' // Cria o efeito tracejado (10px linha, 15px espaço)
//           }
//         ],
//         extendToWaypoints: false,
//         missingRouteTolerance: 10,
//       },
//       // Configurações visuais (remove painel de texto e marcadores extras)
//       show: false, 
//       addWaypoints: false,
//       routeWhileDragging: false,
//       draggableWaypoints: false,
//       fitSelectedRoutes: true,
//       showAlternatives: false,
//       createMarker: () => null, // Não cria marcadores padrão do plugin, usamos os nossos
//     });

//     // Adiciona ao mapa
//     routingControl.addTo(map);

//     // Remove ao desmontar ou atualizar os pontos
//     return () => {
//       try {
//         map.removeControl(routingControl);
//       } catch (e) {
//         console.warn("Erro ao limpar rota", e);
//       }
//     };
//   }, [map, waypoints]);

//   return null;
// }
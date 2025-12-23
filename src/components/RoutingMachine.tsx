/* eslint-disable @typescript-eslint/no-explicit-any */
// components/RoutingMachine.tsx
'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

interface RoutingMachineProps {
  waypoints: L.LatLng[];
}

export default function RoutingMachine({ waypoints }: RoutingMachineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Criar a instância de controle de rota
    const routingControl = (L as any).Routing.control({
      waypoints: waypoints,
      lineOptions: {
        styles: [{ color: '#6FA1EC', weight: 6, opacity: 0.8 }],
        extendToWaypoints: false,
        missingRouteTolerance: 10,
      },
      // Desabilitar interações que podem quebrar o estado do React
      show: false, // Esconde o painel de texto (opcional)
      addWaypoints: false,
      routeWhileDragging: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      // Hack para não criar marcadores extras (já estamos usando os Markers do React)
      createMarker: () => null, 
    });

    // Adiciona ao mapa
    routingControl.addTo(map);

    // Cleanup: Remove a rota ao desmontar ou atualizar
    return () => {
      try {
        map.removeControl(routingControl);
      } catch (e) {
        console.warn("Erro ao remover controle de rota", e);
      }
    };
  }, [map, waypoints]); // O array de dependências garante que se os waypoints mudarem, a rota recria

  return null;
}
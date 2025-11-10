/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import io from 'socket.io-client';

let socket: any;

export default function DriverMap() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId')!;
  const routeName = searchParams.get('routeName')!;
  const routeAddress = searchParams.get('routeAddress')!;

  const [position, setPosition] = useState({ lat: -3.7319, lng: -38.5267 });

  // Conectar WebSocket e enviar posição simulada
  useEffect(() => {
    socket = io('http://localhost:3002');
    socket.emit('joinTask', taskId);

    const interval = setInterval(() => {
      const lat = position.lat + (Math.random() - 0.5) * 0.001;
      const lng = position.lng + (Math.random() - 0.5) * 0.001;
      setPosition({ lat, lng });
      socket.emit('updatePosition', { taskId, lat, lng });
    }, 2000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [taskId]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Rota: {routeName}</h1>
      <p className="text-gray-600 mb-4">{routeAddress}</p>
      <div className="w-full h-[500px] bg-gray-200 flex items-center justify-center">
        {/* Aqui você integra Google Maps ou Leaflet */}
        <p>Mapa em tempo real - posição atual: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>
      </div>
    </div>
  );
}

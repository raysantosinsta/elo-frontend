/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface LocationData {
  driverId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  isSimulating: boolean;
}

interface RouteFinishedData {
  routeId: string;
  driverId: string;
  message: string;
  timestamp: Date;
}

export function useLocationWebSocket({
  routeId,
  driverId,
  onLocationUpdate,
  onDriverOffline,
  onRouteFinished,
}: {
  routeId: string;
  driverId?: string;
  onLocationUpdate?: (location: LocationData) => void;
  onDriverOffline?: (data: any) => void;
  onRouteFinished?: (data: RouteFinishedData) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  // 🔥 USAR REFS PARA OS CALLBACKS PARA EVITAR RECONEXÕES
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onDriverOfflineRef = useRef(onDriverOffline);
  const onRouteFinishedRef = useRef(onRouteFinished);
  
  // Atualizar refs quando callbacks mudarem
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
    onDriverOfflineRef.current = onDriverOffline;
    onRouteFinishedRef.current = onRouteFinished;
  }, [onLocationUpdate, onDriverOffline, onRouteFinished]);

  const sendLocation = useCallback((latitude: number, longitude: number, isSimulating = false) => {
    if (socketRef.current?.connected && driverId) {
      socketRef.current.emit('update-location', { latitude, longitude, isSimulating });
    }
  }, [driverId]);

  const emitRouteFinished = useCallback(() => {
    if (socketRef.current?.connected && driverId) {
      console.log('🏁 [useLocationWebSocket] Emitindo route-finished para rota:', routeId);
      socketRef.current.emit('route-finished', { routeId, message: 'Rota finalizada com sucesso!' });
    }
  }, [driverId, routeId]);

  // 🔥 CONEXÃO DO WEBSOCKET - DEPENDÊNCIAS ESTÁVEIS
  useEffect(() => {
    if (!routeId) return;

    console.log('🔌 [useLocationWebSocket] Iniciando conexão...');
    
    const params = new URLSearchParams({ routeId });
    if (driverId) params.append('driverId', driverId);
    
    const socketUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/locations?${params}`;
    
    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('✅ [useLocationWebSocket] Conectado');
      setIsConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log('❌ [useLocationWebSocket] Desconectado');
      setIsConnected(false);
    });
    
    socket.on('location-update', (loc) => {
      console.log('📍 [useLocationWebSocket] Location update recebido');
      onLocationUpdateRef.current?.(loc);
    });
    
    socket.on('driver-offline', (data) => {
      console.log('⚠️ [useLocationWebSocket] Driver offline');
      onDriverOfflineRef.current?.(data);
    });
    
    socket.on('route-completed', (data) => {
      console.log('🎉 [useLocationWebSocket] Rota finalizada!', data);
      onRouteFinishedRef.current?.(data);
    });
    
    return () => { 
      console.log('🔌 [useLocationWebSocket] Desconectando...');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [routeId, driverId]); // 🔥 APENAS routeId e driverId - NÃO INCLUIR CALLBACKS AQUI!

  return { 
    sendLocation, 
    emitRouteFinished,
    isConnected,
  };
}
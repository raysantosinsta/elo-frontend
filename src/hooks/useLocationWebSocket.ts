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
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  
  // 🔥 USAR REFS PARA OS CALLBACKS
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

  // 🔥 FUNÇÃO PARA DESCONECTAR
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // 🔥 CONEXÃO DO WEBSOCKET - UMA ÚNICA VEZ
  useEffect(() => {
    if (!routeId) return;

    isMountedRef.current = true;
    reconnectAttemptsRef.current = 0;

    console.log('🔌 [useLocationWebSocket] Iniciando conexão...');
    
    const params = new URLSearchParams({ routeId });
    if (driverId) params.append('driverId', driverId);
    
    const socketUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/locations?${params}`;
    
    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      if (!isMountedRef.current) return;
      console.log('✅ [useLocationWebSocket] Conectado');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    });
    
    socket.on('disconnect', (reason) => {
      if (!isMountedRef.current) return;
      console.log('❌ [useLocationWebSocket] Desconectado:', reason);
      setIsConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      console.error('⚠️ [useLocationWebSocket] Erro de conexão:', error.message);
      reconnectAttemptsRef.current++;
      
      if (reconnectAttemptsRef.current >= 3) {
        console.log('🔌 [useLocationWebSocket] Máximo de tentativas atingido, parando...');
        socket.disconnect();
      }
    });
    
    socket.on('location-update', (loc) => {
      if (!isMountedRef.current) return;
      onLocationUpdateRef.current?.(loc);
    });
    
    socket.on('driver-offline', (data) => {
      if (!isMountedRef.current) return;
      onDriverOfflineRef.current?.(data);
    });
    
    socket.on('route-completed', (data) => {
      if (!isMountedRef.current) return;
      console.log('🎉 [useLocationWebSocket] Rota finalizada!', data);
      onRouteFinishedRef.current?.(data);
    });
    
    return () => {
      isMountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [routeId, driverId]); // 🔥 APENAS routeId e driverId

  return { 
    sendLocation, 
    emitRouteFinished,
    isConnected,
    disconnect,
  };
}
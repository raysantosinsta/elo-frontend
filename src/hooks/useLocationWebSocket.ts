/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// useLocationWebSocket.ts - CORREÇÃO COMPLETA
export function useLocationWebSocket({
  routeId,
  driverId,
  onLocationUpdate,
  onDriverOffline,
  onRouteFinished,
  isDriver = false, // Padrão é observador
}: {
  routeId: string;
  driverId?: string;
  onLocationUpdate?: (location: any) => void;
  onDriverOffline?: (data: any) => void;
  onRouteFinished?: (data: any) => void;
  isDriver?: boolean;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  
  // Refs para callbacks
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onDriverOfflineRef = useRef(onDriverOffline);
  const onRouteFinishedRef = useRef(onRouteFinished);
  
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
    onDriverOfflineRef.current = onDriverOffline;
    onRouteFinishedRef.current = onRouteFinished;
  }, [onLocationUpdate, onDriverOffline, onRouteFinished]);

  const sendLocation = useCallback((latitude: number, longitude: number, isSimulating = false) => {
    if (socketRef.current?.connected && driverId && isDriver) {
      socketRef.current.emit('update-location', { latitude, longitude, isSimulating });
    } else if (!isDriver) {
      console.log('👀 Observador: não envia localização');
    }
  }, [driverId, isDriver]);

  const emitRouteFinished = useCallback(() => {
    if (socketRef.current?.connected && driverId && isDriver) {
      console.log('🏁 [useLocationWebSocket] Emitindo route-finished');
      socketRef.current.emit('route-finished', { routeId, message: 'Rota finalizada!' });
    }
  }, [driverId, routeId, isDriver]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // CONEXÃO - SEPARADA POR TIPO
  useEffect(() => {
    if (!routeId) return;
    if (!driverId && !isDriver) return; // Observador precisa do driverId para monitorar

    isMountedRef.current = true;
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;

    console.log(`🔌 [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Conectando à rota ${routeId}...`);
    
    const params = new URLSearchParams({ routeId });
    if (driverId) params.append('driverId', driverId);
    if (isDriver) params.append('isDriver', 'true');
    
    const rawUrl = process.env.NEXT_PUBLIC_NESTJS_API_URL || 'http://localhost:3000';
    const baseUrl = rawUrl.replace(/\/$/, '');
    const socketUrl = `${baseUrl}/locations?${params}`;
    
    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: isDriver ? 3 : 10, // Observador tenta mais vezes
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      if (!isMountedRef.current) return;
      console.log(`✅ [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Conectado ao WebSocket`);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    });
    
    socket.on('disconnect', (reason) => {
      if (!isMountedRef.current) return;
      console.log(`❌ [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Desconectado: ${reason}`);
      setIsConnected(false);
      
      // Se for observador e desconectou, não tentar reconectar se o motivo for "io server disconnect"
      if (!isDriver && reason === 'io server disconnect') {
        shouldReconnectRef.current = false;
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error(`⚠️ [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Erro de conexão:`, error.message);
      reconnectAttemptsRef.current++;
      
      if (!shouldReconnectRef.current || reconnectAttemptsRef.current >= (isDriver ? 3 : 10)) {
        console.log(`🔌 [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Parando tentativas de reconexão`);
        socket.disconnect();
      }
    });
    
    socket.on('location-update', (loc) => {
      if (!isMountedRef.current) return;
      console.log(`📍 [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Recebeu localização:`, loc.latitude, loc.longitude);
      onLocationUpdateRef.current?.(loc);
    });
    
    socket.on('driver-offline', (data) => {
      if (!isMountedRef.current) return;
      console.warn(`⚠️ [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Motorista offline`);
      onDriverOfflineRef.current?.(data);
    });
    
    socket.on('route-completed', (data) => {
      if (!isMountedRef.current) return;
      console.log(`🎉 [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Rota finalizada!`);
      onRouteFinishedRef.current?.(data);
    });
    
    return () => {
      isMountedRef.current = false;
      shouldReconnectRef.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [routeId, driverId, isDriver]); // Dependências corretas

  return { 
    sendLocation, 
    emitRouteFinished,
    isConnected,
    disconnect,
  };
}
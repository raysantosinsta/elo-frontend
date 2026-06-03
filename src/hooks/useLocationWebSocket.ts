/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// ============================================
// TIPAGEM COMPLETA
// ============================================

export interface DriverLocation {
  driverId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  isSimulating: boolean;
}

export interface DriverOfflineEvent {
  driverId: string;
  message: string;
  timestamp: Date;
}

export interface RouteCompletedEvent {
  routeId: string;
  driverId: string;
  message: string;
  timestamp: Date;
}

export interface RouteStartedEvent {
  routeId: string;
  driverId: string;
  message: string;
  timestamp: Date;
}

export interface RouteStatusChangedEvent {
  routeId: string;
  driverId: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
  message: string;
  timestamp: Date;
}

export interface LocationAckEvent {
  timestamp: Date;
  received: boolean;
}

export interface DriverStatusResponse {
  driverId: string;
  routeId: string;
  isOnline: boolean;
  lastLocation: DriverLocation | null;
  lastUpdate: Date | null;
}

interface UseLocationWebSocketProps {
  routeId: string;
  driverId?: string;
  onLocationUpdate?: (location: DriverLocation) => void;
  onDriverOffline?: (data: DriverOfflineEvent) => void;
  onRouteFinished?: (data: RouteCompletedEvent) => void;
  onRouteStarted?: (data: RouteStartedEvent) => void;      // 🔥 NOVO
  onRouteStatusChanged?: (data: RouteStatusChangedEvent) => void; // 🔥 NOVO
  onLocationAck?: (data: LocationAckEvent) => void;        // 🔥 NOVO
  isDriver?: boolean;
  autoConnect?: boolean;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useLocationWebSocket({
  routeId,
  driverId,
  onLocationUpdate,
  onDriverOffline,
  onRouteFinished,
  onRouteStarted,           // 🔥 NOVO
  onRouteStatusChanged,     // 🔥 NOVO
  onLocationAck,            // 🔥 NOVO
  isDriver = false,
  autoConnect = true,
}: UseLocationWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs para callbacks (evita re-render)
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onDriverOfflineRef = useRef(onDriverOffline);
  const onRouteFinishedRef = useRef(onRouteFinished);
  const onRouteStartedRef = useRef(onRouteStarted);
  const onRouteStatusChangedRef = useRef(onRouteStatusChanged);
  const onLocationAckRef = useRef(onLocationAck);
  
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
    onDriverOfflineRef.current = onDriverOffline;
    onRouteFinishedRef.current = onRouteFinished;
    onRouteStartedRef.current = onRouteStarted;
    onRouteStatusChangedRef.current = onRouteStatusChanged;
    onLocationAckRef.current = onLocationAck;
  }, [onLocationUpdate, onDriverOffline, onRouteFinished, onRouteStarted, onRouteStatusChanged, onLocationAck]);

  // ============================================
  // ENVIAR LOCALIZAÇÃO
  // ============================================
  const sendLocation = useCallback((latitude: number, longitude: number, isSimulating = false) => {
    if (socketRef.current?.connected && driverId && isDriver) {
      socketRef.current.emit('update-location', { latitude, longitude, isSimulating });
      return true;
    } else if (!isDriver) {
      console.debug('👀 Observador: não envia localização');
    } else {
      console.warn('⚠️ Não foi possível enviar localização: socket desconectado');
    }
    return false;
  }, [driverId, isDriver]);

  // ============================================
  // ENVIAR MÚLTIPLAS LOCALIZAÇÕES (batch)
  // ============================================
  const sendBatchLocations = useCallback((
    locations: Array<{ latitude: number; longitude: number; isSimulating?: boolean }>
  ) => {
    if (socketRef.current?.connected && driverId && isDriver && locations.length > 0) {
      socketRef.current.emit('batch-update', { locations });
      return true;
    }
    return false;
  }, [driverId, isDriver]);

  // ============================================
  // NOTIFICAR FIM DA ROTA
  // ============================================
  const emitRouteFinished = useCallback((message?: string) => {
    if (socketRef.current?.connected && driverId && isDriver) {
      console.log('🏁 [useLocationWebSocket] Emitindo route-finished');
      socketRef.current.emit('route-finished', { 
        routeId, 
        message: message || 'Rota finalizada!' 
      });
      return true;
    }
    return false;
  }, [driverId, routeId, isDriver]);

  // ============================================
  // NOTIFICAR INÍCIO DA ROTA (apenas motorista)
  // ============================================
  const emitRouteStarted = useCallback((message?: string) => {
    if (socketRef.current?.connected && driverId && isDriver) {
      console.log('🚀 [useLocationWebSocket] Emitindo route-started');
      socketRef.current.emit('route-started', { 
        routeId, 
        message: message || 'Rota iniciada!' 
      });
      return true;
    }
    return false;
  }, [driverId, routeId, isDriver]);

  // ============================================
  // NOTIFICAR MUDANÇA DE STATUS
  // ============================================
  const emitRouteStatusChange = useCallback((
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED',
    message?: string
  ) => {
    if (socketRef.current?.connected && driverId && isDriver) {
      console.log(`📢 [useLocationWebSocket] Emitindo route-status-update: ${status}`);
      socketRef.current.emit('route-status-update', { 
        routeId, 
        status,
        message: message || `Status alterado para ${status}`
      });
      return true;
    }
    return false;
  }, [driverId, routeId, isDriver]);

  // ============================================
  // SOLICITAR STATUS DO MOTORISTA
  // ============================================
  const getDriverStatus = useCallback((): Promise<DriverStatusResponse | null> => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected || !driverId) {
        resolve(null);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      socketRef.current.emit('get-driver-status', { driverId, routeId }, (response: DriverStatusResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }, [driverId, routeId]);

  // ============================================
  // DESCONECTAR
  // ============================================
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsReconnecting(false);
  }, []);

  // ============================================
  // RECONECTAR MANUALMENTE
  // ============================================
  const reconnect = useCallback(() => {
    if (!shouldReconnectRef.current) {
      shouldReconnectRef.current = true;
    }
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  // ============================================
  // CONEXÃO WEBSOCKET
  // ============================================
  useEffect(() => {
    if (!autoConnect) return;
    if (!routeId) {
      console.log('⏳ Aguardando routeId...');
      return;
    }
    if (!driverId && !isDriver) {
      console.log('⏳ Observador aguardando driverId...');
      return;
    }

    isMountedRef.current = true;
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;
    // Avoid calling setState synchronously inside the effect to prevent
    // cascading renders. Schedule the state update asynchronously.
    Promise.resolve().then(() => setConnectionError(null));

    const maxReconnectAttempts = isDriver ? 3 : 10;
    const reconnectDelay = 1000;

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
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    
    socketRef.current = socket;
    
    // ============================================
    // EVENTOS DO SOCKET
    // ============================================
    
    socket.on('connect', () => {
      if (!isMountedRef.current) return;
      console.log(`✅ [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Conectado ao WebSocket`);
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
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
      setConnectionError(error.message);
      reconnectAttemptsRef.current++;
      setIsReconnecting(true);
      
      if (!shouldReconnectRef.current || reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.log(`🔌 [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Parando tentativas de reconexão`);
        setConnectionError(`Falha na conexão após ${reconnectAttemptsRef.current} tentativas`);
        socket.disconnect();
      }
    });
    
    // Localização recebida
    socket.on('location-update', (loc: DriverLocation) => {
      if (!isMountedRef.current) return;
      console.log(`📍 [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Recebeu localização:`, loc.latitude, loc.longitude);
      onLocationUpdateRef.current?.(loc);
    });
    
    // Confirmação de localização enviada (apenas motorista)
    socket.on('location-ack', (data: LocationAckEvent) => {
      if (!isMountedRef.current) return;
      console.log(`✅ [MOTORISTA] Localização confirmada:`, data);
      onLocationAckRef.current?.(data);
    });
    
    // Motorista offline
    socket.on('driver-offline', (data: DriverOfflineEvent) => {
      if (!isMountedRef.current) return;
      console.warn(`⚠️ [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Motorista offline:`, data);
      onDriverOfflineRef.current?.(data);
    });
    
    // Rota finalizada
    socket.on('route-completed', (data: RouteCompletedEvent) => {
      if (!isMountedRef.current) return;
      console.log(`🎉 [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Rota finalizada!`, data);
      onRouteFinishedRef.current?.(data);
    });
    
    // 🔥 NOVO: Rota iniciada
    socket.on('route-started', (data: RouteStartedEvent) => {
      if (!isMountedRef.current) return;
      console.log(`🚀 [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Rota iniciada!`, data);
      onRouteStartedRef.current?.(data);
    });
    
    // 🔥 NOVO: Status da rota alterado
    socket.on('route-status-changed', (data: RouteStatusChangedEvent) => {
      if (!isMountedRef.current) return;
      console.log(`📢 [${isDriver ? 'MOTORISTA' : 'OBSERVADOR'}] Status da rota alterado:`, data);
      onRouteStatusChangedRef.current?.(data);
    });
    
    // Limpeza
    return () => {
      isMountedRef.current = false;
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setIsReconnecting(false);
    };
  }, [routeId, driverId, isDriver, autoConnect]);

  return { 
    sendLocation,
    sendBatchLocations,
    emitRouteFinished,
    emitRouteStarted,        // 🔥 NOVO
    emitRouteStatusChange,   // 🔥 NOVO
    getDriverStatus,         // 🔥 NOVO
    disconnect,
    reconnect,               // 🔥 NOVO
    isConnected,
    isReconnecting,          // 🔥 NOVO
    connectionError,         // 🔥 NOVO
  };
}
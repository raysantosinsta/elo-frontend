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

export function useLocationWebSocket({
  routeId,
  driverId,
  onLocationUpdate,
  onDriverOffline,
}: {
  routeId: string;
  driverId?: string;
  onLocationUpdate?: (location: LocationData) => void;
  onDriverOffline?: (data: any) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const sendLocation = useCallback((latitude: number, longitude: number, isSimulating = false) => {
    if (socketRef.current?.connected && driverId) {
      socketRef.current.emit('update-location', { latitude, longitude, isSimulating });
    }
  }, [driverId]);

  useEffect(() => {
    const params = new URLSearchParams({ routeId });
    if (driverId) params.append('driverId', driverId);
    
    const socket = io(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/locations?${params}`, {
      transports: ['websocket'],
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('location-update', (loc) => onLocationUpdate?.(loc));
    socket.on('driver-offline', (data) => onDriverOffline?.(data));
    
    return () => { socket.disconnect(); };
  }, [routeId, driverId]);

  return { sendLocation, isConnected };
}
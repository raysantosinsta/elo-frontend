/* eslint-disable react-hooks/set-state-in-effect */
// contexts/WebSocketContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

// interface NotificationPayload {
//   title: string;
//   message: string;
//   type: string;
//   taskId?: string;
//   createdAt?: string;
// }

const WebSocketContext = createContext<Socket | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null); // pra garantir cleanup

  useEffect(() => {
    if (!user?.id) {
      // Se deslogar, desconecta tudo
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const newSocket: Socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("WebSocket conectado →", newSocket.id);
      newSocket.emit("register", user.id);
      setSocket(newSocket);
      socketRef.current = newSocket;
    });

    // contexts/WebSocketContext.tsx
    newSocket.on("notification", (notif) => {
      console.log("Notificação em tempo real:", notif);

      // TOAST (já tem)
      toast.success(notif.title, {
        description: notif.message,
        duration: 10000,
        action: notif.taskId
          ? {
              label: "Ver tarefa",
              onClick: () => {
                window.location.href = `/Kanban?highlight=${notif.taskId}`;
              },
            }
          : undefined,
      });

      // AQUI ESTÁ A MÁGICA: avisa TODO o app que chegou notificação
      window.dispatchEvent(
        new CustomEvent("notificationReceived", { detail: notif })
      );
    });

    newSocket.on("disconnect", (reason) => {
      console.log("WebSocket desconectado:", reason);
      setSocket(null);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Erro de conexão WebSocket:", err.message);
    });

    return () => {
      if (newSocket.connected) {
        newSocket.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
    };
  }, [user?.id]);

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext);

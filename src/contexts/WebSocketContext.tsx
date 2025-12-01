// contexts/WebSocketContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const WebSocketContext = createContext<Socket | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000", {
      withCredentials: true,
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      console.log("WebSocket conectado:", newSocket.id);
      newSocket.emit("register", user.id);
      // Move setSocket here. The socket is only provided to the app once it's connected.
      setSocket(newSocket);
    });

    newSocket.on("notification", (notif) => {
      console.log("Notificação recebida:", notif);

      if (notif.type === "TASK_ASSIGNED") {
        toast.success(notif.title, {
          description: notif.message,
          duration: 8000,
          action: notif.taskId
            ? {
                label: "Ver tarefa",
                onClick: () => {
                  window.location.href = `/kanban?highlight=${notif.taskId}`;
                },
              }
            : undefined,
        });
      }
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket desconectado");
      // When disconnected, remove the socket from the state.
      setSocket(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id]);

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext);
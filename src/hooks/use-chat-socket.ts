"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/types/chat";
import { socketService } from "./socket";

interface UseChatSocketProps {
  chatId: string;
  currentUserId: string;
  companyId?: string;
  onNewMessage?: (msg: ChatMessage) => void;
  onUserNotification?: (notification: any) => void;
  onCompanyNotification?: (notification: any) => void;
}

export function useChatSocket({
  chatId,
  currentUserId,
  companyId,
  onNewMessage,
  onUserNotification,
  onCompanyNotification,
}: UseChatSocketProps) {
  
  // Refs para manter os callbacks atualizados sem disparar o useEffect
  const callbacks = useRef({ onNewMessage, onUserNotification, onCompanyNotification });

  useEffect(() => {
    callbacks.current = { onNewMessage, onUserNotification, onCompanyNotification };
  });

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    // 1. Conectar
    socketService.connect();

    // 2. Entrar nas salas
    socketService.joinUserRoom(currentUserId);
    if (companyId) socketService.joinCompanyRoom(companyId);
    socketService.joinChatRoom(chatId);

    // 3. Definir Handlers
    const handleMsg = (msg: ChatMessage) => {
      console.log("📩 Nova mensagem recebida via Socket:", msg);
      callbacks.current.onNewMessage?.(msg);
    };

    const handleUserNotif = (data: any) => callbacks.current.onUserNotification?.(data);
    const handleCompanyNotif = (data: any) => callbacks.current.onCompanyNotification?.(data);

    // 4. Registrar Listeners
    socketService.on("chat:message", handleMsg);
    socketService.on("notification:mention", handleUserNotif);
    socketService.on("notification:new", handleUserNotif);
    socketService.on("company:notification", handleCompanyNotif);

    // 5. Cleanup (Sair da sala do chat ao desmontar componente)
    return () => {
      socketService.leaveChatRoom(chatId);
      socketService.off("chat:message", handleMsg);
      socketService.off("notification:mention", handleUserNotif);
      socketService.off("notification:new", handleUserNotif);
      socketService.off("company:notification", handleCompanyNotif);
    };
  }, [chatId, currentUserId, companyId]);

  return socketService;
}
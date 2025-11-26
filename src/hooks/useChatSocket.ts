/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/types/chat";
import { useSocket } from "./useSocket";

interface UseChatSocketProps {
  chatId: string;
  currentUserId: string;
  companyId?: string;
  onNewMessage?: (message: ChatMessage) => void;
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
  const socket = useSocket();
  const callbacksRef = useRef({
    onNewMessage,
    onUserNotification,
    onCompanyNotification,
  });

  // Atualizar callbacks sem recriar effects
  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onUserNotification,
      onCompanyNotification,
    };
  });

  useEffect(() => {
    if (!socket.isConnected()) return;

    // Entrar na sala do usuário
    socket.joinUserRoom(currentUserId);

    // Entrar na sala da empresa se existir
    if (companyId) {
      socket.joinCompanyRoom(companyId);
    }

    // Listener para novas mensagens no chat
    const handleNewMessage = (message: ChatMessage) => {
      // Só processa se a mensagem for para este chat
      if (message.chatId === chatId) {
        callbacksRef.current.onNewMessage?.(message);
      }
    };

    // Listener para notificações do usuário
    const handleUserNotification = (notification: any) => {
      callbacksRef.current.onUserNotification?.(notification);
    };

    // Listener para notificações da empresa
    const handleCompanyNotification = (data: any) => {
      if (data.chatId === chatId) {
        callbacksRef.current.onCompanyNotification?.(data);
      }
    };

    // Registrar listeners
    socket.on("chat:message", handleNewMessage);
    socket.on("notification:new", handleUserNotification);
    socket.on("notification:mention", handleUserNotification);
    socket.on("chat:message", handleCompanyNotification);

    return () => {
      // Limpar listeners específicos
      socket.off("chat:message", handleNewMessage);
      socket.off("notification:new", handleUserNotification);
      socket.off("notification:mention", handleUserNotification);
      socket.off("chat:message", handleCompanyNotification);
    };
  }, [chatId, currentUserId, companyId, socket]);

  return socket;
}
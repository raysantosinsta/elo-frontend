// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect, useRef, useState } from "react";
// import { ChatMessage } from "@/types/chat";
// import { useSocket } from "./useSocket";

// interface UseChatSocketProps {
//   chatId: string;
//   currentUserId: string;
//   companyId?: string;
//   onNewMessage?: (message: ChatMessage) => void;
//   onUserNotification?: (notification: any) => void;
//   onCompanyNotification?: (notification: any) => void;
// }

// export function useChatSocket({
//   chatId,
//   currentUserId,
//   companyId,
//   onNewMessage,
//   onUserNotification,
//   onCompanyNotification,
// }: UseChatSocketProps) {
//   const socket = useSocket();
//   const [isConnected, setIsConnected] = useState(socket.isConnected());
//   const callbacksRef = useRef({
//     onNewMessage,
//     onUserNotification,
//     onCompanyNotification,
//   });

//   // Atualizar callbacks sem recriar effects
//   useEffect(() => {
//     callbacksRef.current = {
//       onNewMessage,
//       onUserNotification,
//       onCompanyNotification,
//     };
//   });

//   useEffect(() => {
//     // Observar mudanças no estado da conexão
//     const unsubscribe = socket.onConnectionChange(setIsConnected);
//     return () => unsubscribe();
//   }, [socket]);

//   useEffect(() => {
//     if (!chatId || !currentUserId || !companyId || !isConnected) return;

//     console.log('🔌 Conectado. Entrando nas salas...');
    
//     // Entrar nas salas necessárias
//     socket.joinUserRoom(currentUserId);
//     if (companyId) {
//       socket.joinCompanyRoom(companyId);
//     }
//     socket.joinChatRoom(chatId);

//     // Listener para novas mensagens no chat
//     const handleNewMessage = (message: ChatMessage) => {
//       // Só processa se a mensagem for para este chat
//       if (message.chatId === chatId) {
//         console.log('📥 Nova mensagem recebida no chat:', message);
//         callbacksRef.current.onNewMessage?.(message);
//       }
//     };

//     // Listener para notificações do usuário
//     const handleUserNotification = (notification: any) => {
//       callbacksRef.current.onUserNotification?.(notification);
//       console.log('🔔 Notificação de usuário recebida:', notification);
//     };

//     // Listener para notificações da empresa
//     const handleCompanyNotification = (data: any) => {
//       console.log('🏢 Notificação de empresa recebida:', data);
//       if (data.chatId === chatId) {
//         callbacksRef.current.onCompanyNotification?.(data);
//       }
//     };

//     // Registrar listeners
//     socket.on("chat:message", handleNewMessage);
//     socket.on("notification:new", handleUserNotification);
//     socket.on("notification:mention", handleUserNotification);

//     return () => {
//       // Limpar listeners específicos
//       console.log('🧹 Limpando listeners do chat...');
//       socket.off("chat:message", handleNewMessage);
//       socket.off("notification:new", handleUserNotification);
//       socket.off("notification:mention", handleUserNotification);
//       socket.leaveChatRoom(chatId);
//     };
//   }, [chatId, currentUserId, companyId, socket, isConnected]);

//   return socket;
// }
import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;

  // Garante que só existe uma instância da classe (Singleton)
  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect() {
    if (this.socket?.connected) return;

    const API_URL = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

    // Conecta especificamente no Namespace '/ws' configurado no Backend
    this.socket = io(`${API_URL}/ws`, {
      transports: ["websocket"], // Força WebSocket (mais rápido que polling)
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      // path: "/socket.io/", // Padrão do NestJS, não precisa alterar
    });

    this.socket.on("connect", () => {
      console.log("✅ [SocketService] Conectado. ID:", this.socket?.id);
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ [SocketService] Erro de conexão:", error.message);
    });

    this.socket.on("disconnect", (reason) => {
      console.warn("⚠️ [SocketService] Desconectado:", reason);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // --- Métodos de Sala (Rooms) ---
  
  joinUserRoom(userId: string) {
    this.emit("join_user_room", userId);
  }

  joinCompanyRoom(companyId: string) {
    this.emit("join_company_room", companyId);
  }

  joinChatRoom(chatId: string) {
    this.emit("join_chat_room", chatId);
  }

  leaveChatRoom(chatId: string) {
    this.emit("leave_chat_room", chatId);
  }

  // --- Métodos Genéricos ---

  // Wrapper seguro para 'on' que evita duplicação de listeners se o componente re-renderizar
  on(event: string, callback: (data: any) => void) {
    if (!this.socket) return;
    // Remove listener anterior igual (se houver) para evitar duplicidade
    this.socket.off(event, callback); 
    this.socket.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    this.socket?.off(event, callback);
  }

  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = SocketService.getInstance();
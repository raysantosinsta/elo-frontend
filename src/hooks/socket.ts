/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Array<(data: any) => void>>();
  private connectionCallbacks: Array<(connected: boolean) => void> = [];

  connect() {
    if (this.socket) return;

    this.socket = io("http://localhost:3000/ws", {
      transports: ["websocket", "polling"],
      timeout: 10000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("✅ Conectado ao WebSocket");
      this.notifyConnectionChange(true);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Desconectado do WebSocket:", reason);
      this.notifyConnectionChange(false);
    });

    this.socket.on("connect_error", (error) => {
      console.error("💥 Erro de conexão WebSocket:", error);
      this.notifyConnectionChange(false);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`🔁 Reconectado ao WebSocket (tentativa ${attemptNumber})`);
      this.notifyConnectionChange(true);
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Tentativa de reconexão ${attemptNumber}`);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("💥 Erro na reconexão WebSocket:", error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("💥 Falha na reconexão WebSocket");
      this.notifyConnectionChange(false);
    });

    // Registrar listeners existentes
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.on(event, callback);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.notifyConnectionChange(false);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.listeners.has(event) && callback) {
      const eventListeners = this.listeners.get(event);
      const index = eventListeners?.indexOf(callback);
      if (index !== undefined && index > -1) {
        eventListeners?.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  joinUserRoom(userId: string) {
    if (this.socket) {
      this.socket.emit("join_user_room", userId);
      console.log(`👤 Entrando na sala do usuário: ${userId}`);
    }
  }

  joinCompanyRoom(companyId: string) {
    if (this.socket) {
      this.socket.emit("join_company_room", companyId);
      console.log(`🏢 Entrando na sala da empresa: ${companyId}`);
    }
  }

  

  joinChatRoom(chatId: string) {
    if (this.socket) {
      this.socket.emit("join_chat_room", chatId);
      console.log(`💬 Entrando na sala do chat: ${chatId}`);
    }
  }

  leaveChatRoom(chatId: string) {
    if (this.socket) {
      this.socket.emit("leave_chat_room", chatId);
      console.log(`🚪 Saindo da sala do chat: ${chatId}`);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Métodos para gerenciar callbacks de conexão
  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.push(callback);
    
    // Retorna função para remover o callback
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  private notifyConnectionChange(connected: boolean) {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error("Erro no callback de conexão:", error);
      }
    });
  }

  // Método para obter o ID do socket (útil para debug)
  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  // Método para verificar o status da conexão
  getConnectionStatus(): {
    connected: boolean;
    id: string | null;
    disconnected: boolean;
  } {
    if (!this.socket) {
      return {
        connected: false,
        id: null,
        disconnected: true,
      };
    }

    return {
      connected: this.socket.connected,
      id: this.socket.id ?? null,
      disconnected: this.socket.disconnected,
    };
  }
}

export const socketService = new SocketService();
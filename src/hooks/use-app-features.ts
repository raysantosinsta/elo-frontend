/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth, useAuthFetch } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { ChatMessage, User } from "@/types/chat";

// ==========================================
// 1. SOCKET SERVICE (Singleton)
// ==========================================

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Array<(data: any) => void>>();
  private connectionCallbacks: Array<(connected: boolean) => void> = [];

  // Singleton instance
  private static instance: SocketService;

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect() {
    if (this.socket) return;

    // URL do backend (ajuste conforme seu env)
    const API_URL = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

    // 🔥 CORREÇÃO: Adicionamos o "/ws" na URL para bater com o @WebSocketGateway do NestJS
    this.socket = io(`${API_URL}/ws`, {
      transports: ["websocket", "polling"],
      path: "/socket.io/", 
    });

    // Tratamento de eventos de conexão
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

    // Registrar listeners que foram adicionados antes da conexão
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
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

  // Métodos específicos do seu backend
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

  // Métodos genéricos
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
    this.socket?.on(event, callback);
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
    this.socket?.off(event, callback);
  }

  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.push(callback);
    callback(this.isConnected()); // Chama imediatamente com estado atual
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) this.connectionCallbacks.splice(index, 1);
    };
  }

  private notifyConnectionChange(connected: boolean) {
    this.connectionCallbacks.forEach((cb) => cb(connected));
  }
}

export const socketService = SocketService.getInstance();

// ==========================================
// 2. HOOK: USE SOCKET (Genérico)
// ==========================================
export function useSocket() {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      socketService.connect();
      isInitialized.current = true;
    }
  }, []);

  return socketService;
}

// ==========================================
// 3. HOOK: USE CHAT SOCKET (Lógica de Sala)
// ==========================================
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
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(socket.isConnected());

  // Refs para manter callbacks atualizados sem recriar effects
  const callbacksRef = useRef({ onNewMessage, onUserNotification, onCompanyNotification });

  useEffect(() => {
    callbacksRef.current = { onNewMessage, onUserNotification, onCompanyNotification };
  });

  useEffect(() => {
    return socket.onConnectionChange(setIsConnected);
  }, [socket]);

  useEffect(() => {
    if (!chatId || !currentUserId || !isConnected) return;

    // Entrar nas salas
    socket.joinUserRoom(currentUserId);
    if (companyId) socket.joinCompanyRoom(companyId);
    socket.joinChatRoom(chatId);

    // Handlers
    const handleMsg = (msg: ChatMessage) => {
      console.log("🔥 SOCKET (Client) Recebeu:", msg); // ADICIONE ESTE LOG

      // 🔥 REMOVA ou COMENTE esta verificação estrita:
      // if (msg.chatId === chatId) callbacksRef.current.onNewMessage?.(msg);

      // 🔥 USE ASSIM (Confie que se veio pelo socket, é para este chat):
      callbacksRef.current.onNewMessage?.(msg);
    };

    const handleUserNotif = (notif: any) => callbacksRef.current.onUserNotification?.(notif);
    const handleCompanyNotif = (notif: any) => callbacksRef.current.onCompanyNotification?.(notif);

    // Registra listeners
    socket.on("chat:message", handleMsg);
    socket.on("notification:new", handleUserNotif);
    socket.on("notification:mention", handleUserNotif);
    socket.on("company:notification", handleCompanyNotif);

    return () => {
      socket.off("chat:message", handleMsg);
      socket.off("notification:new", handleUserNotif);
      socket.off("notification:mention", handleUserNotif);
      socket.off("company:notification", handleCompanyNotif);
      socket.leaveChatRoom(chatId);
    };
  }, [chatId, currentUserId, companyId, socket, isConnected]);

  return { isConnected, socket };
}

// ==========================================
// 4. HOOK: USE MENTIONS (Input & Busca)
// ==========================================
// Em src/hooks/use-app-features.ts (ou onde estiver seu hook)

export function useMentions() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [showList, setShowList] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isLoading, setIsLoading] = useState(false);
  // NOVO: Estado para controlar o item selecionado via teclado
  const [selectedIndex, setSelectedIndex] = useState(0);

  const timeoutRef = useRef<any>(null);

  // Reseta o index quando os resultados mudam
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleInputChange = useCallback((text: string, cursor: number, el?: HTMLInputElement | HTMLTextAreaElement) => {
    const lastAt = text.lastIndexOf("@", cursor - 1);

    if (lastAt !== -1 && (lastAt === 0 || /[\s\n]/.test(text[lastAt - 1]))) {
      const textAfterAt = text.substring(lastAt + 1, cursor);
      const queryTerm = textAfterAt.split(' ')[0];

      if (!queryTerm.includes('\n')) {
        setQuery(queryTerm);
        setShowList(true);

        if (el) {
          const rect = el.getBoundingClientRect();
          // Ajuste simples para posicionar acima do input
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          setPosition({ top: (rect.top + scrollY) - 20, left: rect.left });
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsLoading(true);

        timeoutRef.current = setTimeout(async () => {
          if (!queryTerm.trim()) {
            setIsLoading(false);
            return;
          }
          try {
            const users = await api.getUsersForMention(queryTerm);
            setResults(users);
            if (users.length === 0) setShowList(false);
          } catch (e) {
            console.error(e);
            setResults([]);
          } finally {
            setIsLoading(false);
          }
        }, 300);
        return;
      }
    }
    setShowList(false);
  }, []);

  const insertMention = (text: string, user: User, cursor: number) => {
    const lastAt = text.lastIndexOf("@", cursor - 1);
    const before = text.substring(0, lastAt);
    const after = text.substring(cursor);
    // Adiciona espaço após o nome para facilitar a continuação da digitação
    const newText = `${before}@${user.name} ${after}`;

    return {
      text: newText,
      // Posição: antes + @ + nome + espaço
      cursor: lastAt + user.name.length + 2
    };
  };

  // NOVO: Lógica de Teclado
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    onSelect: (user: User) => void
  ) => {
    if (!showList || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      onSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowList(false);
    }
  };

  return {
    query,
    results,
    showList,
    position,
    isLoading,
    selectedIndex, // Exportando
    handleInputChange,
    handleKeyDown, // Exportando
    insertMention,
    close: () => setShowList(false)
  };
}

// ==========================================
// 5. HOOK: USE NOTIFICATIONS (API + Socket)
// ==========================================
const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

export function useNotifications() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const socket = useSocket(); // Reutiliza o socket deste mesmo arquivo

  const [notifications, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(`${API_BASE}/notifications`);
      if (res.ok) {
        setNotifs(await res.json());
      } else {
        throw new Error("Falha ao carregar notificações");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, authFetch]);

  useEffect(() => {
    fetchNotifs();

    const handleNew = () => {
      console.log("🔔 Nova notificação via Socket!");
      fetchNotifs();
    };

    socket.on("notification:new", handleNew);
    socket.on("notification:mention", handleNew);

    return () => {
      socket.off("notification:new", handleNew);
      socket.off("notification:mention", handleNew);
    };
  }, [fetchNotifs, socket]);

  const markAsRead = async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await authFetch(`${API_BASE}/notifications/${id}/read`, { method: "PATCH" });
      return true;
    } catch {
      return false;
    }
  };

  const markAllAsRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await authFetch(`${API_BASE}/notifications/mark-all-read`, { method: "POST" });
      return true;
    } catch {
      return false;
    }
  };

  return {
    notifications,
    unreadCount: notifications.filter((n: any) => !n.isRead).length,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifs
  };
}
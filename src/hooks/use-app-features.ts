/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { User } from "@/types/chat";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api"; // Certifique-se de importar do local correto onde criou o axios
import { chatService } from "@/services/chatService"; // Importe o service criado no passo anterior
import { socketService } from "./socket";

// ==========================================
// USE MENTIONS
// ==========================================
export function useMentions() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [showList, setShowList] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleInputChange = useCallback(
    (
      text: string,
      cursor: number,
      el?: HTMLInputElement | HTMLTextAreaElement
    ) => {
      const lastAt = text.lastIndexOf("@", cursor - 1);

      if (lastAt !== -1 && (lastAt === 0 || /[\s\n]/.test(text[lastAt - 1]))) {
        const textAfterAt = text.substring(lastAt + 1, cursor);
        const queryTerm = textAfterAt.split(" ")[0];

        if (!queryTerm.includes("\n")) {
          setQuery(queryTerm);
          setShowList(true);

          if (el) {
            const rect = el.getBoundingClientRect();
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            setPosition({ top: rect.top + scrollY - 20, left: rect.left });
          }

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setIsLoading(true);

          timeoutRef.current = setTimeout(async () => {
            if (!queryTerm.trim()) {
              setIsLoading(false);
              return;
            }
            try {
              // USANDO O SERVICE PADRONIZADO
              const users = await chatService.getUsersForMention(queryTerm);
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
    },
    []
  );

  const insertMention = (text: string, user: User, cursor: number) => {
    const lastAt = text.lastIndexOf("@", cursor - 1);
    const before = text.substring(0, lastAt);
    const after = text.substring(cursor);
    const newText = `${before}@${user.name} ${after}`;

    return {
      text: newText,
      cursor: lastAt + user.name.length + 2,
    };
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    onSelect: (user: User) => void
  ) => {
    if (!showList || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      onSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowList(false);
    }
  };

  return {
    query,
    results,
    showList,
    position,
    isLoading,
    selectedIndex,
    handleInputChange,
    handleKeyDown,
    insertMention,
    close: () => setShowList(false),
  };
}

// ==========================================
// USE NOTIFICATIONS (Simplificado com Axios)
// ==========================================
export function useNotifications() {
  const { user } = useAuth(); // Apenas para saber se está logado
  const socket = socketService;
  const [notifications, setNotifs] = useState<any[]>([]); // Idealmente crie um tipo Notification
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
      // O Axios injeta o token e baseURL automaticamente
      const { data } = await api.get("/notifications");
      setNotifs(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  }, [user]);

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
    // Otimistic Update
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await api.patch(`/notifications/${id}/read`);
      return true;
    } catch {
      // Reverter se falhar (opcional)
      return false;
    }
  };

  const markAllAsRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.post("/notifications/mark-all-read");
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
    refresh: fetchNotifs,
  };
}
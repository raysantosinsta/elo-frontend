/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth, useAuthFetch } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { User } from "@/types/chat";
import { useCallback, useEffect, useRef, useState } from "react";
import { socketService } from "./socket";

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
            // Ajuste simples para posicionar acima do input
            const scrollY =
              window.scrollY || document.documentElement.scrollTop;
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
    },
    []
  );

  const insertMention = (text: string, user: User, cursor: number) => {
    const lastAt = text.lastIndexOf("@", cursor - 1);
    const before = text.substring(0, lastAt);
    const after = text.substring(cursor);
    // Adiciona espaço após o nome para facilitar a continuação da digitação
    const newText = `${before}@${user.name} ${after}`;

    return {
      text: newText,
      // Posição: antes + @ + nome + espaço
      cursor: lastAt + user.name.length + 2,
    };
  };

  // NOVO: Lógica de Teclado
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
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
    selectedIndex, // Exportando
    handleInputChange,
    handleKeyDown, // Exportando
    insertMention,
    close: () => setShowList(false),
  };
}

// ==========================================
// 5. HOOK: USE NOTIFICATIONS (API + Socket)
// ==========================================
const API_BASE =
  process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

export function useNotifications() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const socket = socketService;
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
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await authFetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
      });
      return true;
    } catch {
      return false;
    }
  };

  const markAllAsRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await authFetch(`${API_BASE}/notifications/mark-all-read`, {
        method: "POST",
      });
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

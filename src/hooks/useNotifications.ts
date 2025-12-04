// // src/hooks/useNotifications.ts
// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useAuth, useAuthFetch } from "@/contexts/AuthContext";

// const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

// export interface Notification {
//   id: string;
//   userId: string;
//   title: string;
//   message: string;
//   type: string;
//   isRead: boolean;
//   createdAt: string;
//   readAt?: string | null;
//   task?: {
//     id: string;
//     title: string;
//   };
// }

// export function useNotifications() {
//   const { user } = useAuth();
//   const authFetch = useAuthFetch();

//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const unreadCount = notifications.filter((n) => !n.isRead).length;

//   const fetchNotifications = useCallback(async () => {
//     if (!user) {
//       setNotifications([]);
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     try {
//       // FORÇA URL COMPLETA DO BACKEND
//       const response = await authFetch(`${API_BASE}/notifications`);

//       if (!response.ok) {
//         const text = await response.text();
//         throw new Error(`Erro ${response.status}: ${text.substring(0, 200)}`);
//       }

//       const data = await response.json();
//       setNotifications(data || []);
//     } catch (err: any) {
//       console.error("Erro ao buscar notificações:", err);
//       setError(err.message || "Falha ao carregar notificações");
//     } finally {
//       setLoading(false);
//     }
//   }, [user, authFetch]);

//   const markAsRead = async (id: string) => {
//     try {
//       const response = await authFetch(`${API_BASE}/notifications/${id}/read`, {
//         method: "PATCH",
//       });

//       if (!response.ok) return false;

//       setNotifications((prev) =>
//         prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
//       );
//       return true;
//     } catch {
//       return false;
//     }
//   };

//   const markAllAsRead = async () => {
//     try {
//       const response = await authFetch(`${API_BASE}/notifications/mark-all-read`, {
//         method: "POST",
//       });

//       if (!response.ok) return false;

//       setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
//       return true;
//     } catch {
//       return false;
//     }
//   };

//   const refresh = fetchNotifications;

//   // src/hooks/useNotifications.ts
// useEffect(() => {
//   fetchNotifications(); // carrega na montagem

//   // ESCUTA O EVENTO DO WEBSOCKET
//   const handleNewNotification = () => {
//     console.log("Nova notificação via WebSocket → recarregando lista");
//     fetchNotifications();
//   };

//   window.addEventListener("notificationReceived", handleNewNotification);

//   // cleanup
//   return () => {
//     window.removeEventListener("notificationReceived", handleNewNotification);
//   };
// }, [fetchNotifications]);

//   return {
//     notifications,
//     unreadCount,
//     loading,
//     error,
//     refresh,
//     markAsRead,
//     markAllAsRead,
//   };
// }
/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useNotifications.ts (versão atualizada)
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  task?: {
    id: string;
    title: string;
  };
  company?: {
    id: string;
    name: string;
  };
}

export function useNotifications() {
  const { authFetch, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Buscando notificações para usuário:', user.id);
      
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_NESTJS_API_URL}/notifications?limit=20`
      );
      
      // Verificar se a resposta é ok
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Endpoint de notificações não encontrado. Verifique se o backend está rodando corretamente.');
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Notificações recebidas do backend:', data);
      
      // Verificar o formato dos dados
      if (Array.isArray(data)) {
        setNotifications(data);
        
        // Calcular contagem de não lidas
        const unread = data.filter((n: Notification) => !n.isRead).length;
        setUnreadCount(unread);
      } else {
        console.error('❌ Formato inválido de notificações:', data);
        setError('Formato de dados inválido');
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err: any) {
      console.error('❌ Erro ao buscar notificações:', err);
      setError(err.message || 'Erro ao carregar notificações');
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_NESTJS_API_URL}/notifications/unread-count`
      );
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      } else if (response.status === 404) {
        // Se o endpoint não existe, calcular localmente
        const unread = notifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar contagem não lidas:', err);
      // Calcular localmente em caso de erro
      const unread = notifications.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    }
  }, [authFetch, user, notifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_NESTJS_API_URL}/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
        }
      );

      if (response.ok) {
        // Atualizar estado local
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ Erro ao marcar como lida:', err);
      return false;
    }
  }, [authFetch]);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_NESTJS_API_URL}/notifications/mark-all-read`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        // Marcar todas como lidas no estado local
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ Erro ao marcar todas como lidas:', err);
      // Fallback: marcar localmente
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
      return true; // Retorna true pois marcamos localmente
    }
  }, [authFetch]);

  // Buscar notificações ao carregar e quando o usuário muda
  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Atualizar a cada 30 segundos
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
      
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    fetchUnreadCount,
  };
}
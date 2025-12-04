/* eslint-disable @typescript-eslint/no-explicit-any */
// components/layout/sidebar.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BarChart2,
  BarChart3,
  BarChart,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Home,
  KanbanSquare,
  KanbanSquareDashed,

  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SidebarProps {
  className?: string;
}

// --- CORREÇÃO AQUI: Links ajustados e únicos ---
const menuItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Kanban Profissional",
    href: "/Kanban",
    icon: KanbanSquare,
  },
  {
    title: "Kanban Produto",
    href: "/kanban-flow",
    icon: KanbanSquareDashed,
  },
  // Mudei o link de "Tarefas" para evitar conflito ou redundância
  // Se "Tarefas" for o mesmo que "Kanban", você pode remover este item
  // Se for uma lista simples, pode ser "/tasks"
  // {
  //   title: "Tarefas",
  //   href: "/tasks", // Alterado para não conflitar com relatório
  //   icon: FileText,
  // },
  {
    title: "Chats",
    href: "/chats",
    icon: MessageSquare,
  },
  {
    title: "Calendário",
    href: "/agenda",
    icon: Calendar,
  },
  // Corrigido: Aponta para relatório de PROFISSIONAIS
  {
    title: "Relatórios Profissionais",
    href: "/professionals/report",
    icon: BarChart3,
  },
  // Corrigido: Aponta para relatório de TAREFAS
  {
    title: "Relatórios Tarefas",
    href: "/tasks/report",
    icon: BarChart2,
  },
  {
    title: "Relatórios produtos",
    href: "/product/report",
    icon: BarChart,
  },
  {
    title: "Gerenciar Profissionais",
    href: "/signup", // Adicionei a barra '/' para garantir caminho absoluto
    icon: User,
  }
];

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "TASK_COMPLETED":
        return <Check className="w-4 h-4 text-green-500" />;
      case "TASK_OVERDUE":
        return <Clock className="w-4 h-4 text-red-500" />;
      case "BUDGET_APPROVED":
      case "BUDGET_REJECTED":
      case "BUDGET_PENDING_APPROVAL":
        return <DollarSign className="w-4 h-4 text-purple-500" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="w-4 h-4 text-yellow-500" />;
      case "SYSTEM_ALERT":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const handleMarkAsRead = async (notificationId: string) => {
    const success = await markAsRead(notificationId);
    if (success) {
      toast.success("Notificação marcada como lida");
    } else {
      toast.error("Erro ao marcar como lida");
    }
  };

  const handleMarkAllAsRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      toast.success("Todas as notificações foram marcadas como lidas");
    } else {
      toast.error("Erro ao marcar todas como lidas");
    }
  };

  const handleRefresh = async () => {
    await refresh();
    toast.info("Notificações atualizadas");
  };

  // Log para debug
  useEffect(() => {
    // console.log("🔔 Estado das notificações:", {
    //   total: notifications.length,
    //   unread: unreadCount,
    //   loading,
    //   error,
    // });
  }, [notifications, unreadCount, loading, error]);

  return (
    <div
      className={cn(
        "flex flex-col bg-background border-r transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Highlander</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* Notifications Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative"
                onClick={() => console.log("Notificações clicadas")}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-96 p-0" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="font-semibold">Notificações</h3>
                  <p className="text-xs text-gray-500">
                    {loading ? "Carregando..." : 
                     error ? "Erro ao carregar" :
                     `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''} de ${notifications.length}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRefresh}
                    title="Atualizar"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  {unreadCount > 0 && notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="h-8 text-xs"
                      disabled={loading}
                    >
                      <CheckCheck className="w-3 h-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                </div>
              </div>
              
              {error ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                  <p className="text-sm text-red-600">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleRefresh}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Carregando notificações...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Nenhuma notificação</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Novas notificações aparecerão aqui
                  </p>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-[400px]">
                    <div className="p-2">
                      {notifications.map((notification: any, index: number) => (
                        <div
                          key={notification.id || `notification-${index}`}
                          className={cn(
                            "flex items-start p-3 rounded-lg transition-colors mb-2 border",
                            !notification.isRead 
                              ? "bg-blue-50 border-blue-200 hover:bg-blue-100" 
                              : "border-gray-100 hover:bg-gray-50"
                          )}
                        >
                          <div className="flex-shrink-0 mt-0.5 mr-3">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-semibold text-gray-900">
                                {notification.title || 'Sem título'}
                              </p>
                              {!notification.isRead && (
                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message || 'Sem mensagem'}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                              
                              {notification.task && (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded truncate max-w-[120px]">
                                  {notification.task.title}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-2">
                              {!notification.isRead && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                >
                                  Marcar como lida
                                </Button>
                              )}
                              
                              {notification.task?.id && (
                                <Link href={`/Kanban?highlight=${notification.task.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                  >
                                    Ver tarefa
                                  </Button>
                                </Link>
                              )}
                              
                              {notification.type === "NEW_MESSAGE" && (
                                <Link href="/chats">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                  >
                                    Ir para Chats
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </PopoverContent>
          </Popover>

          {/* Toggle Sidebar Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {/* CORREÇÃO AQUI: Usando item.title como Key */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link key={item.title} href={item.href}>
                <div
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "transparent",
                    collapsed ? "justify-center" : "justify-start"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className={cn("w-4 h-4", collapsed ? "mr-0" : "mr-3")} />
                  {!collapsed && <span>{item.title}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* User Profile */}
      {!collapsed && user && (
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
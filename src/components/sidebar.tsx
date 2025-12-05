// components/layout/sidebar.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/use-app-features";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BarChart,
  BarChart2,
  BarChart3,
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
  {
    title: "Relatórios Profissionais",
    href: "/professionals/report",
    icon: BarChart3,
  },
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
    href: "/signup",
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

  // Ícones de notificação
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <FileText className="w-4 h-4 text-[#2C3E50]" />;
      case "TASK_COMPLETED":
        return <Check className="w-4 h-4 text-green-600" />;
      case "TASK_OVERDUE":
        return <Clock className="w-4 h-4 text-[#D35400]" />;
      case "BUDGET_APPROVED":
      case "BUDGET_REJECTED":
      case "BUDGET_PENDING_APPROVAL":
        return <DollarSign className="w-4 h-4 text-[#2C3E50]" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="w-4 h-4 text-[#D35400]" />;
      case "SYSTEM_ALERT":
        return <AlertCircle className="w-4 h-4 text-[#D35400]" />;
      default:
        return <Bell className="w-4 h-4 text-[#95A5A6]" />;
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

  useEffect(() => {}, [notifications, unreadCount, loading, error]);

  return (
    <div
      className={cn(
        // ALTERADO: Background Azul Petróleo (#2C3E50), borda suave
        "flex flex-col bg-[#2C3E50]  border-white/10 shadow-lg transition-all duration-300 z-40",
        collapsed ? "w-20" : "w-72",
        className
      )}
    >
      {/* Header da Sidebar */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 h-20">
        {!collapsed && (
          <div className="flex items-center space-x-3 transition-opacity duration-300 animate-in fade-in">
            {/* Ícone Branding: Terracota para destaque */}
            <div className="w-10 h-10 bg-[#D35400] rounded-xl flex items-center justify-center shadow-md">
              <Home className="w-5 h-5 text-white" />
            </div>
            {/* ALTERADO: Texto Branco */}
            <span className="font-bold text-xl text-white tracking-tight">Highlander</span>
          </div>
        )}
        
        {/* Controles (Sino e Toggle) */}
        <div className={cn("flex items-center gap-1", collapsed && "flex-col gap-4 mx-auto")}>
          {/* Notifications Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                // ALTERADO: Cores de texto claras e hover com transparência branca
                className="h-9 w-9 relative text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D35400] text-[10px] font-bold text-white ring-2 ring-[#2C3E50]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            
            {/* O conteúdo do Popover mantém o fundo branco para legibilidade */}
            <PopoverContent 
              className="w-96 p-0 border-[#95A5A6]/20 shadow-xl rounded-xl bg-white" 
              align={collapsed ? "center" : "start"}
              side={collapsed ? "right" : "bottom"}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {/* Cabeçalho do Popover */}
              <div className="flex items-center justify-between p-4 border-b border-[#95A5A6]/20 bg-[#F5F0E6]/30">
                <div>
                  <h3 className="font-bold text-[#2C3E50]">Notificações</h3>
                  <p className="text-xs text-[#95A5A6]">
                    {loading ? "Sincronizando..." : 
                     error ? "Falha na conexão" :
                     `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#2C3E50] hover:text-[#D35400]"
                    onClick={handleRefresh}
                    title="Atualizar"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                  </Button>
                  {unreadCount > 0 && notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="h-8 text-xs text-[#2C3E50] hover:text-[#D35400]"
                      disabled={loading}
                    >
                      <CheckCheck className="w-3.5 h-3.5 mr-1" />
                      Lidas
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Corpo das Notificações */}
              {error ? (
                <div className="p-8 text-center bg-red-50/50">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-red-200 text-red-700 hover:bg-red-100"
                    onClick={handleRefresh}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : loading && notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 text-[#D35400] animate-spin mx-auto" />
                  <p className="mt-3 text-sm text-[#95A5A6]">Buscando atualizações...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-[#F5F0E6] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-[#95A5A6]" />
                  </div>
                  <p className="text-sm font-medium text-[#2D3436]">Tudo limpo por aqui</p>
                  <p className="text-xs text-[#95A5A6] mt-1">
                    Novas notificações aparecerão automaticamente
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="p-2 space-y-1">
                    {notifications.map((notification: any, index: number) => (
                      <div
                        key={notification.id || `notification-${index}`}
                        className={cn(
                          "group flex items-start p-3 rounded-lg transition-all border",
                          !notification.isRead 
                            ? "bg-white border-[#D35400]/20 shadow-sm hover:border-[#D35400]/40" 
                            : "bg-transparent border-transparent hover:bg-[#F5F0E6]"
                        )}
                      >
                        <div className="flex-shrink-0 mt-1 mr-3">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <p className={cn(
                              "text-sm font-semibold",
                              !notification.isRead ? "text-[#2C3E50]" : "text-[#95A5A6]"
                            )}>
                              {notification.title || 'Sem título'}
                            </p>
                            {!notification.isRead && (
                              <span className="inline-block w-2 h-2 bg-[#D35400] rounded-full ml-2 shadow-sm"></span>
                            )}
                          </div>
                          <p className="text-sm text-[#2D3436]/80 mt-1 line-clamp-2 leading-relaxed">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-[#95A5A6] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            
                            {notification.task && (
                              <span className="text-[10px] bg-[#2C3E50]/5 text-[#2C3E50] px-2 py-0.5 rounded-full font-medium truncate max-w-[100px] border border-[#2C3E50]/10">
                                {notification.task.title}
                              </span>
                            )}
                          </div>
                          
                          {/* Ações Rápidas */}
                          <div className="flex justify-end gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-[#2C3E50] hover:text-[#D35400] hover:bg-[#D35400]/5"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                Marcar lida
                              </Button>
                            )}
                            
                            {(notification.task?.id || notification.type === "NEW_MESSAGE") && (
                              <Link href={notification.type === "NEW_MESSAGE" ? "/chats" : `/Kanban?highlight=${notification.task?.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[10px] text-[#2C3E50] hover:text-[#D35400] hover:bg-[#D35400]/5"
                                >
                                  Ver detalhes <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </PopoverContent>
          </Popover>

          {/* Toggle Sidebar Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            // ALTERADO: Cor clara
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
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
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link key={item.title} href={item.href}>
                <div
                  className={cn(
                    "flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                    isActive
                      ? "bg-[#D35400] text-white shadow-md shadow-[#D35400]/20" // Ativo: Terracota (Contrasta bem com Azul)
                      : "text-gray-300 hover:bg-white/10 hover:text-white", // ALTERADO: Inativo claro
                    collapsed ? "justify-center" : "justify-start"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon 
                    className={cn(
                      "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                      collapsed ? "mr-0" : "mr-3",
                      // ALTERADO: Ícone sempre branco/claro no fundo escuro
                      isActive ? "text-white" : "text-gray-400 group-hover:text-white" 
                    )} 
                  />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                  
                  {/* Indicador de Hover */}
                  {!isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D35400] opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer / User Profile */}
      {!collapsed && user && (
        // ALTERADO: Fundo escuro sutil (preto com transparência)
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center space-x-3 opacity-90 hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white text-xs font-bold border border-white/5">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Conta Ativa</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
    return <RefreshCw className={cn("animate-spin", className)} />;
}
// // /* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// // components/layout/sidebar.tsx
// "use client";

// import { Button } from "@/components/ui/button";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { useAuth } from "@/contexts/AuthContext";
// import { useNotifications } from "@/hooks/use-app-features";
// import { cn } from "@/lib/utils";
// import {
//   AlertCircle,
//   BarChart,
//   BarChart2,
//   BarChart3,
//   Bell,
//   Calendar,
//   Check,
//   CheckCheck,
//   ChevronLeft,
//   ChevronRight,
//   Clock,
//   DollarSign,
//   FileText,
//   Home,
//   KanbanSquare,
//   KanbanSquareDashed,
//   LayoutDashboard,
//   MessageSquare,
//   RefreshCw,
//   User,
// } from "lucide-react";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useEffect, useState } from "react";
// import { toast } from "sonner";

// interface SidebarProps {
//   className?: string;
// }

// const menuItems = [
//   {
//     title: "Dashboard",
//     href: "/",
//     icon: LayoutDashboard,
//   },
//   {
//     title: "Kanban Profissional",
//     href: "/Kanban",
//     icon: KanbanSquare,
//   },
//   {
//     title: "Kanban Produto",
//     href: "/kanban-flow",
//     icon: KanbanSquareDashed,
//   },
//   {
//     title: "Chats",
//     href: "/chats",
//     icon: MessageSquare,
//   },
//   {
//     title: "Calendário",
//     href: "/agenda",
//     icon: Calendar,
//   },
//   {
//     title: "Relatórios Profissionais",
//     href: "/professionals/report",
//     icon: BarChart3,
//   },
//   {
//     title: "Relatórios Tarefas",
//     href: "/tasks/report",
//     icon: BarChart2,
//   },
//   {
//     title: "Relatórios produtos",
//     href: "/product/report",
//     icon: BarChart,
//   },
//   {
//     title: "Gerenciar Profissionais",
//     href: "/signup",
//     icon: User,
//   }
// ];

// export function Sidebar({ className }: SidebarProps) {
//   const [collapsed, setCollapsed] = useState(false);
//   const pathname = usePathname();
//   const { user } = useAuth();
//   const {
//     notifications,
//     unreadCount,
//     loading,
//     error,
//     refresh,
//     markAsRead,
//     markAllAsRead,
//   } = useNotifications();

//   const toggleSidebar = () => {
//     setCollapsed(!collapsed);
//   };

//   // Ícones de notificação com cores semânticas, mas mantendo a base da paleta onde possível
//   const getNotificationIcon = (type: string) => {
//     switch (type) {
//       case "TASK_ASSIGNED":
//         return <FileText className="w-4 h-4 text-[#2C3E50]" />;
//       case "TASK_COMPLETED":
//         return <Check className="w-4 h-4 text-green-600" />;
//       case "TASK_OVERDUE":
//         return <Clock className="w-4 h-4 text-[#D35400]" />; // Terracota para urgência
//       case "BUDGET_APPROVED":
//       case "BUDGET_REJECTED":
//       case "BUDGET_PENDING_APPROVAL":
//         return <DollarSign className="w-4 h-4 text-[#2C3E50]" />;
//       case "NEW_MESSAGE":
//         return <MessageSquare className="w-4 h-4 text-[#D35400]" />;
//       case "SYSTEM_ALERT":
//         return <AlertCircle className="w-4 h-4 text-[#D35400]" />;
//       default:
//         return <Bell className="w-4 h-4 text-[#95A5A6]" />;
//     }
//   };

//   const formatTimeAgo = (dateString: string) => {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffMs = now.getTime() - date.getTime();
//     const diffMins = Math.floor(diffMs / 60000);
//     const diffHours = Math.floor(diffMins / 60);
//     const diffDays = Math.floor(diffHours / 24);

//     if (diffMins < 1) return "Agora mesmo";
//     if (diffMins < 60) return `${diffMins} min atrás`;
//     if (diffHours < 24) return `${diffHours}h atrás`;
//     if (diffDays < 7) return `${diffDays}d atrás`;
//     return date.toLocaleDateString('pt-BR');
//   };

//   const handleMarkAsRead = async (notificationId: string) => {
//     const success = await markAsRead(notificationId);
//     if (success) {
//       toast.success("Notificação marcada como lida");
//     } else {
//       toast.error("Erro ao marcar como lida");
//     }
//   };

//   const handleMarkAllAsRead = async () => {
//     const success = await markAllAsRead();
//     if (success) {
//       toast.success("Todas as notificações foram marcadas como lidas");
//     } else {
//       toast.error("Erro ao marcar todas como lidas");
//     }
//   };

//   const handleRefresh = async () => {
//     await refresh();
//     toast.info("Notificações atualizadas");
//   };

//   useEffect(() => {}, [notifications, unreadCount, loading, error]);

//   return (
//     <div
//       className={cn(
//         // Background Branco para contraste com o corpo Bege (#F5F0E6), borda Areia
//         "flex flex-col bg-white border-r border-[#95A5A6]/20 shadow-sm transition-all duration-300 z-40",
//         collapsed ? "w-20" : "w-72",
//         className
//       )}
//     >
//       {/* Header da Sidebar */}
//       <div className="flex items-center justify-between p-5 border-b border-[#95A5A6]/20 h-20">
//         {!collapsed && (
//           <div className="flex items-center space-x-3 transition-opacity duration-300 animate-in fade-in">
//             {/* Ícone Branding: Terracota para destaque */}
//             <div className="w-10 h-10 bg-[#D35400] rounded-xl flex items-center justify-center shadow-md">
//               <Home className="w-5 h-5 text-white" />
//             </div>
//             <span className="font-bold text-xl text-[#2C3E50] tracking-tight">Highlander</span>
//           </div>
//         )}
        
//         {/* Controles (Sino e Toggle) */}
//         <div className={cn("flex items-center gap-1", collapsed && "flex-col gap-4 mx-auto")}>
//           {/* Notifications Bell */}
//           <Popover>
//             <PopoverTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="h-9 w-9 relative text-[#2C3E50] hover:bg-[#F5F0E6] hover:text-[#D35400] transition-colors"
//               >
//                 <Bell className="w-5 h-5" />
//                 {unreadCount > 0 && (
//                   <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D35400] text-[10px] font-bold text-white ring-2 ring-white">
//                     {unreadCount > 9 ? "9+" : unreadCount}
//                   </span>
//                 )}
//               </Button>
//             </PopoverTrigger>
//             <PopoverContent 
//               className="w-96 p-0 border-[#95A5A6]/20 shadow-xl rounded-xl" 
//               align={collapsed ? "center" : "start"}
//               side={collapsed ? "right" : "bottom"}
//               onOpenAutoFocus={(e) => e.preventDefault()}
//             >
//               {/* Cabeçalho do Popover */}
//               <div className="flex items-center justify-between p-4 border-b border-[#95A5A6]/20 bg-[#F5F0E6]/30">
//                 <div>
//                   <h3 className="font-bold text-[#2C3E50]">Notificações</h3>
//                   <p className="text-xs text-[#95A5A6]">
//                     {loading ? "Sincronizando..." : 
//                      error ? "Falha na conexão" :
//                      `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`}
//                   </p>
//                 </div>
//                 <div className="flex items-center gap-1">
//                   <Button
//                     variant="ghost"
//                     size="icon"
//                     className="h-8 w-8 text-[#2C3E50] hover:text-[#D35400]"
//                     onClick={handleRefresh}
//                     title="Atualizar"
//                   >
//                     <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
//                   </Button>
//                   {unreadCount > 0 && notifications.length > 0 && (
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={handleMarkAllAsRead}
//                       className="h-8 text-xs text-[#2C3E50] hover:text-[#D35400]"
//                       disabled={loading}
//                     >
//                       <CheckCheck className="w-3.5 h-3.5 mr-1" />
//                       Lidas
//                     </Button>
//                   )}
//                 </div>
//               </div>
              
//               {/* Corpo das Notificações */}
//               {error ? (
//                 <div className="p-8 text-center bg-red-50/50">
//                   <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
//                   <p className="text-sm text-red-600 font-medium">{error}</p>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="mt-3 border-red-200 text-red-700 hover:bg-red-100"
//                     onClick={handleRefresh}
//                   >
//                     Tentar novamente
//                   </Button>
//                 </div>
//               ) : loading && notifications.length === 0 ? (
//                 <div className="p-12 text-center">
//                   <Loader2 className="w-8 h-8 text-[#D35400] animate-spin mx-auto" />
//                   <p className="mt-3 text-sm text-[#95A5A6]">Buscando atualizações...</p>
//                 </div>
//               ) : notifications.length === 0 ? (
//                 <div className="p-12 text-center">
//                   <div className="w-16 h-16 bg-[#F5F0E6] rounded-full flex items-center justify-center mx-auto mb-4">
//                     <Bell className="w-8 h-8 text-[#95A5A6]" />
//                   </div>
//                   <p className="text-sm font-medium text-[#2D3436]">Tudo limpo por aqui</p>
//                   <p className="text-xs text-[#95A5A6] mt-1">
//                     Novas notificações aparecerão automaticamente
//                   </p>
//                 </div>
//               ) : (
//                 <ScrollArea className="h-[400px]">
//                   <div className="p-2 space-y-1">
//                     {notifications.map((notification: any, index: number) => (
//                       <div
//                         key={notification.id || `notification-${index}`}
//                         className={cn(
//                           "group flex items-start p-3 rounded-lg transition-all border",
//                           !notification.isRead 
//                             ? "bg-white border-[#D35400]/20 shadow-sm hover:border-[#D35400]/40" 
//                             : "bg-transparent border-transparent hover:bg-[#F5F0E6]"
//                         )}
//                       >
//                         <div className="flex-shrink-0 mt-1 mr-3">
//                           {getNotificationIcon(notification.type)}
//                         </div>
//                         <div className="flex-1 min-w-0">
//                           <div className="flex justify-between items-start">
//                             <p className={cn(
//                               "text-sm font-semibold",
//                               !notification.isRead ? "text-[#2C3E50]" : "text-[#95A5A6]"
//                             )}>
//                               {notification.title || 'Sem título'}
//                             </p>
//                             {!notification.isRead && (
//                               <span className="inline-block w-2 h-2 bg-[#D35400] rounded-full ml-2 shadow-sm"></span>
//                             )}
//                           </div>
//                           <p className="text-sm text-[#2D3436]/80 mt-1 line-clamp-2 leading-relaxed">
//                             {notification.message}
//                           </p>
                          
//                           <div className="flex items-center justify-between mt-3">
//                             <span className="text-xs text-[#95A5A6] flex items-center gap-1">
//                               <Clock className="w-3 h-3" />
//                               {formatTimeAgo(notification.createdAt)}
//                             </span>
                            
//                             {notification.task && (
//                               <span className="text-[10px] bg-[#2C3E50]/5 text-[#2C3E50] px-2 py-0.5 rounded-full font-medium truncate max-w-[100px] border border-[#2C3E50]/10">
//                                 {notification.task.title}
//                               </span>
//                             )}
//                           </div>
                          
//                           {/* Ações Rápidas */}
//                           <div className="flex justify-end gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
//                             {!notification.isRead && (
//                               <Button
//                                 variant="ghost"
//                                 size="sm"
//                                 className="h-6 px-2 text-[10px] text-[#2C3E50] hover:text-[#D35400] hover:bg-[#D35400]/5"
//                                 onClick={() => handleMarkAsRead(notification.id)}
//                               >
//                                 Marcar lida
//                               </Button>
//                             )}
                            
//                             {(notification.task?.id || notification.type === "NEW_MESSAGE") && (
//                               <Link href={notification.type === "NEW_MESSAGE" ? "/chats" : `/Kanban?highlight=${notification.task?.id}`}>
//                                 <Button
//                                   variant="ghost"
//                                   size="sm"
//                                   className="h-6 px-2 text-[10px] text-[#2C3E50] hover:text-[#D35400] hover:bg-[#D35400]/5"
//                                 >
//                                   Ver detalhes <ChevronRight className="w-3 h-3 ml-1" />
//                                 </Button>
//                               </Link>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </ScrollArea>
//               )}
//             </PopoverContent>
//           </Popover>

//           {/* Toggle Sidebar Button */}
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={toggleSidebar}
//             className="h-8 w-8 text-[#95A5A6] hover:text-[#2C3E50] hover:bg-[#F5F0E6]"
//           >
//             {collapsed ? (
//               <ChevronRight className="w-4 h-4" />
//             ) : (
//               <ChevronLeft className="w-4 h-4" />
//             )}
//           </Button>
//         </div>
//       </div>

//       {/* Navigation */}
//       <ScrollArea className="flex-1 px-4 py-6">
//         <div className="space-y-1.5">
//           {menuItems.map((item) => {
//             const Icon = item.icon;
//             const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

//             return (
//               <Link key={item.title} href={item.href}>
//                 <div
//                   className={cn(
//                     "flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
//                     isActive
//                       ? "bg-[#D35400] text-white shadow-md shadow-[#D35400]/20" // Estado Ativo: Terracota
//                       : "text-[#2D3436] hover:bg-[#F5F0E6] hover:text-[#2C3E50]", // Estado Padrão
//                     collapsed ? "justify-center" : "justify-start"
//                   )}
//                   title={collapsed ? item.title : undefined}
//                 >
//                   <Icon 
//                     className={cn(
//                       "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
//                       collapsed ? "mr-0" : "mr-3",
//                       isActive ? "text-white" : "text-[#2C3E50]" // Ícone Azul Petróleo no estado normal
//                     )} 
//                   />
//                   {!collapsed && <span className="truncate">{item.title}</span>}
                  
//                   {/* Indicador de Hover sutil à esquerda */}
//                   {!isActive && (
//                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D35400] opacity-0 group-hover:opacity-100 transition-opacity" />
//                   )}
//                 </div>
//               </Link>
//             );
//           })}
//         </div>
//       </ScrollArea>

//       {/* Footer / User Profile Simplificado (Opcional, já que existe no Header) */}
//       {!collapsed && user && (
//         <div className="p-4 border-t border-[#95A5A6]/20 bg-[#F5F0E6]/30">
//           <div className="flex items-center space-x-3 opacity-70 hover:opacity-100 transition-opacity">
//             <div className="w-8 h-8 bg-[#2C3E50] rounded-lg flex items-center justify-center text-white text-xs font-bold">
//               {user.name?.charAt(0).toUpperCase() || 'U'}
//             </div>
//             <div className="flex-1 min-w-0">
//               <p className="text-xs font-bold text-[#2C3E50] truncate">Conta Ativa</p>
//               <p className="text-[10px] text-[#95A5A6] uppercase tracking-wider">{user.role}</p>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // Pequeno helper para ícone de loader que faltava importar
// function Loader2({ className }: { className?: string }) {
//     return <RefreshCw className={cn("animate-spin", className)} />;
// }


/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/hooks/SidebarContext";
import { useNotifications } from "@/hooks/use-app-features";
import { cn } from "@/lib/utils";
import {
  BarChart,
  BarChart2,
  BarChart3,
  Bell,
  Calendar,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Factory,
  FileText,
  Home,
  KanbanSquare,
  KanbanSquareDashed,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const menuItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Kanban Profissional", href: "/Kanban", icon: KanbanSquare },
  { title: "Kanban Produto", href: "/kanban-flow", icon: KanbanSquareDashed },
  { title: "Chats", href: "/chats", icon: MessageSquare },
  { title: "Calendário", href: "/agenda", icon: Calendar },
  {
    title: "Relatórios Profissionais",
    href: "/professionals/report",
    icon: BarChart3,
  },
  { title: "Relatórios Tarefas", href: "/tasks/report", icon: BarChart2 },
  { title: "Relatórios produtos", href: "/product/report", icon: BarChart },
  { title: "Empresas", href: "/empresas", icon: Home },
  { title: "Rotas", href: "/route-planner", icon: CarFront },
  {
    title: "Gerenciar Fornecedores/Oficina",
    href: "/suppliers",
    icon: Factory,
  },
  { title: "Usuários", href: "/users", icon: Users },
];

function SidebarContent({
  collapsed,
  onItemClick,
}: {
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  // 🔥 LÓGICA DE FILTRAGEM CORRIGIDA
  const filteredMenuItems = useMemo(() => {
    if (!user) return [];

    return menuItems.filter((item) => {
      // 1. REGRA PARA MASTER:
      // Vê APENAS: Dashboard, Empresas e Usuários.
      if (user.role === "MASTER") {
        // Lista branca de rotas permitidas para Master
        const allowedForMaster = ["/empresas", "/users"];
        return allowedForMaster.includes(item.href);
      }

      // 2. REGRA PARA ADMIN:
      // Vê TUDO, EXCETO Empresas.
      if (user.role === "ADMIN") {
        return item.href !== "/empresas";
      }

      // 3. REGRA PARA EMPLOYER (e outros):
      // Vê TUDO, EXCETO Empresas e Usuários.
      if (user.role === "EMPLOYER") {
        return item.href !== "/empresas" && item.href !== "/users";
      }

      // Fallback padrão (segurança): esconde tudo que for sensível se cargo desconhecido
      return item.href !== "/empresas" && item.href !== "/users";
    });
  }, [user]);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <FileText className="w-4 h-4 text-[#2C3E50]" />;
      case "TASK_COMPLETED":
        return <Check className="w-4 h-4 text-green-600" />;
      case "TASK_OVERDUE":
        return <Clock className="w-4 h-4 text-[#D35400]" />;
      case "BUDGET_APPROVED":
        return <DollarSign className="w-4 h-4 text-[#2C3E50]" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="w-4 h-4 text-[#D35400]" />;
      default:
        return <Bell className="w-4 h-4 text-[#95A5A6]" />;
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    toast.success("Lida");
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[#2C3E50] text-white transition-all duration-300",
        collapsed ? "w-20" : "w-full"
      )}
    >
      {/* Header Sidebar */}
      <div
        className={cn(
          "flex items-center justify-between p-5 border-b border-white/10 h-20",
          collapsed && "justify-center px-2"
        )}
      >
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#D35400] rounded-xl flex items-center justify-center shadow-md">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Highlander</span>
          </div>
        )}

        {/* Notificações */}
        <div
          className={cn("flex items-center", collapsed ? "justify-center" : "")}
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative text-gray-300 hover:bg-white/10 hover:text-white"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D35400] text-[10px] font-bold text-white ring-2 ring-[#2C3E50]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 border-none shadow-xl rounded-xl bg-white z-[60]">
              <div className="flex items-center justify-between p-4 bg-slate-50 border-b">
                <h3 className="font-bold text-[#2C3E50]">Notificações</h3>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refresh()}
                    className="h-8 w-8"
                  >
                    <RefreshCw
                      className={cn("w-4 h-4", loading && "animate-spin")}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsRead()}
                    className="h-8 text-xs"
                  >
                    Lidas
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[300px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    Nenhuma notificação
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map((n: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "p-3 border-b flex gap-3 hover:bg-slate-50",
                          !n.isRead && "bg-blue-50/50"
                        )}
                      >
                        <div className="mt-1">
                          {getNotificationIcon(n.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">
                            {n.title}
                          </p>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-[10px] text-slate-400">
                              {formatTimeAgo(n.createdAt)}
                            </span>
                            {!n.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="text-[10px] text-[#D35400] hover:underline"
                              >
                                Marcar lida
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Menu Navigation */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-1.5">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.title} href={item.href} onClick={onItemClick}>
                <div
                  className={cn(
                    "flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                    isActive
                      ? "bg-[#D35400] text-white shadow-md"
                      : "text-gray-300 hover:bg-white/10 hover:text-white",
                    collapsed ? "justify-center" : "justify-start"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                      collapsed ? "mr-0" : "mr-3",
                      isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-white"
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer Profile */}
      {!collapsed && user && (
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white text-xs font-bold border border-white/5">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                {user.role}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { isOpen, close } = useSidebar();

  return (
    <>
      <div
        className={cn(
          "hidden md:flex flex-col h-full border-r border-white/10 transition-all duration-300 bg-[#2C3E50]",
          collapsed ? "w-20" : "w-72",
          className
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <div className="bg-[#2C3E50] p-2 flex justify-center border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white hover:bg-white/10 w-full"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <Sheet open={isOpen} onOpenChange={close}>
        <SheetContent
          side="left"
          className="p-0 border-none w-72 bg-[#2C3E50] text-white"
        >
          <SidebarContent collapsed={false} onItemClick={close} />
        </SheetContent>
      </Sheet>
    </>
  );
}
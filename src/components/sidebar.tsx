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
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  BarChart2,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CarFront,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Factory,
  Home,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

// --- 1. DEFINIÇÃO DA ESTRUTURA DO MENU ---
const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    subItems: [
      { title: "Company", href: "/" },
      { title: "Usuario", href: "/dashboard-user" },
      { title: "Coleção", href: "/colecao" },
      { title: "Itens Finalizados", href: "/completed-items-dashboard" },
    ],
  },
  {
    title: "Kanban",
    icon: KanbanSquare,
    subItems: [
      { title: "Profissional", href: "/Kanban" },
      { title: "Produto", href: "/kanban-flow" },
    ],
  },
  { title: "Chats", href: "/chats", icon: MessageSquare },
  { title: "Calendário", href: "/agenda", icon: Calendar },
  {
    title: "Relatórios",
    icon: BarChart3,
    subItems: [
      {
        title: "Profissionais",
        href: "/professionals/report",
        icon: BarChart3,
      },
      { title: "Tarefas", href: "/tasks/report", icon: BarChart2 },
      { title: "Produtos", href: "/product/report", icon: BarChart },
    ],
  },
  { title: "Empresas", href: "/empresas", icon: Home },
  { title: "Cargos", href: "/company-roles", icon: Briefcase },
  { title: "Rotas", href: "/routes", icon: CarFront },
  { title: "Fornecedores", href: "/suppliers", icon: Factory },
  { title: "Usuários", href: "/users", icon: Users },
  { title: "Audit", href: "/audit", icon: Shield },
];

// Componente de Notificações
function NotificationsPopover() {
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [open, setOpen] = useState(false);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleRefresh = () => {
    refresh();
  };

  // Formatar a data relativa
  const formatDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "Data desconhecida";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative text-gray-300 hover:bg-white/10 hover:text-white"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2F80ED] text-[10px] font-bold text-white ring-2 ring-[#353A40]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={5}
        className="w-80 p-0 bg-[#353A40] border-white/10 text-white"
      >
        {/* Header do Popover */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <h3 className="font-semibold text-sm">Notificações</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-300 hover:text-white hover:bg-white/10"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-300 hover:text-white hover:bg-white/10"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        {/* Lista de Notificações */}
        <ScrollArea className="max-h-96">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-300 text-sm">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-3 hover:bg-white/5 transition-colors cursor-pointer",
                    !notif.isRead && "bg-white/5",
                  )}
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {notif.title || "Notificação"}
                      </p>
                      <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">
                        {notif.message || notif.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-[#2F80ED] flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function SidebarContent({
  collapsed,
  onItemClick,
}: {
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  const [userToggledMenus, setUserToggledMenus] = useState<
    Record<string, boolean>
  >({});

  const toggleMenu = (title: string) => {
    setUserToggledMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // --- 2. LÓGICA DE PERMISSÕES PARA MASTER ---
  const filteredMenuItems = useMemo(() => {
    if (!user) {
      return [];
    }

    // 👇 SE FOR MASTER, MOSTRA APENAS OS ITENS ESPECÍFICOS
    if (user.role === "MASTER") {
      const masterItems = menuItems.filter((item) => {
        const allowedTitles = ["Empresas", "Usuários", "Dashboard", "Audit"];
        if (allowedTitles.includes(item.title)) {
          return true;
        }
        return false;
      });
      return masterItems;
    }

    // Para outros usuários (ADMIN, EMPLOYER)
    const filtered = menuItems.filter((item) => {
      if (user.role === "ADMIN") {
        return true;
      }
      if (user.role === "EMPLOYER") {
        if (item.href === "/empresas" || item.href === "/users") {
          return false;
        }
      }
      return true;
    });

    return filtered;
  }, [user]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[#353A40] text-white transition-all duration-300",
        collapsed ? "w-20" : "w-full",
      )}
    >
      {/* Header Sidebar */}
      <div
        className={cn(
          "flex items-center justify-between p-5 border-b border-white/10 h-20",
          collapsed && "justify-center px-2",
        )}
      >
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#2F80ED] rounded-xl flex items-center justify-center shadow-md">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Highlander</span>
          </div>
        )}
        <div
          className={cn("flex items-center", collapsed ? "justify-center" : "")}
        >
          <NotificationsPopover />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-1.5">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;

            if (item.subItems) {
              const isGroupActive = item.subItems.some(
                (sub) => pathname === sub.href,
              );

              const isOpen =
                userToggledMenus[item.title] !== undefined
                  ? userToggledMenus[item.title]
                  : isGroupActive;

              if (collapsed) {
                return (
                  <Popover key={item.title}>
                    <PopoverTrigger asChild>
                      <div
                        className={cn(
                          "flex items-center justify-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 cursor-pointer",
                          isGroupActive
                            ? "bg-[#2F80ED] text-white"
                            : "text-gray-200 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      className="w-56 p-2 bg-[#2A2F35] border-white/10 text-white ml-2"
                    >
                      <p className="text-xs font-bold text-gray-300 px-2 py-1 mb-1">
                        {item.title}
                      </p>
                      {item.subItems.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onItemClick}
                        >
                          <div
                            className={cn(
                              "rounded-md px-2 py-2 text-sm hover:bg-white/10 transition-colors",
                              pathname === sub.href &&
                                "bg-white/10 text-[#2F80ED]",
                            )}
                          >
                            {sub.title}
                          </div>
                        </Link>
                      ))}
                    </PopoverContent>
                  </Popover>
                );
              }

              return (
                <div key={item.title} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 group hover:bg-white/10 hover:text-white",
                      isGroupActive ? "text-white" : "text-gray-200",
                    )}
                  >
                    <div className="flex items-center">
                      <Icon
                        className={cn(
                          "w-5 h-5 mr-3 transition-transform",
                          isGroupActive ? "text-[#2F80ED]" : "text-gray-300",
                        )}
                      />
                      <span>{item.title}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isOpen ? "transform rotate-180" : "",
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="ml-4 pl-4 border-l border-white/10 space-y-1 animate-in slide-in-from-top-2 duration-200">
                      {item.subItems.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={onItemClick}
                          >
                            <div
                              className={cn(
                                "flex items-center rounded-lg px-3 py-2 text-sm transition-all",
                                isSubActive
                                  ? "text-[#2F80ED] font-bold bg-white/5"
                                  : "text-gray-300 hover:text-white hover:bg-white/5",
                              )}
                            >
                              <span>{sub.title}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.title}
                href={item.href || "#"}
                onClick={onItemClick}
              >
                <div
                  className={cn(
                    "flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                    isActive
                      ? "bg-[#2F80ED] text-white shadow-md"
                      : "text-gray-200 hover:bg-white/10 hover:text-white",
                    collapsed ? "justify-center" : "justify-start",
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                      collapsed ? "mr-0" : "mr-3",
                      isActive
                        ? "text-white"
                        : "text-gray-300 group-hover:text-white",
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { isOpen, close } = useSidebar();

  return (
    <>
      <div
        className={cn(
          "hidden md:flex flex-col h-full border-r border-white/10 transition-all duration-300 bg-[#353A40]",
          collapsed ? "w-20" : "w-72",
          className,
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <div className="bg-[#2A2F35] p-2 flex justify-center border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-300 hover:text-white hover:bg-white/10 w-full"
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
          className="p-0 border-none w-72 bg-[#353A40] text-white"
        >
          <SidebarContent collapsed={false} onItemClick={close} />
        </SheetContent>
      </Sheet>
    </>
  );
}

interface SidebarProps {
  className?: string;
}

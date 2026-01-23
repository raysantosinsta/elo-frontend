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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Factory,
  FileText,
  Home,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

// --- 1. DEFINIÇÃO DA ESTRUTURA DO MENU ---
const menuItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  
  // GRUPO KANBAN
  { 
    title: "Kanban", 
    icon: KanbanSquare,
    subItems: [
      { title: "Profissional", href: "/Kanban" },
      { title: "Produto", href: "/kanban-flow" },
    ]
  },

  { title: "Chats", href: "/chats", icon: MessageSquare },
  { title: "Calendário", href: "/agenda", icon: Calendar },

  // GRUPO RELATÓRIOS
  {
    title: "Relatórios",
    icon: BarChart3,
    subItems: [
      { title: "Profissionais", href: "/professionals/report", icon: BarChart3 },
      { title: "Tarefas", href: "/tasks/report", icon: BarChart2 },
      { title: "Produtos", href: "/product/report", icon: BarChart },
    ]
  },

  { title: "Empresas", href: "/empresas", icon: Home },
  { title: "Rotas", href: "/route-planner", icon: CarFront },
  {
    title: "Fornecedores",
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
  
  // Estado para controlar quais menus (acordeão) estão abertos
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // --- 2. SINCRONIZAÇÃO URL -> MENU ABERTO ---
  // Abre o menu pai automaticamente se a URL corresponder a um subitem
  useEffect(() => {
    const newOpenState: Record<string, boolean> = {};
    let hasChanges = false;
    
    menuItems.forEach((item) => {
      if (item.subItems) {
        const isActive = item.subItems.some(sub => pathname === sub.href);
        // Só abrimos se estiver ativo e ainda não tivermos definido o estado
        if (isActive) {
          newOpenState[item.title] = true;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
        setOpenMenus((prev) => ({ ...prev, ...newOpenState }));
    }
  }, [pathname]);

  // --- 3. LÓGICA DE PERMISSÕES ---
  const filteredMenuItems = useMemo(() => {
    if (!user) return [];

    return menuItems.map(item => {
        // Se for um item simples (sem subitems)
        if (!item.subItems) {
            let isAllowed = true;
            if (user.role === "MASTER") {
                // Master vê Dashboard, Empresas e Usuários (e rota principal)
                const allowedForMaster = ["/empresas", "/users", "/"];
                isAllowed = allowedForMaster.includes(item.href || "");
            } else if (user.role === "ADMIN") {
                isAllowed = item.href !== "/empresas";
            } else if (user.role === "EMPLOYER") {
                isAllowed = item.href !== "/empresas" && item.href !== "/users";
            }
            return isAllowed ? item : null;
        }

        // Se for um GRUPO (Kanban ou Relatórios)
        if (user.role === "MASTER") {
            // Master não vê Kanban nem Relatórios na regra original
            return null; 
        }

        // Admin e Employer veem os grupos normalmente
        return item; 
    }).filter(Boolean) as typeof menuItems;
  }, [user]);

  const {
    notifications,
    unreadCount,
    loading,
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
            
            // --- RENDERIZAÇÃO DE GRUPO (COM SUBMENU) ---
            if (item.subItems) {
                const isGroupActive = item.subItems.some(sub => pathname === sub.href);
                const isOpen = openMenus[item.title]; 

                // Se a sidebar estiver fechada (collapsed)
                if (collapsed) {
                    return (
                        <Popover key={item.title}>
                            <PopoverTrigger asChild>
                                <div className={cn(
                                    "flex items-center justify-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 cursor-pointer",
                                    isGroupActive ? "bg-[#D35400] text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent side="right" className="w-56 p-2 bg-[#2C3E50] border-white/10 text-white ml-2">
                                <p className="text-xs font-bold text-gray-400 px-2 py-1 mb-1">{item.title}</p>
                                {item.subItems.map((sub) => (
                                    <Link key={sub.href} href={sub.href} onClick={onItemClick}>
                                        <div className={cn(
                                            "rounded-md px-2 py-2 text-sm hover:bg-white/10 transition-colors",
                                            pathname === sub.href && "bg-white/10 text-[#D35400]"
                                        )}>
                                            {sub.title}
                                        </div>
                                    </Link>
                                ))}
                            </PopoverContent>
                        </Popover>
                    )
                }

                // Se a sidebar estiver aberta (Accordion/Select)
                return (
                    <div key={item.title} className="space-y-1">
                        <button
                            onClick={() => toggleMenu(item.title)}
                            className={cn(
                                "w-full flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 group hover:bg-white/10 hover:text-white",
                                // Se algum filho estiver ativo, destacamos o ícone/texto mesmo fechado
                                isGroupActive ? "text-white" : "text-gray-300"
                            )}
                        >
                            <div className="flex items-center">
                                <Icon className={cn("w-5 h-5 mr-3 transition-transform", isGroupActive ? "text-[#D35400]" : "text-gray-400")} />
                                <span>{item.title}</span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen ? "transform rotate-180" : "")} />
                        </button>

                        {/* Área dos Subitens */}
                        {isOpen && (
                            <div className="ml-4 pl-4 border-l border-white/10 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                {item.subItems.map((sub) => {
                                    const isSubActive = pathname === sub.href;
                                    return (
                                        <Link key={sub.href} href={sub.href} onClick={onItemClick}>
                                            <div className={cn(
                                                "flex items-center rounded-lg px-3 py-2 text-sm transition-all",
                                                isSubActive 
                                                    ? "text-[#D35400] font-bold bg-white/5" 
                                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                            )}>
                                                <span>{sub.title}</span>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                );
            }

            // --- RENDERIZAÇÃO DE ITEM ÚNICO (SEM SUBMENU) ---
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            
            return (
              <Link key={item.title} href={item.href || "#"} onClick={onItemClick}>
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
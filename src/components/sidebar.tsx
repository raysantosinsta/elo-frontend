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
  MessageSquare,
  RefreshCw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { toast } from "sonner";

// --- 1. DEFINIÇÃO DA ESTRUTURA DO MENU ---
const menuItems = [
  { 
    title: "Dashboard", 
    icon: LayoutDashboard, // Usei LayoutDashboard para o ícone de Dashboard
    subItems: [
      { title: "Company", href: "/" },
      { title: "Usuario", href: "/dashboard-user" },
    ]
  },
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
  { title: "Fornecedores", href: "/suppliers", icon: Factory },
  { title: "Usuários", href: "/users", icon: Users },
];

import { LayoutDashboard } from "lucide-react";

function SidebarContent({
  collapsed,
  onItemClick,
}: {
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // 1. Mantenha apenas o estado para cliques manuais
  const [userToggledMenus, setUserToggledMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (title: string) => {
    setUserToggledMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // --- 2. LÓGICA DE PERMISSÕES ---
  const filteredMenuItems = useMemo(() => {
    if (!user) return [];

    return menuItems.map(item => {
        if (!item.subItems) {
            let isAllowed = true;
            if (user.role === "MASTER") {
                const allowedForMaster = ["/empresas", "/users", "/"];
                isAllowed = allowedForMaster.includes(item.href || "");
            } else if (user.role === "ADMIN") {
                isAllowed = item.href !== "/empresas";
            } else if (user.role === "EMPLOYER") {
                isAllowed = item.href !== "/empresas" && item.href !== "/users";
            }
            return isAllowed ? item : null;
        }
        if (user.role === "MASTER") return null; 
        return item; 
    }).filter(Boolean) as typeof menuItems;
  }, [user]);

  const { notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className={cn("flex flex-col h-full bg-[#2C3E50] text-white transition-all duration-300", collapsed ? "w-20" : "w-full")}>
      {/* Header Sidebar (Omitido por brevidade, manter igual ao seu) */}
      <div className={cn("flex items-center justify-between p-5 border-b border-white/10 h-20", collapsed && "justify-center px-2")}>
         {/* ... seu código de header e notificações ... */}
         {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#D35400] rounded-xl flex items-center justify-center shadow-md">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Highlander</span>
          </div>
        )}
        {/* Adicionei o botão de notificações de volta aqui */}
        <div className={cn("flex items-center", collapsed ? "justify-center" : "")}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative text-gray-300 hover:bg-white/10 hover:text-white">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D35400] text-[10px] font-bold text-white ring-2 ring-[#2C3E50]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            {/* PopoverContent igual */}
          </Popover>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-1.5">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            
            if (item.subItems) {
                const isGroupActive = item.subItems.some(sub => pathname === sub.href);
                
                // --- A MÁGICA ESTÁ AQUI: DERIVAÇÃO DE ESTADO ---
                // O menu está aberto se:
                // 1. O usuário clicou para abrir (userToggledMenus[item.title] === true)
                // 2. OU a URL atual está dentro deste grupo e o usuário ainda NÃO fechou manualmente
                const isOpen = userToggledMenus[item.title] !== undefined 
                    ? userToggledMenus[item.title] 
                    : isGroupActive;

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

                return (
                    <div key={item.title} className="space-y-1">
                        <button
                            onClick={() => toggleMenu(item.title)}
                            className={cn(
                                "w-full flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 group hover:bg-white/10 hover:text-white",
                                isGroupActive ? "text-white" : "text-gray-300"
                            )}
                        >
                            <div className="flex items-center">
                                <Icon className={cn("w-5 h-5 mr-3 transition-transform", isGroupActive ? "text-[#D35400]" : "text-gray-400")} />
                                <span>{item.title}</span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen ? "transform rotate-180" : "")} />
                        </button>

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

            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            
            return (
              <Link key={item.title} href={item.href || "#"} onClick={onItemClick}>
                <div className={cn(
                    "flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                    isActive ? "bg-[#D35400] text-white shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white",
                    collapsed ? "justify-center" : "justify-start"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className={cn(
                      "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                      collapsed ? "mr-0" : "mr-3",
                      isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
      {/* Footer Profile omitido, manter igual */}
    </div>
  );
}

// Sidebar Wrapper principal (Mantém igual ao seu)
export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { isOpen, close } = useSidebar();

  return (
    <>
      <div className={cn("hidden md:flex flex-col h-full border-r border-white/10 transition-all duration-300 bg-[#2C3E50]", collapsed ? "w-20" : "w-72", className)}>
        <SidebarContent collapsed={collapsed} />
        <div className="bg-[#2C3E50] p-2 flex justify-center border-t border-white/10">
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white hover:bg-white/10 w-full">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <Sheet open={isOpen} onOpenChange={close}>
        <SheetContent side="left" className="p-0 border-none w-72 bg-[#2C3E50] text-white">
          <SidebarContent collapsed={false} onItemClick={close} />
        </SheetContent>
      </Sheet>
    </>
  );
}

interface SidebarProps {
  className?: string;
}
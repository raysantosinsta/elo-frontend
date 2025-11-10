// components/layout/sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Settings,
  FileText,
  KanbanSquare,
  Calendar,
  BarChart3,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: "3",
  },
  {
    title: "Kanban",
    href: "/Kanban",
    icon: KanbanSquare,
    badge: "12",
  },
  {
    title: "Tarefas",
    href: "/tasks",
    icon: FileText,
    badge: "5",
  },
  {
    title: "Calendário",
    href: "/agenda",
    icon: Calendar,
  },
  {
    title: "Relatórios",
    href: "/reports",
    icon: BarChart3,
  },
];

const secondaryItems = [
  {
    title: "Equipe",
    href: "/team",
    icon: Users,
  },
  {
    title: "Configurações",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "Ajuda",
    href: "/help",
    icon: HelpCircle,
  },
];

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

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

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "transparent",
                    collapsed ? "justify-center" : "justify-between"
                  )}
                >
                  <div className="flex items-center">
                    <Icon className={cn("w-4 h-4", collapsed ? "mr-0" : "mr-3")} />
                    {!collapsed && <span>{item.title}</span>}
                  </div>
                  
                  {!collapsed && item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <Separator className="my-2" />

        <div className="space-y-1 py-2">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "transparent",
                    collapsed ? "justify-center" : "justify-start"
                  )}
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
      {!collapsed && (
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">H</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Highlander Team</p>
              <p className="text-xs text-muted-foreground truncate">admin@highlander.com</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
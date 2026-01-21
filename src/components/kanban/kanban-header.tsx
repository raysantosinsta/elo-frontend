import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Settings, X } from "lucide-react";
import React, { useState } from "react";

interface ConfigAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
}

interface KanbanHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  configActions: ConfigAction[];
  rightContent?: React.ReactNode; // Para contadores ou avatares extras
}

export function KanbanHeader({
  title,
  subtitle,
  icon,
  configActions,
  rightContent,
}: KanbanHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-[#2C3E50] text-white px-4 py-3 shadow-md border-b border-[#2C3E50] z-20 sticky top-0">
      <div className="flex justify-between items-center max-w-[1920px] mx-auto w-full">
        
        {/* Lado Esquerdo: Título e Menu Mobile */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
          
          <div className="flex flex-col">
             <div className="flex items-center gap-2">
                {icon && <span className="text-[#D35400]">{icon}</span>}
                <h1 className="text-lg font-bold">{title}</h1>
             </div>
             {subtitle && <p className="text-xs text-blue-200 font-medium hidden md:block">{subtitle}</p>}
          </div>
        </div>

        {/* Lado Direito: Ações e Configuração */}
        <div className="flex items-center gap-3">
          
          {/* Slot para conteúdo extra (filtros rápidos, contadores) */}
          {rightContent}

          <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" />

          {/* Botão de Configuração (O Coração da Abstração) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-transparent border-white/20 text-white hover:bg-white/10 gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {configActions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={action.onClick}
                  className={`cursor-pointer ${action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''}`}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Plus, Settings, X } from "lucide-react";
import React, { useState } from "react";

// Definição da interface para ações do menu dropdown
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
  
  // Opção 1: Botão direto de adicionar (Usado no Kanban de Tarefas)
  onAddColumn?: () => void;
  
  // Opção 2: Menu de ações complexo (Usado no Kanban de Fluxo)
  configActions?: ConfigAction[];
  
  rightContent?: React.ReactNode;
}

export function KanbanHeader({
  title,
  subtitle,
  icon,
  onAddColumn,
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

        {/* Lado Direito */}
        <div className="flex items-center gap-3">
          
          {/* Conteúdo Extra (Filtros, Contadores, Selects) */}
          {rightContent}

          <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" />

          {/* CASO 1: Botão Direto (Prioridade para o Kanban de Tarefas) */}
          {onAddColumn && (
            <Button 
              onClick={onAddColumn}
              className="bg-[#D35400] hover:bg-[#A04000] text-white gap-2 font-medium border border-transparent hover:border-white/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Criar Nova Coluna</span>
              <span className="sm:hidden">Nova Coluna</span>
            </Button>
          )}

          {/* CASO 2: Menu Dropdown (Para o Kanban de Fluxo que tem múltiplas ações) */}
          {configActions && configActions.length > 0 && (
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
          )}

        </div>
      </div>
    </header>
  );
}
import { Button } from "@/components/ui/button";
import { Menu, Plus, X } from "lucide-react";
import React, { useState } from "react";

interface KanbanHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onAddColumn?: () => void; // Nova propriedade direta
  rightContent?: React.ReactNode;
}

export function KanbanHeader({
  title,
  subtitle,
  icon,
  onAddColumn,
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

        {/* Lado Direito: Ações e Botão Nova Coluna */}
        <div className="flex items-center gap-3">
          
          {/* Slot para conteúdo extra (contadores) */}
          {rightContent}

          <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" />

          {/* BOTÃO DIRETO: Criar Nova Coluna */}
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
        </div>
      </div>
    </header>
  );
}
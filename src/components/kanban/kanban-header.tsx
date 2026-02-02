/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Menu, 
  X, 
  Settings, 
  ChevronDown,
  Layers 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
  
  // Opção 1: Kanban de Tarefas (Coluna simples)
  onAddColumn?: () => void;
  
  // Opção 2: Kanban de Produto (Fluxo e Etapa)
  onAddFlow?: () => void;   // Ação Principal (Novo Fluxo)
  onAddStage?: () => void;  // Ação Secundária (Nova Etapa/Coluna)
  
  configActions?: ConfigAction[];
  rightContent?: React.ReactNode;
}

export function KanbanHeader({
  title,
  subtitle,
  icon,
  onAddColumn,
  onAddFlow,
  onAddStage, // <--- ADICIONE ISSO AQUI PARA CORRIGIR O ERRO
  configActions,
  rightContent,
}: KanbanHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-[#2C3E50] text-white px-6 py-4 shadow-lg border-b border-white/5 z-20 sticky top-0">
      <div className="flex justify-between items-center max-w-[1920px] mx-auto w-full">
        
        {/* LADO ESQUERDO */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-white/5 rounded-lg text-[#D35400]">
                {icon}
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-xl font-extrabold tracking-tight leading-none">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[11px] text-[#95A5A6] font-bold uppercase tracking-widest mt-1 hidden md:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* LADO DIREITO */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center">
            {rightContent}
          </div>

          <div className="flex items-center gap-2">
            {/* BOTÃO TAREFAS */}
            {onAddColumn && (
              <Button 
                onClick={onAddColumn}
                className="bg-[#D35400] hover:bg-[#A04000] text-white gap-2 font-bold shadow-sm transition-all"
              >
                <Plus size={18} strokeWidth={3} />
                <span className="hidden sm:inline">Nova Coluna</span>
              </Button>
            )}

            {/* BOTÕES PRODUTO/FLOW */}
            {onAddStage && (
              <Button 
                variant="outline"
                onClick={onAddStage}
                className="bg-transparent border-white/20 text-white hover:bg-white/10 gap-2 font-bold transition-all"
              >
                <Layers size={18} />
                <span className="hidden sm:inline">Nova Etapa</span>
              </Button>
            )}

            {onAddFlow && (
              <Button 
                onClick={onAddFlow}
                className="bg-[#D35400] hover:bg-[#A04000] text-white gap-2 font-bold shadow-sm transition-all active:scale-95"
              >
                <Plus size={18} strokeWidth={3} />
                <span className="hidden sm:inline">Novo Fluxo</span>
              </Button>
            )}

            {/* AÇÕES EXTRAS */}
            {configActions && configActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5">
                    <Settings size={20} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#2C3E50] border-white/10 text-white">
                  {configActions.map((action, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={action.onClick}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer focus:bg-white/10 focus:text-white",
                        action.variant === 'destructive' && "text-red-400 focus:text-red-400"
                      )}
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
      </div>
    </header>
  );
}
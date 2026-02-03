/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Menu, 
  X, 
  Settings, 
  ChevronDown,
  Layers,
  Save,
  Check,
  Trash2,
  Copy,
  LayoutTemplate,
  Kanban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  onAddColumn?: () => void;
  onAddFlow?: () => void;   
  onAddStage?: () => void;  
  templates?: any[];
  selectedTemplateId?: string;
  onSelectTemplate?: (id: string) => void;
  onApplyTemplate?: () => void;
  onSaveTemplate?: () => void;
  onDeleteTemplate?: (id: string) => void;
  configActions?: ConfigAction[];
  rightContent?: React.ReactNode;
}

/**
 * KanbanHeader Padronizado
 * Cores: Grafite (#2D3436), Algodão Cru (#F5F0E6), Terracota (#D35400), 
 * Areia (#95A5A6), Azul Petróleo (#2C3E50)
 */
export function KanbanHeader({
  title,
  subtitle,
  icon,
  onAddColumn,
  onAddFlow,
  onAddStage,
  templates = [],
  selectedTemplateId,
  onSelectTemplate,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  configActions,
  rightContent,
}: KanbanHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const selectedTemplateName = templates.find(t => t.id === selectedTemplateId)?.name || "Selecionar Template";

  return (
    <header className="bg-[#2C3E50] text-[#F5F0E6] px-6 py-4 shadow-lg border-b border-[#95A5A6]/20 z-20 sticky top-0">
      <div className="flex justify-between items-center max-w-[1920px] mx-auto w-full">
        
        {/* LADO ESQUERDO: Branding */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden text-[#F5F0E6] hover:bg-white/10" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          <div className="flex items-center gap-3">
            {icon && <div className="p-2 bg-white/5 rounded-lg text-[#D35400]">{icon}</div>}
            <div className="flex flex-col">
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-[#F5F0E6]">{title}</h1>
              {subtitle && <p className="text-[11px] text-[#95A5A6] font-bold uppercase tracking-widest mt-1 hidden md:block">{subtitle}</p>}
            </div>
          </div>
        </div>

        {/* LADO DIREITO */}
        <div className="flex items-center gap-3">
          
          <div className="hidden md:flex items-center gap-3">
            {rightContent}

            {/* GESTÃO DE TEMPLATES - Padronizado para tons de Areia e Azul */}
            {(onSaveTemplate || onApplyTemplate) && (
              <div className="flex items-center gap-2 bg-[#2D3436]/40 p-1 rounded-lg border border-[#95A5A6]/30">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-[11px] font-semibold text-[#95A5A6] hover:text-[#F5F0E6] hover:bg-white/5">
                      <LayoutTemplate size={14} className="mr-2 text-[#95A5A6]" />
                      <span className="max-w-[120px] truncate">{selectedTemplateName}</span>
                      <ChevronDown size={12} className="ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 bg-[#2D3436] border border-[#95A5A6]/30 text-[#F5F0E6] shadow-2xl" align="start">
                    <div className="text-[10px] font-bold text-[#95A5A6] uppercase tracking-widest px-2 py-2">Modelos de Estrutura</div>
                    
                    <div className="space-y-1">
                      {templates.map((t) => {
                        const isActive = selectedTemplateId === t.id;
                        return (
                          <div 
                            key={t.id} 
                            className={cn(
                              "group flex items-center justify-between p-2 rounded-md transition-all cursor-pointer",
                              isActive ? "bg-[#D35400] text-white" : "text-[#95A5A6] hover:bg-white/5 hover:text-[#F5F0E6]"
                            )}
                            onClick={() => onSelectTemplate?.(t.id)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Copy size={14} className={cn(isActive ? "text-white" : "text-[#95A5A6]")} />
                              <span className="text-sm font-medium">{t.name}</span>
                              {isActive && <Check size={14} className="text-white ml-1" />}
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onDeleteTemplate?.(t.id); }} 
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="h-px bg-[#95A5A6]/20 my-2" />
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onSaveTemplate} 
                      className="w-full justify-start text-[11px] font-bold text-[#D35400] hover:bg-[#D35400]/10"
                    >
                      <Save size={14} className="mr-2" /> Salvar estrutura atual
                    </Button>
                  </PopoverContent>
                </Popover>

                {onApplyTemplate && (
                  <Button 
                    size="sm" 
                    onClick={onApplyTemplate} 
                    className="h-8 px-4 text-[10px] bg-[#D35400] hover:bg-[#A04000] text-white font-black border-none shadow-md transition-all active:scale-95"
                  >
                    APLICAR
                  </Button>
                )}
              </div>
            )}

            {/* BOTÃO ADICIONAR - Terracota (Foco em Ação) */}
            {(onAddFlow || onAddStage || onAddColumn) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-[#D35400] hover:bg-[#A04000] text-white gap-2 font-bold shadow-md transition-all active:scale-95 h-9 border-none">
                    <Plus size={18} strokeWidth={3} />
                    <span className="hidden sm:inline text-xs">Adicionar</span>
                    <ChevronDown size={14} className="opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#2D3436] border border-[#95A5A6]/30 text-[#F5F0E6] p-1 shadow-2xl">
                  {onAddFlow && (
                    <DropdownMenuItem onClick={onAddFlow} className="gap-3 cursor-pointer py-2.5 focus:bg-white/10 rounded-md border-none outline-none">
                      <Layers size={16} className="text-[#D35400]" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#F5F0E6]">Novo Fluxo</span>
                        <span className="text-[10px] text-[#95A5A6]">Criar uma nova esteira</span>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {onAddStage && (
                    <DropdownMenuItem onClick={onAddStage} className="gap-3 cursor-pointer py-2.5 focus:bg-white/10 rounded-md border-none outline-none">
                      <Plus size={16} className="text-[#95A5A6]" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#F5F0E6]">Nova Etapa</span>
                        <span className="text-[10px] text-[#95A5A6]">Adicionar coluna ao fluxo</span>
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* CONFIGURAÇÕES - Areia (Secundário) */}
            {configActions && configActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#95A5A6] hover:text-[#F5F0E6] hover:bg-white/5 ml-1">
                    <Settings size={20} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#2D3436] border border-[#95A5A6]/30 text-[#F5F0E6] p-1 shadow-2xl">
                   <div className="text-[10px] font-bold text-[#95A5A6] uppercase tracking-widest px-3 py-2">Configurações</div>
                  {configActions.map((action, index) => (
                    <DropdownMenuItem 
                      key={index} 
                      onClick={action.onClick} 
                      className={cn(
                        "flex items-center gap-2 cursor-pointer py-2 px-3 rounded-md focus:bg-white/10 border-none outline-none",
                        action.variant === 'destructive' ? "text-red-400 focus:bg-red-500/10" : "text-[#F5F0E6]"
                      )}
                    >
                      {action.icon}
                      <span className="text-sm font-medium">{action.label}</span>
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
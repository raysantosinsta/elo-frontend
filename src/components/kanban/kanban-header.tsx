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
  Columns,
  Calendar,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Melhorando a tipagem do Template
interface Template {
  id: string;
  name: string;
}

// interface Flow {
//   id: string;
//   name: string;
//   color?: string;
//   deadline?: string;
//   [key: string]: any; // Permite propriedades adicionais
// }

interface ConfigAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
}

// Ou melhor, torne o componente genérico:
interface KanbanHeaderProps<
  T extends { id: string; name: string; color?: string; deadline?: string },
> {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onAddColumn?: () => void;
  onAddFlow?: () => void;
  onAddStage?: () => void;
  flows?: T[];
  selectedFlowIds?: string[];
  onToggleFlow?: (id: string) => void;
  onEditFlow?: (flow: T) => void;
  onDeleteFlow?: (id: string) => void;
  calculateDaysRemaining?: (deadline: string) => number | null;
  templates?: Template[];
  selectedTemplateId?: string;
  onSelectTemplate?: (id: string) => void;
  onApplyTemplate?: () => void;
  onSaveTemplate?: () => void;
  onDeleteTemplate?: (id: string) => void;
  configActions?: ConfigAction[];
  rightContent?: React.ReactNode;
}

export function KanbanHeader<
  T extends { id: string; name: string; color?: string; deadline?: string },
>({
  title,
  subtitle,
  icon,
  onAddColumn,
  onAddFlow,
  onAddStage,
  flows = [],
  selectedFlowIds = [],
  onToggleFlow,
  onEditFlow,
  onDeleteFlow,
  calculateDaysRemaining,
  templates = [],
  selectedTemplateId,
  onSelectTemplate,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  configActions,
  rightContent,
}: KanbanHeaderProps<T>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const selectedTemplateName =
    templates.find((t) => t.id === selectedTemplateId)?.name ||
    "Selecionar Template";

  // Texto do botão baseado nas seleções
  const getFlowButtonText = () => {
    if (selectedFlowIds.length === 0) {
      return "Nenhuma coleção selecionada";
    }
    if (selectedFlowIds.length === 1) {
      const selected = flows.find((f) => f.id === selectedFlowIds[0]);
      return selected?.name || "1 coleção";
    }
    return `${selectedFlowIds.length} coleções selecionadas`;
  };

  return (
    <header className="bg-[#2C3E50] text-[#F5F0E6] px-6 py-4 shadow-lg border-b border-[#95A5A6]/20 z-20 sticky top-0">
      <div className="flex justify-between items-center max-w-[1920px] mx-auto w-full">
        {/* LADO ESQUERDO: Branding */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-[#F5F0E6] hover:bg-white/10"
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
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-[#F5F0E6]">
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

        {/* LADO DIREITO (DESKTOP) */}
        <div className="hidden md:flex items-center gap-3">
          {/* SELEÇÃO DE FLUXOS COM AUTOCOMPLETE */}
          {flows.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="bg-white/10 text-white border-white/20 h-9 text-xs max-w-[280px] justify-between hover:bg-white/15"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Layers size={16} className="flex-shrink-0" />
                    <span className="truncate">{getFlowButtonText()}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className="ml-2 opacity-50 flex-shrink-0"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-96 p-0 bg-[#2C3E50] border-white/10 text-white shadow-2xl"
                align="end"
              >
                <Command className="bg-transparent">
                  <CommandInput
                    placeholder="Buscar coleção por nome..."
                    className="border-none text-white placeholder:text-slate-400 h-10"
                  />
                  <CommandList>
                    <CommandEmpty className="py-6 text-center text-sm text-slate-400">
                      Nenhuma coleção encontrada.
                    </CommandEmpty>
                    <CommandGroup>
                      {flows.map((flow) => {
                        const isSelected = selectedFlowIds.includes(flow.id);
                        const daysRemaining =
                          flow.deadline && calculateDaysRemaining
                            ? calculateDaysRemaining(flow.deadline)
                            : null;

                        return (
                          <CommandItem
                            key={flow.id}
                            value={flow.name}
                            onSelect={() => {
                              console.log("Selecionado:", flow.name);
                              onToggleFlow?.(flow.id);
                            }}
                            className="flex items-center justify-between py-2 px-2 text-white aria-selected:bg-white/10 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: flow.color || "#D35400",
                                }}
                              />
                              <span className="text-sm font-medium truncate">
                                {flow.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Badge de prazo */}
                              {flow.deadline && daysRemaining !== null && (
                                <span
                                  className={cn(
                                    "text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap",
                                    daysRemaining < 0
                                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                                      : daysRemaining === 0
                                        ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                        : daysRemaining <= 3
                                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                          : "bg-green-500/20 text-green-400 border-green-500/30",
                                  )}
                                >
                                  {daysRemaining < 0
                                    ? `${Math.abs(daysRemaining)}d atrasado`
                                    : daysRemaining === 0
                                      ? "Hoje!"
                                      : `${daysRemaining}d`}
                                </span>
                              )}

                              {/* Check de seleção */}
                              {isSelected && (
                                <Check size={14} className="text-orange-500" />
                              )}

                              {/* Botões de ação */}
                              <div className="flex items-center gap-1 opacity-100">
                                {onEditFlow && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditFlow(flow);
                                    }}
                                    className="p-1 text-blue-400 hover:bg-blue-500/10 rounded"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}

                                {onDeleteFlow && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteFlow(flow.id);
                                    }}
                                    className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>

                  {/* Legenda de prazos */}
                  {flows.some((f) => f.deadline) && (
                    <div className="p-2 border-t border-white/10">
                      <div className="flex items-center gap-2 text-[9px] text-slate-400">
                        <Calendar size={10} />
                        <span>Prazos:</span>
                        <span className="text-green-400">● OK</span>
                        <span className="text-yellow-400">● ≤3d</span>
                        <span className="text-orange-400">● Hoje</span>
                        <span className="text-red-400">● Atrasado</span>
                      </div>
                    </div>
                  )}
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {rightContent}

          {/* GESTÃO DE TEMPLATES */}
          {(onSaveTemplate || onApplyTemplate) && (
            <div className="flex items-center gap-2 bg-[#2D3436]/40 p-1 rounded-lg border border-[#95A5A6]/30">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[11px] font-semibold text-[#95A5A6] hover:text-[#F5F0E6] hover:bg-white/5"
                  >
                    <LayoutTemplate size={14} className="mr-2 text-[#95A5A6]" />
                    <span className="max-w-[120px] truncate">
                      {selectedTemplateName}
                    </span>
                    <ChevronDown size={12} className="ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 p-2 bg-[#2D3436] border border-[#95A5A6]/30 text-[#F5F0E6] shadow-2xl"
                  align="end"
                >
                  <div className="text-[10px] font-bold text-[#95A5A6] uppercase tracking-widest px-2 py-2">
                    Modelos de Estrutura
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {templates.map((t) => {
                      const isActive = selectedTemplateId === t.id;
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "group flex items-center justify-between p-2 rounded-md transition-all cursor-pointer",
                            isActive
                              ? "bg-[#D35400] text-white"
                              : "text-[#95A5A6] hover:bg-white/5 hover:text-[#F5F0E6]",
                          )}
                          onClick={() => onSelectTemplate?.(t.id)}
                        >
                          <div className="flex items-center gap-2 flex-1 overflow-hidden">
                            <Copy
                              size={14}
                              className={cn(
                                isActive ? "text-white" : "text-[#95A5A6]",
                              )}
                            />
                            <span className="text-sm font-medium truncate">
                              {t.name}
                            </span>
                            {isActive && (
                              <Check
                                size={14}
                                className="text-white ml-1 flex-shrink-0"
                              />
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTemplate?.(t.id);
                            }}
                            className="opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded transition-opacity"
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
                    className="w-full justify-start text-[11px] font-bold text-[#D35400] hover:bg-[#D35400]/10 hover:text-[#D35400]"
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

          {/* BOTÃO ADICIONAR - AGORA COM OPÇÃO PARA COLUNA */}
          {(onAddFlow || onAddStage || onAddColumn) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-[#D35400] hover:bg-[#A04000] text-white gap-2 font-bold shadow-md transition-all active:scale-95 h-9 border-none">
                  <Plus size={18} strokeWidth={3} />
                  <span className="hidden sm:inline text-xs">Adicionar</span>
                  <ChevronDown size={14} className="opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-[#2D3436] border border-[#95A5A6]/30 text-[#F5F0E6] p-1 shadow-2xl"
              >
                {/* OPÇÃO PARA FLUXO */}
                {onAddFlow && (
                  <DropdownMenuItem
                    onClick={onAddFlow}
                    className="gap-3 cursor-pointer py-2.5 focus:bg-white/10 focus:text-white rounded-md border-none outline-none"
                  >
                    <Layers size={16} className="text-[#D35400]" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Novo Fluxo</span>
                      <span className="text-[10px] text-[#95A5A6]">
                        Criar uma nova esteira
                      </span>
                    </div>
                  </DropdownMenuItem>
                )}

                {/* OPÇÃO PARA ETAPA/ESTÁGIO */}
                {onAddStage && (
                  <DropdownMenuItem
                    onClick={onAddStage}
                    className="gap-3 cursor-pointer py-2.5 focus:bg-white/10 focus:text-white rounded-md border-none outline-none"
                  >
                    <Plus size={16} className="text-[#95A5A6]" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Nova Etapa</span>
                      <span className="text-[10px] text-[#95A5A6]">
                        Adicionar coluna ao fluxo
                      </span>
                    </div>
                  </DropdownMenuItem>
                )}

                {/* OPÇÃO PARA COLUNA - PARA KANBANS SIMPLES */}
                {onAddColumn && (
                  <DropdownMenuItem
                    onClick={onAddColumn}
                    className="gap-3 cursor-pointer py-2.5 focus:bg-white/10 focus:text-white rounded-md border-none outline-none"
                  >
                    <Columns size={16} className="text-[#3498DB]" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Nova Coluna</span>
                      <span className="text-[10px] text-[#95A5A6]">
                        Adicionar coluna ao kanban
                      </span>
                    </div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* CONFIGURAÇÕES */}
          {configActions && configActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[#95A5A6] hover:text-[#F5F0E6] hover:bg-white/5 ml-1"
                >
                  <Settings size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#2D3436] border border-[#95A5A6]/30 text-[#F5F0E6] p-1 shadow-2xl"
              >
                <div className="text-[10px] font-bold text-[#95A5A6] uppercase tracking-widest px-3 py-2">
                  Configurações
                </div>
                {configActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer py-2 px-3 rounded-md focus:bg-white/10 border-none outline-none",
                      action.variant === "destructive"
                        ? "text-red-400 focus:bg-red-500/10 focus:text-red-400"
                        : "text-[#F5F0E6] focus:text-white",
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

      {/* MENU MOBILE */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#2C3E50] border-t border-[#95A5A6]/20 shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
          {/* Seletor de Fluxos Mobile */}
          {flows.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#95A5A6] uppercase tracking-widest">
                Coleções
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {flows.map((flow) => {
                  const isSelected = selectedFlowIds.includes(flow.id);
                  return (
                    <button
                      key={flow.id}
                      onClick={() => onToggleFlow?.(flow.id)}
                      className={cn(
                        "flex items-center justify-between w-full p-2 rounded text-sm text-left",
                        isSelected
                          ? "bg-white/10 text-white"
                          : "text-[#95A5A6] hover:bg-white/5",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: flow.color || "#D35400" }}
                        />
                        <span className="truncate">{flow.name}</span>
                      </div>
                      {isSelected && (
                        <Check size={14} className="text-orange-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ações Mobile */}
          <div className="grid grid-cols-2 gap-2">
            {onAddFlow && (
              <Button
                onClick={() => {
                  onAddFlow();
                  setIsMobileMenuOpen(false);
                }}
                variant="outline"
                className="bg-transparent border-[#95A5A6]/30 text-[#F5F0E6] hover:bg-white/5 justify-start"
              >
                <Layers size={16} className="mr-2 text-[#D35400]" /> Novo Fluxo
              </Button>
            )}
            {onAddStage && (
              <Button
                onClick={() => {
                  onAddStage();
                  setIsMobileMenuOpen(false);
                }}
                variant="outline"
                className="bg-transparent border-[#95A5A6]/30 text-[#F5F0E6] hover:bg-white/5 justify-start"
              >
                <Plus size={16} className="mr-2 text-[#95A5A6]" /> Nova Etapa
              </Button>
            )}
            {onAddColumn && (
              <Button
                onClick={() => {
                  onAddColumn();
                  setIsMobileMenuOpen(false);
                }}
                variant="outline"
                className="bg-transparent border-[#95A5A6]/30 text-[#F5F0E6] hover:bg-white/5 justify-start"
              >
                <Columns size={16} className="mr-2 text-[#3498DB]" /> Nova
                Coluna
              </Button>
            )}
          </div>

          {/* Templates Mobile */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#95A5A6] uppercase tracking-widest">
                Templates
              </p>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTemplate?.(t.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center p-2 rounded text-sm text-left",
                      selectedTemplateId === t.id
                        ? "bg-[#D35400] text-white"
                        : "text-[#95A5A6] hover:bg-white/5",
                    )}
                  >
                    <span className="flex-1 truncate">{t.name}</span>
                    {selectedTemplateId === t.id && <Check size={14} />}
                  </button>
                ))}
              </div>
              {onApplyTemplate && (
                <Button
                  onClick={onApplyTemplate}
                  className="w-full bg-[#D35400] hover:bg-[#A04000] text-white h-8 text-xs"
                >
                  Aplicar Template Selecionado
                </Button>
              )}
            </div>
          )}

          {/* Configs Mobile */}
          {configActions && (
            <div className="pt-2 border-t border-[#95A5A6]/20">
              {configActions.map((action, i) => (
                <Button
                  key={i}
                  onClick={() => {
                    action.onClick();
                    setIsMobileMenuOpen(false);
                  }}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-8",
                    action.variant === "destructive"
                      ? "text-red-400 hover:text-red-300"
                      : "text-[#95A5A6] hover:text-white",
                  )}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

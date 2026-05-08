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

interface ConfigAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
}

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
    <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 shadow-sm z-20 sticky top-0">
      <div className="flex justify-between items-center max-w-[1920px] mx-auto w-full">
        {/* LADO ESQUERDO: Branding */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-[#7A7E83] hover:bg-[#F5F6FA] hover:text-[#353A40]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>

          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-[#F5F6FA] rounded-lg text-[#2F80ED]">
                {icon}
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-[#353A40]">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[11px] text-[#7A7E83] font-medium uppercase tracking-widest mt-1 hidden md:block">
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
                  className="bg-white border-[#CBD5E1] text-[#353A40] h-9 text-xs max-w-[280px] justify-between hover:bg-[#F5F6FA]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Layers size={16} className="flex-shrink-0 text-[#7A7E83]" />
                    <span className="truncate">{getFlowButtonText()}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className="ml-2 opacity-50 flex-shrink-0 text-[#7A7E83]"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-96 p-0 bg-white border border-[#E2E8F0] text-[#353A40] shadow-lg rounded-xl"
                align="end"
              >
                <Command className="bg-transparent">
                  <CommandInput
                    placeholder="Buscar coleção por nome..."
                    className="border-b border-[#E2E8F0] text-[#353A40] placeholder:text-[#7A7E83] h-10"
                  />
                  <CommandList>
                    <CommandEmpty className="py-6 text-center text-sm text-[#7A7E83]">
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
                            className="flex items-center justify-between py-2 px-2 text-[#353A40] aria-selected:bg-[#F5F6FA] cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: flow.color || "#2F80ED",
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
                                      ? "bg-red-100 text-red-700 border-red-200"
                                      : daysRemaining === 0
                                        ? "bg-orange-100 text-orange-700 border-orange-200"
                                        : daysRemaining <= 3
                                          ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                          : "bg-green-100 text-green-700 border-green-200",
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
                                <Check size={14} className="text-[#2F80ED]" />
                              )}

                              {/* Botões de ação */}
                              <div className="flex items-center gap-1 opacity-100">
                                {onEditFlow && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditFlow(flow);
                                    }}
                                    className="p-1 text-[#2F80ED] hover:bg-[#F5F6FA] rounded"
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
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
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
                    <div className="p-2 border-t border-[#E2E8F0]">
                      <div className="flex items-center gap-2 text-[9px] text-[#7A7E83]">
                        <Calendar size={10} />
                        <span>Prazos:</span>
                        <span className="text-green-600">● OK</span>
                        <span className="text-yellow-600">● ≤3d</span>
                        <span className="text-orange-600">● Hoje</span>
                        <span className="text-red-600">● Atrasado</span>
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
            <div className="flex items-center gap-2 bg-[#F5F6FA] p-1 rounded-lg border border-[#E2E8F0]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[11px] font-semibold text-[#7A7E83] hover:text-[#353A40] hover:bg-[#F5F6FA]"
                  >
                    <LayoutTemplate size={14} className="mr-2 text-[#7A7E83]" />
                    <span className="max-w-[120px] truncate">
                      {selectedTemplateName}
                    </span>
                    <ChevronDown size={12} className="ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 p-2 bg-white border border-[#E2E8F0] text-[#353A40] shadow-lg rounded-xl"
                  align="end"
                >
                  <div className="text-[10px] font-bold text-[#7A7E83] uppercase tracking-widest px-2 py-2">
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
                              ? "bg-[#2F80ED] text-white"
                              : "text-[#7A7E83] hover:bg-[#F5F6FA] hover:text-[#353A40]",
                          )}
                          onClick={() => onSelectTemplate?.(t.id)}
                        >
                          <div className="flex items-center gap-2 flex-1 overflow-hidden">
                            <Copy
                              size={14}
                              className={cn(
                                isActive ? "text-white" : "text-[#7A7E83]",
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
                            className="opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-px bg-[#E2E8F0] my-2" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSaveTemplate}
                    className="w-full justify-start text-[11px] font-bold text-[#2F80ED] hover:bg-[#F5F6FA] hover:text-[#1E5CB8]"
                  >
                    <Save size={14} className="mr-2" /> Salvar estrutura atual
                  </Button>
                </PopoverContent>
              </Popover>

              {onApplyTemplate && (
                <Button
                  size="sm"
                  onClick={onApplyTemplate}
                  className="h-8 px-4 text-[10px] bg-[#2F80ED] hover:bg-[#1E5CB8] text-white font-black border-none shadow-sm transition-all active:scale-95"
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
                <Button className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white gap-2 font-bold shadow-sm transition-all active:scale-95 h-9 border-none">
                  <Plus size={18} strokeWidth={3} />
                  <span className="hidden sm:inline text-xs">Adicionar</span>
                  <ChevronDown size={14} className="opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-white border border-[#E2E8F0] text-[#353A40] p-1 shadow-lg rounded-xl"
              >
                {/* OPÇÃO PARA FLUXO */}
                {onAddFlow && (
                  <DropdownMenuItem
                    onClick={onAddFlow}
                    className="gap-3 cursor-pointer py-2.5 focus:bg-[#F5F6FA] focus:text-[#353A40] rounded-md border-none outline-none"
                  >
                    <Layers size={16} className="text-[#2F80ED]" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Novo Fluxo</span>
                      <span className="text-[10px] text-[#7A7E83]">
                        Criar uma nova esteira
                      </span>
                    </div>
                  </DropdownMenuItem>
                )}

                {/* OPÇÃO PARA ETAPA/ESTÁGIO */}
                {onAddStage && (
                  <DropdownMenuItem
                    onClick={onAddStage}
                    className="gap-3 cursor-pointer py-2.5 focus:bg-[#F5F6FA] focus:text-[#353A40] rounded-md border-none outline-none"
                  >
                    <Plus size={16} className="text-[#7A7E83]" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Nova Etapa</span>
                      <span className="text-[10px] text-[#7A7E83]">
                        Adicionar coluna ao fluxo
                      </span>
                    </div>
                  </DropdownMenuItem>
                )}

                {/* OPÇÃO PARA COLUNA - PARA KANBANS SIMPLES */}
                {onAddColumn && (
                  <DropdownMenuItem
                    onClick={onAddColumn}
                    className="gap-3 cursor-pointer py-2.5 focus:bg-[#F5F6FA] focus:text-[#353A40] rounded-md border-none outline-none"
                  >
                    <Columns size={16} className="text-[#2F80ED]" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Nova Coluna</span>
                      <span className="text-[10px] text-[#7A7E83]">
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
                  className="text-[#7A7E83] hover:text-[#353A40] hover:bg-[#F5F6FA] ml-1"
                >
                  <Settings size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border border-[#E2E8F0] text-[#353A40] p-1 shadow-lg rounded-xl"
              >
                <div className="text-[10px] font-bold text-[#7A7E83] uppercase tracking-widest px-3 py-2">
                  Configurações
                </div>
                {configActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer py-2 px-3 rounded-md focus:bg-[#F5F6FA] border-none outline-none",
                      action.variant === "destructive"
                        ? "text-red-600 focus:bg-red-50 focus:text-red-600"
                        : "text-[#353A40] focus:text-[#353A40]",
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
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-[#E2E8F0] shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-5 z-50">
          {/* Seletor de Fluxos Mobile */}
          {flows.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#7A7E83] uppercase tracking-widest">
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
                          ? "bg-[#F5F6FA] text-[#353A40]"
                          : "text-[#7A7E83] hover:bg-[#F5F6FA]",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: flow.color || "#2F80ED" }}
                        />
                        <span className="truncate">{flow.name}</span>
                      </div>
                      {isSelected && (
                        <Check size={14} className="text-[#2F80ED]" />
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
                className="bg-white border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA] justify-start"
              >
                <Layers size={16} className="mr-2 text-[#2F80ED]" /> Novo Fluxo
              </Button>
            )}
            {onAddStage && (
              <Button
                onClick={() => {
                  onAddStage();
                  setIsMobileMenuOpen(false);
                }}
                variant="outline"
                className="bg-white border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA] justify-start"
              >
                <Plus size={16} className="mr-2 text-[#7A7E83]" /> Nova Etapa
              </Button>
            )}
            {onAddColumn && (
              <Button
                onClick={() => {
                  onAddColumn();
                  setIsMobileMenuOpen(false);
                }}
                variant="outline"
                className="bg-white border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA] justify-start"
              >
                <Columns size={16} className="mr-2 text-[#2F80ED]" /> Nova
                Coluna
              </Button>
            )}
          </div>

          {/* Templates Mobile */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#7A7E83] uppercase tracking-widest">
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
                        ? "bg-[#2F80ED] text-white"
                        : "text-[#7A7E83] hover:bg-[#F5F6FA] hover:text-[#353A40]",
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
                  className="w-full bg-[#2F80ED] hover:bg-[#1E5CB8] text-white h-8 text-xs"
                >
                  Aplicar Template Selecionado
                </Button>
              )}
            </div>
          )}

          {/* Configs Mobile */}
          {configActions && (
            <div className="pt-2 border-t border-[#E2E8F0]">
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
                      ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                      : "text-[#7A7E83] hover:text-[#353A40] hover:bg-[#F5F6FA]",
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
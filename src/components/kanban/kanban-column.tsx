// components/kanban/kanban-column.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Edit, MoreVertical, Plus, Trash2 } from "lucide-react";
import React from "react";
import { ColumnFilterIcons } from "./column-filter-icons";

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color?: string;
  onAddClick?: () => void;
  onAddItem?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  onDropItem: (itemId: string, columnId: string) => void;
  children: React.ReactNode;
  
  // NOVA PROP: indica se é a primeira coluna
  isFirstColumn?: boolean;

  // 🔥 NOVA PROP: controla se o botão de adicionar deve aparecer
  showAddButton?: boolean;
  
  // Novas props para filtros
  onFilterOverdue?: () => void;
  onFilterUpcoming?: () => void;
  isOverdueFilterActive?: boolean;
  isUpcomingFilterActive?: boolean;
  filterDisabled?: boolean;
  
  // 🔥 NOVA PROP: dias padrão para exibir
  defaultDays?: number;
}

export function KanbanColumn({
  id,
  title,
  count,
  color = "#2C3E50",
  onAddClick,
  onAddItem,
  onEditClick,
  onDeleteClick,
  onDropItem,
  children,
  showAddButton = false,
  // NOVA PROP com valor padrão false
  isFirstColumn = false,
  
  // Novas props com valores padrão
  onFilterOverdue,
  onFilterUpcoming,
  isOverdueFilterActive = false,
  isUpcomingFilterActive = false,
  filterDisabled = false,
  
  // 🔥 NOVA PROP
  defaultDays,
}: KanbanColumnProps) {
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    if (itemId) onDropItem(itemId, id);
  };

  const handleAdd = onAddItem || onAddClick;

  return (
    <div
      className="w-[280px] flex-shrink-0 flex flex-col h-full rounded-lg bg-gray-100/50 border border-gray-200 transition-colors"
      style={{ height: "100%" }} // 🔥 Garante que a coluna ocupe 100% da altura disponível
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header da Coluna - FIXO */}
      <div
        className="px-3 py-2 rounded-t-lg flex justify-between items-center text-white shadow-sm flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide truncate">
            {title}
            <Badge
              variant="secondary"
              className="bg-white/20 text-white border-0 hover:bg-white/30 text-[9px] h-4 px-1"
            >
              {count}
            </Badge>
          </div>
          
          {/* 🔥 EXIBE OS DIAS PADRÃO DA ETAPA */}
          {defaultDays !== undefined && defaultDays > 0 && (
            <div className="flex items-center gap-1 text-[9px] text-white/80 mt-0.5">
              <Calendar className="w-2.5 h-2.5" />
              <span>Padrão: {defaultDays} {defaultDays === 1 ? 'dia' : 'dias'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* ÍCONES DE FILTRO */}
          {onFilterOverdue && onFilterUpcoming && (
            <ColumnFilterIcons
              onFilterOverdue={onFilterOverdue}
              onFilterUpcoming={onFilterUpcoming}
              isOverdueActive={isOverdueFilterActive}
              isUpcomingActive={isUpcomingFilterActive}
              disabled={filterDisabled}
            />
          )}

          {/* 🔥 BOTÃO DE ADICIONAR - SÓ APARECE NA PRIMEIRA COLUNA */}
          {handleAdd && (showAddButton || isFirstColumn) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/10"
              onClick={handleAdd}
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
          
          {/* Menu de Opções */}
          {(onEditClick || onDeleteClick) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/10"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEditClick && (
                  <DropdownMenuItem onClick={onEditClick}>
                    <Edit className="w-3.5 h-3.5 mr-2" /> Editar
                  </DropdownMenuItem>
                )}
                {onDeleteClick && (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={onDeleteClick}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Corpo da Coluna - Área com rolagem vertical */}
      <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar min-h-[100px]">
        {children}
        {React.Children.count(children) === 0 && (
          <div className="h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
            Arraste itens para cá
          </div>
        )}
      </div>
    </div>
  );
}
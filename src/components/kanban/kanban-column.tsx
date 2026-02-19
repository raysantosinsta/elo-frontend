// components/kanban/kanban-column.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical, Plus, Trash2 } from "lucide-react";
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
  
  // Novas props para filtros
  onFilterOverdue?: () => void;
  onFilterUpcoming?: () => void;
  isOverdueFilterActive?: boolean;
  isUpcomingFilterActive?: boolean;
  filterDisabled?: boolean;
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
  
  // Novas props com valores padrão
  onFilterOverdue,
  onFilterUpcoming,
  isOverdueFilterActive = false,
  isUpcomingFilterActive = false,
  filterDisabled = false,
}: KanbanColumnProps) {
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    if (itemId) onDropItem(itemId, id);
  };

  const handleAdd = onAddItem || onAddClick;

  return (
    <div
      className="w-[260px] flex-shrink-0 flex flex-col h-full max-h-[calc(100vh-140px)] rounded-lg bg-gray-100/50 border border-gray-200 transition-colors"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header da Coluna */}
      <div
        className="px-3 py-2 rounded-t-lg flex justify-between items-center text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide truncate">
          {title}
          <Badge
            variant="secondary"
            className="bg-white/20 text-white border-0 hover:bg-white/30 text-[9px] h-4 px-1"
          >
            {count}
          </Badge>
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

          {/* Botão de Adicionar */}
          {handleAdd && (
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

      {/* Corpo da Coluna */}
      <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
        {children}
        {React.Children.count(children) === 0 && (
          <div className="h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
            Vazio
          </div>
        )}
      </div>
    </div>
  );
}
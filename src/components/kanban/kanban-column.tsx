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

  isFirstColumn?: boolean;
  showAddButton?: boolean;

  // 🔥 Tornar as props OBRIGATÓRIAS ou usar valores padrão
  onFilterOverdue?: () => void;
  onFilterUpcoming?: () => void;
  isOverdueFilterActive?: boolean;
  isUpcomingFilterActive?: boolean;
  filterDisabled?: boolean;

  defaultDays?: number;
  className?: string;
}

export function KanbanColumn({
  id,
  title,
  count,
  color = "#2F80ED",
  onAddClick,
  onAddItem,
  onEditClick,
  onDeleteClick,
  onDropItem,
  children,
  showAddButton = false,
  isFirstColumn = false,
  onFilterOverdue,
  onFilterUpcoming,
  isOverdueFilterActive = false,
  isUpcomingFilterActive = false,
  filterDisabled = false,
  defaultDays,
  className = "",
}: KanbanColumnProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    if (itemId) onDropItem(itemId, id);
  };

  const handleAdd = onAddItem || onAddClick;

  // 🔥 Funções de fallback para evitar erro quando não fornecidas
  const handleFilterOverdue = () => {
    if (onFilterOverdue) onFilterOverdue();
  };

  const handleFilterUpcoming = () => {
    if (onFilterUpcoming) onFilterUpcoming();
  };

  return (
    <div
      className={`w-[280px] flex-shrink-0 flex flex-col h-full rounded-lg bg-[#F5F6FA] border border-[#E2E8F0] transition-colors ${className}`}
      style={{ height: "100%" }}
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
              className="bg-white/20 text-white border-0 hover:bg-white/30 text-[10px] h-4 px-1.5 font-medium"
            >
              {count}
            </Badge>
          </div>

          {defaultDays !== undefined && defaultDays > 0 && (
            <div className="flex items-center gap-1 text-[9px] text-white/80 mt-0.5">
              <Calendar className="w-2.5 h-2.5" />
              <span>
                Padrão: {defaultDays} {defaultDays === 1 ? "dia" : "dias"}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* 🔥 Verifica se as funções existem antes de renderizar */}
          {onFilterOverdue && onFilterUpcoming && (
            <ColumnFilterIcons
              onFilterOverdue={handleFilterOverdue}
              onFilterUpcoming={handleFilterUpcoming}
              isOverdueActive={isOverdueFilterActive}
              isUpcomingActive={isUpcomingFilterActive}
              disabled={filterDisabled}
            />
          )}

          {handleAdd && (showAddButton || isFirstColumn) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/10 rounded-md"
              onClick={handleAdd}
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}

          {(onEditClick || onDeleteClick) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/10 rounded-md"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white border border-[#E2E8F0] shadow-lg rounded-xl p-1 min-w-[140px]"
              >
                {onEditClick && (
                  <DropdownMenuItem
                    onClick={onEditClick}
                    className="text-[#353A40] hover:bg-[#F5F6FA] hover:text-[#353A40] cursor-pointer rounded-md text-xs py-1.5"
                  >
                    <Edit className="w-3.5 h-3.5 mr-2 text-[#2F80ED]" /> Editar
                  </DropdownMenuItem>
                )}
                {onDeleteClick && (
                  <DropdownMenuItem
                    onClick={onDeleteClick}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer rounded-md text-xs py-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar min-h-[100px]">
        {children}
        {React.Children.count(children) === 0 && (
          <div className="h-16 border-2 border-dashed border-[#CBD5E1] rounded-lg flex items-center justify-center text-[#7A7E83] text-xs bg-white/50">
            Arraste itens para cá
          </div>
        )}
      </div>
    </div>
  );
}

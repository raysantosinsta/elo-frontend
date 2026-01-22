import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical, Plus, Trash2 } from "lucide-react";
import React from "react";

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color?: string;
  onAddClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  onDropItem: (itemId: string, columnId: string) => void;
  children: React.ReactNode;
}

export function KanbanColumn({
  id,
  title,
  count,
  color = "#2C3E50",
  onAddClick,
  onEditClick,
  onDeleteClick,
  onDropItem,
  children
}: KanbanColumnProps) {
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    if (itemId) onDropItem(itemId, id);
  };

  return (
    <div
      // 🔥 AJUSTE: w-[260px] (era 300px). Isso diminui a largura de todos os cards.
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
          <Badge variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30 text-[9px] h-4 px-1">
            {count}
          </Badge>
        </div>
        
        <div className="flex items-center gap-0.5">
          {onAddClick && (
            <Button variant="ghost" size="icon" className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/10" onClick={onAddClick}>
              <Plus className="w-3 h-3" />
            </Button>
          )}
          {(onEditClick || onDeleteClick) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/10">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEditClick && <DropdownMenuItem onClick={onEditClick}><Edit className="w-3.5 h-3.5 mr-2"/> Editar</DropdownMenuItem>}
                {onDeleteClick && <DropdownMenuItem className="text-red-600" onClick={onDeleteClick}><Trash2 className="w-3.5 h-3.5 mr-2"/> Excluir</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Corpo da Coluna */}
      {/* 🔥 AJUSTE: p-2 (reduzido de p-3) */}
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
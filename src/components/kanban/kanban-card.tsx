/* eslint-disable @next/next/no-img-element */
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Edit, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import React from "react";

export interface KanbanCardProps {
  id: string;
  title: string;
  subtitle?: string;
  tags?: React.ReactNode;
  
  // 🔥 NOVAS PROPS DE STATUS
  statusLabel?: string; // Ex: "PENDENTE", "EM PROGRESSO"
  statusColor?: string; // Ex: "#E67E22" (Hexadecimal)

  priorityColor?: string;
  coverImage?: string; 
  imagesCount?: number; 
  footer?: React.ReactNode;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDoubleClick?: () => void; 
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void; 
  extraMenuItems?: React.ReactNode;
  children?: React.ReactNode;
}

export function KanbanCard({
  id,
  title,
  subtitle,
  tags,
  statusLabel, // 🔥 Recebe label
  statusColor = "#64748b", // 🔥 Recebe cor (default slate-500)
  priorityColor = "#ccc",
  footer,
  onView,
  onEdit,
  onDelete,
  onDoubleClick,
  onDragStart,
  extraMenuItems,
  children
}: KanbanCardProps) {
  
  return (
    <Card
      draggable
      onDragStart={(e) => {
          if (onDragStart) {
              onDragStart(e);
          } else {
              e.dataTransfer.setData("itemId", id);
          }
      }}
      onDoubleClick={onDoubleClick}
      className="cursor-grab active:cursor-grabbing group transition-all duration-200 border-l-[3px] bg-white hover:shadow-sm hover:border-l-[4px] select-none relative mb-1.5 rounded-md"
      style={{ borderLeftColor: priorityColor }}
    >
       <div className="p-2">
        
        {/* Topo: Status, Tags e Menu */}
        <div className="flex justify-between items-start mb-1.5">
          <div className="flex flex-wrap gap-1 items-center">
             
             {/* 🔥 RENDERIZAÇÃO DO STATUS */}
             {statusLabel && (
               <span 
                 className="text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider leading-none"
                 style={{ 
                    // Usa a cor passada para o texto
                    color: statusColor, 
                    // Usa a mesma cor com 15% de opacidade para o fundo (hex + '26')
                    backgroundColor: `${statusColor}26` 
                 }}
               >
                 {statusLabel}
               </span>
             )}

             {tags}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-300 hover:text-gray-600 p-0.5 -mr-1 outline-none focus:ring-0 transition-colors">
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {extraMenuItems}
              {extraMenuItems && <DropdownMenuSeparator />}

              {onView && (
                <DropdownMenuItem onClick={onView} className="cursor-pointer text-xs">
                  <Eye className="w-3.5 h-3.5 mr-2" /> Visualizar
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer text-xs">
                  <Edit className="w-3.5 h-3.5 mr-2" /> Editar
                </DropdownMenuItem>
              )}

              {(onView || onEdit) && onDelete && <DropdownMenuSeparator />}

              {onDelete && (
                <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer focus:bg-red-50 text-xs" onClick={onDelete}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Conteúdo Principal */}
        <div className="mb-0.5">
            <h4 className="font-bold text-xs leading-tight text-slate-800 line-clamp-2" title={title}>
              {title}
            </h4>
            {subtitle && <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide truncate">{subtitle}</p>}
        </div>

        {/* Descrição */}
        <div className="text-[10px] text-slate-500 space-y-0.5 line-clamp-2 leading-3">
          {children}
        </div>

        {/* Rodapé Super Compacto */}
        {footer && (
          <div className="mt-1.5 pt-1 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400">
            {footer}
          </div>
        )}
      </div>
    </Card>
  );
}
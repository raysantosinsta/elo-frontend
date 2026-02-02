/* eslint-disable @next/next/no-img-element */
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Edit, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import React from "react";

export interface KanbanCardProps {
  id: string;
  title: string;
  subtitle?: string;
  tags?: React.ReactNode;
  statusLabel?: string; 
  statusColor?: string; 
  priorityColor?: string;
  coverImage?: string; 
  imagesCount?: number; 
  footer?: React.ReactNode;
  children?: React.ReactNode;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDoubleClick?: () => void; 
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void; 
  extraMenuItems?: React.ReactNode;
}

export function KanbanCard({
  id,
  title,
  subtitle,
  tags,
  statusLabel,
  statusColor = "#95A5A6",
  priorityColor = "#ccc",
  coverImage,
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
      onDragStart={(e) => onDragStart ? onDragStart(e) : e.dataTransfer.setData("itemId", id)}
      onDoubleClick={onDoubleClick}
      // 🔥 IMPORTANTE: Mudança na estrutura de classes para garantir visibilidade
      className={cn(
        "cursor-grab active:cursor-grabbing group transition-all duration-200",
        "border-l-[4px] bg-white hover:shadow-md select-none relative mb-3 rounded-xl overflow-hidden flex flex-col"
      )}
      style={{ borderLeftColor: priorityColor }}
    >
      {/* 🖼️ ÁREA DA IMAGEM - Reforçada */}
      {coverImage && (
        <div className="w-full h-32 flex-shrink-0 overflow-hidden bg-slate-100 border-b border-slate-100">
          <img 
            src={coverImage} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            loading="lazy"
            onError={(e) => {
              // Se a imagem falhar (404), removemos o espaço para não ficar feio
              e.currentTarget.parentElement!.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="p-3 flex flex-col flex-1">
        {/* Status e Menu */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-wrap gap-1 items-center">
             {statusLabel && (
               <span 
                 className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase leading-none"
                 style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
               >
                 {statusLabel}
               </span>
             )}
             {tags}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-slate-300 hover:text-slate-500 transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onView && <DropdownMenuItem onClick={onView}><Eye className="w-4 h-4 mr-2"/> Ver</DropdownMenuItem>}
              {onEdit && <DropdownMenuItem onClick={onEdit}><Edit className="w-4 h-4 mr-2"/> Editar</DropdownMenuItem>}
              {onDelete && <DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="w-4 h-4 mr-2"/> Excluir</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Textos */}
        <div className="mb-2">
            <h4 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight group-hover:text-[#D35400] transition-colors">{title}</h4>
            {subtitle && <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase truncate">{subtitle}</p>}
        </div>

        <div className="text-xs text-slate-500 line-clamp-2 mb-3">
          {children}
        </div>

        {footer && (
          <div className="mt-auto pt-2 border-t border-slate-50">
            {footer}
          </div>
        )}
      </div>
    </Card>
  );
}
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
import { Edit, Eye, MoreHorizontal, Trash2, CheckCircle2 } from "lucide-react";
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
  
  // Ações
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onComplete?: () => void; 

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
  onComplete, 
  onDoubleClick,
  onDragStart,
  extraMenuItems,
  children
}: KanbanCardProps) {
  
  const hasActions = onComplete || onView || onEdit || onDelete || extraMenuItems;

  return (
    <Card
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart ? onDragStart(e) : e.preventDefault()}
      onDoubleClick={onDoubleClick}
      className={cn(
        "cursor-grab active:cursor-grabbing group transition-all duration-200",
        "border-l-[4px] bg-white hover:shadow-md select-none relative mb-2 rounded-lg overflow-hidden flex flex-col"
      )}
      style={{ borderLeftColor: priorityColor }}
    >
      {/* 🖼️ IMAGEM MAIS COMPACTA */}
      {coverImage && (
        <div className="w-full h-24 flex-shrink-0 overflow-hidden bg-slate-100">
          <img 
            src={coverImage} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            loading="lazy"
            onError={(e) => {
              e.currentTarget.parentElement!.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="p-2.5 flex flex-col flex-1">
        {/* Status e Menu - MAIS JUNTOS */}
        <div className="flex justify-between items-start gap-1 mb-1.5">
          <div className="flex flex-wrap gap-1 items-center min-h-[24px]">
             {statusLabel && (
               <span 
                 className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase leading-none inline-flex items-center"
                 style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
               >
                 {statusLabel}
               </span>
             )}
             {tags}
          </div>

          {hasActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-slate-300 hover:text-slate-500 transition-colors p-0.5 hover:bg-slate-100 rounded-sm -mt-0.5 -mr-1">
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                
                {onComplete && (
                  <>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onComplete();
                      }} 
                      className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 font-bold cursor-pointer text-sm py-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2"/> 
                      Concluir Etapa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {onView && (
                  <DropdownMenuItem onClick={onView} className="cursor-pointer text-sm py-1.5">
                    <Eye className="w-3.5 h-3.5 mr-2"/> Ver
                  </DropdownMenuItem>
                )}
                
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit} className="cursor-pointer text-sm py-1.5">
                    <Edit className="w-3.5 h-3.5 mr-2"/> Editar
                  </DropdownMenuItem>
                )}
                
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer text-sm py-1.5">
                    <Trash2 className="w-3.5 h-3.5 mr-2"/> Excluir
                  </DropdownMenuItem>
                )}

                {extraMenuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Título e Subtítulo - MAIS COMPACTOS */}
        <div className="mb-1">
            <h4 className="font-semibold text-xs text-slate-800 line-clamp-2 leading-snug group-hover:text-[#D35400] transition-colors">
              {title}
            </h4>
            {subtitle && (
              <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase truncate leading-tight">
                {subtitle}
              </p>
            )}
        </div>

        {/* Conteúdo/Descrição - COM MENOS ESPAÇO */}
        {children && (
          <div className="text-[10px] text-slate-500 line-clamp-2 mb-1.5 leading-relaxed">
            {children}
          </div>
        )}

        {/* Footer - MAIS COMPACTO */}
        {footer && (
          <div className="mt-auto pt-1.5 border-t border-slate-100 text-xs">
            {footer}
          </div>
        )}
      </div>
    </Card>
  );
}
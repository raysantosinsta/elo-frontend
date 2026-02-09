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
// 1. Adicionei o ícone CheckCircle2 (ou ArrowRight se preferir)
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
  // 🔥 2. NOVA PROP: Função para concluir/avançar
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
  onComplete, // 🔥 Recebendo a nova prop
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
      className={cn(
        "cursor-grab active:cursor-grabbing group transition-all duration-200",
        "border-l-[4px] bg-white hover:shadow-md select-none relative mb-3 rounded-xl overflow-hidden flex flex-col"
      )}
      style={{ borderLeftColor: priorityColor }}
    >
      {/* 🖼️ ÁREA DA IMAGEM */}
      {coverImage && (
        <div className="w-full h-32 flex-shrink-0 overflow-hidden bg-slate-100 border-b border-slate-100">
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
              <button className="text-slate-300 hover:text-slate-500 transition-colors p-1 hover:bg-slate-100 rounded">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              
              {/* 🔥 3. BOTÃO DE CONCLUIR/AVANÇAR */}
              {onComplete && (
                <>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete();
                    }} 
                    className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 font-bold cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2"/> 
                    Concluir Etapa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Outras opções */}
              {onView && (
                <DropdownMenuItem onClick={onView} className="cursor-pointer">
                  <Eye className="w-4 h-4 mr-2"/> Ver
                </DropdownMenuItem>
              )}
              
              {onEdit && (
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                  <Edit className="w-4 h-4 mr-2"/> Editar
                </DropdownMenuItem>
              )}
              
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2"/> Excluir
                </DropdownMenuItem>
              )}

              {extraMenuItems}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Título e Subtítulo */}
        <div className="mb-2">
            <h4 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight group-hover:text-[#D35400] transition-colors">
              {title}
            </h4>
            {subtitle && (
              <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase truncate">
                {subtitle}
              </p>
            )}
        </div>

        {/* Conteúdo/Descrição */}
        <div className="text-xs text-slate-500 line-clamp-2 mb-3">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-auto pt-2 border-t border-slate-50">
            {footer}
          </div>
        )}
      </div>
    </Card>
  );
}
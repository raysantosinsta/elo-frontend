/* eslint-disable @next/next/no-img-element */
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useProductRefPermission } from "@/hooks/use-product-ref-permission";
import { cn } from "@/lib/utils";
import { Edit, Eye, MoreHorizontal, Trash2, CheckCircle2, EyeOff, Lock, Clock } from "lucide-react";
import React, { useMemo } from "react";

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
  dueDate?: string;
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
  dueDate,
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

  const { canViewRef, canManageRef } = useProductRefPermission();
  
  const hasActions = onComplete || onView || onEdit || onDelete || extraMenuItems;

  const renderSubtitle = () => {
    if (!subtitle) return null;

    if (canViewRef) {
      return (
        <p className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase truncate leading-tight">
          {subtitle}
        </p>
      );
    }
    // Se não pode ver (nunca acontece, porque canViewRef é true para todos)
  };

  // Helper para formatar a data compacta no card
  const formattedDate = useMemo(() => {
    if (!dueDate) return null;
    try {
      return new Date(dueDate).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
    } catch {
      return null;
    }
  }, [dueDate]);

  return (
    <Card
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart ? onDragStart(e) : e.preventDefault()}
      onDoubleClick={onDoubleClick}
      className={cn(
        "cursor-grab active:cursor-grabbing group transition-all duration-200",
        "border-l-[4px] bg-white hover:shadow-md select-none relative rounded-lg overflow-hidden flex flex-col",
        "mb-2 w-full" // 🔥 Garante largura total dentro da coluna
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

      <div className="p-3 flex flex-col flex-1"> {/* 🔥 padding um pouco maior para melhor legibilidade */}
        
        {/* Status e Menu - LINHA SUPERIOR */}
        <div className="flex justify-between items-start gap-1 mb-2"> {/* 🔥 mb-2 para mais espaço */}
          
          {/* Status e Tags - LADO ESQUERDO */}
          <div className="flex flex-wrap gap-1 items-center min-h-[24px] flex-1">
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

          {/* Menu de Ações - LADO DIREITO */}
          {hasActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-sm -mt-1 -mr-1 flex-shrink-0">
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
                      className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 font-bold cursor-pointer text-sm py-2"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2"/> 
                      Concluir Etapa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {onView && (
                  <DropdownMenuItem onClick={onView} className="cursor-pointer text-sm py-2">
                    <Eye className="w-4 h-4 mr-2"/> Ver
                  </DropdownMenuItem>
                )}
                
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit} className="cursor-pointer text-sm py-2">
                    <Edit className="w-4 h-4 mr-2"/> Editar
                  </DropdownMenuItem>
                )}
                
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer text-sm py-2">
                    <Trash2 className="w-4 h-4 mr-2"/> Excluir
                  </DropdownMenuItem>
                )}

                {extraMenuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Título - MAIS DESTAQUE */}
        <h4 className="font-semibold text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-[#D35400] transition-colors mb-1">
          {title}
        </h4>
        
        {/* Subtítulo - MAIS VISÍVEL */}
        {renderSubtitle()}

        {/* 🔥 NOVO: Prazo no corpo do card para destaque */}
        {formattedDate && (
          <div className="flex items-center gap-1.5 mt-2 text-[#D35400] bg-orange-50 w-fit px-2 py-0.5 rounded border border-orange-100">
            <Clock size={10} className="font-bold" />
            <span className="text-[10px] font-bold">Prazo: {formattedDate}</span>
          </div>
        )}

        {/* Conteúdo/Descrição */}
        {children && (
          <div className="text-xs text-slate-600 line-clamp-2 mt-1 mb-2 leading-relaxed">
            {children}
          </div>
        )}

        {/* Footer - COM MAIS ESPAÇO */}
        {footer && (
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
            {footer}
          </div>
        )}
      </div>
    </Card>
  );
}
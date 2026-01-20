/* eslint-disable @next/next/no-img-element */
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Eye, ImageIcon, MoreVertical, Trash2 } from "lucide-react";
import React from "react";

export interface KanbanCardProps {
  id: string;
  title: string;
  subtitle?: string; // ex: REF-001
  tags?: React.ReactNode; // Badges extras
  priorityColor?: string; // Cor da borda esquerda
  coverImage?: string;
  imagesCount?: number;
  footer?: React.ReactNode; // Ícones de anexo, data, etc
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  // 🔥 ADICIONE ISTO: Prop para o Drag & Drop
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void; 
  children?: React.ReactNode; // Conteúdo livre no meio
}

export function KanbanCard({
  id,
  title,
  subtitle,
  tags,
  priorityColor = "#ccc",
  coverImage,
  imagesCount = 0,
  footer,
  onView,
  onEdit,
  onDelete,
  onDragStart, // 🔥 Recebe a prop
  children
}: KanbanCardProps) {
  
  return (
    <Card
      draggable
      // 🔥 Usa a prop recebida ou um fallback padrão (opcional)
      onDragStart={(e) => {
          if (onDragStart) {
              onDragStart(e);
          } else {
              e.dataTransfer.setData("itemId", id);
          }
      }}
      className="cursor-grab active:cursor-grabbing group transition-all duration-200 border-l-4 bg-white hover:shadow-md"
      style={{ borderLeftColor: priorityColor }}
    >
      {/* ... Resto do conteúdo ... */}
       <div className="p-3">
        {/* Topo: Tags e Menu */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-wrap gap-1">
             {tags}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-400 hover:text-gray-600 p-1 -mr-2">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && <DropdownMenuItem onClick={onView}><Eye className="w-4 h-4 mr-2" /> Visualizar</DropdownMenuItem>}
              {onEdit && <DropdownMenuItem onClick={onEdit}><Edit className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>}
              <DropdownMenuSeparator />
              {onDelete && <DropdownMenuItem className="text-red-600" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Imagem de Capa */}
        {coverImage && (
          <div className="mb-3 relative rounded-md overflow-hidden h-32 bg-gray-100 group/img">
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover transition-transform group-hover/img:scale-105 duration-500" />
            {imagesCount > 1 && (
              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-sm flex items-center gap-1 backdrop-blur-sm">
                <ImageIcon size={10} /> +{imagesCount - 1}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo Principal */}
        <h4 className="font-bold text-sm mb-1 leading-tight text-slate-800 line-clamp-2" title={title}>
          {title}
        </h4>
        
        {subtitle && <p className="text-xs text-slate-500 font-mono mb-2">{subtitle}</p>}

        <div className="text-xs text-slate-600 space-y-1">
          {children}
        </div>

        {/* Rodapé (Datas, Avatares, Ícones) */}
        {footer && (
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            {footer}
          </div>
        )}
      </div>
    </Card>
  );
}
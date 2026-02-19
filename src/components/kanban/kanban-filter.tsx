/* eslint-disable @next/next/no-img-element */
import { Filter } from "lucide-react";
import React from "react";

interface KanbanFilterProps {
  children: React.ReactNode;
}

// Interface para os filtros
export interface FilterParams {
  startDate?: string;
  endDate?: string;
  dateType?: 'productionStartedAt' | 'dueDate';
  isOverdue?: boolean;
  isUpcoming?: boolean;
  assignedToId?: string;
  supplierId?: string;
  status?: string;
}

export function KanbanFilter({ children }: KanbanFilterProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm z-10">
      <div className="flex flex-col md:flex-row md:items-center gap-4 max-w-[1920px] mx-auto w-full">
        
        {/* Label Estático */}
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium min-w-fit">
          <Filter className="w-4 h-4" /> Filtros:
        </div>

        {/* Inputs Dinâmicos (Children) */}
        <div className="flex flex-wrap items-center gap-4 w-full">
          {children}
        </div>
        
      </div>
    </div>
  );
}
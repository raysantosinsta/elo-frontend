import React from "react";

interface KanbanBoardProps {
  children: React.ReactNode;
  className?: string;
}

export function KanbanBoard({ children, className }: KanbanBoardProps) {
  return (
    <div className="flex-1 w-full h-full overflow-x-auto overflow-y-hidden bg-[#F5F0E6]/50">
      {/* 1. min-w-max: Força o container a ter a largura da soma de todas as colunas
          2. flex-row: Garante que as colunas fiquem lado a lado
      */}
      <div className={`flex flex-row h-full gap-3 p-4 pb-6 items-start min-w-max ${className}`}>
        {children}
      </div>
    </div>
  );
}
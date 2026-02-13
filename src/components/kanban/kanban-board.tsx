import React from "react";

interface KanbanBoardProps {
  children: React.ReactNode;
  className?: string;
}

export function KanbanBoard({ children, className }: KanbanBoardProps) {
  return (
    // overflow-y-hidden aqui garante que o scroll seja apenas das colunas internas se elas forem muito grandes, 
    // mas geralmente queremos que a board toda tenha scroll horizontal.
    <div className="flex-1 w-full h-full overflow-x-auto overflow-y-hidden bg-[#F5F0E6]/50 scrollbar-thin scrollbar-thumb-[#95A5A6]/40 scrollbar-track-transparent">
      {/* min-w-max: Força o container a ter a largura da soma de todas as colunas */}
      <div className={`flex flex-row h-full gap-3 p-4 pb-6 items-start min-w-max ${className}`}>
        {children}
      </div>
    </div>
  );
}
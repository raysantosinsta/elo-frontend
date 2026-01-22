import React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface KanbanBoardProps {
  children: React.ReactNode;
  className?: string;
}

export function KanbanBoard({ children, className }: KanbanBoardProps) {
  return (
    <ScrollArea className="flex-1 h-full w-full whitespace-nowrap">
      {/* 🔥 AJUSTE: gap-3 (era gap-6) e p-4 (era p-6) */}
      <div className={`flex h-full gap-3 p-4 items-start ${className}`}>
        {children}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
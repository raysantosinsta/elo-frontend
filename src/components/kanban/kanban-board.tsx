import React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface KanbanBoardProps {
  children: React.ReactNode;
  className?: string;
}

export function KanbanBoard({ children, className }: KanbanBoardProps) {
  return (
    <ScrollArea className="flex-1 h-full w-full whitespace-nowrap">
      <div className={`flex h-full gap-6 p-4 md:p-6 items-start ${className}`}>
        {children}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
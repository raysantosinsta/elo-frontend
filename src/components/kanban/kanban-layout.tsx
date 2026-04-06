import React from "react";

interface KanbanLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function KanbanLayout({ children, className }: KanbanLayoutProps) {
  return (
    <div 
      className={cn(
        "flex flex-col h-screen overflow-hidden bg-[#F5F0E6] font-sans",
        className
      )}
    >
      {children}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
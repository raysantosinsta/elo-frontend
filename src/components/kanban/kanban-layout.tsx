import React from "react";

interface KanbanLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function KanbanLayout({ children, className }: KanbanLayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col font-sans bg-[#F5F0E6] ${className}`}>
      {children}
    </div>
  );
}
import React from "react";

interface KanbanLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function KanbanLayout({ children, className }: KanbanLayoutProps) {
  return (
    // h-screen: Trava a altura na tela inteira
    // overflow-hidden: Impede que a tela inteira role, forçando a rolagem apenas dentro do Board
    <div className={`h-screen flex flex-col overflow-hidden font-sans bg-[#F5F0E6] ${className}`}>
      {children}
    </div>
  );
}
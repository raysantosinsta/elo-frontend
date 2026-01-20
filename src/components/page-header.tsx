import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  // Props de Busca (Opcionais)
  searchValue?: string;
  onSearchChange?: (term: string) => void;
  searchPlaceholder?: string;
  // Botões ou ações extras
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  className,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  children,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6", className)}>
      {/* Título e Descrição */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#2D3436] md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[#95A5A6] md:text-base">
            {description}
          </p>
        )}
      </div>

      {/* Área de Ações (Busca + Botões) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        
        {/* Campo de Busca (Renderiza apenas se onSearchChange for passado) */}
        {onSearchChange && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#95A5A6]" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              className="pl-9 bg-[#F5F0E6]/30 border-[#95A5A6]/30 focus-visible:ring-[#2C3E50]"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {/* Botões Extras (Adicionar, Filtros, etc) */}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
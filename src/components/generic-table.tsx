"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Definição de uma Coluna
export interface Column<T> {
  header: string;
  // Função para renderizar o conteúdo da célula. 
  // Se não passar, tenta acessar item[accessorKey] (se existir)
  cell: (item: T) => React.ReactNode; 
  className?: string; // Para alinhar à direita, definir largura, etc.
}

interface GenericTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  emptyMessage?: string;
  // Ações extras (botão de adicionar, etc) que ficam ao lado do título
  headerActions?: React.ReactNode; 
}

export function GenericTable<T extends { id: string | number }>({
  title,
  data,
  columns,
  isLoading = false,
  searchTerm = "",
  onSearchChange,
  emptyMessage = "Nenhum registro encontrado.",
  headerActions,
}: GenericTableProps<T>) {
  return (
    <Card className="border-[#95A5A6]/20 shadow-sm bg-white">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl text-[#2D3436]">{title}</CardTitle>
            {headerActions}
          </div>
          
          {onSearchChange && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#95A5A6]" />
              <Input
                placeholder="Buscar..."
                className="pl-9 bg-[#F5F0E6]/30 border-[#95A5A6]/30 focus-visible:ring-[#2C3E50]"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-[#95A5A6]/20">
          <Table>
            <TableHeader className="bg-[#F5F0E6]/50">
              <TableRow>
                {columns.map((col, index) => (
                  <TableHead
                    key={index}
                    className={cn("text-[#2D3436] font-semibold", col.className)}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton Loading
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns.length} className="h-12">
                      <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                // Empty State
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8 text-[#95A5A6]"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                // Data Rows
                data.map((item) => (
                  <TableRow
                    key={item.id}
                    className="group hover:bg-[#F5F0E6]/30 transition-colors"
                  >
                    {columns.map((col, index) => (
                      <TableCell key={index} className={col.className}>
                        {col.cell(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
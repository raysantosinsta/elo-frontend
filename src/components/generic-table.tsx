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
import { Button } from "@/components/ui/button"; // <--- Importante
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from "lucide-react"; // <--- Ícones dos botões
import { cn } from "@/lib/utils";

// Definição de uma Coluna
export interface Column<T> {
  header: string;
  cell: (item: T) => React.ReactNode;
  className?: string;
}

// --- 🔥 NOVA INTERFACE PARA PAGINAÇÃO ---
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

interface GenericTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  emptyMessage?: string;
  headerActions?: React.ReactNode;
  pagination?: PaginationProps; // <--- Prop nova
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
  pagination, // <--- Recebendo a prop
}: GenericTableProps<T>) {
  
  // Renderiza texto "Mostrando 1-10 de 50"
  const renderPaginationInfo = () => {
    if (!pagination?.totalItems || !pagination?.itemsPerPage) return null;
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const end = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);
    return (
      <span className="text-sm text-[#95A5A6]">
        Mostrando <span className="font-medium text-[#2D3436]">{start}-{end}</span> de <span className="font-medium text-[#2D3436]">{pagination.totalItems}</span>
      </span>
    );
  };

  return (
    <Card className="border-[#95A5A6]/20 shadow-sm bg-white flex flex-col h-full">
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

      <CardContent className="flex-1 flex flex-col">
        <div className="rounded-md border border-[#95A5A6]/20 flex-1">
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
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns.length} className="h-12">
                      <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8 text-[#95A5A6]"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
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

        {/* --- 🔥 AQUI ESTÃO OS BOTÕES --- */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between py-4 border-t border-[#95A5A6]/20 mt-4">
            <div className="flex-1">
              {renderPaginationInfo()}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436]"
                onClick={() => pagination.onPageChange(1)}
                disabled={pagination.currentPage === 1 || isLoading}
                title="Primeira página"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436]"
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || isLoading}
                title="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm font-medium text-[#2D3436] min-w-[3rem] text-center">
                {pagination.currentPage} / {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436]"
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages || isLoading}
                title="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436]"
                onClick={() => pagination.onPageChange(pagination.totalPages)}
                disabled={pagination.currentPage === pagination.totalPages || isLoading}
                title="Última página"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// Definição de uma Coluna com suporte a ordenação
export interface Column<T> {
  header: string;
  cell: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortKey?: keyof T;
}

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
  pagination?: PaginationProps;
  onSort?: (key: keyof T, direction: "asc" | "desc") => void;
  sortConfig?: { key: keyof T; direction: "asc" | "desc" } | null;
  enableAnimations?: boolean;
}

// Componente interno da tabela (movido para fora)
function TableContent<T extends { id: string | number }>({
  columns,
  data,
  isLoading,
  emptyMessage,
  enableAnimations,
  sortConfig,
  onSort,
  isHoveredRow,
  setIsHoveredRow,
}: {
  columns: Column<T>[];
  data: T[];
  isLoading: boolean;
  emptyMessage: string;
  enableAnimations: boolean;
  sortConfig: { key: keyof T; direction: "asc" | "desc" } | null;
  onSort?: (key: keyof T, direction: "asc" | "desc") => void;
  isHoveredRow: string | number | null;
  setIsHoveredRow: (id: string | number | null) => void;
}) {
  const handleSort = (col: Column<T>) => {
    if (col.sortable && col.sortKey && onSort) {
      const newDirection =
        sortConfig?.key === col.sortKey && sortConfig.direction === "asc"
          ? "desc"
          : "asc";
      onSort(col.sortKey, newDirection);
    }
  };

  return (
    <div className="rounded-md border border-[#95A5A6]/20 flex-1 overflow-x-auto">
      <Table>
        <TableHeader className="bg-[#F5F0E6]/50 sticky top-0 z-10">
          <TableRow>
            {columns.map((col, index) => (
              <TableHead
                key={index}
                className={cn(
                  "text-[#2D3436] font-semibold",
                  col.sortable &&
                    "cursor-pointer hover:text-[#D35400] transition-colors",
                  col.className,
                )}
                onClick={() => handleSort(col)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable &&
                    col.sortKey &&
                    sortConfig?.key === col.sortKey && (
                      <motion.span
                        initial={{ rotate: 0 }}
                        animate={{
                          rotate: sortConfig.direction === "asc" ? 0 : 180,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {sortConfig.direction === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </motion.span>
                    )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={columns.length} className="h-12">
                  <div className="relative overflow-hidden">
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    {enableAnimations && (
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-8 text-[#95A5A6]"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {emptyMessage}
                </motion.div>
              </TableCell>
            </TableRow>
          ) : (
            <AnimatePresence mode="wait">
              {data.map((item, idx) => {
                const RowComponent = enableAnimations ? motion.tr : "tr";
                const rowProps = enableAnimations
                  ? {
                      initial: { opacity: 0, y: 10 },
                      animate: { opacity: 1, y: 0 },
                      exit: { opacity: 0, x: -20 },
                      transition: { duration: 0.2, delay: idx * 0.02 },
                      layout: true,
                    }
                  : {};

                return (
                  <RowComponent
                    key={item.id}
                    {...rowProps}
                    className={cn(
                      "group transition-all duration-200",
                      "hover:bg-[#F5F0E6]/30",
                      isHoveredRow === item.id && "bg-[#F5F0E6]/50",
                    )}
                    onMouseEnter={() => setIsHoveredRow(item.id)}
                    onMouseLeave={() => setIsHoveredRow(null)}
                  >
                    {columns.map((col, colIndex) => (
                      <TableCell key={colIndex} className={col.className}>
                        {col.cell(item)}
                      </TableCell>
                    ))}
                  </RowComponent>
                );
              })}
            </AnimatePresence>
          )}
        </TableBody>
      </Table>
    </div>
  );
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
  pagination,
  onSort,
  sortConfig = null,
  enableAnimations = true,
}: GenericTableProps<T>) {
  const [isHoveredRow, setIsHoveredRow] = useState<string | number | null>(
    null,
  );

  const renderPaginationInfo = () => {
    if (!pagination?.totalItems || !pagination?.itemsPerPage) return null;
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const end = Math.min(
      pagination.currentPage * pagination.itemsPerPage,
      pagination.totalItems,
    );
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-[#95A5A6]"
      >
        Mostrando{" "}
        <span className="font-medium text-[#2D3436]">
          {start}-{end}
        </span>{" "}
        de{" "}
        <span className="font-medium text-[#2D3436]">
          {pagination.totalItems}
        </span>
      </motion.span>
    );
  };

  return (
    <Card className="border-[#95A5A6]/20 shadow-sm bg-white flex flex-col h-full generic-table-container">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl text-[#2D3436]">{title}</CardTitle>
            {headerActions}
          </div>

          {onSearchChange && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative w-full max-w-sm"
            >
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#95A5A6]" />
              <Input
                placeholder="Buscar..."
                className="pl-9 bg-[#F5F0E6]/30 border-[#95A5A6]/30 focus-visible:ring-[#2C3E50] transition-all duration-200 focus:scale-[1.02]"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </motion.div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {enableAnimations ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={pagination?.currentPage || 1}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <TableContent
                columns={columns}
                data={data}
                isLoading={isLoading}
                emptyMessage={emptyMessage}
                enableAnimations={enableAnimations}
                sortConfig={sortConfig}
                onSort={onSort}
                isHoveredRow={isHoveredRow}
                setIsHoveredRow={setIsHoveredRow}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <TableContent
            columns={columns}
            data={data}
            isLoading={isLoading}
            emptyMessage={emptyMessage}
            enableAnimations={enableAnimations}
            sortConfig={sortConfig}
            onSort={onSort}
            isHoveredRow={isHoveredRow}
            setIsHoveredRow={setIsHoveredRow}
          />
        )}

        {pagination && pagination.totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between py-4 border-t border-[#95A5A6]/20 mt-4"
          >
            <div className="flex-1">{renderPaginationInfo()}</div>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436] transition-all duration-200 hover:scale-105 active:scale-95"
                      onClick={() => pagination.onPageChange(1)}
                      disabled={pagination.currentPage === 1 || isLoading}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Primeira página</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436] transition-all duration-200 hover:scale-105 active:scale-95"
                      onClick={() =>
                        pagination.onPageChange(pagination.currentPage - 1)
                      }
                      disabled={pagination.currentPage === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Página anterior</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <motion.span
                key={pagination.currentPage}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-sm font-medium text-[#2D3436] min-w-[3rem] text-center"
              >
                {pagination.currentPage} / {pagination.totalPages}
              </motion.span>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436] transition-all duration-200 hover:scale-105 active:scale-95"
                      onClick={() =>
                        pagination.onPageChange(pagination.currentPage + 1)
                      }
                      disabled={
                        pagination.currentPage === pagination.totalPages ||
                        isLoading
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Próxima página</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-[#95A5A6]/30 text-[#2D3436] transition-all duration-200 hover:scale-105 active:scale-95"
                      onClick={() =>
                        pagination.onPageChange(pagination.totalPages)
                      }
                      disabled={
                        pagination.currentPage === pagination.totalPages ||
                        isLoading
                      }
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Última página</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

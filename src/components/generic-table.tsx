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
  className?: string;
}

// Componente interno da tabela
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
    <div className="rounded-md border border-[#E2E8F0] flex-1 overflow-x-auto">
      <Table>
        <TableHeader className="bg-[#F8FAFC] sticky top-0 z-10">
          <TableRow className="border-b border-[#E2E8F0]">
            {columns.map((col, index) => (
              <TableHead
                key={index}
                className={cn(
                  "text-[#353A40] font-semibold",
                  col.sortable &&
                    "cursor-pointer hover:text-[#2F80ED] transition-colors",
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
                          <ChevronUp className="h-3 w-3 text-[#2F80ED]" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-[#2F80ED]" />
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
              <TableRow key={i} className="border-b border-[#E2E8F0]">
                <TableCell colSpan={columns.length} className="h-12">
                  <div className="relative overflow-hidden">
                    <div className="h-4 bg-[#E2E8F0] rounded w-full" />
                    {enableAnimations && (
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow className="border-b border-[#E2E8F0]">
              <TableCell
                colSpan={columns.length}
                className="text-center py-8 text-[#7A7E83]"
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
                      "group transition-all duration-200 border-b border-[#E2E8F0]",
                      "hover:bg-[#F5F6FA]",
                      isHoveredRow === item.id && "bg-[#F5F6FA]",
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
  className,
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
  className="text-sm text-[#7A7E83] ml-2 md:ml-4"
>
  Mostrando{" "}
  <span className="font-medium text-[#353A40]">
    {start}-{end}
  </span>{" "}
  de{" "}
  <span className="font-medium text-[#353A40]">
    {pagination.totalItems}
  </span>
</motion.span>
    );
  };

  return (
    <Card className={cn(
  "border-x-0 border-t border-b border-[#E2E8F0] shadow-none bg-white flex flex-col h-full", // Remove bordas laterais e sombra
  className
)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl font-extrabold text-[#353A40]">
              {title}
            </CardTitle>
            {headerActions}
          </div>

          {onSearchChange && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative w-full max-w-sm"
            >
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#7A7E83]" />
              <Input
                placeholder="Buscar..."
                className="pl-9 bg-white border-[#CBD5E1] focus:ring-[#2F80ED] focus:border-[#2F80ED] transition-all duration-200 focus:scale-[1.02]"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </motion.div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 m-0">
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
            className="flex items-center justify-between py-4 border-t border-[#E2E8F0] mt-4"
          >
            <div className="flex-1">{renderPaginationInfo()}</div>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-[#CBD5E1] text-[#353A40] transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-[#F5F6FA]"
                      onClick={() => pagination.onPageChange(1)}
                      disabled={pagination.currentPage === 1 || isLoading}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#353A40] text-white">
                    Primeira página
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-[#CBD5E1] text-[#353A40] transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-[#F5F6FA]"
                      onClick={() =>
                        pagination.onPageChange(pagination.currentPage - 1)
                      }
                      disabled={pagination.currentPage === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#353A40] text-white">
                    Página anterior
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <motion.span
                key={pagination.currentPage}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-sm font-medium text-[#353A40] min-w-[3rem] text-center"
              >
                {pagination.currentPage} / {pagination.totalPages}
              </motion.span>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-[#CBD5E1] text-[#353A40] transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-[#F5F6FA]"
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
                  <TooltipContent className="bg-[#353A40] text-white">
                    Próxima página
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-[#CBD5E1] text-[#353A40] transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-[#F5F6FA]"
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
                  <TooltipContent className="bg-[#353A40] text-white">
                    Última página
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

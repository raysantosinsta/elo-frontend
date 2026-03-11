"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  description?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = "Excluir permanentemente?",
  description = "Esta ação não pode ser desfeita. O item será removido do banco de dados e não poderá ser recuperado.",
}) => {
  const handleOpenChange = (open: boolean) => {
    if (loading) return;
    if (!open) onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[400px] gap-6 border border-red-200 bg-white p-6 shadow-2xl sm:rounded-xl">
        <AlertDialogHeader className="flex flex-col items-center gap-4 text-center sm:text-center">
          {/* Ícone de Alerta com contraste melhorado */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle
              className="h-7 w-7 text-red-600"
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>

          <div className="space-y-2">
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-gray-600">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:justify-center sm:gap-3">
          {/* Botão Cancelar: Estilo secundário com contraste melhorado */}
          <AlertDialogCancel
            disabled={loading}
            className="mt-2 w-full border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:text-gray-900 sm:mt-0 sm:w-auto transition-colors duration-200"
          >
            Cancelar
          </AlertDialogCancel>

          {/* Botão Confirmar: Estilo Destrutivo com contraste melhorado */}
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={`
              w-full 
              bg-red-600 
              text-white 
              font-medium 
              shadow-md 
              hover:bg-red-700 
              hover:shadow-lg 
              active:bg-red-800
              disabled:opacity-50 
              disabled:cursor-not-allowed
              transition-all 
              duration-200 
              sm:w-auto
              ${buttonVariants({ variant: "destructive" })}
            `}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Sim, excluir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

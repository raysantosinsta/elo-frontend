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
import { AlertTriangle, Loader2 } from "lucide-react"; // Ícones para contexto visual

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
  
  // UX: Impede fechamento acidental enquanto a operação (delete) está ocorrendo
  const handleOpenChange = (open: boolean) => {
    if (loading) return;
    if (!open) onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* UI: Modal Branco sobre fundo Algodão Cru (da página pai) gera contraste.
         Borda sutil em Areia Escuro.
      */}
      <AlertDialogContent className="max-w-[400px] gap-6 border-[#95A5A6]/20 bg-white p-6 shadow-xl sm:rounded-xl">
        
        <AlertDialogHeader className="flex flex-col items-center gap-3 text-center sm:text-center">
          {/* Ícone de Alerta: Reforça a natureza destrutiva da ação */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <AlertDialogTitle className="text-xl font-bold text-[#2D3436]">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-[#95A5A6]">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:justify-center sm:gap-3">
          {/* Botão Cancelar: Estilo secundário (Grafite/Areia) */}
          <AlertDialogCancel
            disabled={loading}
            className="mt-2 w-full border-[#95A5A6]/30 text-[#2D3436] hover:bg-[#F5F0E6] hover:text-[#2D3436] sm:mt-0 sm:w-auto"
          >
            Cancelar
          </AlertDialogCancel>

          {/* Botão Confirmar: Estilo Destrutivo (Vermelho padrão para perigo) */}
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault(); // Impede fechamento automático, controlado pelo loading
              onConfirm();
            }}
            className={`${buttonVariants({ variant: "destructive" })} w-full bg-red-600 shadow-sm transition-all hover:bg-red-700 sm:w-auto`}
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
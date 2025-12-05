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
import { buttonVariants } from "@/components/ui/button"; // Para estilos de botão

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
  loading,
  title = "Tem certeza que deseja excluir?",
  description = "Essa ação não pode ser desfeita. Isso excluirá permanentemente o item de nossos servidores.",
}) => {
  // Impede o fechamento se estiver carregando (opcional, mas recomendado)
  const handleOpenChange = (open: boolean) => {
    if (!open && loading) return; 
    if (!open) onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          {/* Botão de confirmação com estilo destrutivo (vermelho) */}
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault(); // Impede o fechamento automático para controlarmos via loading
              onConfirm();
            }}
            className={`${buttonVariants({ variant: "destructive" })} bg-red-600 hover:bg-red-700`}
          >
            {loading ? "Excluindo..." : "Continuar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
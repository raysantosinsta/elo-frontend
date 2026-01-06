'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react'; // Ícone opcional

interface GlobalErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  errors?: string[]; // Lista de erros específicos
}

export function GlobalErrorDialog({
  isOpen,
  onClose,
  title,
  message,
  errors,
}: GlobalErrorDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border-l-4 border-l-red-500">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-base font-medium text-foreground">
            {message}
          </DialogDescription>
        </DialogHeader>

        {/* Renderização condicional para múltiplos erros */}
        {errors && errors.length > 0 && (
          <div className="bg-red-50 p-3 rounded-md text-sm text-red-800 mt-2 max-h-[200px] overflow-y-auto">
            <p className="font-semibold mb-1">Detalhes:</p>
            <ul className="list-disc pl-4 space-y-1">
              {errors.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="destructive" onClick={onClose}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
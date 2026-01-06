"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"; // Ajuste imports do shadcn conforme seu projeto
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { registerGlobalErrorListener } from "@/services/api";

interface ErrorContextType {
  showError: (title: string, message: string, errors?: string[]) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [errorState, setErrorState] = useState<{
    title: string;
    message: string;
    errors?: string[];
  }>({ title: "", message: "", errors: [] });

  // Função que abre o dialog
  const showError = (title: string, message: string, errors?: string[]) => {
    setErrorState({ title, message, errors });
    setOpen(true);
  };

  // --- O PULO DO GATO ---
  // Registramos esta função no Axios assim que o Provider monta no navegador
  useEffect(() => {
    registerGlobalErrorListener((title, message, errors) => {
      showError(title, message, errors);
    });
  }, []);

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      
      {/* Componente Dialog do Shadcn renderizado globalmente */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] border-l-4 border-destructive">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle>{errorState.title}</DialogTitle>
            </div>
            <DialogDescription className="pt-3 text-base text-foreground">
              {errorState.message}
            </DialogDescription>
          </DialogHeader>

          {/* Renderiza lista de múltiplos erros se houver */}
          {errorState.errors && errorState.errors.length > 0 && (
            <div className="mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <ul className="list-disc pl-4 space-y-1">
                {errorState.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorContext.Provider>
  );
}

// Hook opcional se quiser disparar erro manualmente de algum componente
export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) throw new Error("useError must be used within ErrorProvider");
  return context;
};
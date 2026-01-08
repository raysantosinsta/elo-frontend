"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
// Importe o componente separado que você criou
import { GlobalErrorDialog } from "@/components/global-error-dialog"; 
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

  // 🔥 CORREÇÃO AQUI: Adicionado useCallback
  const showError = useCallback((title: string, message: string, errors?: string[]) => {
    setErrorState({ title, message, errors });
    setOpen(true);
  }, []); // Dependências vazias, pois setErrorState e setOpen são estáveis do React

  useEffect(() => {
    // Conecta o React ao Axios
    registerGlobalErrorListener((title, message, errors) => {
      showError(title, message, errors);
    });
  }, [showError]); // Agora é seguro colocar showError aqui

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      
      <GlobalErrorDialog 
        isOpen={open}
        onClose={() => setOpen(false)}
        title={errorState.title}
        message={errorState.message}
        errors={errorState.errors}
      />
    </ErrorContext.Provider>
  );
}

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) throw new Error("useError must be used within ErrorProvider");
  return context;
};
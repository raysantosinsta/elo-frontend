"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
// Importamos o seu Dialog original
import { GlobalErrorDialog } from "@/components/global-error-dialog"; 
import { registerGlobalErrorListener } from "@/services/api";

interface ErrorContextType {
  showError: (title: string, message: string, errors?: string[]) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  // Controle de estado local do Dialog
  const [isOpen, setIsOpen] = useState(false);
  
  const [errorState, setErrorState] = useState<{
    title: string;
    message: string;
    errors?: string[];
  }>({ title: "", message: "", errors: [] });

  // Função que atualiza o estado e abre o modal
  const showError = useCallback((title: string, message: string, errors?: string[]) => {
    setErrorState({ title, message, errors });
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    // Registra esta função no interceptor do Axios (api.ts)
    // Quando a API der erro, ela chamará esta função automaticamente
    registerGlobalErrorListener((title, message, errors) => {
      showError(title, message, errors);
    });
  }, [showError]);

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      
      {/* O Dialog é renderizado aqui, controlado pelo estado local */}
      <GlobalErrorDialog 
        isOpen={isOpen}
        onClose={handleClose}
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
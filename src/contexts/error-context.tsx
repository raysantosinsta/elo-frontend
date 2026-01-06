"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

  const showError = (title: string, message: string, errors?: string[]) => {
    setErrorState({ title, message, errors });
    setOpen(true);
  };

  useEffect(() => {
    // Conecta o React ao Axios
    registerGlobalErrorListener((title, message, errors) => {
      showError(title, message, errors);
    });
  }, []);

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      
      {/* Aqui usamos o seu componente separado, passando os estados do Contexto */}
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
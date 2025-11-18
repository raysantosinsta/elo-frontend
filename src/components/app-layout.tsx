"use client";

import { Sidebar } from "./sidebar";
import { useAuth } from "@/contexts/AuthContext";

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { isAuthenticated, isLoading } = useAuth();

    // Mostrar loading enquanto verifica autenticação
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    // Se não está autenticado, mostra apenas o conteúdo sem sidebar
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background">
                {children}
            </div>
        );
    }

    // Se está autenticado, mostra layout completo com sidebar
    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar - só aparece quando autenticado */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
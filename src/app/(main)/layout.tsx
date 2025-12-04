"use client";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header"; // <--- Importando o Header
import { useAuth } from "@/contexts/AuthContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Estado para controlar abertura do menu mobile (opcional, para uso futuro)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redireciona se não estiver logado (Proteção de Rota)
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <WebSocketProvider>
      <div className="flex h-screen w-full bg-background">
        
        {/* 1. Sidebar (Esquerda) */}
        {/* No mobile, geralmente escondemos e mostramos via estado. 
            Aqui mantemos o padrão md:block para desktop. */}
        <div className="hidden md:block h-full border-r">
           <Sidebar />
        </div>

        {/* 2. Área de Conteúdo (Direita) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          
          {/* Header (Fixo no topo da área de conteúdo) */}
          <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

          {/* Conteúdo Principal (Scrollável) */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/10">
            <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
              {children}
            </div>
          </main>
        </div>

      </div>
      
      {/* DICA PRO: Se você quiser um Drawer/Sheet para o menu mobile, 
         você colocaria o componente Sheet do shadcn aqui, controlado pelo isMobileMenuOpen 
      */}

    </WebSocketProvider>
  );
}
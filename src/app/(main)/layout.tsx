"use client";

import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { socketService } from "@/hooks/socket";
// REMOVA ESTA LINHA: import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // NOVO: Conecta o socket globalmente assim que o usuário existir
  useEffect(() => {
    if (user) {
      socketService.connect();
      socketService.joinUserRoom(user.id);
      if (user.companyId) {
        socketService.joinCompanyRoom(user.companyId);
      }
    }
    
    // Cleanup opcional: desconectar ao fazer logout/sair do layout principal
    // return () => socketService.disconnect(); 
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  // REMOVA A TAG <WebSocketProvider>
  return (
    <div className="flex h-screen w-full bg-background">
      <div className="hidden md:block h-full border-r">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden ml-[-1px]">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/10">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
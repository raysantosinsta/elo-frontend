// app/(main)/layout.tsx
"use client";

import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redireciona se não estiver logado (Proteção de Rota)
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login"); // Ou sua rota de login
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null; // Evita flash de conteúdo antes do redirect

  return (
    <WebSocketProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </WebSocketProvider>
  );
}
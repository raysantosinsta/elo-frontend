"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Components
import { ChatList } from "@/components/chat/chat-list";

// Hooks
import { useAuth } from "@/contexts/AuthContext";

export default function ChatsPage() {
  // --- STATE MANAGEMENT ---
  // Substituímos toda a lógica manual de jwtDecode pelo hook useAuth.
  // Isso garante consistência: se o AuthContext diz que está logado, está logado.
  const { user, loading } = useAuth();
  const router = useRouter();

  // --- PROTECTED ROUTE CHECK ---
  useEffect(() => {
    // Se terminou de carregar e não tem usuário, manda pro login
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // --- RENDER: LOADING STATE ---
  if (loading) {
    return (
      <div 
        className="flex h-screen w-full items-center justify-center bg-[#F5F0E6]"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#D35400]" />
          <p className="animate-pulse text-sm font-medium text-[#95A5A6]">
            Carregando ambiente...
          </p>
        </div>
      </div>
    );
  }

  // Se não estiver carregando e não tiver usuário, retorna null enquanto redireciona
  if (!user) return null;

  // --- RENDER: MAIN CONTENT ---
  return (
    <main className="min-h-screen w-full bg-[#F5F0E6] text-[#2D3436]">
      {/* Container Centralizado */}
      <div className="mx-auto flex h-screen max-w-4xl flex-col p-4 md:p-6 lg:p-8">
        
        <section 
          className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#95A5A6]/20 bg-white shadow-sm"
          aria-label="Gerenciamento de Chats"
        >
          <div className="flex-1 overflow-y-auto">
             {/* 🔥 AQUI ESTÁ A INTEGRAÇÃO:
                1. Passamos os dados direto do objeto `user` do contexto.
                2. O componente ChatList fará chamadas API (ex: api.get('/chats')).
                3. Se essas chamadas falharem, o Axios Interceptor disparará o GlobalErrorDialog automaticamente.
             */}
             <ChatList 
               currentUserId={user.id} 
               companyId={user.company?.id || ""} // Ajuste conforme sua interface de User
               userRole={user.role} // O AuthContext deve fornecer isso
             />
          </div>
        </section>

      </div>
    </main>
  );
}
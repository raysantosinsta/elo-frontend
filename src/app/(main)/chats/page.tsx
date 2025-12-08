"use client";

import { ChatList } from "@/components/chat/chat-list";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Loader2 } from "lucide-react";

// --- TYPE DEFINITIONS ---
interface JwtPayload {
  sub: string;
  email: string;
  role: string; // 🔥 CRUCIAL: Agora capturamos o cargo
  companyId: string;
  iat: number;
  exp: number;
}

export default function ChatsPage() {
  // --- STATE MANAGEMENT ---
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [userRole, setUserRole] = useState<string>(""); // Estado para o cargo
  const [loading, setLoading] = useState(true);

  // --- LOGIC / EFFECTS ---
  useEffect(() => {
    const getTokenData = () => {
      try {
        if (process.env.NODE_ENV === 'development') {
           console.log("🔍 Iniciando validação de sessão...");
        }

        const token = localStorage.getItem("accessToken");
        
        if (token) {
          const decoded = jwtDecode<JwtPayload>(token);
          
          if (process.env.NODE_ENV === 'development') {
            console.log("✅ Sessão válida. User:", decoded.sub, "Role:", decoded.role);
          }

          setCurrentUserId(decoded.sub);
          setCompanyId(decoded.companyId);
          setUserRole(decoded.role || ""); // Garante que não seja undefined
        } else {
          console.warn("⚠️ Token não encontrado. Redirecionando para login...");
          // Aqui você poderia adicionar um router.push('/login')
        }
      } catch (error) {
        console.error("❌ Erro crítico na sessão:", error);
      } finally {
        setLoading(false);
      }
    };

    getTokenData();
  }, []);

  // --- RENDER: LOADING STATE (UX: Feedback Imediato) ---
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

  // --- RENDER: MAIN CONTENT ---
  return (
    <main className="min-h-screen w-full bg-[#F5F0E6] text-[#2D3436]">
      {/* Container Centralizado
         Mobile-First: Padding pequeno (p-4).
         Desktop: Padding maior e largura controlada (max-w-4xl) para leitura confortável.
      */}
      <div className="mx-auto flex h-screen max-w-4xl flex-col p-4 md:p-6 lg:p-8">
        
        <section 
          className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#95A5A6]/20 bg-white shadow-sm"
          aria-label="Gerenciamento de Chats"
        >
          <div className="flex-1 overflow-y-auto">
             {/* 🔥 AQUI ESTÁ A MÁGICA:
                Passamos o userRole para a ChatList. 
                Se for ADM/MASTER, o botão de lixeira aparecerá.
             */}
             <ChatList 
               currentUserId={currentUserId} 
               companyId={companyId} 
               userRole={userRole}
             />
          </div>
        </section>

      </div>
    </main>
  );
}
"use client";

import { ChatList } from "@/components/chat/chat-list";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

// Interface para tipar o payload do JWT
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string;
  iat: number;
  exp: number;
}

export default function ChatsPage() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getTokenData = () => {
      try {
        console.log("🔍 Iniciando busca do token no localStorage...");
        
        const token = localStorage.getItem('accessToken');
        console.log("📄 Token encontrado:", token ? "Sim" : "Não");
        
        if (token) {
          console.log("✅ Token recuperado com sucesso!");
          console.log("🔓 Decodificando token...");
          
          const decoded = jwtDecode<JwtPayload>(token);
          console.log("🎯 Payload decodificado:", decoded);
          
          console.log("👤 User ID (sub):", decoded.sub);
          console.log("🏢 Company ID:", decoded.companyId);
          
          setCurrentUserId(decoded.sub);
          setCompanyId(decoded.companyId);
          
          console.log("✅ Estados atualizados com sucesso!");
          console.log("📊 Resumo:");
          console.log("   - User ID:", decoded.sub);
          console.log("   - Company ID:", decoded.companyId);
        } else {
          console.warn("⚠️ Nenhum token 'accessToken' encontrado no localStorage");
          console.log("📋 Chaves disponíveis no localStorage:", Object.keys(localStorage));
        }
      } catch (error) {
        console.error('❌ Erro ao decodificar token:', error);
      } finally {
        setLoading(false);
        console.log("🏁 Processo de carregamento finalizado");
      }
    };

    getTokenData();
  }, []);

  // Log quando os estados são atualizados
  useEffect(() => {
    if (!loading) {
      console.log("🔄 Estados atualizados:");
      console.log("   - currentUserId:", currentUserId);
      console.log("   - companyId:", companyId);
      console.log("   - loading:", loading);
    }
  }, [currentUserId, companyId, loading]);

  if (loading) {
    console.log("⏳ Componente em estado de loading...");
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          Carregando...
        </div>
      </div>
    );
  }

  console.log("🎉 Renderizando componente com dados:", { currentUserId, companyId });

  return (
    <div className="container mx-auto p-6">
      <div className="flex gap-6">
        <ChatList 
          currentUserId={currentUserId} 
          companyId={companyId} 
        />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Selecione um chat para começar a conversar
        </div>
      </div>
    </div>
  );
}
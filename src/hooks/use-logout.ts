"use client";

import { useAuth } from "@/contexts/AuthContext";
import { socketService } from "@/hooks/socket";
import { useCallback } from "react";
import { toast } from "sonner";

export function useLogout() {
  const { logout: contextLogout } = useAuth();

  const handleLogout = useCallback(() => {
    try {
      // 1. Desconectar o Socket explicitamente
      // Isso evita que o usuário fique "preso" online no servidor
      if (socketService.isConnected()) {
        console.log("🔌 Desconectando socket ao sair...");
        socketService.disconnect();
      }

      // 2. Executar o logout do contexto (Limpa tokens, cookies e redireciona)
      contextLogout();
      
      toast.success("Você saiu do sistema.");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      // Força o logout mesmo com erro no socket
      contextLogout();
    }
  }, [contextLogout]);

  return handleLogout;
}
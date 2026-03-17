/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/use-product-ref-permission.ts
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export function useProductRefPermission() {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return { canManageRef: false, canViewRef: false };

    const systemRole = (user as any).role || "";
    const professionalRole = user.professionalRole?.toLowerCase() || "";

    // Admin e Master sempre podem
    if (["MASTER", "ADMIN"].includes(systemRole)) {
      return { canManageRef: true, canViewRef: true };
    }

    // EMPLOYER só pode se tiver cargo de modelagem
    if (systemRole === "EMPLOYER") {
      const MODELAGEM_KEYWORDS = ["modelagem", "modelista", "modelo"];
      const isModelagem = MODELAGEM_KEYWORDS.some((keyword) =>
        professionalRole.includes(keyword),
      );

      return {
        canManageRef: isModelagem,
        canViewRef: true,
      };
    }

    // Outros perfis (ex: CLIENT) não podem ver/editar
    return { canManageRef: false, canViewRef: false };
  }, [user]);
}

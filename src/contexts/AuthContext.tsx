// contexts/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { User } from "@/types/chat";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const { data } = await api.get<User>("/auth/profile");
      
      // 🔥 Garantir que professionalRole seja string | null
      const normalizedUser: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone || data.contact,
        professionalRole: data.professionalRole ?? null,
        professionalRoleId: data.professionalRoleId ?? null,
        companyId: data.companyId,
        role: data.role,
        company: data.company,
        status: data.status,
        contact: data.contact,
        document: data.document,
      };
      
      console.log('🔍 [refreshUser] Perfil recarregado:', {
        id: normalizedUser.id,
        name: normalizedUser.name,
        professionalRole: normalizedUser.professionalRole,
        type: typeof normalizedUser.professionalRole
      });
      
      setUser(normalizedUser);
    } catch (error) {
      console.error('Erro ao recarregar perfil:', error);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });

      console.log('🔍 Dados do login:', {
        user: data.user,
        professionalRole: data.user?.professionalRole,
      });

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      const isProduction = process.env.NODE_ENV === 'production';
      document.cookie = `access_token=${data.accessToken}; path=/; max-age=86400; SameSite=None; ${isProduction ? 'Secure' : ''}`;
      
      // 🔥 Normalizar usuário
      const normalizedUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone || data.user.contact,
        professionalRole: data.user.professionalRole ?? null,
        professionalRoleId: data.user.professionalRoleId ?? null,
        companyId: data.user.companyId,
        role: data.user.role,
        company: data.user.company,
        status: data.user.status,
        contact: data.user.contact,
        document: data.user.document,
      };
      
      setUser(normalizedUser);
      router.push("/dashboard-user");
    } catch (error) {
      throw error;
    }
  }, [router]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get<User>("/auth/profile");
        
        // 🔥 Normalizar usuário
        const normalizedUser: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone || data.contact,
          professionalRole: data.professionalRole ?? null,
          professionalRoleId: data.professionalRoleId ?? null,
          companyId: data.companyId,
          role: data.role,
          company: data.company,
          status: data.status,
          contact: data.contact,
          document: data.document,
        };
        
        console.log('🔍 Profile carregado:', {
          user: normalizedUser,
          professionalRole: normalizedUser?.professionalRole,
        });
        
        setUser(normalizedUser);
      } catch (error) {
        console.error('Erro ao carregar profile:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [logout]);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        login, 
        logout, 
        loading,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve estar dentro de AuthProvider");
  return context;
};
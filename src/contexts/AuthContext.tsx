// contexts/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api"; // Importa do arquivo novo
import { User } from "@/types/chat"; // Unifique seus tipos

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
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

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      // Para isto (Adicionando Secure):
      const isProduction = process.env.NODE_ENV === 'production';
      const secureAttribute = isProduction ? '; Secure' : '';
      // SameSite=Lax costuma funcionar bem para navegação, mas se falhar, use SameSite=None
      document.cookie = `access_token=${data.accessToken}; path=/; max-age=86400; SameSite=Lax${secureAttribute}`;

      setUser(data.user);
      router.push("/");
    } catch (error) {
      throw error; // Deixe o componente de UI lidar com o erro visual
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
        setUser(data);
      } catch {
        // Se falhar o profile (token inválido), o interceptor do axios 
        // ou a lógica de erro já vai redirecionar ou limpar.
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve estar dentro de AuthProvider");
  return context;
};
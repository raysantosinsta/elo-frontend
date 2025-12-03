/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useEffect, useState, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosInstance, AxiosError } from "axios";

// --- Interfaces ---
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  companyId: string | null;
  document?: string | null;
  phone: string;
  company?: { id: string; name: string; status: string } | null;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  token: string | null;
  // Mantemos authFetch para compatibilidade com seus componentes existentes
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  // Expomos a instância do axios para novos desenvolvimentos
  api: AxiosInstance;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

// --- Configuração da Instância do Axios ---
export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Função auxiliar para limpar dados
  const clearAuthData = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // Remove o header de autorização padrão
    delete api.defaults.headers.common["Authorization"];
  };

  const logout = () => {
    clearAuthData();
    router.push("/login");
  };

  // --- Configuração dos Interceptors do Axios ---
  // Isso substitui toda aquela lógica manual de refresh token que existia no authFetch antigo
  useLayoutEffect(() => {
    // 1. Interceptor de Requisição: Injeta o token automaticamente
    const reqInterceptor = api.interceptors.request.use(
      (config) => {
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 2. Interceptor de Resposta: Trata erro 401 e faz Refresh Token
    const resInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Se der erro 401 (Não autorizado) e ainda não tentamos reenviar
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) {
              throw new Error("Sem refresh token");
            }

            // Tenta obter novo token
            const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });

            // Salva novos tokens
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken); // Opcional se o back renovar o refresh também
            
            // Atualiza o header da requisição original e refaz a chamada
            api.defaults.headers.common["Authorization"] = `Bearer ${data.accessToken}`;
            originalRequest.headers["Authorization"] = `Bearer ${data.accessToken}`;
            
            return api(originalRequest);
          } catch (refreshError) {
            // Se o refresh falhar, desloga o usuário
            logout();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup dos interceptors
    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // --- Função de Login com Axios ---
  const login = async (email: string, password: string) => {
    try {
      // Chamada direta usando a instância do axios
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { accessToken, refreshToken, user } = response.data;

      // Salva dados
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

      setToken(accessToken);
      setUser(user);
      router.push("/Kanban");
    } catch (error: any) {
      // Tratamento de erro do Axios
      const message = error.response?.data?.message || "Erro ao realizar login";
      console.error("Erro no login:", message);
      throw new Error(message);
    }
  };

  // --- Compatibilidade com código antigo (authFetch) ---
  // Esta função simula o comportamento do fetch antigo usando nossa instância axios
  // para que você não precise refatorar todas as páginas agora.
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
      const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
      
      const config = {
        method: options.method || "GET",
        headers: options.headers as any,
        data: options.body ? JSON.parse(options.body as string) : undefined,
      };

      const response = await api(fullUrl, config);

      // Retorna um objeto que imita a resposta do fetch nativo
      return {
        ok: true,
        status: response.status,
        statusText: response.statusText,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data),
        headers: new Headers(response.headers as any),
      } as unknown as Response;

    } catch (error: any) {
      // Se o axios der erro, retornamos uma estrutura similar ao fetch com ok: false
      if (error.response) {
        return {
          ok: false,
          status: error.response.status,
          statusText: error.response.statusText,
          json: async () => error.response.data,
          text: async () => JSON.stringify(error.response.data),
        } as unknown as Response;
      }
      throw error;
    }
  };

  // Inicialização (Load Profile)
  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem("accessToken");
      if (!savedToken) {
        setLoading(false);
        return;
      }

      setToken(savedToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;

      try {
        const { data } = await api.get("/auth/profile");
        setUser(data);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
        token,
        authFetch, // Mantido para compatibilidade
        api,       // Nova forma recomendada de fazer requisições
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

// Hook auxiliar para pegar o authFetch (compatibilidade)
export const useAuthFetch = () => useAuth().authFetch;
// Hook auxiliar para pegar a instância do axios (recomendado para novos códigos)
export const useApi = () => useAuth().api;
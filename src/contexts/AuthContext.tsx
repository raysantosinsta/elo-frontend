/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

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

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string;
  exp: number;
  iat: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: any) => Promise<void>;
  adminSignup: (userData: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
  token: string | null;
  refreshAuthToken: () => Promise<boolean>;
  isTokenValid: (token: string) => boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  };

  const scheduleRefreshTimer = (accessToken: string) => {
    clearRefreshTimer();
    try {
      const payload: JwtPayload = JSON.parse(atob(accessToken.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;
      if (expiresIn <= 0) return;

      const refreshIn = Math.max(expiresIn - 300, 60) * 1000;
      refreshTimerRef.current = setTimeout(async () => {
        const success = await refreshAuthToken();
        if (!success) logout();
      }, refreshIn);
    } catch (e) {
      console.error("Erro ao agendar refresh:", e);
    }
  };

  const isTokenValid = (token: string): boolean => {
    if (!token) return false;
    try {
      const payload: JwtPayload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  };

  const clearAuthData = () => {
    clearRefreshTimer();
    setToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  const setAuthToken = (newToken: string, refreshToken?: string): boolean => {
    if (!isTokenValid(newToken)) {
      clearAuthData();
      return false;
    }

    setToken(newToken);
    localStorage.setItem("accessToken", newToken);
    // 7 dias de cookie (mesmo tempo do refresh)
    document.cookie = `access_token=${newToken}; path=/; max-age=604800; SameSite=Lax; Secure`;

    if (refreshToken && isTokenValid(refreshToken)) {
      localStorage.setItem("refreshToken", refreshToken);
      document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax; Secure`;
    }

    scheduleRefreshTimer(newToken);
    return true;
  };

  const refreshAuthToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken || !isTokenValid(refreshToken)) {
      clearAuthData();
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Refresh falhou:", res.status, errorText);
        throw new Error(`Refresh failed: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log("✅ Refresh bem-sucedido, novo token obtido");
      return setAuthToken(data.accessToken, data.refreshToken);
    } catch (err: any) {
      console.error("❌ Refresh falhou com erro:", err);
      clearAuthData();
      return false;
    }
  };

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    console.log(`🔗 [AUTH FETCH] Iniciando requisição para: ${url}`);
    
    let accessToken = localStorage.getItem("accessToken");
    console.log(`🔑 [AUTH FETCH] Token atual: ${accessToken ? "Presente" : "Ausente"}`);
    
    if (!accessToken || !isTokenValid(accessToken)) {
      console.log("🔄 [AUTH FETCH] Token inválido ou ausente, tentando refresh...");
      const ok = await refreshAuthToken();
      if (!ok) {
        console.log("❌ [AUTH FETCH] Refresh falhou, sessão expirada");
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      accessToken = localStorage.getItem("accessToken");
      console.log(`✅ [AUTH FETCH] Novo token obtido: ${accessToken ? "Sim" : "Não"}`);
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    console.log(`📤 [AUTH FETCH] Enviando requisição com headers:`, {
      Authorization: `Bearer ${accessToken ? `${accessToken.substring(0, 20)}...` : 'null'}`,
    });

    let response: Response;
    
    try {
      response = await fetch(url, { ...options, headers });
      console.log(`📥 [AUTH FETCH] Resposta recebida:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
      });
    } catch (networkError: any) {
      console.error("🌐 [AUTH FETCH] Erro de rede:", networkError);
      throw new Error(`Erro de conexão: ${networkError.message}`);
    }

    // Se for 401, tenta refresh uma vez
    if (response.status === 401) {
      console.log("🔒 [AUTH FETCH] Status 401 (Não autorizado), tentando refresh...");
      const ok = await refreshAuthToken();
      if (!ok) {
        console.log("❌ [AUTH FETCH] Refresh falhou após 401, fazendo logout");
        logout();
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      
      // Tenta novamente com novo token
      const newAccessToken = localStorage.getItem("accessToken");
      const newHeaders = {
        ...headers,
        Authorization: `Bearer ${newAccessToken}`,
      };
      
      console.log("🔄 [AUTH FETCH] Tentando requisição novamente com novo token...");
      response = await fetch(url, {
        ...options,
        headers: newHeaders,
      });
      
      console.log(`📥 [AUTH FETCH] Segunda resposta:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });
    }

    // Se ainda não está ok após refresh, lança erro
    if (!response.ok) {
      console.error(`❌ [AUTH FETCH] Requisição falhou com status ${response.status}`);
      
      // Tenta obter a mensagem de erro do backend
      let errorMessage = `Erro ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error("📄 [AUTH FETCH] Detalhes do erro:", errorData);
      } catch {
        // Se não conseguir parsear como JSON, tenta texto
        try {
          const errorText = await response.text();
          errorMessage = `Erro ${response.status}: ${errorText}`;
        } catch {
          // Ignora erro ao tentar ler texto
        }
      }
      
      throw new Error(errorMessage);
    }

    console.log(`✅ [AUTH FETCH] Requisição bem-sucedida para ${url}`);
    return response;
  };

  const login = async (email: string, password: string) => {
    console.log(`🔐 [LOGIN] Tentando login para: ${email}`);
    
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    console.log(`📥 [LOGIN] Resposta recebida:`, {
      status: response.status,
      ok: response.ok,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ [LOGIN] Falha no login:`, data);
      throw new Error(data.message || "Erro no login");
    }

    console.log(`✅ [LOGIN] Login bem-sucedido para: ${data.user.email}`);
    console.log(`🎫 [LOGIN] Token recebido: ${data.accessToken ? "Sim" : "Não"}`);
    
    setAuthToken(data.accessToken, data.refreshToken);
    setUser(data.user);
    router.push("/Kanban");
  };

  const logout = () => {
    console.log("🚪 [LOGOUT] Fazendo logout");
    clearAuthData();
    router.push("/login");
  };

  // INICIALIZAÇÃO PERFEITA
  useEffect(() => {
    const init = async () => {
      console.log("🔄 [AUTH] Inicializando contexto de autenticação...");
      
      const savedToken = localStorage.getItem("accessToken");
      console.log(`🔑 [AUTH] Token salvo encontrado: ${savedToken ? "Sim" : "Não"}`);

      if (!savedToken || !isTokenValid(savedToken)) {
        console.log("❌ [AUTH] Token inválido ou expirado, limpando dados");
        clearAuthData();
        setLoading(false);
        return;
      }

      console.log("✅ [AUTH] Token válido, configurando...");
      setToken(savedToken);
      scheduleRefreshTimer(savedToken);

      try {
        console.log("👤 [AUTH] Buscando perfil do usuário...");
        const res = await fetch(`${API_BASE}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
            "Content-Type": "application/json",
          },
        });

        console.log(`📥 [AUTH] Resposta do perfil:`, {
          status: res.status,
          ok: res.ok,
        });

        if (res.ok) {
          const userData = await res.json();
          console.log(`✅ [AUTH] Perfil carregado: ${userData.name} (${userData.email})`);
          setUser(userData);
        } else {
          console.error(`❌ [AUTH] Erro ao carregar perfil: ${res.status}`);
          // Se não conseguir carregar perfil, limpa os dados
          clearAuthData();
        }
      } catch (err) {
        console.warn("⚠️ [AUTH] Erro de rede ao carregar perfil:", err);
        // Continua mesmo com erro de rede, o usuário pode tentar novamente
      } finally {
        setLoading(false);
        console.log("✅ [AUTH] Inicialização concluída");
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
        signup: async () => { },
        adminSignup: async () => { },
        logout,
        loading,
        token,
        refreshAuthToken,
        isTokenValid,
        authFetch,
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

export const useAuthFetch = () => useAuth().authFetch;
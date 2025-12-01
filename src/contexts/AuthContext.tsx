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
  company?: {
    id: string;
    name: string;
    status: string;
  } | null;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  adminSignup: (userData: SignupData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  token: string | null;
  refreshAuthToken: () => Promise<boolean>;
  isTokenValid: (token: string) => boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  companyId: string;
  phone: string;
  document?: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE =
  process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpa timer antigo
  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // Agenda refresh 5 minutos antes da expiração
  const scheduleRefreshTimer = (accessToken: string) => {
    clearRefreshTimer();

    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp ? payload.exp - now : 0;

      if (expiresIn <= 0) {
        refreshAuthToken();
        return;
      }

      const refreshIn = Math.max(expiresIn - 300, 60) * 1000; // 5 min antes, mínimo 1 min

      refreshTimerRef.current = setTimeout(async () => {
        const success = await refreshAuthToken();
        if (!success) logout();
      }, refreshIn);
    } catch (e) {
      console.error("Erro ao agendar refresh:", e);
    }
  };

  // Verifica se token é válido (não expirado)
  const isTokenValid = (token: string): boolean => {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  };

  // Limpa tudo (logout, refresh de página, etc.)
  const clearAuthData = () => {
    clearRefreshTimer();
    setToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  // Salva tokens + agenda refresh automático
  const setAuthToken = (newToken: string, refreshToken?: string): boolean => {
    if (!isTokenValid(newToken)) {
      clearAuthData();
      return false;
    }

    setToken(newToken);
    localStorage.setItem("accessToken", newToken);
    document.cookie = `access_token=${newToken}; path=/; max-age=86400; SameSite=Lax`;

    if (refreshToken && isTokenValid(refreshToken)) {
      localStorage.setItem("refreshToken", refreshToken);
      document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
    }

    scheduleRefreshTimer(newToken);
    return true;
  };

  // Refresh do token
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

      if (!res.ok) throw new Error("Refresh failed");

      const data = await res.json();
      const success = setAuthToken(data.accessToken, data.refreshToken);
      return success;
    } catch (err) {
      console.error("Refresh token falhou:", err);
      clearAuthData();
      return false;
    }
  };

  // authFetch com retry automático em caso de 401
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let accessToken = localStorage.getItem("accessToken");

    if (!accessToken || !isTokenValid(accessToken)) {
      const refreshed = await refreshAuthToken();
      if (!refreshed) throw new Error("Sessão expirada");
      accessToken = localStorage.getItem("accessToken");
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const refreshed = await refreshAuthToken();
      if (!refreshed) {
        logout();
        throw new Error("Sessão expirada");
      }
      const newToken = localStorage.getItem("accessToken");
      response = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    }

    return response;
  };

  // LOGIN ATUALIZADO (sem fetchUserData!)
  const login = async (email: string, password: string) => {
    try {
      console.log("Tentando login...", { email, passwordLength: password.length });

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const text = await response.text();
      console.log("Resposta login:", response.status, text);

      if (!response.ok) {
        let msg = "Credenciais inválidas";
        try {
          const err = JSON.parse(text);
          msg = err.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const data = JSON.parse(text);

      const accessToken = data.accessToken;
      const refreshToken = data.refreshToken;
      const userFromLogin = data.user;

      if (!accessToken || !userFromLogin) {
        throw new Error("Resposta incompleta do servidor");
      }

      // Salva tokens
      setAuthToken(accessToken, refreshToken);

      // Define usuário direto (sem chamada extra!)
      setUser(userFromLogin);
      console.log("Login sucesso! Usuário:", userFromLogin.name || userFromLogin.email);

      router.push("/Kanban");
    } catch (error: any) {
      console.error("Erro no login:", error);
      throw error;
    }
  };

  // Resto das funções (signup, adminSignup, logout)
  const signup = async (userData: SignupData) => { /* ... teu código atual ... */ };
  const adminSignup = async (userData: SignupData) => { /* ... teu código atual ... */ };

  const logout = () => {
    clearAuthData();
    router.push("/login");
  };

  // Inicialização na carga da página
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const savedToken = localStorage.getItem("accessToken");
      if (savedToken && isTokenValid(savedToken)) {
        setToken(savedToken);
        scheduleRefreshTimer(savedToken);

        try {
          const res = await fetch(`${API_BASE}/auth/profile`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
          } else {
            clearAuthData();
          }
        } catch {
          clearAuthData();
        }
      }
      setLoading(false);
    };
    init();
    return () => clearRefreshTimer();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        adminSignup,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve estar dentro de AuthProvider");
  return context;
}

export function useAuthFetch() {
  const { authFetch } = useAuth();
  return authFetch;
}
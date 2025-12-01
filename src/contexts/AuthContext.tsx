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

      if (!res.ok) throw new Error("Refresh failed");
      const data = await res.json();
      return setAuthToken(data.accessToken, data.refreshToken);
    } catch (err) {
      console.error("Refresh falhou:", err);
      clearAuthData();
      return false;
    }
  };

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let accessToken = localStorage.getItem("accessToken");
    if (!accessToken || !isTokenValid(accessToken)) {
      const ok = await refreshAuthToken();
      if (!ok) throw new Error("Sessão expirada");
      accessToken = localStorage.getItem("accessToken");
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const ok = await refreshAuthToken();
      if (!ok) {
        logout();
        throw new Error("Sessão expirada");
      }
      response = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
    }
    return response;
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Erro no login");

    setAuthToken(data.accessToken, data.refreshToken);
    setUser(data.user);
    router.push("/Kanban");
  };

  const logout = () => {
    clearAuthData();
    router.push("/login");
  };

  // INICIALIZAÇÃO PERFEITA
  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem("accessToken");

      if (!savedToken || !isTokenValid(savedToken)) {
        clearAuthData();
        setLoading(false);
        return;
      }

      setToken(savedToken);
      scheduleRefreshTimer(savedToken);

      try {
        const res = await fetch(`${API_BASE}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          setUser(await res.json());
        }
      } catch (err) {
        console.warn("Erro ao carregar perfil (rede?)", err);
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
        login,
        signup: async () => {},
        adminSignup: async () => {},
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
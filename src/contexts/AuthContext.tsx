"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestConfig,
} from "axios";

// --- Tipagem ---
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

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  token: string | null;
  api: AxiosInstance;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

const logger = {
  error: (message: string, meta?: unknown) => console.error(`[AuthError]: ${message}`, meta),
  info: (message: string, meta?: unknown) => console.log(`[AuthInfo]: ${message}`, meta),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Instância base
export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

// Fila de espera para refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- Limpeza de Dados ---
  const clearAuthData = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      // Limpa Cookies também para evitar loops no Middleware
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    }
    delete api.defaults.headers.common["Authorization"];
  }, []);

  const logout = useCallback(() => {
    clearAuthData();
    router.push("/login");
  }, [clearAuthData, router]);

  // --- INTERCEPTOR (BLINDAGEM DO RETRY) ---
  const retryRequest = (originalRequest: InternalAxiosRequestConfig, newToken: string) => {
    let data = originalRequest.data;
    if (data && typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch { /* ignorar */ }
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`
    };

    const newConfig: AxiosRequestConfig = {
        method: originalRequest.method,
        url: originalRequest.url,
        params: originalRequest.params,
        baseURL: originalRequest.baseURL,
        data: data,
        headers: headers 
    };

    return api(newConfig);
  };

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (!originalRequest) return Promise.reject(error);

        if (originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/refresh")) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((newToken) => {
                return retryRequest(originalRequest, newToken);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const storedRefreshToken = localStorage.getItem("refreshToken");
            if (!storedRefreshToken) throw new Error("No refresh token");

            const { data } = await axios.post<LoginResponse>(`${API_BASE}/auth/refresh`, {
              refreshToken: storedRefreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = data;

            localStorage.setItem("accessToken", accessToken);
            // Atualiza Cookie para Middleware
            document.cookie = `access_token=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
            
            if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
            
            setToken(accessToken);
            api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

            processQueue(null, accessToken);

            return retryRequest(originalRequest, accessToken);

          } catch (refreshErr) {
            processQueue(refreshErr, null);
            logout();
            return Promise.reject(refreshErr);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [logout]);

  // --- INIT ---
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const savedToken = localStorage.getItem("accessToken");
      const savedRefreshToken = localStorage.getItem("refreshToken");
      
      if (!savedToken || !savedRefreshToken) {
        if (mounted) setLoading(false);
        return;
      }
      
      try {
        setToken(savedToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
        // Garante que o cookie existe no reload
        document.cookie = `access_token=${savedToken}; path=/; max-age=86400; SameSite=Lax`;

        const { data } = await api.get<User>("/auth/profile");
        if (mounted) setUser(data);
      } catch (e) {
        // Se falhar o profile, tenta um refresh silencioso ou desloga
        if (axios.isAxiosError(e) && e.response?.status === 401) {
             // Deixa o interceptor tentar resolver ou falhar
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [clearAuthData]);

  // --- LOGIN (CORRIGIDO PARA RACE CONDITION) ---
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post<LoginResponse>("/auth/login", { email, password });
      const { accessToken, refreshToken, user } = response.data;
      
      // 1. LocalStorage (Persistência)
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      
      // 2. Cookie (Para Middleware e Race Conditions)
      document.cookie = `access_token=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
      
      // 3. Axios Defaults (Para chamadas futuras)
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      
      // 4. State React
      setToken(accessToken);
      setUser(user);
      
      router.push("/");
    } catch (error) {
      if (axios.isAxiosError(error)) throw new Error(error.response?.data?.message || "Erro de conexão");
      throw error;
    }
  }, [router]);

  // --- AUTH FETCH (CORRIGIDO PARA FORÇAR HEADER) ---
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
      const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
      
      let data = options.body;
      if (typeof options.body === "string") {
         try { data = JSON.parse(options.body); } catch { data = options.body; }
      }

      // CORREÇÃO CRÍTICA: Ler token direto do storage para garantir atualização imediata
      const currentToken = localStorage.getItem("accessToken") || token;
      
      const headers: any = { 
          ...options.headers,
          "Content-Type": "application/json"
      };

      // Força o header Authorization se tivermos o token
      if (currentToken) {
          headers["Authorization"] = `Bearer ${currentToken}`;
      }

      const response = await api(fullUrl, {
        method: options.method || "GET",
        headers: headers, // Passa headers explícitos
        data,
      });

      return {
        ok: true,
        status: response.status,
        json: async () => response.data,
        headers: new Headers(response.headers as any),
      } as unknown as Response;
    } catch (error: any) {
        if (error.response) return { ok: false, status: error.response.status, json: async () => error.response.data } as Response;
        throw error;
    }
  }, [token]);

  const contextValue = useMemo(() => ({
    user, isAuthenticated: !!user, login, logout, loading, token, api, authFetch
  }), [user, login, logout, loading, token, authFetch]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve estar dentro de AuthProvider");
  return context;
};
export const useAuthFetch = () => useAuth().authFetch;
export const useApi = () => useAuth().api;
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
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";

// --- Governança: Tipagem Estrita e Interfaces ---

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
  /**
   * @deprecated Use `api` instead. Kept for legacy support.
   */
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

// Configuração centralizada
const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

// --- Monitoramento ---
const logger = {
  error: (message: string, meta?: unknown) => console.error(`[AuthError]: ${message}`, meta),
  info: (message: string, meta?: unknown) => console.log(`[AuthInfo]: ${message}`, meta),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Instância Axios Base (Definida FORA do componente) ---
export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // Timeout ajustado para 60s para evitar erros em relatórios pesados
});

// --- Controle de Concorrência para Refresh Token ---
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

  // --- Segurança e Limpeza ---
  const clearAuthData = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    }
    delete api.defaults.headers.common["Authorization"];
  }, []);

  const logout = useCallback(() => {
    logger.info("User initiated logout");
    clearAuthData();
    router.push("/login");
  }, [clearAuthData, router]);

  // --- Setup Interceptors ---
  useEffect(() => {
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

    const resInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        // Evita loop infinito em rotas de auth
        if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers["Authorization"] = `Bearer ${token}`;
              }
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) throw new Error("No refresh token available");

          // Usamos axios puro aqui para não acionar interceptors novamente
          const { data } = await axios.post<LoginResponse>(`${API_BASE}/auth/refresh`, {
            refreshToken,
          });

          const newAccessToken = data.accessToken;
          const newRefreshToken = data.refreshToken;

          localStorage.setItem("accessToken", newAccessToken);
          if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
          
          setToken(newAccessToken);
          api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          
          if (originalRequest.headers) {
             originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);

        } catch (refreshError) {
          processQueue(refreshError, null);
          clearAuthData();
          // Não redireciona forçado aqui, deixa o componente lidar com estado null
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    );

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, [clearAuthData]);

  // --- Inicialização (Hydration Inteligente) ---
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const savedToken = localStorage.getItem("accessToken");
      
      if (!savedToken) {
        if (mounted) setLoading(false);
        return;
      }

      // Verificação Prévia de Expiração (Simples e Rápida)
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        
        if (payload.exp < now) {
           console.log("Token expirado na inicialização. O interceptor tentará renovar.");
           // Não fazemos nada aqui, deixamos o api.get falhar e o interceptor renovar
        }
      } catch (e) {
        console.warn("Token malformado no storage");
        clearAuthData();
        if (mounted) setLoading(false);
        return;
      }

      setToken(savedToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;

      try {
        const { data } = await api.get<User>("/auth/profile");
        if (mounted) setUser(data);
      } catch (error) {
        // Ignora erro 401 visualmente, pois o interceptor trata o refresh
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
             logger.error("Failed to load profile on init", error);
        }
        // Se após o refresh (que acontece nos bastidores) ainda der 401, limpa tudo
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            clearAuthData();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [clearAuthData]);

  // --- Login ---
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

      setToken(accessToken);
      setUser(user);
      
      logger.info("Login successful", { userId: user.id });
      router.push("/");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Erro de conexão";
        throw new Error(message);
      }
      throw error;
    }
  }, [router]);

  // --- Legacy AuthFetch (Compatibilidade) ---
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
      const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
      let data = undefined;
      if (options.body) {
        try {
           data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        } catch {
           data = options.body;
        }
      }

      const config = {
        method: options.method || "GET",
        headers: options.headers as unknown as Record<string, string>,
        data,
      };

      const response = await api(fullUrl, config);

      return {
        ok: true,
        status: response.status,
        statusText: response.statusText,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data),
        headers: new Headers(response.headers as unknown as HeadersInit),
      } as unknown as Response;

    } catch (error) {
       if (axios.isAxiosError(error) && error.response) {
        return {
          ok: false,
          status: error.response.status,
          statusText: error.response.statusText,
          json: async () => error.response?.data,
          text: async () => JSON.stringify(error.response?.data),
        } as unknown as Response;
      }
      throw error;
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
    token,
    api,
    authFetch,
  }), [user, login, logout, loading, token, authFetch]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve estar dentro de AuthProvider");
  return context;
};

export const useAuthFetch = () => {
    const { authFetch } = useAuth();
    return authFetch;
};

export const useApi = () => {
    const { api } = useAuth();
    return api;
};
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
  /** @deprecated Use `api` instead. */
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

// --- Configuração ---
const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

const logger = {
  error: (message: string, meta?: unknown) => console.error(`[AuthError]: ${message}`, meta),
  info: (message: string, meta?: unknown) => console.log(`[AuthInfo]: ${message}`, meta),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Instância Axios Base ---
export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

// --- Controle de Fila para Refresh Token (Fora do Componente) ---
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

  // --- Helpers de Limpeza ---
  const clearAuthData = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      // Opcional: Limpar cookies se usar
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

  // --- 1. CONFIGURAÇÃO DO INTERCEPTOR (A CORREÇÃO PRINCIPAL) ---
  useEffect(() => {
    // Adiciona o interceptor para tratar erros 401 globalmente
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Evita loop infinito se a chamada for de login ou refresh
        if (!originalRequest) return Promise.reject(error);
        if (
          originalRequest.url?.includes("/auth/login") ||
          originalRequest.url?.includes("/auth/refresh")
        ) {
          return Promise.reject(error);
        }

        // Se deu 401 (Unauthorized) e ainda não tentamos reconectar
        if (error.response?.status === 401 && !originalRequest._retry) {
          
          // Caso A: Já existe um refresh acontecendo. Entra na fila.
          if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((newToken) => {
                originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
                return api(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          // Caso B: Somos o primeiro a detectar o erro 401. Inicia o Refresh.
          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const storedRefreshToken = localStorage.getItem("refreshToken");
            if (!storedRefreshToken) throw new Error("No refresh token");

            // Chamada direta com axios puro (sem a instância 'api' para não interceptar)
            const { data } = await axios.post<LoginResponse>(`${API_BASE}/auth/refresh`, {
              refreshToken: storedRefreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = data;

            // Salva novos dados
            localStorage.setItem("accessToken", accessToken);
            if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
            
            // Atualiza o estado da aplicação
            setToken(accessToken);
            api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

            // Libera a fila de requisições pausadas
            processQueue(null, accessToken);

            // Retenta a requisição original que falhou
            originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
            return api(originalRequest);

          } catch (refreshErr) {
            // Se o refresh falhar (ex: refresh token expirado), desloga geral
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

    // Remove o interceptor ao desmontar
    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [logout]);

  // --- 2. Inicialização / Hydration (Ao carregar a página) ---
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
        // Verifica validade básica do token (decodificando JWT)
        const payload = JSON.parse(atob(savedToken.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);
        
        let currentAccessToken = savedToken;

        // Se expirou (ou vai expirar em <10s), renova proativamente NO BOOT
        if (payload.exp < now + 10) {
          console.log("🔄 Token expirado no boot. Renovando...");
          try {
            const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
              refreshToken: savedRefreshToken,
            });
            currentAccessToken = data.accessToken;
            localStorage.setItem("accessToken", currentAccessToken);
            if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
            setToken(currentAccessToken);
          } catch (e) {
            console.error("Falha ao renovar no boot", e);
            clearAuthData();
            if (mounted) setLoading(false);
            return;
          }
        } else {
          setToken(savedToken);
        }

        // Configura header e busca perfil
        api.defaults.headers.common["Authorization"] = `Bearer ${currentAccessToken}`;
        
        const { data } = await api.get<User>("/auth/profile");
        if (mounted) setUser(data);

      } catch (error) {
        // Se der erro aqui, o interceptor acima pode não ter pego ainda (ex: erro de rede ou malformado)
        // Se for 401 REAL mesmo após tentativas, limpamos.
        if (axios.isAxiosError(error) && error.response?.status === 401) {
             clearAuthData();
        } else {
            logger.error("Erro ao carregar perfil inicial", error);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => { mounted = false; };
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

  // --- Legacy AuthFetch ---
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
      const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
      let data = undefined;
      if (options.body) {
        try {
          data = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
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
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// --- Hooks ---

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
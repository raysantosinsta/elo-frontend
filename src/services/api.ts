/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { parseCookies, setCookie, destroyCookie } from "nookies"; // Recomendo usar 'nookies' para gerenciar cookies no Next.js (mais seguro que document.cookie manual)

// Definição da URL Base
const API_BASE =
  process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

// Extensão da tipagem para incluir a flag _retry
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

// --- 1. Interceptador de Request ---
api.interceptors.request.use((config) => {
  // Tenta pegar token dos cookies (funciona melhor com SSR/Next) ou localStorage
  const { access_token: token } = parseCookies();
  // OU: const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Variáveis de Controle de Concorrência ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

// Função para processar a fila após o refresh
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// --- 2. Interceptador de Response ---
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    // Se a requisição foi cancelada ou não tem config, rejeita direto
    if (!originalRequest) return Promise.reject(error);

    // Verifica se é erro 401 e se NÃO é uma tentativa repetida
    if (error.response?.status === 401 && !originalRequest._retry) {
      // CRÍTICO: Evitar Loop Infinito.
      // Se a falha ocorreu no LOGIN ou no REFRESH, não tentamos renovar de novo.
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      // Se já houver um refresh acontecendo, enfileira a requisição
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Pega o refresh token do storage (ou cookies httpOnly se estiver usando)
        const refreshToken = localStorage.getItem("refreshToken"); // ou cookies

        if (!refreshToken) {
          throw new Error("Refresh token não encontrado");
        }

        // Chamada direta ao backend (bypass do interceptor da api)
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken: refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          data;

        // 1. Atualiza LocalStorage (para uso imediato no client)
        localStorage.setItem("accessToken", newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }

        // 2. Atualiza Cookies (CRÍTICO para o Middleware do Next.js passar nas rotas)
        setCookie(null, "access_token", newAccessToken, {
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
          sameSite: "lax", // ou 'strict'
          // secure: process.env.NODE_ENV === 'production' // descomentar em prod
        });

        // 3. Configura o header padrão para futuras requisições
        api.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // 4. Processa a fila de requisições que estavam esperando
        processQueue(null, newAccessToken);

        // 5. Retenta a requisição original
        return api(originalRequest);
      } catch (refreshError) {
        // Se o refresh falhar (expirou ou inválido): LOGOUT TOTAL
        processQueue(refreshError, null);

        // Limpa tudo
        destroyCookie(null, "access_token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        // Redireciona para login (via window para garantir limpeza de estado)
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { parseCookies, setCookie, destroyCookie } from "nookies";

const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// --- NOVO: Sistema de Observer para Erros ---
// Isso permite que o React injete a função de abrir o Dialog aqui dentro
type ErrorHandlerFn = (title: string, message: string, errors?: string[]) => void;
let globalErrorHandler: ErrorHandlerFn | null = null;

export const registerGlobalErrorListener = (fn: ErrorHandlerFn) => {
  globalErrorHandler = fn;
};
// --------------------------------------------

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const { access_token: cookieToken } = parseCookies();
  const localToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const token = cookieToken || localToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;

let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

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

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    const status = error.response?.status;

    // --- Lógica de Refresh Token (Mantida a sua, impecável) ---
    if (status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/refresh")) {
        // Se falhar no login, deixamos o erro passar para o Dialog tratar abaixo
        // ou retornamos reject se não quisermos dialog no login incorreto
        // Vamos deixar passar para o Dialog exibir "Credenciais Inválidas"
      } else {
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
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) throw new Error("No refresh token");

          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;

          localStorage.setItem("accessToken", newAccessToken);
          if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
          
          setCookie(null, "access_token", newAccessToken, {
            maxAge: 30 * 24 * 60 * 60,
            path: "/",
            sameSite: "lax",
          });

          api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          destroyCookie(null, "access_token");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          if (typeof window !== "undefined") window.location.href = "/login";
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

    // --- NOVO: Captura Genérica de Erros para o Dialog ---
    // Se chegamos aqui, ou não é 401, ou o refresh falhou, ou é erro de validação (400, 422, 500)
    if (globalErrorHandler) {
        const errorData = error.response?.data;
        
        // Título baseado no status
        let title = "Erro Inesperado";
        if (status === 400) title = "Dados Inválidos";
        if (status === 401) title = "Acesso Negado";
        if (status === 403) title = "Sem Permissão";
        if (status === 404) title = "Não Encontrado";
        if (status === 500) title = "Erro no Servidor";

        // Mensagem e erros detalhados vindos do Backend
        const message = errorData?.message || error.message || "Ocorreu um erro desconhecido.";
        const details = errorData?.errors; // Array de strings vindo do filtro do NestJS

        // Dispara o Dialog - === showError
        globalErrorHandler(title, message, details);
    }

    return Promise.reject(error);
  }
);
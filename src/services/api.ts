// lib/api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { parseCookies, setCookie, destroyCookie } from "nookies";

const API_BASE =
  process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// --- Sistema de Observer para Erros ---
type ErrorHandlerFn = (
  title: string,
  message: string,
  errors?: string[],
) => void;
let globalErrorHandler: ErrorHandlerFn | null = null;

export const registerGlobalErrorListener = (fn: ErrorHandlerFn) => {
  globalErrorHandler = fn;
};

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

// Interceptor de request para adicionar token
api.interceptors.request.use((config) => {
  const { access_token: cookieToken } = parseCookies();
  const localToken =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
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

// Interceptor de response para refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    const status = error.response?.status;

    // Lógica de Refresh Token
    if (status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        // Se falhar no login, deixamos o erro passar
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

          const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            data;

          localStorage.setItem("accessToken", newAccessToken);
          if (newRefreshToken)
            localStorage.setItem("refreshToken", newRefreshToken);

          setCookie(null, "access_token", newAccessToken, {
            maxAge: 30 * 24 * 60 * 60,
            path: "/",
            sameSite: "lax",
          });

          api.defaults.headers.common["Authorization"] =
            `Bearer ${newAccessToken}`;
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

    // Captura Genérica de Erros para o Dialog
    if (globalErrorHandler) {
      const errorData = error.response?.data;

      let title = "Erro Inesperado";
      if (status === 400) title = "Dados Inválidos";
      if (status === 401) title = "Acesso Negado";
      if (status === 403) title = "Sem Permissão";
      if (status === 404) title = "Não Encontrado";
      if (status === 409) title = "Conflito";
      if (status === 422) title = "Dados Inválidos";
      if (status === 500) title = "Erro no Servidor";

      const message =
        errorData?.message || error.message || "Ocorreu um erro desconhecido.";
      const details = errorData?.errors;

      globalErrorHandler(title, message, details);
    }

    return Promise.reject(error);
  },
);

// =============================================
// TIPOS PARA AS ROTAS
// =============================================

export interface RouteStop {
  id?: string;
  name?: string;
  address: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  notes?: string;
  order?: number;
}

export interface Route {
  userAssignedId?: string | null;
  orderBy?: "DISTANCE" | "PRIORITY";
  id: string;
  title: string;
  description?: string;
  routeDate?: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "FINISHED" | "CANCELED";
  totalDistanceMeters?: number;
  totalDurationSeconds?: number;
  optimizedAt?: string;
  stops: RouteStop[];
  userAssigned?: {
    id: string;
    name: string;
    contact?: string;
  };
  userCreate?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  formattedDistance?: string;
  formattedDuration?: string;
  _count?: {
    stops: number;
  };
  tasks?: TaskInfo[];
}

export interface CreateRouteDto {
  title: string;
  description?: string;
  routeDate?: string;
  stops: Omit<RouteStop, "id" | "order" | "visited" | "visitedAt">[];
  userAssignedId?: string;
  orderBy?: "DISTANCE" | "PRIORITY";
}

export interface UpdateRouteDto {
  title?: string;
  description?: string;
  routeDate?: string;
  status?: Route["status"];
  stops?: CreateRouteDto["stops"];
  userAssignedId?: string;
  orderBy?: "DISTANCE" | "PRIORITY";
}

export interface RouteStats {
  total: number;
  byStatus: {
    scheduled: number;
    inProgress: number;
    finished: number;
    canceled: number;
  };
  totalStops: number;
  totalDistance: number;
  averageDistancePerRoute: number;
  lastRoutes: Array<{
    id: string;
    title: string;
    status: Route["status"];
    stopsCount: number;
    createdAt: string;
  }>;
}

export interface OptimizeRouteDto {
  driverLatitude: number;
  driverLongitude: number;
  taskIds: string[];
  orderBy?: "DISTANCE" | "PRIORITY";
}

export interface FinalizeTaskDto {
  status: "COMPLETED" | "FAILED";
  finalComment?: string;
  dueDate?: string;
}

export interface TaskAddress {
  id: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
  latitude?: number;
  longitude?: number;
}

export interface AvailableTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  scheduledDate?: string;
  dueDate?: string;
  taskAddress?: TaskAddress;
  userAssigned?: {
    id: string;
    name: string;
  };
  column?: {
    id: string;
  };
}

export interface TaskInfo {
  id: string;
  title: string;
  intervalTime: number | null;
  status?: string;
}

// =============================================
// TIPOS PARA TAREFAS (NOVO)
// =============================================

export interface CreateTaskDto {
  title: string;
  description?: string;
  dueDate?: string;
  scheduledAt?: string;
  status?: string;
  completionDate?: string | null;
  address?: {
    cep: string;
    endereco: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    complemento?: string;
    latitude?: number;
    longitude?: number;
  };
  assignedToId?: string;
  companyId?: string;
  columnId?: string;
  routeId?: string;
  priority?: number;
  columnOrder?: number;
  intervalTime?: number;
  finalComment?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  columnOrder: number;
  dueDate: string | null;
  scheduledDate: string | null;
  completionDate: string | null;
  finalComment: string | null;
  intervalTime: number | null;
  companyId: string;
  userCreateId: string;
  userAssignedId: string | null;
  userCompletedId: string | null;
  userUpdateId: string | null;
  columnId: string | null;
  routeId: string | null;
  createdAt: string;
  updatedAt: string;
  taskAddress?: {
    id: string;
    cep: string;
    endereco: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    complemento: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  userAssigned?: {
    id: string;
    name: string;
    email: string;
    contact: string | null;
  };
  userCreate?: {
    id: string;
    name: string;
  };
  userUpdate?: {
    id: string;
    name: string;
  };
  userCompleted?: {
    id: string;
    name: string;
  };
  column?: {
    id: string;
    title: string;
  };
  route?: {
    id: string;
    title: string;
  };
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueDate?: string;
  scheduledAt?: string;
  completionDate?: string | null;
  status?: string;
  priority?: number;
  columnOrder?: number;
  assignedToId?: string | null;
  columnId?: string | null;
  routeId?: string | null;
  finalComment?: string | null;
  intervalTime?: number | null;
  address?: CreateTaskDto["address"];
  removeImageIds?: string[];
  removeAudioIds?: string[];
  removeVideoIds?: string[];
}

// =============================================
// API ROUTES - Rotas sem tarefas
// =============================================

export const routesApi = {
  /**
   * Busca todas as rotas da empresa
   */
  getAll: (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get("/routes", { params }),

  /**
   * Busca uma rota específica por ID
   */
  getById: (id: string) => api.get(`/routes/${id}`),

  /**
   * Cria uma nova rota sem criar tarefas
   */
  create: (data: CreateRouteDto) => api.post("/routes", data),

  /**
   * Atualiza uma rota existente
   */
  update: (id: string, data: UpdateRouteDto) =>
    api.patch(`/routes/${id}`, data),

  /**
   * Remove uma rota
   */
  delete: (id: string) => api.delete(`/routes/${id}`),

  /**
   * Retorna estatísticas resumidas das rotas
   */
  getSummary: () => api.get("/routes/stats/summary"),

  /**
   * Duplica uma rota existente
   */
  duplicate: (
    id: string,
    data: { title?: string; routeDate?: string; description?: string },
  ) => api.post(`/routes/${id}/duplicate`, data),

  /**
   * Converte uma rota salva em tarefas reais
   */
  convertToTasks: (
    id: string,
    data: { columnId?: string; userAssignedId?: string },
  ) => api.post(`/routes/${id}/convert-to-tasks`, data),

  /**
   * Marca uma parada como visitada
   */
  markStopVisited: (routeId: string, stopId: string, notes?: string) =>
    api.patch(`/routes/${routeId}/stops/${stopId}/visit`, { notes }),

  // =============================================
  // ENDPOINTS EXISTENTES - Rotas com tarefas
  // =============================================

  /**
   * Busca tarefas disponíveis com localização válida
   */
  getAvailableTasks: (params?: {
    startDate?: string;
    endDate?: string;
    assignedToId?: string;
  }) => api.get("/routes/available-tasks", { params }),

  /**
   * Otimiza a ordem das tarefas pela melhor rota
   */
  optimizeRoute: (data: OptimizeRouteDto) =>
    api.post("/routes/calculate-best-path", data),

  /**
   * Finaliza uma tarefa (sucesso/falha) ou agenda
   */
  finalizeTask: (taskId: string, data: FinalizeTaskDto) =>
    api.patch(`/tasks/${taskId}/finalize`, data),

  /**
   * Busca as tasks de uma rota específica
   */
  getRouteTasks: (routeId: string) => api.get(`/routes/${routeId}/tasks`),

  // =============================================
  // NOVOS ENDPOINTS PARA TAREFAS
  // =============================================

  /**
   * Cria uma nova tarefa
   */
  createTask: (data: CreateTaskDto) => api.post<Task>("/tasks", data),

  /**
   * Busca todas as tarefas (com paginação e filtros)
   */
  getAllTasks: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    assignedToId?: string;
    startDate?: string;
    endDate?: string;
    dateType?: string;
    isOverdue?: boolean;
    excludeCompleted?: boolean;
    columnId?: string;
    hasLocation?: boolean;
  }) => api.get("/tasks", { params }),

  /**
   * Busca uma tarefa específica por ID
   */
  getTaskById: (id: string) => api.get<Task>(`/tasks/${id}`),

  /**
   * Atualiza uma tarefa existente
   */
  updateTask: (id: string, data: UpdateTaskDto) =>
    api.patch<Task>(`/tasks/${id}`, data),

  /**
   * Remove uma tarefa
   */
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),

  /**
   * Adiciona ou atualiza o endereço de uma tarefa
   */
  addTaskAddress: (taskId: string, address: any) =>
    api.post(`/tasks/${taskId}/address`, address),
};

export default api;

/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useRoutes.ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  QueryClient,
} from "@tanstack/react-query";
import {
  AvailableTask,
  CreateRouteDto,
  CreateTaskDto,
  FinalizeTaskDto,
  Route,
  routesApi,
  RouteStats,
  Task,
  TaskInfo,
  UpdateRouteDto,
} from "../services/api";

// =============================================
// 🚀 HELPER: delay entre requisições
// =============================================
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================
// 🚀 HELPER: buscar tasks com rate limiting
// =============================================
const createTaskFetcher = () => {
  const pendingRequests = new Map<string, Promise<TaskInfo[]>>();
  const lastRequestTime = new Map<string, number>();
  const MIN_DELAY_MS = 500; // Delay mínimo entre requisições para a mesma rota

  return async (
    routeId: string,
    queryClient: QueryClient,
  ): Promise<TaskInfo[]> => {
    const cacheKey: string[] = ["tasks-by-route", routeId];

    // Verifica cache primeiro
    const cached = queryClient.getQueryData<TaskInfo[]>(cacheKey);
    if (cached) return cached;

    // Verifica se já existe uma requisição em andamento
    if (pendingRequests.has(routeId)) {
      const pending = pendingRequests.get(routeId);
      if (pending) return pending;
    }

    // Rate limiting: garantir delay entre requisições
    const now = Date.now();
    const lastRequest = lastRequestTime.get(routeId) || 0;
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < MIN_DELAY_MS) {
      await delay(MIN_DELAY_MS - timeSinceLastRequest);
    }

    // Criar nova requisição
    const request = (async () => {
      try {
        const { data } = await routesApi.getRouteTasks(routeId);
        lastRequestTime.set(routeId, Date.now());
        queryClient.setQueryData(cacheKey, data);
        return data as TaskInfo[];
      } finally {
        pendingRequests.delete(routeId);
      }
    })();

    pendingRequests.set(routeId, request);
    return request;
  };
};

export const useRoutes = () => {
  const queryClient = useQueryClient();
  const fetchTasksWithRateLimit = createTaskFetcher();

  // =============================================
  // 🚀 HELPER: buscar tasks com cache (ANTI-FLOOD)
  // =============================================
  const getTasksWithCache = async (routeId: string) => {
    return fetchTasksWithRateLimit(routeId, queryClient);
  };

  const useMarkStopVisited = () =>
    useMutation({
      mutationFn: ({
        routeId,
        stopId,
        notes,
      }: {
        routeId: string;
        stopId: string;
        notes?: string;
      }) => routesApi.markStopVisited(routeId, stopId, notes),

      onSuccess: (_, variables) => {
        // Atualiza apenas o necessário
        queryClient.invalidateQueries({
          queryKey: ["routes", variables.routeId],
        });
        queryClient.invalidateQueries({
          queryKey: ["tasks-by-route", variables.routeId],
        });
      },
    });

  // =============================================
  // 🚀 GET ALL ROUTES (OTIMIZADO - SEM FLOOD)
  // =============================================
  const useGetAllRoutes = (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    useQuery({
      queryKey: ["routes", params],
      queryFn: async () => {
        const { data } = await routesApi.getAll(params);
        const routes = data as Route[];

        // 🔥 NÃO buscar tasks automaticamente - deixar para quando necessário
        // Retornar rotas sem tasks para evitar flood
        return routes.map((route) => ({
          ...route,
          tasks: [], // Tasks vazias inicialmente
        }));
      },
      staleTime: 1000 * 30, // 30 segundos
      gcTime: 1000 * 60 * 5, // 5 minutos
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
      retry: 1, // Tentar apenas 1 vez em caso de erro
      retryDelay: 1000, // Esperar 1 segundo antes de tentar novamente
    });

  // =============================================
  // GET ROUTE BY ID (COM TASKS SOB DEMANDA)
  // =============================================
  const useGetRouteById = (id: string) =>
    useQuery({
      queryKey: ["routes", id],
      queryFn: async () => {
        const { data } = await routesApi.getById(id);
        const route = data as Route;

        // Buscar tasks apenas para a rota específica
        try {
          const tasks = await getTasksWithCache(id);
          return {
            ...route,
            tasks,
          };
        } catch (error) {
          console.error(`Erro ao buscar tasks da rota ${id}`, error);
          return {
            ...route,
            tasks: [],
          };
        }
      },
      enabled: !!id,
      staleTime: 1000 * 30, // 30 segundos
      gcTime: 1000 * 60 * 5,
      retry: 1,
    });

  // =============================================
  // GET TASKS BY ROUTE (CARREGAMENTO SOB DEMANDA)
  // =============================================
  const useGetTasksByRoute = (routeId: string, enabled: boolean = true) =>
    useQuery({
      queryKey: ["tasks-by-route", routeId],
      queryFn: async () => {
        // Pequeno delay para evitar múltiplas chamadas simultâneas
        await delay(100);
        const { data } = await routesApi.getRouteTasks(routeId);
        return data as TaskInfo[];
      },
      enabled: !!routeId && enabled,
      staleTime: 1000 * 60, // 1 minuto
      gcTime: 1000 * 60 * 5,
      retry: 1,
      retryDelay: 1000,
    });

  // =============================================
  // OUTROS GETS
  // =============================================
  const useGetSummary = () =>
    useQuery({
      queryKey: ["routes-summary"],
      queryFn: async () => {
        const { data } = await routesApi.getSummary();
        return data as RouteStats;
      },
      staleTime: 1000 * 60 * 2, // 2 minutos
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    });

  const useGetAvailableTasks = (params?: any) =>
    useQuery({
      queryKey: ["available-tasks", params],
      queryFn: async () => {
        const { data } = await routesApi.getAvailableTasks(params);
        return data as AvailableTask[];
      },
      staleTime: 1000 * 30, // 30 segundos
      gcTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    });

  const useGetAllTasks = (params?: any) =>
    useQuery({
      queryKey: ["tasks", params],
      queryFn: async () => {
        const { data } = await routesApi.getAllTasks(params);
        return data;
      },
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    });

  const useGetTaskById = (id: string) =>
    useQuery({
      queryKey: ["tasks", id],
      queryFn: async () => {
        const { data } = await routesApi.getTaskById(id);
        return data as Task;
      },
      enabled: !!id,
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
    });

  const useFinalizeTask = () =>
    useMutation({
      mutationFn: ({
        taskId,
        data,
      }: {
        taskId: string;
        data: FinalizeTaskDto;
      }) => routesApi.finalizeTask(taskId, data),

      onSuccess: (_, variables) => {
        // Invalidar apenas o necessário
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["tasks-by-route"] });
      },
    });

  // =============================================
  // MUTATIONS
  // =============================================

  const useCreateRoute = () =>
    useMutation({
      mutationFn: (data: CreateRouteDto) => routesApi.create(data),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["routes"] });
        await queryClient.invalidateQueries({ queryKey: ["routes-summary"] });
      },
    });

  const useUpdateRoute = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateRouteDto }) =>
        routesApi.update(id, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ["routes"] });
        queryClient.invalidateQueries({ queryKey: ["routes", id] });
      },
    });

  const useDeleteRoute = () =>
    useMutation({
      mutationFn: (id: string) => routesApi.delete(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["routes"] });
        queryClient.invalidateQueries({ queryKey: ["routes-summary"] });
      },
    });

  const useCreateTask = () =>
    useMutation({
      mutationFn: (data: CreateTaskDto) => routesApi.createTask(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["routes"] });
      },
    });

  const useUpdateTask = () =>
    useMutation({
      mutationFn: ({ id, data }: any) => routesApi.updateTask(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["routes"] });
      },
    });

  const useDeleteTask = () =>
    useMutation({
      mutationFn: (id: string) => routesApi.deleteTask(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["routes"] });
      },
    });

  return {
    useGetAllRoutes,
    useGetRouteById,
    useGetSummary,
    useGetAvailableTasks,
    useGetTasksByRoute,
    useGetAllTasks,
    useGetTaskById,
    useCreateRoute,
    useUpdateRoute,
    useDeleteRoute,
    useCreateTask,
    useUpdateTask,
    useDeleteTask,
    useMarkStopVisited,
    useFinalizeTask,
  };
};

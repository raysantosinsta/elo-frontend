/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useRoutes.ts
import {
  useMutation,
  useQuery,
  useQueryClient
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

export const useRoutes = () => {
  const queryClient = useQueryClient();

  // =============================================
  // 🚀 GET ALL ROUTES (SEM TASKS PARA EVITAR FLOOD)
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
        // Retornar rotas sem tasks para evitar flood
        return routes.map((route) => ({
          ...route,
          tasks: [],
        }));
      },
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
      retry: 1,
      retryDelay: 1000,
    });

  // =============================================
  // GET ROUTE BY ID (SEM TASKS AUTOMÁTICAS)
  // =============================================
  const useGetRouteById = (id: string) =>
    useQuery({
      queryKey: ["routes", id],
      queryFn: async () => {
        const { data } = await routesApi.getById(id);
        const route = data as Route;
        return {
          ...route,
          tasks: [], // Não buscar tasks automaticamente para evitar erro 404
        };
      },
      enabled: !!id,
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      retry: 1,
    });

  // =============================================
  // GET TASKS BY ROUTE (DESABILITADO POR PADRÃO)
  // =============================================
  // 🔥 IMPORTANTE: Este hook só será chamado se você passar enabled: true manualmente
  const useGetTasksByRoute = (routeId: string, enabled: boolean = false) =>
    useQuery({
      queryKey: ["tasks-by-route", routeId],
      queryFn: async () => {
        try {
          const { data } = await routesApi.getRouteTasks(routeId);
          return data as TaskInfo[];
        } catch (error) {
          console.error(`Erro ao buscar tasks da rota ${routeId}:`, error);
          return [];
        }
      },
      enabled: !!routeId && enabled, // 🔥 Só executa se enabled = true
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      retry: 0, // 🔥 Não tentar novamente em caso de erro
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
      staleTime: 1000 * 60 * 2,
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
      staleTime: 1000 * 30,
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

  // =============================================
  // MUTATIONS
  // =============================================

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
        queryClient.invalidateQueries({
          queryKey: ["routes", variables.routeId],
        });
      },
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

      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      },
    });

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
    // Gets
    useGetAllRoutes,
    useGetRouteById,
    useGetSummary,
    useGetAvailableTasks,
    useGetTasksByRoute,
    useGetAllTasks,
    useGetTaskById,
    // Mutations
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
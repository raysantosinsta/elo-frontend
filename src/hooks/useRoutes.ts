// hooks/useRoutes.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  routesApi,
  Route,
  CreateRouteDto,
  UpdateRouteDto,
  RouteStats,
  OptimizeRouteDto,
  FinalizeTaskDto,
  AvailableTask,
  TaskInfo, // ← ADICIONE ESTE
} from "../services/api";

export const useRoutes = () => {
  const queryClient = useQueryClient();

  // =============================================
  // QUERIES (GET) - Custom Hooks
  // =============================================

  /**
   * Hook personalizado para buscar todas as rotas da empresa (COM TASKS)
   */
  const useGetAllRoutes = (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    useQuery({
      queryKey: ["routes", params],
      queryFn: async () => {
        const { data } = await routesApi.getAll(params);

        // Buscar tasks para cada rota em paralelo
        const routesWithTasks = await Promise.all(
          (data as Route[]).map(async (route) => {
            try {
              const tasksResponse = await routesApi.getRouteTasks(route.id);
              return {
                ...route,
                tasks: tasksResponse.data as TaskInfo[],
              };
            } catch (error) {
              console.error(`Erro ao buscar tasks da rota ${route.id}:`, error);
              return {
                ...route,
                tasks: [],
              };
            }
          }),
        );

        return routesWithTasks;
      },
    });

  /**
   * Hook personalizado para buscar uma rota específica por ID (COM TASKS)
   */
  const useGetRouteById = (id: string) =>
    useQuery({
      queryKey: ["routes", id],
      queryFn: async () => {
        const { data } = await routesApi.getById(id);

        try {
          const tasksResponse = await routesApi.getRouteTasks(id);
          return {
            ...(data as Route),
            tasks: tasksResponse.data as TaskInfo[],
          };
        } catch (error) {
          console.error(`Erro ao buscar tasks da rota ${id}:`, error);
          return {
            ...(data as Route),
            tasks: [],
          };
        }
      },
      enabled: !!id,
    });

  /**
   * Hook personalizado para buscar estatísticas resumidas das rotas
   */
  const useGetSummary = () =>
    useQuery({
      queryKey: ["routes-summary"],
      queryFn: async () => {
        const { data } = await routesApi.getSummary();
        return data as RouteStats;
      },
    });

  /**
   * Hook personalizado para buscar tarefas disponíveis para rota (com localização)
   */
  const useGetAvailableTasks = (params?: {
    startDate?: string;
    endDate?: string;
    assignedToId?: string;
  }) =>
    useQuery({
      queryKey: ["available-tasks", params],
      queryFn: async () => {
        const { data } = await routesApi.getAvailableTasks(params);
        return data as AvailableTask[];
      },
    });

  // =============================================
  // MUTATIONS (POST, PATCH, DELETE)
  // =============================================

  // ... todas as mutations permanecem iguais ...
  const useCreateRoute = () =>
    useMutation({
      mutationFn: (newRoute: CreateRouteDto) => routesApi.create(newRoute),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["routes"] });
        queryClient.invalidateQueries({ queryKey: ["routes-summary"] });
      },
    });

  const useUpdateRoute = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateRouteDto }) =>
        routesApi.update(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["routes"] });
        queryClient.invalidateQueries({ queryKey: ["routes", variables.id] });
        queryClient.invalidateQueries({ queryKey: ["routes-summary"] });
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

  const useDuplicateRoute = () =>
    useMutation({
      mutationFn: ({
        id,
        data,
      }: {
        id: string;
        data: { title?: string; routeDate?: string; description?: string };
      }) => routesApi.duplicate(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["routes"] });
        queryClient.invalidateQueries({ queryKey: ["routes-summary"] });
      },
    });

  const useConvertToTasks = () =>
    useMutation({
      mutationFn: ({
        id,
        data,
      }: {
        id: string;
        data: { columnId?: string; userAssignedId?: string };
      }) => routesApi.convertToTasks(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["routes", variables.id] });
        queryClient.invalidateQueries({ queryKey: ["routes"] });
      },
    });

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
        queryClient.invalidateQueries({ queryKey: ["routes"] });
        queryClient.invalidateQueries({ queryKey: ["routes-summary"] });
      },
    });

  const useOptimizeRoute = () =>
    useMutation({
      mutationFn: (data: OptimizeRouteDto) => routesApi.optimizeRoute(data),
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
        queryClient.invalidateQueries({ queryKey: ["available-tasks"] });
      },
    });

  return {
    // Query Hooks
    useGetAllRoutes,
    useGetRouteById,
    useGetSummary,
    useGetAvailableTasks,
    // Mutation Hooks
    useCreateRoute,
    useUpdateRoute,
    useDeleteRoute,
    useDuplicateRoute,
    useConvertToTasks,
    useMarkStopVisited,
    useOptimizeRoute,
    useFinalizeTask,
  };
};

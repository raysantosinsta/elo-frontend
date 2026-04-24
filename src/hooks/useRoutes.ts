/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useRoutes.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, {
  routesApi,
  Route,
  CreateRouteDto,
  UpdateRouteDto,
  RouteStats,
  OptimizeRouteDto,
  FinalizeTaskDto,
  AvailableTask,
  TaskInfo,
  CreateTaskDto, // ← ADICIONE ESTE
  Task, // ← ADICIONE ESTE
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
              console.log(`📊 Tasks da rota ${route.id}:`, tasksResponse.data); // 🔥 ADICIONE

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
  // NOVOS QUERIES PARA TAREFAS
  // =============================================

  /**
   * Hook para buscar tarefas associadas a uma rota
   */
  const useGetTasksByRoute = (routeId: string) =>
    useQuery({
      queryKey: ["tasks-by-route", routeId],
      queryFn: async () => {
        const { data } = await routesApi.getRouteTasks(routeId);
        return data as TaskInfo[];
      },
      enabled: !!routeId,
    });

  /**
   * Hook para buscar todas as tarefas (com paginação e filtros)
   */
  const useGetAllTasks = (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    assignedToId?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    useQuery({
      queryKey: ["tasks", params],
      queryFn: async () => {
        const { data } = await routesApi.getAllTasks(params);
        return data;
      },
    });

  /**
   * Hook para buscar uma tarefa específica por ID
   */
  const useGetTaskById = (id: string) =>
    useQuery({
      queryKey: ["tasks", id],
      queryFn: async () => {
        const { data } = await routesApi.getTaskById(id);
        return data as Task;
      },
      enabled: !!id,
    });

  // =============================================
  // MUTATIONS (POST, PATCH, DELETE)
  // =============================================

  const useCreateRoute = () =>
    useMutation({
      mutationFn: async (data: any) => {
        console.log("📤 [useCreateRoute] Enviando requisição:", data);
        const response = await api.post("/routes", data);
        console.log("📥 [useCreateRoute] Resposta recebida:", response.data);
        return response.data;
      },
      onError: (error: any) => {
        console.error("❌ [useCreateRoute] Erro na mutation:", error);
      },
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
        // Invalidar também as tarefas da rota
        queryClient.invalidateQueries({
          queryKey: ["tasks-by-route", variables.routeId],
        });
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
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      },
    });

  // =============================================
  // NOVAS MUTATIONS PARA TAREFAS
  // =============================================

  /**
   * Mutation para criar uma nova tarefa
   */
  const useCreateTask = () =>
    useMutation({
      mutationFn: (newTask: CreateTaskDto) => routesApi.createTask(newTask),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["available-tasks"] });
        // Se a tarefa tem rota associada, invalidar também
        if (variables.routeId) {
          queryClient.invalidateQueries({
            queryKey: ["tasks-by-route", variables.routeId],
          });
          queryClient.invalidateQueries({
            queryKey: ["routes", variables.routeId],
          });
        }
      },
    });

  /**
   * Mutation para atualizar uma tarefa existente
   */
  const useUpdateTask = () =>
    useMutation({
      mutationFn: ({
        id,
        data,
      }: {
        id: string;
        data: Partial<CreateTaskDto>;
      }) => routesApi.updateTask(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["tasks", variables.id] });
        queryClient.invalidateQueries({ queryKey: ["available-tasks"] });
        // Invalidar também as rotas que possam conter esta tarefa
        queryClient.invalidateQueries({ queryKey: ["routes"] });
      },
    });

  /**
   * Mutation para deletar uma tarefa
   */
  const useDeleteTask = () =>
    useMutation({
      mutationFn: (id: string) => routesApi.deleteTask(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["available-tasks"] });
        queryClient.invalidateQueries({ queryKey: ["routes"] });
      },
    });

  return {
    // Query Hooks
    useGetAllRoutes,
    useGetRouteById,
    useGetSummary,
    useGetAvailableTasks,
    // Novos Query Hooks
    useGetTasksByRoute,
    useGetAllTasks,
    useGetTaskById,
    // Mutation Hooks
    useCreateRoute,
    useUpdateRoute,
    useDeleteRoute,
    useDuplicateRoute,
    useConvertToTasks,
    useMarkStopVisited,
    useOptimizeRoute,
    useFinalizeTask,
    // Novos Mutation Hooks
    useCreateTask,
    useUpdateTask,
    useDeleteTask,
  };
};

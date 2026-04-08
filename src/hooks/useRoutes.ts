// hooks/useRoutes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  routesApi, 
  Route, 
  CreateRouteDto, 
  UpdateRouteDto, 
  RouteStats, 
  OptimizeRouteDto, 
  FinalizeTaskDto,
  AvailableTask 
} from '../services/api';

export const useRoutes = () => {
  const queryClient = useQueryClient();

  // =============================================
  // QUERIES (GET) - Custom Hooks
  // =============================================

  /**
   * Hook personalizado para buscar todas as rotas da empresa
   */
  const useGetAllRoutes = (params?: { status?: string; startDate?: string; endDate?: string }) =>
    useQuery({
      queryKey: ['routes', params],
      queryFn: async () => {
        const { data } = await routesApi.getAll(params);
        return data as Route[];
      },
    });

  /**
   * Hook personalizado para buscar uma rota específica por ID
   */
  const useGetRouteById = (id: string) =>
    useQuery({
      queryKey: ['routes', id],
      queryFn: async () => {
        const { data } = await routesApi.getById(id);
        return data as Route;
      },
      enabled: !!id,
    });

  /**
   * Hook personalizado para buscar estatísticas resumidas das rotas
   */
  const useGetSummary = () =>
    useQuery({
      queryKey: ['routes-summary'],
      queryFn: async () => {
        const { data } = await routesApi.getSummary();
        return data as RouteStats;
      },
    });

  /**
   * Hook personalizado para buscar tarefas disponíveis para rota (com localização)
   */
  const useGetAvailableTasks = (params?: { startDate?: string; endDate?: string; assignedToId?: string }) =>
    useQuery({
      queryKey: ['available-tasks', params],
      queryFn: async () => {
        const { data } = await routesApi.getAvailableTasks(params);
        return data as AvailableTask[];
      },
    });

  // =============================================
  // MUTATIONS (POST, PATCH, DELETE)
  // =============================================

  /**
   * Hook personalizado para criar uma nova rota
   */
  const useCreateRoute = () =>
    useMutation({
      mutationFn: (newRoute: CreateRouteDto) => routesApi.create(newRoute),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['routes'] });
        queryClient.invalidateQueries({ queryKey: ['routes-summary'] });
      },
    });

  /**
   * Hook personalizado para atualizar uma rota existente
   */
  const useUpdateRoute = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateRouteDto }) =>
        routesApi.update(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['routes'] });
        queryClient.invalidateQueries({ queryKey: ['routes', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['routes-summary'] });
      },
    });

  /**
   * Hook personalizado para remover uma rota
   */
  const useDeleteRoute = () =>
    useMutation({
      mutationFn: (id: string) => routesApi.delete(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['routes'] });
        queryClient.invalidateQueries({ queryKey: ['routes-summary'] });
      },
    });

  /**
   * Hook personalizado para duplicar uma rota existente
   */
const useDuplicateRoute = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; routeDate?: string; description?: string } }) =>
      routesApi.duplicate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['routes-summary'] });
    },
  });

  /**
   * Hook personalizado para converter uma rota em tarefas
   */
  const useConvertToTasks = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: { columnId?: string; userAssignedId?: string } }) =>
        routesApi.convertToTasks(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['routes', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['routes'] });
      },
    });

  /**
   * Hook personalizado para marcar uma parada como visitada
   */
  const useMarkStopVisited = () =>
    useMutation({
      mutationFn: ({ routeId, stopId, notes }: { routeId: string; stopId: string; notes?: string }) =>
        routesApi.markStopVisited(routeId, stopId, notes),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['routes', variables.routeId] });
        queryClient.invalidateQueries({ queryKey: ['routes'] });
        queryClient.invalidateQueries({ queryKey: ['routes-summary'] });
      },
    });

  /**
   * Hook personalizado para otimizar a ordem das tarefas
   */
  const useOptimizeRoute = () =>
    useMutation({
      mutationFn: (data: OptimizeRouteDto) => routesApi.optimizeRoute(data),
    });

  /**
   * Hook personalizado para finalizar uma tarefa
   */
  const useFinalizeTask = () =>
    useMutation({
      mutationFn: ({ taskId, data }: { taskId: string; data: FinalizeTaskDto }) =>
        routesApi.finalizeTask(taskId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
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
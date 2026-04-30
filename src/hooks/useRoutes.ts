/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useRoutes.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export const useRoutes = () => {
  const queryClient = useQueryClient();

  // =============================================
  // 🚀 HELPER: buscar tasks com cache (ANTI-FLOOD)
  // =============================================
  const getTasksWithCache = async (routeId: string) => {
    const cacheKey = ["tasks-by-route", routeId];

    const cached = queryClient.getQueryData<TaskInfo[]>(cacheKey);
    if (cached) return cached;

    const { data } = await routesApi.getRouteTasks(routeId);

    queryClient.setQueryData(cacheKey, data);

    return data as TaskInfo[];
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
        // 🔥 Atualiza apenas o necessário (evita flood)
        queryClient.invalidateQueries({
          queryKey: ["routes", variables.routeId],
        });

        queryClient.invalidateQueries({
          queryKey: ["tasks-by-route", variables.routeId],
        });

        // ⚠️ NÃO invalidar tudo
        // ❌ queryClient.invalidateQueries(["routes"])  ← EVITE
        // ❌ queryClient.invalidateQueries(["routes-summary"]) ← só se precisar mesmo
      },
    });

  // =============================================
  // 🚀 GET ALL ROUTES (OTIMIZADO)
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

        // 🔥 LIMITAR CONCORRÊNCIA (ANTI-THROTTLE)
        const CONCURRENCY_LIMIT = 5;

        const results: Route[] = [];

        for (let i = 0; i < routes.length; i += CONCURRENCY_LIMIT) {
          const chunk = routes.slice(i, i + CONCURRENCY_LIMIT);

          const chunkResults = await Promise.all(
            chunk.map(async (route) => {
              try {
                const tasks = await getTasksWithCache(route.id);

                return {
                  ...route,
                  tasks,
                };
              } catch (error) {
                console.error(
                  `Erro ao buscar tasks da rota ${route.id}`,
                  error,
                );
                return {
                  ...route,
                  tasks: [],
                };
              }
            }),
          );

          results.push(...chunkResults);
        }

        return results;
      },
      // 🔥 ALTERAR ESTAS CONFIGURAÇÕES
      staleTime: 1000 * 10, // Mudar para 10 segundos (ou 0 para sempre buscar)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true, // 🔥 Mudar para true
      // 🔥 Adicionar esta configuração
      gcTime: 1000 * 60 * 5, // Manter no cache por 5 minutos (antigo cacheTime)
    });

  // =============================================
  // GET ROUTE BY ID
  // =============================================
  const useGetRouteById = (id: string) =>
    useQuery({
      queryKey: ["routes", id],
      queryFn: async () => {
        const { data } = await routesApi.getById(id);

        const tasks = await getTasksWithCache(id);

        return {
          ...(data as Route),
          tasks,
        };
      },
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
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
    });

  const useGetAvailableTasks = (params?: any) =>
    useQuery({
      queryKey: ["available-tasks", params],
      queryFn: async () => {
        const { data } = await routesApi.getAvailableTasks(params);
        return data as AvailableTask[];
      },
      staleTime: 1000 * 60 * 2,
    });

  // =============================================
  // TASKS
  // =============================================
  const useGetTasksByRoute = (routeId: string) =>
    useQuery({
      queryKey: ["tasks-by-route", routeId],
      queryFn: async () => {
        const { data } = await routesApi.getRouteTasks(routeId);
        return data as TaskInfo[];
      },
      enabled: !!routeId,
      staleTime: 1000 * 60 * 5,
    });

  const useGetAllTasks = (params?: any) =>
    useQuery({
      queryKey: ["tasks", params],
      queryFn: async () => {
        const { data } = await routesApi.getAllTasks(params);
        return data;
      },
      staleTime: 1000 * 60 * 2,
    });

  const useGetTaskById = (id: string) =>
    useQuery({
      queryKey: ["tasks", id],
      queryFn: async () => {
        const { data } = await routesApi.getTaskById(id);
        return data as Task;
      },
      enabled: !!id,
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
        // 🔥 Atualiza apenas o essencial
        queryClient.invalidateQueries({ queryKey: ["tasks"] });

        // Se você souber a rota, melhor ainda:
        // queryClient.invalidateQueries(["tasks-by-route", routeId])

        // ⚠️ Evitar isso aqui:
        // ❌ invalidateQueries(["routes"]) em massa
      },
    });

  // =============================================
  // MUTATIONS
  // =============================================

  const useCreateRoute = () =>
    useMutation({
      mutationFn: (data: CreateRouteDto) => routesApi.create(data),
      onSuccess: async () => {
        // 🔥 Isso já é suficiente - o React Query vai atualizar automaticamente
        await queryClient.invalidateQueries({ queryKey: ["routes"] });

        // Se você tem queries com parâmetros (filtros), invalida também
        await queryClient.invalidateQueries({
          queryKey: ["routes"],
          exact: false,
        });

        // Se tiver summary, invalida também
        queryClient.invalidateQueries({ queryKey: ["routes-summary"] });
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

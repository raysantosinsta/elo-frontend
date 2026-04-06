/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/use-kanban-boards.ts - VERSÃO CORRIGIDA
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface KanbanFilters {
  startDate?: string;
  endDate?: string;
  dateType?: "productionStartedAt" | "dueDate";
  isOverdue?: boolean;
  isUpcoming?: boolean;
  assignedToId?: string;
  supplierId?: string;
  productRef?: string;
  stageName?: string;
}

interface UseKanbanBoardsProps {
  selectedFlowIds: string[];
  filters: KanbanFilters;
  enabled?: boolean;
}

export const useKanbanBoards = ({
  selectedFlowIds,
  filters,
  enabled = true,
}: UseKanbanBoardsProps) => {
  const queryClient = useQueryClient();

  const queryKey = ["kanban-boards", selectedFlowIds, filters];

  const queryFn = async () => {
    console.log(`📡 [${new Date().toISOString()}] Buscando boards via useQuery`);

    if (selectedFlowIds.length === 0) {
      console.log("⚠️ Nenhum fluxo selecionado");
      return [];
    }

    const validFlowIds = selectedFlowIds.filter((id) => id);

    if (validFlowIds.length === 0) {
      console.log("⚠️ Nenhum fluxo válido");
      return [];
    }

    // 🔥 Verificar se há filtros ativos
    const hasActiveFilters = !!(
      filters.startDate ||
      filters.endDate ||
      filters.isOverdue ||
      filters.isUpcoming ||
      (filters.assignedToId && filters.assignedToId !== "all") ||
      (filters.supplierId && filters.supplierId !== "all") ||
      filters.productRef ||
      filters.stageName
    );

    // 🔥 LOG DOS FILTROS
    console.log("🔍 [useKanbanBoards] Filtros recebidos:", {
      isOverdue: filters.isOverdue,
      isUpcoming: filters.isUpcoming,
      startDate: filters.startDate,
      endDate: filters.endDate,
      dateType: filters.dateType,
      hasActiveFilters,
    });

    const promises = validFlowIds.map(async (flowId) => {
      const params = new URLSearchParams();

      // 🔥 CORREÇÃO: Prioridade para filtros de status (overdue/upcoming)
      if (filters.isOverdue) {
        params.set("isOverdue", "true");
        // 🔥 Importante: não enviar dateType quando for overdue/upcoming
        // pois o backend já usa dueDate por padrão
      } else if (filters.isUpcoming) {
        params.set("isUpcoming", "true");
      } else if (filters.startDate || filters.endDate) {
        // Filtros de data explícitos
        if (filters.startDate) params.set("startDate", filters.startDate);
        if (filters.endDate) params.set("endDate", filters.endDate);
        if (filters.dateType) params.set("dateType", filters.dateType);
      }

      // Filtros de entidades
      if (filters.assignedToId && filters.assignedToId !== "all")
        params.set("assignedToId", filters.assignedToId);
      if (filters.supplierId && filters.supplierId !== "all")
        params.set("supplierId", filters.supplierId);
      if (filters.productRef) params.set("productRef", filters.productRef);
      if (filters.stageName && filters.stageName.trim() !== "") {
        params.set("stageName", filters.stageName.trim());
      }

      // 🔥 DECISÃO DA URL
      let url: string;
      const hasParams = params.toString().length > 0;

      if (hasParams) {
        url = `/flow/${flowId}/filtered-board?${params.toString()}`;
      } else {
        url = `/flow/${flowId}/board`;
      }

      console.log(`📡 Buscando: ${url}`);

      try {
        const response = await api.get(url);
        return response.data;
      } catch (error: any) {
        console.error(`❌ Erro no board ${flowId}:`, error);
        return {
          id: flowId,
          name: "Erro ao carregar",
          stages: [],
        };
      }
    });

    const results = await Promise.all(promises);
    console.log(`✅ Boards carregados: ${results.length}`);
    
    results.forEach(board => {
      console.log(`📋 Board: ${board.name} - ${board.stages.length} colunas`);
      board.stages.forEach((stage: any) => {
        console.log(`   - ${stage.name}: ${stage.items.length} itens`);
      });
    });

    return results;
  };

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: enabled && selectedFlowIds.length > 0,
    staleTime: 30 * 1000,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: 1000,
  });

  const invalidateBoards = () => {
    console.log("🔄 Invalidando cache de boards");
    queryClient.invalidateQueries({ queryKey: ["kanban-boards"] });
  };

  return {
    ...query,
    boards: query.data || [],
    invalidateBoards,
  };
};
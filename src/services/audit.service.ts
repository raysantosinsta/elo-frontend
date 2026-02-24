/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api";

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldData: any;
  newData: any;
  metadata: any;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  // FALTA:
  companyId?: string; // Importante para multi-tenancy
}

export interface AuditFilters {
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const auditService = {
  async getLogs(
    filters: AuditFilters = {},
    page = 1,
    limit = 10, // <- Mude para 10 para consistência
  ): Promise<PaginatedResponse<AuditLog>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.entityId && { entityId: filters.entityId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await api.get(`/audit?${params}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      throw error;
    }
  },

  async getEntityHistory(entity: string, id: string): Promise<AuditLog[]> {
    try {
      const response = await api.get(`/audit/entity/${entity}/${id}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      throw error;
    }
  },
};

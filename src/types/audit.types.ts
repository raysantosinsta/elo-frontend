/* eslint-disable @typescript-eslint/no-explicit-any */
// types/audit.types.ts
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "MOVE"
  | "ASSIGN"
  | "COMPLETE"
  | "CREATE_ITEM"
  | "UPDATE_ITEM"
  | "DELETE_ITEM"
  | "MOVE_ITEM"
  | "ADVANCE_ITEM"
  | "ADD_IMAGE"
  | "ADD_AUDIO"
  | "ADD_VIDEO"
  | "DELETE_IMAGE"
  | "DELETE_AUDIO"
  | "DELETE_VIDEO"
  | "APPLY_TEMPLATE"
  | "SAVE_TEMPLATE"
  | "DELETE_TEMPLATE"
  | "CREATE_STAGE"
  | "UPDATE_STAGE"
  | "DELETE_STAGE";
  

export type AuditEntity =
  | "FLOW"
  | "FLOW_ITEM"
  | "FLOW_STAGE"
  | "FLOW_TEMPLATE"
  | "TASK"
  | "BUDGET"
  | "USER"
  | "SUPPLIER"
  | "MATERIAL"
  | "PRODUCT";

// services/audit.service.ts
export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldData: Record<string, any> | null;  // Pode vir como objeto ou null
  newData: Record<string, any> | null;  // Pode vir como objeto ou null
  metadata: Record<string, any> | null; // Pode vir como objeto ou null
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuditFilters {
  entity?: AuditEntity;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

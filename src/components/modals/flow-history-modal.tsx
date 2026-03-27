/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Calendar,
  User,
  ArrowRight,
  Clock,
  Info,
  Pencil,
  Package,
  Hash,
  Tag,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Interface para o log de auditoria
export interface AuditLogEntry {
  id: string;
  createdAt: string;
  action: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
  oldData?: any;
  newData?: any;
  metadata?: any;
}

interface FlowHistoryModalProps {
  logs: AuditLogEntry[];
  isLoading?: boolean;
  // Dados para resolver IDs em nomes
  users?: { id: string; name: string }[];
  suppliers?: { id: string; name: string }[];
  stages?: { id: string; name: string }[];
}

// Mapeamento de ações para ícones e cores
const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  CREATE_ITEM: { icon: Info, color: "text-green-600 bg-green-50", label: "Criação" },
  UPDATE_ITEM: { icon: Pencil, color: "text-blue-600 bg-blue-50", label: "Atualização" },
  MOVE_ITEM: { icon: ArrowRight, color: "text-purple-600 bg-purple-50", label: "Movimentação" },
  DELETE_ITEM: { icon: Info, color: "text-red-600 bg-red-50", label: "Exclusão" },
  ADD_IMAGE: { icon: Tag, color: "text-orange-600 bg-orange-50", label: "Imagem adicionada" },
  ADD_AUDIO: { icon: Clock, color: "text-blue-600 bg-blue-50", label: "Áudio adicionado" },
  ADD_VIDEO: { icon: Info, color: "text-orange-600 bg-orange-50", label: "Vídeo adicionado" },
  DELETE_IMAGE: { icon: Tag, color: "text-red-600 bg-red-50", label: "Imagem removida" },
  DELETE_AUDIO: { icon: Clock, color: "text-red-600 bg-red-50", label: "Áudio removido" },
  DELETE_VIDEO: { icon: Info, color: "text-red-600 bg-red-50", label: "Vídeo removido" },
  BULK_UPDATE_ITEM_STAGES: { icon: Calendar, color: "text-amber-600 bg-amber-50", label: "Ajuste de Cronograma" },
  UPDATE_ITEM_STAGE_DEADLINE: { icon: Calendar, color: "text-amber-600 bg-amber-50", label: "Prazo Alterado" },
};

const FIELD_NAMES: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  quantity: "Quantidade",
  productRef: "Referência",
  status: "Status",
  priority: "Prioridade",
  dueDate: "Prazo final",
  productionStartedAt: "Início produção",
  deliveryAt: "Data entrega",
  supplierId: "Fornecedor",
  assignedToId: "Responsável",
  stageId: "Etapa",
  orderNumber: "Nº pedido",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
  EM_ANDAMENTO: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  CONCLUIDO: { label: "Concluído", color: "bg-green-100 text-green-700" },
  ATRASADO: { label: "Atrasado", color: "bg-red-100 text-red-700" },
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Baixa", color: "bg-slate-100 text-slate-700" },
  2: { label: "Média", color: "bg-blue-100 text-blue-700" },
  3: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  4: { label: "Urgente", color: "bg-red-100 text-red-700" },
};

const formatDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const formatValue = (value: any, field?: string): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (field?.includes("Date") || field?.includes("At")) {
    try {
      return format(new Date(value), "dd/MM/yyyy");
    } catch {
      return String(value);
    }
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  return String(value);
};

const CreationDetails = ({
  newData,
  users = [],
  suppliers = [],
  stages = [],
}: any) => {
  if (!newData || Object.keys(newData).length === 0) return null;

  const displayFields = [
    { key: "title", label: "Título", icon: <Tag size={12} /> },
    { key: "productRef", label: "Referência", icon: <Hash size={12} /> },
    { key: "quantity", label: "Qtd Inicial", icon: <Package size={12} /> },
    { key: "status", label: "Status", icon: <Info size={12} /> },
    { key: "dueDate", label: "Prazo Final", icon: <Calendar size={12} /> },
    { key: "stageId", label: "Etapa Inicial", icon: <Layers size={12} /> },
  ];

  const renderValue = (key: string, value: any) => {
    if (!value) return null;
    if (key === "stageId") return stages.find((s: any) => s.id === value)?.name;
    if (key === "dueDate") return format(new Date(value), "dd/MM/yyyy");
    return String(value);
  };

  return (
    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Dados do Item Criado</p>
      <div className="grid grid-cols-2 gap-2">
        {displayFields.map((f) => {
          const val = renderValue(f.key, newData[f.key]);
          if (!val) return null;
          return (
            <div key={f.key} className="text-[11px]">
              <span className="text-slate-400 block">{f.label}:</span>
              <span className="font-medium text-slate-700">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FieldChange = ({ field, oldValue, newValue }: any) => {
  const fieldName = FIELD_NAMES[field] || field;
  if (field === "updatedAt" || field === "createdAt") return null;
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return null;

  return (
    <div className="text-xs border-b border-slate-100 last:border-0 py-2">
      <div className="font-medium text-slate-700 mb-1">{fieldName}</div>
      <div className="flex items-center gap-2 text-slate-600">
        <span className="line-through text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{formatValue(oldValue, field)}</span>
        <ArrowRight size={12} className="text-slate-400" />
        <span className="font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{formatValue(newValue, field)}</span>
      </div>
    </div>
  );
};

export function FlowHistoryModal({
  logs,
  isLoading = false,
  users = [],
  suppliers = [],
  stages = [],
}: FlowHistoryModalProps) {
  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;

  if (!logs || logs.length === 0) return <div className="text-center py-12 text-slate-400">Nenhum histórico encontrado</div>;

  const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-4">
        {sortedLogs.map((log, index) => {
          const config = ACTION_CONFIG[log.action] || { icon: Info, color: "text-slate-600 bg-slate-50", label: log.action.replace(/_/g, " ") };
          const Icon = config.icon;

          return (
            <div key={log.id} className={cn("relative pl-6 pb-4", index !== sortedLogs.length - 1 && "border-l-2 border-slate-200")}>
              <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-white bg-slate-300" />

              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", config.color)}><Icon size={14} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{config.label}</p>
                    <time className="text-[11px] text-slate-500">{formatDateTime(log.createdAt)}</time>
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    <User size={12} className="text-slate-400 shrink-0" />
                    <p className="text-xs text-slate-600">{log.user?.name || "Sistema"}</p>
                  </div>

                  {/* 🟢 DETALHES DE CRIAÇÃO */}
                  {log.action === "CREATE_ITEM" && (
                    <CreationDetails newData={log.newData} users={users} suppliers={suppliers} stages={stages} />
                  )}

                  {/* 🟣 DETALHES DE MOVIMENTAÇÃO */}
                  {log.action === "MOVE_ITEM" && log.metadata && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="bg-white font-normal">{log.metadata.fromStageName || "Origem"}</Badge>
                      <ArrowRight size={12} className="text-slate-400" />
                      <Badge variant="outline" className="bg-white font-bold text-purple-600 border-purple-200">{log.metadata.toStageName || "Destino"}</Badge>
                    </div>
                  )}

                  {/* 🔵 DETALHES DE ATUALIZAÇÃO (CAMPOS) */}
                  {log.action === "UPDATE_ITEM" && log.oldData && log.newData && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="space-y-1">
                        {Object.keys(log.newData).map((field) => (
                          <FieldChange key={field} field={field} oldValue={log.oldData[field]} newValue={log.newData[field]} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 🟠 DETALHES DE MÍDIA (CORREÇÃO DO JSON) */}
                  {["ADD_IMAGE", "ADD_AUDIO", "ADD_VIDEO", "DELETE_IMAGE", "DELETE_AUDIO", "DELETE_VIDEO"].includes(log.action) && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded border border-slate-200">
                        <Tag size={12} className="text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Arquivo:</span>
                        <p className="text-xs font-medium text-slate-700 truncate max-w-[350px]">
                          {log.metadata?.filename || "Arquivo processado"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 🟡 DETALHES DE CRONOGRAMA (CORREÇÃO DO JSON) */}
                  {["BULK_UPDATE_ITEM_STAGES", "UPDATE_ITEM_STAGE_DEADLINE"].includes(log.action) && (
                    <div className="mt-2 p-3 bg-amber-50/50 rounded-lg border border-amber-100 flex items-start gap-2">
                      <Calendar size={14} className="text-amber-600 mt-0.5" />
                      <div className="flex flex-col">
                        <p className="text-xs font-semibold text-amber-800">Atualização de Prazos</p>
                        <p className="text-[11px] text-amber-700">
                          {log.metadata?.successfulUpdates || 1} etapa(s) do cronograma foram ajustadas.
                          {log.metadata?.cascadeApplied && " As etapas futuras foram recalculadas automaticamente."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Calendar, User, ArrowRight, Clock, Info, Pencil, Package, Hash, Tag, Layers } from "lucide-react";
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
  ADD_IMAGE: { icon: Info, color: "text-orange-600 bg-orange-50", label: "Imagem adicionada" },
  ADD_AUDIO: { icon: Info, color: "text-orange-600 bg-orange-50", label: "Áudio adicionado" },
  ADD_VIDEO: { icon: Info, color: "text-orange-600 bg-orange-50", label: "Vídeo adicionado" },
  DELETE_IMAGE: { icon: Info, color: "text-red-600 bg-red-50", label: "Imagem removida" },
  DELETE_AUDIO: { icon: Info, color: "text-red-600 bg-red-50", label: "Áudio removido" },
  DELETE_VIDEO: { icon: Info, color: "text-red-600 bg-red-50", label: "Vídeo removido" },
};

// Mapeamento de nomes de campos para nomes amigáveis
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

// Mapeamento de status para cores
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
  EM_ANDAMENTO: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  CONCLUIDO: { label: "Concluído", color: "bg-green-100 text-green-700" },
  ATRASADO: { label: "Atrasado", color: "bg-red-100 text-red-700" },
};

// Mapeamento de prioridade
const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Baixa", color: "bg-slate-100 text-slate-700" },
  2: { label: "Média", color: "bg-blue-100 text-blue-700" },
  3: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  4: { label: "Urgente", color: "bg-red-100 text-red-700" },
};

// Formatação de data
const formatDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

// Formata valor para exibição
const formatValue = (value: any, field?: string): string => {
  if (value === null || value === undefined) return "—";
  if (value === "") return "—";
  
  // Se for data
  if (field?.includes('Date') || field?.includes('At')) {
    try {
      return format(new Date(value), "dd/MM/yyyy");
    } catch {
      return String(value);
    }
  }
  
  // Se for booleano
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  
  // Se for número
  if (typeof value === "number") return String(value);
  
  return String(value);
};

// Componente para mostrar detalhes da criação
const CreationDetails = ({ 
  newData, 
  metadata,
  users = [],
  suppliers = [],
  stages = []
}: { 
  newData: any; 
  metadata?: any;
  users?: { id: string; name: string }[];
  suppliers?: { id: string; name: string }[];
  stages?: { id: string; name: string }[];
}) => {
  if (!newData || Object.keys(newData).length === 0) {
    return <p className="text-xs text-slate-400">Nenhum dado disponível</p>;
  }

  // Função para buscar nome do responsável
  const getResponsibleName = (id: string) => {
    if (!id) return null;
    const user = users.find(u => u.id === id);
    return user?.name;
  };

  // Função para buscar nome do fornecedor
  const getSupplierName = (id: string) => {
    if (!id) return null;
    const supplier = suppliers.find(s => s.id === id);
    return supplier?.name;
  };

  // Função para buscar nome da etapa
  const getStageName = (id: string) => {
    if (!id) return null;
    const stage = stages.find(s => s.id === id);
    return stage?.name;
  };

  // Ordem preferencial dos campos
  const fieldOrder = [
    { key: 'title', label: 'Título', icon: <Tag size={12} /> },
    { key: 'description', label: 'Descrição', icon: <Info size={12} /> },
    { key: 'productRef', label: 'Referência', icon: <Hash size={12} /> },
    { key: 'quantity', label: 'Quantidade', icon: <Package size={12} /> },
    { key: 'status', label: 'Status', icon: <Info size={12} /> },
    { key: 'priority', label: 'Prioridade', icon: <Info size={12} /> },
    { key: 'dueDate', label: 'Prazo final', icon: <Calendar size={12} /> },
    { key: 'productionStartedAt', label: 'Início produção', icon: <Calendar size={12} /> },
    { key: 'deliveryAt', label: 'Data entrega', icon: <Calendar size={12} /> },
    { key: 'orderNumber', label: 'Nº pedido', icon: <Hash size={12} /> },
  ];

  const formatFieldValue = (key: string, value: any) => {
    if (value === null || value === undefined) return null;
    
    // 🔥 BUSCA NOME DO RESPONSÁVEL
    if (key === 'assignedToId') {
      const name = getResponsibleName(value);
      return name ? (
        <span className="flex items-center gap-1">
          <User size={10} className="text-slate-400" />
          {name}
        </span>
      ) : null;
    }
    
    // 🔥 BUSCA NOME DO FORNECEDOR
    if (key === 'supplierId') {
      const name = getSupplierName(value);
      return name ? (
        <span className="flex items-center gap-1">
          <Package size={10} className="text-slate-400" />
          {name}
        </span>
      ) : null;
    }
    
    // 🔥 BUSCA NOME DA ETAPA
    if (key === 'stageId') {
      const name = getStageName(value);
      return name ? (
        <span className="flex items-center gap-1">
          <Layers size={10} className="text-slate-400" />
          {name}
        </span>
      ) : null;
    }
    
    // Formata status
    if (key === 'status' && STATUS_CONFIG[value]) {
      return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_CONFIG[value].color}`}>
          {STATUS_CONFIG[value].label}
        </span>
      );
    }
    
    // Formata prioridade
    if (key === 'priority' && PRIORITY_CONFIG[value]) {
      return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_CONFIG[value].color}`}>
          {PRIORITY_CONFIG[value].label}
        </span>
      );
    }
    
    // Formata datas
    if (typeof value === 'string' && value.includes('T')) {
      return format(new Date(value), "dd/MM/yyyy");
    }
    
    // Formata quantidade
    if (key === 'quantity') {
      return `${value} unidade${value !== 1 ? 's' : ''}`;
    }
    
    return String(value);
  };

  return (
    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
      <p className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1">
        <Info size={12} />
        Detalhes do item:
      </p>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {/* Campos principais */}
        {fieldOrder.map(({ key, label, icon }) => {
          const value = newData[key];
          if (value === null || value === undefined || value === '') return null;
          
          const formattedValue = formatFieldValue(key, value);
          if (formattedValue === null) return null;
          
          return (
            <div key={key} className="text-xs col-span-2 md:col-span-1">
              <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider flex items-center gap-1">
                {icon} {label}:
              </span>
              <span className="font-medium text-slate-700">
                {formattedValue}
              </span>
            </div>
          );
        })}

        {/* Responsável (se existir e não foi mostrado acima) */}
        {newData.assignedToId && !fieldOrder.some(f => f.key === 'assignedToId') && (
          <div className="text-xs col-span-2 md:col-span-1">
            <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider flex items-center gap-1">
              <User size={12} /> Responsável:
            </span>
            <span className="font-medium text-slate-700">
              {formatFieldValue('assignedToId', newData.assignedToId)}
            </span>
          </div>
        )}

        {/* Fornecedor (se existir e não foi mostrado acima) */}
        {newData.supplierId && !fieldOrder.some(f => f.key === 'supplierId') && (
          <div className="text-xs col-span-2 md:col-span-1">
            <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Package size={12} /> Fornecedor:
            </span>
            <span className="font-medium text-slate-700">
              {formatFieldValue('supplierId', newData.supplierId)}
            </span>
          </div>
        )}

        {/* Etapa (se existir e não foi mostrado acima) */}
        {newData.stageId && !fieldOrder.some(f => f.key === 'stageId') && (
          <div className="text-xs col-span-2 md:col-span-1">
            <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Layers size={12} /> Etapa:
            </span>
            <span className="font-medium text-slate-700">
              {formatFieldValue('stageId', newData.stageId)}
            </span>
          </div>
        )}
      </div>

      {/* Metadados adicionais */}
      {metadata && Object.keys(metadata).length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="text-xs font-medium text-slate-500 mb-2">Informações adicionais:</p>
          <div className="grid grid-cols-2 gap-3">
            {metadata.flowName && (
              <div className="text-xs">
                <span className="text-slate-400 block mb-0.5 text-[10px] uppercase">Fluxo:</span>
                <span className="font-medium text-slate-700 flex items-center gap-1">
                  <Layers size={10} className="text-slate-400" />
                  {metadata.flowName}
                </span>
              </div>
            )}
            {metadata.stageName && (
              <div className="text-xs">
                <span className="text-slate-400 block mb-0.5 text-[10px] uppercase">Etapa inicial:</span>
                <span className="font-medium text-slate-700">{metadata.stageName}</span>
              </div>
            )}
            {metadata.createdAt && (
              <div className="text-xs col-span-2">
                <span className="text-slate-400 block mb-0.5 text-[10px] uppercase">Criado em:</span>
                <span className="font-medium text-slate-700">
                  {format(new Date(metadata.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para mostrar alterações de campo
const FieldChange = ({ field, oldValue, newValue }: { field: string; oldValue: any; newValue: any }) => {
  const fieldName = FIELD_NAMES[field] || field;
  
  // Pula campos internos
  if (field === 'updatedAt' || field === 'createdAt') return null;
  
  // Se os valores forem iguais, não mostra
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return null;
  
  return (
    <div className="text-xs border-b border-slate-100 last:border-0 py-2">
      <div className="font-medium text-slate-700 mb-1">{fieldName}</div>
      <div className="flex items-center gap-2 text-slate-600">
        <span className="line-through text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
          {formatValue(oldValue, field)}
        </span>
        <ArrowRight size={12} className="text-slate-400" />
        <span className="font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
          {formatValue(newValue, field)}
        </span>
      </div>
    </div>
  );
};

export function FlowHistoryModal({ 
  logs, 
  isLoading = false,
  users = [],
  suppliers = [],
  stages = []
}: FlowHistoryModalProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-sm text-slate-500 font-medium">Nenhum histórico encontrado</p>
        <p className="text-xs text-slate-400 mt-1">
          As movimentações e alterações aparecerão aqui
        </p>
      </div>
    );
  }

  // Ordena logs do mais recente para o mais antigo
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-4">
        {sortedLogs.map((log, index) => {
          const config = ACTION_CONFIG[log.action] || {
            icon: Info,
            color: "text-slate-600 bg-slate-50",
            label: log.action.replace(/_/g, " "),
          };
          
          const Icon = config.icon;

          return (
            <div
              key={log.id}
              className={cn(
                "relative pl-6 pb-4",
                index !== sortedLogs.length - 1 && "border-l-2 border-slate-200"
              )}
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  "absolute left-[-8px] top-0 w-4 h-4 rounded-full border-2 border-white",
                )}
                style={{ 
                  backgroundColor: config.color.includes("bg-") 
                    ? config.color.split(" ")[1]?.replace('bg-', '') === 'green-50' ? '#22c55e' :
                      config.color.split(" ")[1]?.replace('bg-', '') === 'blue-50' ? '#3b82f6' :
                      config.color.split(" ")[1]?.replace('bg-', '') === 'purple-50' ? '#a855f7' :
                      config.color.split(" ")[1]?.replace('bg-', '') === 'red-50' ? '#ef4444' :
                      config.color.split(" ")[1]?.replace('bg-', '') === 'orange-50' ? '#f97316' :
                      '#94a3b8'
                    : '#94a3b8'
                }}
              />

              {/* Header */}
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">
                      {config.label}
                    </p>
                    <time className="text-xs text-slate-600 font-medium whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </time>
                  </div>

                  {/* Usuário */}
                  <div className="flex items-center gap-1 mt-1">
                    <User size={12} className="text-slate-500 shrink-0" />
                    <p className="text-xs text-slate-700 truncate font-medium">
                      {log.user?.name || "Usuário desconhecido"}
                      {log.metadata?.isAdmin && (
                        <span className="ml-1 text-purple-700 font-bold">(Admin)</span>
                      )}
                    </p>
                  </div>

                  {/* ========================================================== */}
                  {/* DETALHES DE CRIAÇÃO */}
                  {/* ========================================================== */}
                  {log.action === "CREATE_ITEM" && (
                    <CreationDetails 
                      newData={log.newData} 
                      metadata={log.metadata}
                      users={users}
                      suppliers={suppliers}
                      stages={stages}
                    />
                  )}

                  {/* ========================================================== */}
                  {/* DETALHES DE MOVIMENTAÇÃO */}
                  {/* ========================================================== */}
                  {log.action === "MOVE_ITEM" && log.metadata && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <Badge variant="outline" className="bg-white font-normal">
                          {log.metadata.fromStageName || "Origem"}
                        </Badge>
                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                        <Badge variant="outline" className="bg-white font-bold text-purple-600 border-purple-200">
                          {log.metadata.toStageName || "Destino"}
                        </Badge>
                      </div>

                      {/* Responsável/Fornecedor se houver - USANDO NOMES */}
                      {log.metadata.newResponsibleId && (
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                          <User size={10} className="text-slate-400" />
                          <span className="font-medium">Atribuído a:</span>{' '}
                          {users.find(u => u.id === log.metadata.newResponsibleId)?.name || 
                           log.metadata.newResponsibleName || 
                           'ID não encontrado'}
                        </p>
                      )}
                      {log.metadata.newSupplierId && (
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                          <Package size={10} className="text-slate-400" />
                          <span className="font-medium">Oficina:</span>{' '}
                          {suppliers.find(s => s.id === log.metadata.newSupplierId)?.name || 
                           log.metadata.newSupplierName || 
                           'ID não encontrado'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ========================================================== */}
                  {/* DETALHES DE ATUALIZAÇÃO */}
                  {/* ========================================================== */}
                  {log.action === "UPDATE_ITEM" && log.oldData && log.newData && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <Pencil size={12} />
                        Campos alterados:
                      </p>
                      <div className="space-y-1">
                        {Object.keys(log.newData).map((field) => {
                          if (field === 'updatedAt' || field === 'id') return null;
                          
                          const oldValue = log.oldData[field];
                          const newValue = log.newData[field];
                          
                          if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return null;
                          
                          return (
                            <FieldChange
                              key={field}
                              field={field}
                              oldValue={oldValue}
                              newValue={newValue}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ========================================================== */}
                  {/* FALLBACK PARA OUTRAS AÇÕES */}
                  {/* ========================================================== */}
                  {!['CREATE_ITEM', 'MOVE_ITEM', 'UPDATE_ITEM'].includes(log.action) && 
                   log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <pre className="text-[10px] text-slate-600 whitespace-pre-wrap">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
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
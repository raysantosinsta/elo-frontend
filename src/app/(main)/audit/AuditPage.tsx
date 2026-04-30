/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AuditFilters, AuditLog, auditService } from "@/services/audit.service";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  FilePlus,
  Filter,
  Image,
  Loader2,
  Mic,
  Move,
  Pencil,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Trash2,
  User,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// 🔥 IMPORTANTE: NENHUM COMPANYID É ENVIADO DO FRONTEND!
// O backend pega automaticamente do token/CLS

// Constantes para os selects - com "all" em vez de string vazia
const ENTITIES = [
  { value: "all", label: "Todas" },
  { value: "FLOW", label: "Fluxo" },
  { value: "FLOW_ITEM", label: "Item de Fluxo" },
  { value: "FLOW_STAGE", label: "Etapa de Fluxo" },
  { value: "FLOW_TEMPLATE", label: "Template de Fluxo" },
  { value: "TASK", label: "Tarefa" },
  { value: "BUDGET", label: "Orçamento" },
  { value: "USER", label: "Usuário" },
  { value: "SUPPLIER", label: "Fornecedor" },
  { value: "MATERIAL", label: "Material" },
  { value: "PRODUCT", label: "Produto" },
];

const ACTIONS = [
  { value: "all", label: "Todas" },
  // Ações básicas
  { value: "CREATE", label: "Criação", icon: PlusCircle },
  { value: "UPDATE", label: "Atualização", icon: Pencil },
  { value: "DELETE", label: "Exclusão", icon: Trash2 },
  { value: "MOVE", label: "Movimentação", icon: Move },
  { value: "ASSIGN", label: "Atribuição", icon: UserPlus },
  { value: "COMPLETE", label: "Conclusão", icon: CheckCircle },

  

  // Ações específicas de Flow
  { value: "CREATE_ITEM", label: "Criar Item", icon: PlusCircle },
  { value: "UPDATE_ITEM", label: "Atualizar Item", icon: Pencil },
  { value: "DELETE_ITEM", label: "Excluir Item", icon: Trash2 },
  { value: "MOVE_ITEM", label: "Mover Item", icon: Move },
  { value: "ADVANCE_ITEM", label: "Avançar Item", icon: ArrowRight },
  { value: "CREATE_STAGE", label: "Criar Etapa", icon: PlusCircle },
  { value: "UPDATE_STAGE", label: "Atualizar Etapa", icon: Pencil },
  { value: "DELETE_STAGE", label: "Excluir Etapa", icon: Trash2 },

  // Ações de mídia
  { value: "ADD_IMAGE", label: "Adicionar Imagem", icon: Image },
  { value: "ADD_AUDIO", label: "Adicionar Áudio", icon: Mic },
  { value: "ADD_VIDEO", label: "Adicionar Vídeo", icon: Video },
  { value: "DELETE_IMAGE", label: "Remover Imagem", icon: Trash2 },
  { value: "DELETE_AUDIO", label: "Remover Áudio", icon: Trash2 },
  { value: "DELETE_VIDEO", label: "Remover Vídeo", icon: Trash2 },

  // Ações de template
  { value: "APPLY_TEMPLATE", label: "Aplicar Template", icon: FilePlus },
  { value: "SAVE_TEMPLATE", label: "Salvar Template", icon: Save },
  { value: "DELETE_TEMPLATE", label: "Excluir Template", icon: Trash2 },
];

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [tempFilters, setTempFilters] = useState<AuditFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 0,
    limit: 10,
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Carregar logs - SEM companyId, o backend resolve
  const fetchLogs = async () => {
    setLoading(true);
    try {
      // 🔥 IMPORTANTE: NÃO PASSAMOS companyId!
      // O backend pega do CLS: this.cls.get('tenantId')
      const response = await auditService.getLogs(
        filters,
        pagination.page,
        pagination.limit,
      );

      console.log("📦 Dados recebidos da API:", response);
      
      setLogs(response.data);
      setPagination(response.meta);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page]);

  // Aplicar filtros
  const applyFilters = () => {
    setFilters(tempFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Limpar filtros
  const clearFilters = () => {
    setTempFilters({});
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Ícone da ação
  const getActionIcon = (action: string) => {
    const found = ACTIONS.find((a) => a.value === action);
    if (found && found.icon) {
      const Icon = found.icon;
      return <Icon className="w-4 h-4" />;
    }
    return <AlertCircle className="w-4 h-4" />;
  };

  // Cor da ação
  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: "bg-emerald-100 text-emerald-800 border-emerald-200",
      UPDATE: "bg-yellow-100 text-yellow-800 border-yellow-200",
      DELETE: "bg-red-100 text-red-800 border-red-200",
      MOVE: "bg-blue-100 text-blue-800 border-blue-200",
      ASSIGN: "bg-purple-100 text-purple-800 border-purple-200",
      COMPLETE: "bg-green-100 text-green-800 border-green-200",
      CREATE_ITEM: "bg-emerald-100 text-emerald-800 border-emerald-200",
      UPDATE_ITEM: "bg-yellow-100 text-yellow-800 border-yellow-200",
      DELETE_ITEM: "bg-red-100 text-red-800 border-red-200",
      MOVE_ITEM: "bg-blue-100 text-blue-800 border-blue-200",
      ADVANCE_ITEM: "bg-indigo-100 text-indigo-800 border-indigo-200",
      CREATE_STAGE: "bg-emerald-100 text-emerald-800 border-emerald-200",
      UPDATE_STAGE: "bg-yellow-100 text-yellow-800 border-yellow-200",
      DELETE_STAGE: "bg-red-100 text-red-800 border-red-200",
      ADD_IMAGE: "bg-pink-100 text-pink-800 border-pink-200",
      ADD_AUDIO: "bg-pink-100 text-pink-800 border-pink-200",
      ADD_VIDEO: "bg-pink-100 text-pink-800 border-pink-200",
      DELETE_IMAGE: "bg-red-100 text-red-800 border-red-200",
      DELETE_AUDIO: "bg-red-100 text-red-800 border-red-200",
      DELETE_VIDEO: "bg-red-100 text-red-800 border-red-200",
      APPLY_TEMPLATE: "bg-orange-100 text-orange-800 border-orange-200",
      SAVE_TEMPLATE: "bg-teal-100 text-teal-800 border-teal-200",
      DELETE_TEMPLATE: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[action] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Renderizar detalhes do log
  const renderLogDetails = (log: AuditLog) => {
    if (log.action === "CREATE" && log.newData) {
      return (
        <div className="text-sm">
          <span className="text-emerald-600 font-medium">
            {log.newData.title || log.newData.name || "Novo registro"}
          </span>
        </div>
      );
    }

    if (log.action === "UPDATE" && log.newData) {
      return (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-yellow-600 font-medium">
              {log.newData.name || "Fluxo atualizado"}
            </span>
          </div>
          {log.oldData && log.oldData.name && log.newData.name && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span className="line-through text-red-400">{log.oldData.name}</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="text-green-500">{log.newData.name}</span>
            </div>
          )}
        </div>
      );
    }

    if (log.action === "CREATE_ITEM" && log.newData) {
      return (
        <div className="text-sm">
          <span className="text-emerald-600 font-medium">
            Item: {log.newData.title}
          </span>
        </div>
      );
    }

    if (log.action === "UPDATE_ITEM" && log.newData) {
      return (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-yellow-600 font-medium">
              {log.newData.title || "Item atualizado"}
            </span>
          </div>
          {log.oldData && log.oldData.title && log.newData.title && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span className="line-through text-red-400">{log.oldData.title}</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="text-green-500">{log.newData.title}</span>
            </div>
          )}
        </div>
      );
    }

    if (log.action === "DELETE" && log.oldData) {
      return (
        <div className="text-sm">
          <span className="text-red-600 line-through font-medium">
            {log.oldData.title || log.oldData.name || "Registro excluído"}
          </span>
        </div>
      );
    }

    if (log.action === "DELETE_ITEM" && log.oldData) {
      return (
        <div className="text-sm">
          <span className="text-red-600 line-through font-medium">
            Item: {log.oldData.title}
          </span>
        </div>
      );
    }

    if (log.action === "MOVE_ITEM" && log.metadata) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-red-500 font-medium">
              {log.metadata.fromStageName || "?"}
            </span>
            <Move className="w-3 h-3 text-gray-400" />
            <span className="text-green-500 font-medium">
              {log.metadata.toStageName || "?"}
            </span>
          </div>
          {log.metadata.itemTitle && (
            <div className="text-xs text-gray-500">
              Item: {log.metadata.itemTitle}
            </div>
          )}
        </div>
      );
    }

    if (log.action === "ADVANCE_ITEM" && log.metadata) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <ArrowRight className="w-3 h-3 text-indigo-500" />
            <span className="text-indigo-600 font-medium">
              {log.metadata.fromStageName} → {log.metadata.toStageName}
            </span>
          </div>
          {log.metadata.itemTitle && (
            <div className="text-xs text-gray-500">
              Item: {log.metadata.itemTitle}
            </div>
          )}
        </div>
      );
    }

    if (
      log.action?.startsWith("ADD_") &&
      ["IMAGE", "AUDIO", "VIDEO"].includes(log.action.replace("ADD_", "")) &&
      log.metadata
    ) {
      const mediaType = log.action.replace("ADD_", "").toLowerCase();
      const Icon =
        mediaType === "image" ? Image : mediaType === "audio" ? Mic : Video;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-pink-600">
            <Icon className="w-3 h-3" />
            <span className="truncate max-w-[200px]">
              {log.metadata.filename}
            </span>
          </div>
          {log.metadata.size && (
            <div className="text-xs text-gray-500">
              Tamanho: {(log.metadata.size / 1024).toFixed(2)} KB
            </div>
          )}
        </div>
      );
    }

    if (log.action === "APPLY_TEMPLATE" && log.metadata) {
      return (
        <div className="space-y-1">
          <div className="text-sm text-orange-600 font-medium">
            Template: {log.metadata.templateName}
          </div>
          <div className="text-xs text-gray-500">
            {log.metadata.stagesAdded} etapas adicionadas
          </div>
        </div>
      );
    }

    if (log.action === "SAVE_TEMPLATE" && log.metadata) {
      return (
        <div className="space-y-1">
          <div className="text-sm text-teal-600 font-medium">
            Template: {log.metadata.templateName}
          </div>
          <div className="text-xs text-gray-500">
            {log.metadata.stagesCount} etapas salvas
          </div>
        </div>
      );
    }

    if (log.action === "ASSIGN" && log.metadata) {
      return (
        <div className="space-y-1">
          <div className="text-sm">
            {log.newData?.assignedToName ? (
              <span className="text-purple-600">
                Atribuído para: {log.newData.assignedToName}
              </span>
            ) : (
              <span className="text-gray-500">Responsável removido</span>
            )}
          </div>
          {log.metadata.itemTitle && (
            <div className="text-xs text-gray-500">
              Item: {log.metadata.itemTitle}
            </div>
          )}
        </div>
      );
    }

    if (log.action === "CREATE_STAGE" && log.newData) {
      return (
        <div className="text-sm">
          <span className="text-emerald-600 font-medium">
            Etapa: {log.newData.name}
          </span>
        </div>
      );
    }

    if (log.action === "UPDATE_STAGE" && log.newData) {
      return (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-yellow-600 font-medium">
              Etapa: {log.newData.name}
            </span>
          </div>
          {log.oldData && log.oldData.name && log.newData.name && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span className="line-through text-red-400">{log.oldData.name}</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="text-green-500">{log.newData.name}</span>
            </div>
          )}
        </div>
      );
    }

    if (log.action === "DELETE_STAGE" && log.oldData) {
      return (
        <div className="text-sm">
          <span className="text-red-600 line-through font-medium">
            Etapa: {log.oldData.name}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Auditoria do Sistema
        </h1>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw
            className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
          />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Entidade */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Entidade
              </label>
              <Select
                value={tempFilters.entity || "all"}
                onValueChange={(value) =>
                  setTempFilters({
                    ...tempFilters,
                    entity: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITIES.map((entity) => (
                    <SelectItem key={entity.value} value={entity.value}>
                      {entity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ação */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Ação
              </label>
              <Select
                value={tempFilters.action || "all"}
                onValueChange={(value) =>
                  setTempFilters({
                    ...tempFilters,
                    action: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Inicial */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Data Inicial
              </label>
              <Input
                type="date"
                value={tempFilters.startDate || ""}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    startDate: e.target.value || undefined,
                  })
                }
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Data Final
              </label>
              <Input
                type="date"
                value={tempFilters.endDate || ""}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    endDate: e.target.value || undefined,
                  })
                }
              />
            </div>

            {/* ID da Entidade (busca rápida) */}
            {/* <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                ID do Registro
              </label>
              <Input
                placeholder="UUID..."
                value={tempFilters.entityId || ""}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    entityId: e.target.value || undefined,
                  })
                }
              />
            </div> */}

            {/* Botões */}
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="flex-1">
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Data/Hora</TableHead>
                <TableHead className="w-[200px]">Usuário</TableHead>
                <TableHead className="w-[120px]">Ação</TableHead>
                <TableHead className="w-[120px]">Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      <p className="text-sm text-gray-500">Carregando...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Nenhum registro encontrado
                      </p>
                      <Button
                        variant="link"
                        onClick={clearFilters}
                        className="text-sm"
                      >
                        Limpar filtros
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-gray-50 group"
                    onClick={() => {
                      setSelectedLog(log);
                      setShowDetails(true);
                    }}
                  >
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {log.user.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "gap-1 whitespace-nowrap",
                          getActionColor(log.action),
                        )}
                      >
                        {getActionIcon(log.action)}
                        <span className="text-xs">
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.entity}
                      </Badge>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {log.entityId.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md relative">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">{renderLogDetails(log)}</div>
                        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            <span className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-medium">VER</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} a{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
            {pagination.total} registros
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination({ ...pagination, page: pagination.page - 1 })
              }
              disabled={pagination.page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination({ ...pagination, page: pagination.page + 1 })
              }
              disabled={pagination.page === pagination.pages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Detalhes da Ação</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDetails(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Data/Hora</p>
                  <p className="font-medium">
                    {formatDate(selectedLog.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Usuário</p>
                  <p className="font-medium">{selectedLog.user.name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedLog.user.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Ação</p>
                  <Badge
                    className={cn("gap-1", getActionColor(selectedLog.action))}
                  >
                    {getActionIcon(selectedLog.action)}
                    {selectedLog.action.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Entidade</p>
                  <Badge variant="outline">{selectedLog.entity}</Badge>
                  <p className="text-xs font-mono text-gray-400 mt-1">
                    ID: {selectedLog.entityId}
                  </p>
                </div>
              </div>

              {/* Dados Antigos */}
              {selectedLog.oldData &&
              Object.keys(selectedLog.oldData).length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-red-600">
                    Dados Antigos
                  </h3>
                  <pre className="bg-red-50 p-4 rounded-lg text-xs overflow-x-auto max-h-60">
                    {JSON.stringify(selectedLog.oldData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic border-t pt-4">
                  Nenhum dado antigo registrado para esta ação
                </div>
              )}

              {/* Dados Novos */}
              {selectedLog.newData &&
              Object.keys(selectedLog.newData).length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-green-600">
                    Dados Novos
                  </h3>
                  <pre className="bg-green-50 p-4 rounded-lg text-xs overflow-x-auto max-h-60">
                    {JSON.stringify(selectedLog.newData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic border-t pt-4">
                  Nenhum dado novo registrado para esta ação
                </div>
              )}

              {/* Metadados */}
              {selectedLog.metadata &&
              Object.keys(selectedLog.metadata).length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-600">
                    Metadados
                  </h3>
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto max-h-60">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic border-t pt-4">
                  Nenhum metadado registrado para esta ação
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditPage;
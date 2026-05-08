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
  { value: "all", label: "Todas", icon: null },
  { value: "CREATE", label: "Criação", icon: PlusCircle },
  { value: "UPDATE", label: "Atualização", icon: Pencil },
  { value: "DELETE", label: "Exclusão", icon: Trash2 },
  { value: "MOVE", label: "Movimentação", icon: Move },
  { value: "ASSIGN", label: "Atribuição", icon: UserPlus },
  { value: "COMPLETE", label: "Conclusão", icon: CheckCircle },
  { value: "CREATE_ITEM", label: "Criar Item", icon: PlusCircle },
  { value: "UPDATE_ITEM", label: "Atualizar Item", icon: Pencil },
  { value: "DELETE_ITEM", label: "Excluir Item", icon: Trash2 },
  { value: "MOVE_ITEM", label: "Mover Item", icon: Move },
  { value: "ADVANCE_ITEM", label: "Avançar Item", icon: ArrowRight },
  { value: "CREATE_STAGE", label: "Criar Etapa", icon: PlusCircle },
  { value: "UPDATE_STAGE", label: "Atualizar Etapa", icon: Pencil },
  { value: "DELETE_STAGE", label: "Excluir Etapa", icon: Trash2 },
  { value: "ADD_IMAGE", label: "Adicionar Imagem", icon: Image },
  { value: "ADD_AUDIO", label: "Adicionar Áudio", icon: Mic },
  { value: "ADD_VIDEO", label: "Adicionar Vídeo", icon: Video },
  { value: "DELETE_IMAGE", label: "Remover Imagem", icon: Trash2 },
  { value: "DELETE_AUDIO", label: "Remover Áudio", icon: Trash2 },
  { value: "DELETE_VIDEO", label: "Remover Vídeo", icon: Trash2 },
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

  // Carregar logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await auditService.getLogs(
        filters,
        pagination.page,
        pagination.limit,
      );
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

  const applyFilters = () => {
    setFilters(tempFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setTempFilters({});
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getActionIcon = (action: string) => {
    const found = ACTIONS.find((a) => a.value === action);
    if (found && found.icon) {
      const Icon = found.icon;
      return <Icon className="w-4 h-4" />;
    }
    return <AlertCircle className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
      UPDATE: "bg-amber-50 text-amber-700 border-amber-200",
      DELETE: "bg-red-50 text-red-700 border-red-200",
      MOVE: "bg-blue-50 text-blue-700 border-blue-200",
      ASSIGN: "bg-purple-50 text-purple-700 border-purple-200",
      COMPLETE: "bg-green-50 text-green-700 border-green-200",
      CREATE_ITEM: "bg-emerald-50 text-emerald-700 border-emerald-200",
      UPDATE_ITEM: "bg-amber-50 text-amber-700 border-amber-200",
      DELETE_ITEM: "bg-red-50 text-red-700 border-red-200",
      MOVE_ITEM: "bg-blue-50 text-blue-700 border-blue-200",
      ADVANCE_ITEM: "bg-indigo-50 text-indigo-700 border-indigo-200",
      CREATE_STAGE: "bg-emerald-50 text-emerald-700 border-emerald-200",
      UPDATE_STAGE: "bg-amber-50 text-amber-700 border-amber-200",
      DELETE_STAGE: "bg-red-50 text-red-700 border-red-200",
      ADD_IMAGE: "bg-pink-50 text-pink-700 border-pink-200",
      ADD_AUDIO: "bg-pink-50 text-pink-700 border-pink-200",
      ADD_VIDEO: "bg-pink-50 text-pink-700 border-pink-200",
      DELETE_IMAGE: "bg-red-50 text-red-700 border-red-200",
      DELETE_AUDIO: "bg-red-50 text-red-700 border-red-200",
      DELETE_VIDEO: "bg-red-50 text-red-700 border-red-200",
      APPLY_TEMPLATE: "bg-orange-50 text-orange-700 border-orange-200",
      SAVE_TEMPLATE: "bg-teal-50 text-teal-700 border-teal-200",
      DELETE_TEMPLATE: "bg-red-50 text-red-700 border-red-200",
    };
    return colors[action] || "bg-gray-50 text-gray-700 border-gray-200";
  };

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
            <span className="text-amber-600 font-medium">
              {log.newData.name || "Fluxo atualizado"}
            </span>
          </div>
          {log.oldData && log.oldData.name && log.newData.name && (
            <div className="flex items-center gap-1 text-xs text-[#7A7E83]">
              <span className="line-through text-red-400">
                {log.oldData.name}
              </span>
              <ArrowRight className="w-3 h-3 text-[#7A7E83]" />
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
            <span className="text-amber-600 font-medium">
              {log.newData.title || "Item atualizado"}
            </span>
          </div>
          {log.oldData && log.oldData.title && log.newData.title && (
            <div className="flex items-center gap-1 text-xs text-[#7A7E83]">
              <span className="line-through text-red-400">
                {log.oldData.title}
              </span>
              <ArrowRight className="w-3 h-3 text-[#7A7E83]" />
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
            <Move className="w-3 h-3 text-[#7A7E83]" />
            <span className="text-green-500 font-medium">
              {log.metadata.toStageName || "?"}
            </span>
          </div>
          {log.metadata.itemTitle && (
            <div className="text-xs text-[#7A7E83]">
              Item: {log.metadata.itemTitle}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // Função para formatar nome do campo
  const formatFieldName = (key: string) => {
    const names: Record<string, string> = {
      title: "Título",
      status: "Status",
      dueDate: "Data de Vencimento",
      stageId: "Etapa",
      priority: "Prioridade",
      quantity: "Quantidade",
      productRef: "Referência do Produto",
      supplierId: "Fornecedor",
      orderNumber: "Número do Pedido",
      assignedToId: "Responsável",
      name: "Nome",
      email: "E-mail",
      phone: "Telefone",
      role: "Função",
      companyName: "Empresa",
      cnpj: "CNPJ",
      flowId: "ID do Fluxo",
      createdAt: "Data de Criação",
      stageName: "Nome da Etapa",
      contact: "Contato",
      document: "Documento",
      companyId: "Empresa",
    };
    return (
      names[key] ||
      key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
    );
  };

  // Função para formatar valor
  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === "") return "—";

    // Status
    if (value === "PENDENTE")
      return (
        <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
          📋 Pendente
        </Badge>
      );
    if (value === "EM_ANDAMENTO")
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
          ⚙️ Em Andamento
        </Badge>
      );
    if (value === "CONCLUIDO")
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200">
          ✅ Concluído
        </Badge>
      );
    if (value === "CANCELADO")
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200">
          ❌ Cancelado
        </Badge>
      );

    // Prioridades
    if (typeof value === "number") {
      if (value === 1) return "🟢 Baixa";
      if (value === 2) return "🟡 Média";
      if (value === 3) return "🟠 Alta";
      if (value === 4) return "🔴 Urgente";
      return value;
    }

    // UUIDs
    if (
      typeof value === "string" &&
      value.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      return (
        <span className="font-mono text-xs">{value.substring(0, 8)}...</span>
      );
    }

    // Datas
    if (
      typeof value === "string" &&
      value.includes("T") &&
      value.includes("Z")
    ) {
      return new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return value;
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[#353A40]">
            Auditoria do Sistema
          </h1>
          <p className="text-sm text-[#7A7E83] mt-1">
            Histórico completo de todas as ações realizadas no sistema
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchLogs}
          disabled={loading}
          className="border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA]"
        >
          <RefreshCw
            className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
          />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7E83] mb-1 block">
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
                <SelectTrigger className="bg-white border-[#CBD5E1]">
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

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7E83] mb-1 block">
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
                <SelectTrigger className="bg-white border-[#CBD5E1]">
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

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7E83] mb-1 block">
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
                className="bg-white border-[#CBD5E1] focus:ring-[#2F80ED]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7E83] mb-1 block">
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
                className="bg-white border-[#CBD5E1] focus:ring-[#2F80ED]"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={applyFilters}
                className="flex-1 bg-[#2F80ED] hover:bg-[#1E5CB8] text-white"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA]"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <TableHead className="w-[180px] text-[#353A40] font-bold">
                  Data/Hora
                </TableHead>
                <TableHead className="w-[200px] text-[#353A40] font-bold">
                  Usuário
                </TableHead>
                <TableHead className="w-[120px] text-[#353A40] font-bold">
                  Ação
                </TableHead>
                <TableHead className="w-[120px] text-[#353A40] font-bold">
                  Entidade
                </TableHead>
                <TableHead className="text-[#353A40] font-bold">
                  Detalhes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-[#2F80ED]" />
                      <p className="text-sm text-[#7A7E83]">Carregando...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-[#7A7E83]" />
                      <p className="text-sm text-[#7A7E83]">
                        Nenhum registro encontrado
                      </p>
                      <Button
                        variant="link"
                        onClick={clearFilters}
                        className="text-sm text-[#2F80ED]"
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
                    className="cursor-pointer hover:bg-[#F5F6FA] transition-colors border-b border-[#E2E8F0] group"
                    onClick={() => {
                      setSelectedLog(log);
                      setShowDetails(true);
                    }}
                  >
                    <TableCell className="whitespace-nowrap font-mono text-xs text-[#7A7E83]">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#F5F6FA] rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-[#7A7E83]" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-[#353A40]">
                            {log.user.name}
                          </div>
                          <div className="text-xs text-[#7A7E83]">
                            {log.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "gap-1 whitespace-nowrap border-0",
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
                      <Badge
                        variant="outline"
                        className="font-mono text-xs border-[#CBD5E1] text-[#7A7E83]"
                      >
                        {log.entity}
                      </Badge>
                      <div className="text-xs text-[#7A7E83] mt-1 font-mono">
                        {log.entityId.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md relative">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">{renderLogDetails(log)}</div>
                        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-1 text-xs text-[#2F80ED] bg-[#2F80ED]/10 px-2 py-1 rounded-full">
                            <span className="w-1 h-1 bg-[#2F80ED] rounded-full animate-pulse"></span>
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
          <p className="text-sm text-[#7A7E83]">
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
              className="border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA]"
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
              className="border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA]"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes - Versão Amigável (SEM JSON) */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      selectedLog.action === "CREATE" && "bg-emerald-100",
                      selectedLog.action === "UPDATE" && "bg-amber-100",
                      selectedLog.action === "DELETE" && "bg-red-100",
                      !["CREATE", "UPDATE", "DELETE"].includes(
                        selectedLog.action,
                      ) && "bg-blue-100",
                    )}
                  >
                    {selectedLog.action === "CREATE" && (
                      <PlusCircle className="w-5 h-5 text-emerald-600" />
                    )}
                    {selectedLog.action === "UPDATE" && (
                      <Pencil className="w-5 h-5 text-amber-600" />
                    )}
                    {selectedLog.action === "DELETE" && (
                      <Trash2 className="w-5 h-5 text-red-600" />
                    )}
                    {selectedLog.action === "MOVE_ITEM" && (
                      <Move className="w-5 h-5 text-blue-600" />
                    )}
                    {!["CREATE", "UPDATE", "DELETE", "MOVE_ITEM"].includes(
                      selectedLog.action,
                    ) && <AlertCircle className="w-5 h-5 text-gray-600" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#353A40]">
                      Detalhes da Ação
                    </h2>
                    <p className="text-sm text-[#7A7E83]">
                      Informações completas da operação
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                  className="hover:bg-[#F5F6FA] rounded-full w-8 h-8 p-0 text-[#7A7E83]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informações básicas em cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-[#F5F6FA] rounded-lg">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <svg
                      className="w-5 h-5 text-[#7A7E83]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-[#7A7E83] uppercase tracking-wide">
                      Data/Hora
                    </p>
                    <p className="font-medium text-[#353A40]">
                      {formatDate(selectedLog.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#F5F6FA] rounded-lg">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <User className="w-5 h-5 text-[#7A7E83]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#7A7E83] uppercase tracking-wide">
                      Usuário
                    </p>
                    <p className="font-medium text-[#353A40]">
                      {selectedLog.user.name}
                    </p>
                    <p className="text-xs text-[#7A7E83]">
                      {selectedLog.user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#F5F6FA] rounded-lg">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <svg
                      className="w-5 h-5 text-[#7A7E83]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-[#7A7E83] uppercase tracking-wide">
                      Ação
                    </p>
                    <Badge
                      className={cn(
                        "mt-1 border-0",
                        getActionColor(selectedLog.action),
                      )}
                    >
                      {getActionIcon(selectedLog.action)}
                      <span className="ml-1">
                        {selectedLog.action.replace(/_/g, " ")}
                      </span>
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#F5F6FA] rounded-lg">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <svg
                      className="w-5 h-5 text-[#7A7E83]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-[#7A7E83] uppercase tracking-wide">
                      Entidade
                    </p>
                    <p className="font-medium text-[#353A40]">
                      {selectedLog.entity}
                    </p>
                    <p className="text-xs font-mono text-[#7A7E83] mt-1">
                      ID: {selectedLog.entityId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Separador */}
              <div className="border-t border-[#E2E8F0] my-4"></div>

              {/* Dados Antigos - Formatado */}
              {selectedLog.oldData &&
                Object.keys(selectedLog.oldData).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-100 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </div>
                      <h3 className="text-sm font-semibold text-red-700">
                        Dados Anteriores
                      </h3>
                      <span className="text-xs text-[#7A7E83] ml-auto">
                        Antes da alteração
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(selectedLog.oldData).map(
                        ([key, value]) => {
                          if (
                            value === null ||
                            value === undefined ||
                            value === ""
                          )
                            return null;
                          if (
                            key.includes("Id") &&
                            typeof value === "string" &&
                            value.length > 30
                          )
                            return null;
                          return (
                            <div
                              key={key}
                              className="flex justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                            >
                              <span className="text-sm text-red-600">
                                {formatFieldName(key)}
                              </span>
                              <span className="text-sm font-medium text-red-800 text-right">
                                {formatValue(value)}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

              {/* Dados Novos - Formatado */}
              {selectedLog.newData &&
                Object.keys(selectedLog.newData).length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 rounded-lg">
                        <PlusCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <h3 className="text-sm font-semibold text-green-700">
                        Dados do Registro
                      </h3>
                      <span className="text-xs text-[#7A7E83] ml-auto">
                        Informações salvas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(selectedLog.newData.title ||
                        selectedLog.newData.name) && (
                        <div className="col-span-full bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                          <p className="text-xs text-green-600 uppercase tracking-wide mb-1">
                            Título
                          </p>
                          <p className="text-lg font-semibold text-green-900">
                            {selectedLog.newData.title ||
                              selectedLog.newData.name}
                          </p>
                          {selectedLog.newData.productRef && (
                            <p className="text-sm text-gray-600 mt-1">
                              Ref: {selectedLog.newData.productRef}
                            </p>
                          )}
                        </div>
                      )}

                      {selectedLog.newData.status && (
                        <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                          <p className="text-xs text-[#7A7E83] mb-1">Status</p>
                          {formatValue(selectedLog.newData.status)}
                        </div>
                      )}

                      {selectedLog.newData.priority && (
                        <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                          <p className="text-xs text-[#7A7E83] mb-1">
                            Prioridade
                          </p>
                          <p className="font-medium text-[#353A40]">
                            {formatValue(selectedLog.newData.priority)}
                          </p>
                        </div>
                      )}

                      {selectedLog.newData.quantity && (
                        <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                          <p className="text-xs text-[#7A7E83] mb-1">
                            Quantidade
                          </p>
                          <p className="text-2xl font-bold text-[#353A40]">
                            {selectedLog.newData.quantity}
                          </p>
                        </div>
                      )}

                      {selectedLog.newData.dueDate && (
                        <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                          <p className="text-xs text-[#7A7E83] mb-1">
                            Data de Vencimento
                          </p>
                          <p className="text-[#353A40]">
                            {formatValue(selectedLog.newData.dueDate)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {Object.entries(selectedLog.newData).map(
                        ([key, value]) => {
                          if (
                            [
                              "title",
                              "name",
                              "productRef",
                              "status",
                              "priority",
                              "quantity",
                              "dueDate",
                            ].includes(key)
                          )
                            return null;
                          if (
                            value === null ||
                            value === undefined ||
                            value === ""
                          )
                            return null;
                          if (
                            key.includes("Id") &&
                            typeof value === "string" &&
                            value.length > 30
                          )
                            return null;

                          return (
                            <div
                              key={key}
                              className="flex justify-between p-2 bg-[#F5F6FA] rounded-lg"
                            >
                              <span className="text-xs text-[#7A7E83]">
                                {formatFieldName(key)}
                              </span>
                              <span className="text-xs font-medium text-[#353A40]">
                                {formatValue(value)}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

              {/* Metadados - Formatado */}
              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-purple-600" />
                      </div>
                      <h3 className="text-sm font-semibold text-purple-700">
                        Informações do Fluxo
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedLog.metadata.stageName && (
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <span className="text-sm text-purple-600">Etapa</span>
                          <span className="text-sm font-medium text-purple-800">
                            {selectedLog.metadata.stageName}
                          </span>
                        </div>
                      )}
                      {selectedLog.metadata.createdAt && (
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <span className="text-sm text-purple-600">
                            Criado em
                          </span>
                          <span className="text-sm font-medium text-purple-800">
                            {formatValue(selectedLog.metadata.createdAt)}
                          </span>
                        </div>
                      )}
                      {selectedLog.metadata.fromStageName &&
                        selectedLog.metadata.toStageName && (
                          <div className="col-span-full flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <span className="text-sm text-purple-600">
                              Movimentação
                            </span>
                            <span className="text-sm font-medium text-purple-800">
                              {selectedLog.metadata.fromStageName} →{" "}
                              {selectedLog.metadata.toStageName}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                )}

              {/* Mensagem quando não há dados */}
              {(!selectedLog.oldData ||
                Object.keys(selectedLog.oldData).length === 0) &&
                (!selectedLog.newData ||
                  Object.keys(selectedLog.newData).length === 0) &&
                (!selectedLog.metadata ||
                  Object.keys(selectedLog.metadata).length === 0) && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-[#F5F6FA] rounded-full mb-3">
                      <AlertCircle className="w-6 h-6 text-[#7A7E83]" />
                    </div>
                    <p className="text-[#7A7E83] text-sm">
                      Nenhum dado adicional disponível para esta ação
                    </p>
                    <p className="text-[#7A7E83] text-xs mt-1">
                      Esta é uma ação simples sem dados estruturados
                    </p>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#F8FAFC] border-t border-[#E2E8F0] px-6 py-4 flex justify-end">
              <Button
                onClick={() => setShowDetails(false)}
                variant="outline"
                className="border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA]"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditPage;

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Edit3,
  Save,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { format, differenceInDays, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";

interface StageDeadline {
  id: string;
  stageId: string;
  stageName: string;
  stageOrder: number;
  stageColor?: string;
  suggestedDeadline?: string;
  deadline: string;
  actualDeadline?: string;
  status: "PENDENTE" | "ATUAL" | "CONCLUIDO" | "ATRASADO";
  notes?: string;
  isCurrentStage: boolean;
  canEdit: boolean;
  daysRemaining?: number;
  isOverdue?: boolean;
}

interface StagesDeadlineTabProps {
  itemId?: string;
  stages: any[];
  isLoading?: boolean;
  isAdmin: boolean;
  currentStageId?: string;
  onDeadlineUpdate?: () => void;
}

// 🔥 Interface para edições temporárias
interface PendingEdit {
  stageId: string;
  suggestedDeadline: string;
  notes: string;
  originalSuggestedDeadline?: string;
  originalNotes?: string;
}

export function StagesDeadlineTab({
  itemId,
  stages,
  isLoading = false,
  isAdmin,
  currentStageId,
  onDeadlineUpdate,
}: StagesDeadlineTabProps) {
  const [deadlines, setDeadlines] = useState<StageDeadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🔥 NOVOS ESTADOS PARA EDIÇÃO EM LOTE
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingEdit>>(
    {},
  );
  const [hasChanges, setHasChanges] = useState(false);

  // ===========================================================================
  // 🔥 CARREGAR PRAZOS DO ITEM
  // ===========================================================================
  const loadDeadlines = async () => {
    if (!itemId) return;

    setLoading(true);
    try {
      const response = await api.get(`/flow/items/${itemId}/stages`);
      const data = response.data;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const enriched = data.map((stage: any) => {
        const deadlineDate = stage.deadline ? new Date(stage.deadline) : null;

        let daysRemaining = undefined;
        if (deadlineDate) {
          daysRemaining = differenceInDays(deadlineDate, today);
        }

        const isOverdue = deadlineDate
          ? isBefore(deadlineDate, today) && stage.status !== "CONCLUIDO"
          : false;

        return {
          ...stage,
          stageName: stage.stage?.name || "Etapa",
          stageColor: stage.stage?.color,
          daysRemaining,
          isOverdue,
          canEdit: isAdmin || stage.isCurrentStage,
        };
      });

      setDeadlines(enriched);

      // 🔥 Limpa edições pendentes ao recarregar
      setPendingEdits({});
      setHasChanges(false);
      setIsBulkEditing(false);
    } catch (error) {
      console.error("Erro ao carregar prazos:", error);
      toast.error("Erro ao carregar prazos das etapas");
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================================
  // 🔥 FUNÇÕES PARA EDIÇÃO EM LOTE
  // ===========================================================================

  // Iniciar modo de edição em lote
  const startBulkEditing = () => {
    // 🔥 Inicializa com os valores atuais
    const initialEdits: Record<string, PendingEdit> = {};
    deadlines.forEach((stage) => {
      if (stage.canEdit) {
        initialEdits[stage.stageId] = {
          stageId: stage.stageId,
          suggestedDeadline: stage.suggestedDeadline?.split("T")[0] || "",
          notes: stage.notes || "",
          originalSuggestedDeadline:
            stage.suggestedDeadline?.split("T")[0] || "",
          originalNotes: stage.notes || "",
        };
      }
    });
    setPendingEdits(initialEdits);
    setIsBulkEditing(true);
    setHasChanges(false);
  };

  // Cancelar edições
  const cancelBulkEditing = () => {
    setPendingEdits({});
    setIsBulkEditing(false);
    setHasChanges(false);
  };

  // Atualizar um campo específico
  const updatePendingEdit = (
    stageId: string,
    field: "suggestedDeadline" | "notes",
    value: string,
  ) => {
    setPendingEdits((prev) => {
      const updated = {
        ...prev,
        [stageId]: {
          ...prev[stageId],
          [field]: value,
        },
      };

      // 🔥 Verifica se houve mudança
      const hasAnyChange = Object.values(updated).some(
        (edit) =>
          edit.suggestedDeadline !== edit.originalSuggestedDeadline ||
          edit.notes !== edit.originalNotes,
      );
      setHasChanges(hasAnyChange);

      return updated;
    });
  };

  // Salvar todas as alterações
  const saveAllChanges = async () => {
    if (!itemId) return;
    if (!hasChanges) {
      setIsBulkEditing(false);
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Salvando prazos...");

    try {
      // 🔥 Filtra apenas etapas com alterações
      const updates = Object.values(pendingEdits)
        .filter(
          (edit) =>
            edit.suggestedDeadline !== edit.originalSuggestedDeadline ||
            edit.notes !== edit.originalNotes,
        )
        .map((edit) => ({
          stageId: edit.stageId,
          suggestedDeadline: new Date(edit.suggestedDeadline).toISOString(),
          notes: edit.notes || undefined,
        }));

      if (updates.length === 0) {
        setIsBulkEditing(false);
        toast.dismiss(toastId);
        return;
      }

      // 🔥 Envia todas as alterações de uma vez
      await api.patch(`/flow/items/${itemId}/stages/bulk`, { updates });

      toast.success(`${updates.length} prazo(s) atualizado(s) com sucesso!`, {
        id: toastId,
      });

      // 🔥 Recarrega os dados
      await loadDeadlines();

      // 🔥 CHAMA O CALLBACK PARA ATUALIZAR O ITEM
      if (onDeadlineUpdate) {
        onDeadlineUpdate();
      }
      toast.success(`${updates.length} prazo(s) atualizado(s) com sucesso!`, {
        id: toastId,
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Erro ao salvar prazos";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // ===========================================================================
  // 🔥 FORMATAR DATA
  // ===========================================================================
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (stage: StageDeadline) => {
    if (stage.status === "CONCLUIDO") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 text-xs">
          <CheckCircle2 size={14} className="mr-1" />
          Concluído
        </Badge>
      );
    }

    if (stage.isOverdue) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 px-3 py-1 text-xs">
          <AlertTriangle size={14} className="mr-1" />
          Atrasado
        </Badge>
      );
    }

    if (stage.isCurrentStage) {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 text-xs">
          <Clock size={14} className="mr-1" />
          Etapa Atual
        </Badge>
      );
    }

    if (
      stage.daysRemaining !== undefined &&
      stage.daysRemaining !== null &&
      stage.daysRemaining <= 3
    ) {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1 text-xs">
          <Clock size={14} className="mr-1" />
          {stage.daysRemaining} dias
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-slate-600 px-3 py-1 text-xs">
        Pendente
      </Badge>
    );
  };

  // ===========================================================================
  // 🔥 LOAD INICIAL
  // ===========================================================================
  useEffect(() => {
    if (itemId) {
      loadDeadlines();
    }
  }, [itemId]);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (deadlines.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
        <Calendar className="h-16 w-16 mx-auto text-slate-300 mb-4" />
        <p className="text-base text-slate-600">Nenhum prazo encontrado</p>
        <p className="text-sm text-slate-400 mt-2">
          Os prazos são gerados automaticamente na criação do item
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 🔥 CABEÇALHO COM INFO E BOTÕES */}
      <div className="flex items-start justify-between gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 flex-1">
          <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">📋 Sobre os prazos:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Cada etapa do fluxo tem seu próprio prazo</li>
              <li>O prazo final do item é sempre o prazo da etapa atual</li>
              {isAdmin && (
                <li className="font-medium">
                  ✅ Como admin, você pode editar qualquer prazo
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* 🔥 BOTÕES DE CONTROLE */}
        {isAdmin && (
          <div className="flex gap-2">
            {!isBulkEditing ? (
              <Button
                onClick={startBulkEditing}
                variant="outline"
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Editar Vários
              </Button>
            ) : (
              <>
                <Button
                  onClick={saveAllChanges}
                  disabled={saving || !hasChanges}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
                <Button
                  onClick={cancelBulkEditing}
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 🔥 TABELA COM ROLAGEM */}
      <div className="flex-1 overflow-auto border rounded-xl min-h-[300px] bg-white">
        <table className="w-full min-w-[1100px] border-collapse">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              <th className="text-left p-4 text-sm font-bold w-[250px]">
                Etapa
              </th>
              <th className="text-left p-4 text-sm font-bold w-[140px]">
                Status
              </th>
              <th className="text-left p-4 text-sm font-bold w-[180px]">
                Prazo
              </th>
              <th className="text-left p-4 text-sm font-bold w-[140px]">
                Data Real
              </th>
              <th className="text-left p-4 text-sm font-bold w-[250px]">
                Observações
              </th>
            </tr>
          </thead>
          <tbody>
            {deadlines.map((stage) => {
              const editData = pendingEdits[stage.stageId];
              const isEditing = isBulkEditing && stage.canEdit;

              return (
                <tr
                  key={stage.id}
                  className={`border-t border-slate-100 ${
                    stage.isCurrentStage ? "bg-blue-50/50" : "hover:bg-slate-50"
                  } ${
                    isEditing &&
                    editData &&
                    (editData.suggestedDeadline !==
                      editData.originalSuggestedDeadline ||
                      editData.notes !== editData.originalNotes)
                      ? "bg-amber-50"
                      : ""
                  }`}
                >
                  {/* ETAPA */}
                  <td className="p-4 align-top">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: stage.stageColor || "#94A3B8",
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {stage.stageName}
                        </span>
                        {stage.isCurrentStage && (
                          <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-100 px-2 py-0.5 rounded-full w-fit mt-1">
                            etapa atual
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="p-4 align-top">{getStatusBadge(stage)}</td>

                  {/* PRAZO */}
                  <td className="p-4 align-top">
                    {isEditing && editData ? (
                      <Input
                        type="date"
                        value={editData.suggestedDeadline}
                        onChange={(e) =>
                          updatePendingEdit(
                            stage.stageId,
                            "suggestedDeadline",
                            e.target.value,
                          )
                        }
                        className="h-9 text-sm w-full"
                        disabled={saving}
                      />
                    ) : (
                      <div>
                        <div className="text-sm font-medium">
                          {formatDate(
                            stage.suggestedDeadline || stage.deadline,
                          )}
                        </div>
                        {stage.daysRemaining !== undefined &&
                          stage.daysRemaining !== null &&
                          stage.status !== "CONCLUIDO" && (
                            <div
                              className={cn(
                                "text-xs font-medium mt-1",
                                stage.daysRemaining < 0
                                  ? "text-red-600"
                                  : stage.daysRemaining <= 3
                                    ? "text-amber-600"
                                    : "text-slate-400",
                              )}
                            >
                              {stage.daysRemaining < 0
                                ? `${Math.abs(stage.daysRemaining)} dias atrasado`
                                : `${stage.daysRemaining} dias restantes`}
                            </div>
                          )}
                      </div>
                    )}
                  </td>

                  {/* DATA REAL */}
                  <td className="p-4 align-top">
                    <div className="text-sm">
                      {stage.actualDeadline ? (
                        <span className="text-green-600 font-medium">
                          {formatDate(stage.actualDeadline)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* OBSERVAÇÕES */}
                  <td className="p-4 align-top">
                    {isEditing && editData ? (
                      <Textarea
                        value={editData.notes}
                        onChange={(e) =>
                          updatePendingEdit(
                            stage.stageId,
                            "notes",
                            e.target.value,
                          )
                        }
                        placeholder="Observações..."
                        className="h-20 text-sm resize-none"
                        disabled={saving}
                      />
                    ) : (
                      <div className="text-sm text-slate-600 max-w-[250px] break-words">
                        {stage.notes || "—"}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 🔥 INDICADOR DE ALTERAÇÕES */}
      {isBulkEditing && hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-700">
          <AlertTriangle size={16} />
          <span className="text-sm">Você tem alterações não salvas</span>
        </div>
      )}

      {/* 🔥 LEGENDA */}
      <div className="flex flex-wrap gap-6 text-xs text-slate-500 border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Etapa atual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Concluída</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Atrasada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span>Próximos 3 dias</span>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

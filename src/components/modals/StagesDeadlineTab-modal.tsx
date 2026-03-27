/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, AlertTriangle, Clock, CheckCircle2, Calendar } from "lucide-react";
import { format, differenceInDays, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";

interface StageDeadline {
  id: string;
  stageId: string;
  stageName: string;
  stageColor?: string;
  suggestedDeadline?: string;
  deadline: string;
  status: "PENDENTE" | "ATUAL" | "CONCLUIDO" | "ATRASADO";
  isCurrentStage: boolean;
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

export function StagesDeadlineTab({
  itemId,
  isAdmin,
  onDeadlineUpdate,
}: StagesDeadlineTabProps) {
  const [deadlines, setDeadlines] = useState<StageDeadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

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
        const isOverdue = deadlineDate ? isBefore(deadlineDate, today) && stage.status !== "CONCLUIDO" : false;

        return {
          ...stage,
          stageName: stage.stage?.name || "Etapa",
          stageColor: stage.stage?.color,
          daysRemaining,
          isOverdue,
        };
      });

      setDeadlines(enriched);
      setPendingEdits({});
      setHasChanges(false);
    } catch (error) {
      toast.error("Erro ao carregar prazos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (itemId) loadDeadlines(); }, [itemId]);

  const updateDate = (stageId: string, value: string) => {
    setPendingEdits(prev => {
      const newEdits = { ...prev, [stageId]: value };
      setHasChanges(true);
      return newEdits;
    });
  };

  const saveChanges = async () => {
    if (!itemId || !hasChanges) return;
    setSaving(true);
    const toastId = toast.loading("Salvando novos prazos...");

    try {
      const updates = Object.entries(pendingEdits).map(([stageId, date]) => ({
        stageId,
        suggestedDeadline: new Date(date).toISOString(),
      }));

      await api.patch(`/flow/items/${itemId}/stages/bulk`, { updates });
      toast.success("Prazos atualizados!", { id: toastId });
      await loadDeadlines();
      if (onDeadlineUpdate) onDeadlineUpdate();
    } catch (error) {
      toast.error("Erro ao salvar", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
        <div className="flex items-center gap-2">
            <Calendar className="text-blue-500 h-4 w-4" />
            <span className="text-sm font-medium text-slate-700">Ajuste de Cronograma por Etapa</span>
        </div>
        {isAdmin && (
          <Button 
            onClick={saveChanges} 
            disabled={saving || !hasChanges}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white h-8"
          >
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
            Salvar Alterações
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="text-left p-4 font-bold text-slate-600">Etapa</th>
              <th className="text-left p-4 font-bold text-slate-600">Status</th>
              <th className="text-left p-4 font-bold text-slate-600">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {deadlines.map((stage) => (
              <tr key={stage.id} className={cn("border-b last:border-0 hover:bg-slate-50/50", stage.isCurrentStage && "bg-blue-50/30")}>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.stageColor || "#ccc" }} />
                    <div className="flex flex-col">
                        <span className={cn("font-medium", stage.isCurrentStage ? "text-blue-700 font-bold" : "text-slate-700")}>
                            {stage.stageName}
                        </span>
                        {stage.isCurrentStage && <span className="text-[9px] uppercase text-blue-500 font-bold tracking-wider">Etapa Atual</span>}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  {stage.status === "CONCLUIDO" ? (
                    <Badge className="bg-green-100 text-green-700 border-none shadow-none"><CheckCircle2 size={12} className="mr-1"/> Concluído</Badge>
                  ) : stage.isOverdue ? (
                    <Badge className="bg-red-100 text-red-700 border-none shadow-none"><AlertTriangle size={12} className="mr-1"/> Atrasado</Badge>
                  ) : stage.isCurrentStage ? (
                    <Badge className="bg-blue-100 text-blue-700 border-none shadow-none"><Clock size={12} className="mr-1"/> Em andamento</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal">Pendente</Badge>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    {isAdmin ? (
                        <Input
                        type="date"
                        className="h-8 text-xs w-full max-w-[160px]"
                        value={pendingEdits[stage.stageId] || (stage.suggestedDeadline?.split("T")[0] || "")}
                        onChange={(e) => updateDate(stage.stageId, e.target.value)}
                        />
                    ) : (
                        <span className="text-slate-700 font-medium">
                        {stage.suggestedDeadline ? format(new Date(stage.suggestedDeadline), "dd/MM/yyyy") : "-"}
                        </span>
                    )}

                    {/* 🔥 DIAS RESTANTES / ATRASO ABAIXO DA DATA */}
                    {stage.status !== "CONCLUIDO" && stage.daysRemaining !== undefined && (
                        <span className={cn(
                            "text-[10px] font-bold ml-1",
                            stage.isOverdue ? "text-red-500" : stage.daysRemaining <= 3 ? "text-amber-500" : "text-slate-400"
                        )}>
                            {stage.daysRemaining < 0 
                                ? `${Math.abs(stage.daysRemaining)} dias de atraso` 
                                : `${stage.daysRemaining} dias restantes`
                            }
                        </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
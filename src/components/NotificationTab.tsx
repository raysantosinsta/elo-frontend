"use client";

import React from "react";
import { useForm } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { InfoIcon } from "lucide-react";
import { useCompanySettings } from "@/hooks/use-company-settings";

interface NotificationTabProps {
  companyId: string;
}

type FormData = {
  notificationDays: number;
};

export const NotificationTab: React.FC<NotificationTabProps> = ({ companyId }) => {
  const { data: settings, isLoading } = useCompanySettings(companyId);

  const form = useForm<FormData>({
    defaultValues: {
      notificationDays: settings?.notificationDays ?? 7,
    },
  });

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full rounded-2xl" />;
  }

  const notificationDays = form.watch("notificationDays") ?? 7;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Configurações de Notificação</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure com quantos dias de antecedência você deseja receber
          notificações de vencimento de tarefas, orçamentos e outros itens.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Campo */}
        <div className="space-y-2">
          <Label htmlFor="notificationDays">
            Dias de Antecedência
          </Label>

          <div className="flex items-center gap-2">
            <Input
              id="notificationDays"
              type="number"
              min={1}
              max={90}
              placeholder="Ex: 7"
              {...form.register("notificationDays", {
                required: true,
                min: 1,
                max: 90,
                valueAsNumber: true,
              })}
            />
            <span className="text-sm text-muted-foreground">dias</span>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <InfoIcon size={14} />
            Número de dias antes do vencimento para receber notificações
          </p>
        </div>

        {/* Alerta */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Como funciona</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Com <strong>{notificationDays} dias</strong> de antecedência,
                você receberá notificações de itens que vencem em{" "}
                {notificationDays} dias
              </li>
              <li>
                Altere esse valor para controlar com quanta antecedência deseja
                ser avisado
              </li>
              <li>O valor padrão é 7 dias para novas lojas</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
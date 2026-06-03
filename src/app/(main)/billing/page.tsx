"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  billingService,
  BillingKpis,
  BillingPlan,
  Partner,
} from "@/services/billing.service";
import { useAuth } from "@/contexts/AuthContext";

function money(value: string | number | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    TRIAL_ACTIVE: "Trial ativo",
    TRIAL_EXPIRED: "Trial expirado",
    ACTIVE: "Ativo",
    OVERDUE: "Vencido",
    BLOCKED: "Bloqueado",
    CANCELED: "Cancelado",
    PENDING: "Pendente",
    APPROVED: "Aprovado",
    REJECTED: "Reprovado",
    AVAILABLE: "DisponÃƒÂ­vel",
    PAID: "Pago",
    REVERSED: "Revertido",
  };
  return labels[status || ""] || status || "-";
}

export default function BillingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [kpis, setKpis] = useState<BillingKpis | null>(null);
  const [myBilling, setMyBilling] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: "",
    period: "MONTHLY" as "MONTHLY" | "YEARLY",
    trialDays: "7",
    userLimit: "",
  });

  const isMaster = user?.role === "MASTER";
  const isCompanyAdmin = user?.role === "ADMIN";
  const canAccessBilling = isMaster || isCompanyAdmin;

  const load = async () => {
    setLoading(true);
    try {
      const [plansResult, myBillingResult] = await Promise.all([
        billingService.getPlans(isMaster),
        billingService.getMyBilling().catch(() => ({ data: null })),
      ]);

      setPlans(plansResult.data);
      setMyBilling(myBillingResult.data);

      if (isMaster) {
        const [kpisResult, partnersResult, commissionsResult] =
          await Promise.all([
            billingService.getAdminKpis().catch(() => ({ data: null })),
            billingService.getPartners().catch(() => ({ data: [] })),
            billingService.getCommissions().catch(() => ({ data: [] })),
          ]);
        setKpis(kpisResult.data);
        setPartners(partnersResult.data);
        setCommissions(commissionsResult.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isMaster]);

  const statusTone = useMemo(() => {
    const status = myBilling?.billingStatus;
    if (status === "ACTIVE" || status === "TRIAL_ACTIVE") {
      return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
    }
    if (status === "OVERDUE" || status === "TRIAL_EXPIRED") {
      return "bg-amber-100 text-amber-700 hover:bg-amber-100";
    }
    return "bg-red-100 text-red-700 hover:bg-red-100";
  }, [myBilling?.billingStatus]);

  const createPlan = async () => {
    if (!planForm.name || !planForm.price) {
      toast.error("Informe nome e valor do plano.");
      return;
    }

    await billingService.createPlan({
      name: planForm.name,
      description: planForm.description || undefined,
      price: Number(planForm.price),
      period: planForm.period,
      trialDays: Number(planForm.trialDays || 0),
      userLimit: planForm.userLimit ? Number(planForm.userLimit) : undefined,
    });

    toast.success("Plano criado.");
    setPlanForm({
      name: "",
      description: "",
      price: "",
      period: "MONTHLY",
      trialDays: "7",
      userLimit: "",
    });
    load();
  };

  const createSubscription = async (planId: string) => {
    if (!user?.companyId) return;
    try {
      await billingService.createSubscription({
        companyId: user.companyId,
        planId,
        billingType: "UNDEFINED",
      });
      toast.success("Assinatura criada no Asaas.");
      load();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Nao foi possivel criar a assinatura no Asaas.",
      );
    }
  };

  const togglePlanStatus = async (plan: BillingPlan) => {
    if (!isMaster) return;
    await billingService.updatePlan(plan.id, { isActive: !plan.isActive });
    toast.success(plan.isActive ? "Plano inativado." : "Plano ativado.");
    load();
  };

  const deletePlan = async (plan: BillingPlan) => {
    if (!isMaster) return;
    await billingService.deletePlan(plan.id);
    toast.success("Plano removido do catalogo ativo.");
    load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2F80ED]" />
      </div>
    );
  }

  if (!canAccessBilling) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso bloqueado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-500">
            Esta area esta disponivel apenas para usuarios MASTER ou ADMIN da
            empresa.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Financeiro SaaS
          </h1>
          <p className="text-sm text-slate-500">
            Asaas, trial, assinaturas, parceiros, comissÃƒÂµes e saques.
          </p>
        </div>
        <Button variant="outline" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
              <CreditCard className="h-4 w-4" />
              Minha conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusTone}>
              {statusLabel(myBilling?.billingStatus)}
            </Badge>
            <p className="mt-2 text-xs text-slate-500">
              Trial ate{" "}
              {myBilling?.trialEnd
                ? new Date(myBilling.trialEnd).toLocaleDateString("pt-BR")
                : "-"}
            </p>
          </CardContent>
        </Card>

        {isMaster && <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
              <WalletCards className="h-4 w-4" />
              Receita recebida
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {money(kpis?.revenue.received)}
          </CardContent>
        </Card>}

        {isMaster && <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
              <Users className="h-4 w-4" />
              Parceiros pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kpis?.partners.pendingApproval ?? 0}
          </CardContent>
        </Card>}

        {isMaster && <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              Webhooks falhos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kpis?.webhooks.failed ?? 0}
          </CardContent>
        </Card>}
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">
            {isMaster ? "Planos" : "Contratar plano"}
          </TabsTrigger>
          {isMaster && <TabsTrigger value="partners">Parceiros</TabsTrigger>}
          {isMaster && <TabsTrigger value="commissions">Comissoes</TabsTrigger>}
        </TabsList>

        <TabsContent value="plans" className="mt-4 space-y-4">
          {isMaster && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novo plano</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Label>Nome</Label>
                  <Input
                    value={planForm.name}
                    onChange={(event) =>
                      setPlanForm({ ...planForm, name: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    value={planForm.price}
                    onChange={(event) =>
                      setPlanForm({ ...planForm, price: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Ciclo</Label>
                  <Select
                    value={planForm.period}
                    onValueChange={(period: "MONTHLY" | "YEARLY") =>
                      setPlanForm({ ...planForm, period })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="YEARLY">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Trial</Label>
                  <Input
                    type="number"
                    value={planForm.trialDays}
                    onChange={(event) =>
                      setPlanForm({
                        ...planForm,
                        trialDays: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={createPlan} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Criar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {plan.name}
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-semibold">
                    {money(plan.price)}
                  </div>
                  <p className="text-sm text-slate-500">
                    {plan.period === "MONTHLY" ? "Mensal" : "Anual"} -{" "}
                    {plan.trialDays} dias de trial
                  </p>
                  {isCompanyAdmin && user?.companyId && (
                    <Button
                      variant="outline"
                      onClick={() => createSubscription(plan.id)}
                      className="w-full"
                    >
                      Contratar no Asaas
                    </Button>
                  )}
                  {isMaster && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => togglePlanStatus(plan)}
                        className="gap-2"
                      >
                        <Power className="h-4 w-4" />
                        {plan.isActive ? "Inativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => deletePlan(plan)}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="partners" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {partner.company?.name || partner.code}
                      </div>
                      <div className="text-sm text-slate-500">
                        CÃƒÂ³digo {partner.code} Ã¢â‚¬Â¢ ComissÃƒÂ£o{" "}
                        {Number(partner.commissionRate)}%
                      </div>
                    </div>
                    <Badge>{statusLabel(partner.status)}</Badge>
                  </div>
                ))}
                {!partners.length && (
                  <div className="p-6 text-sm text-slate-500">
                    Nenhum parceiro cadastrado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {commissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {commission.company?.name || "Empresa"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {statusLabel(commission.status)} Ã¢â‚¬Â¢ Base{" "}
                        {money(commission.baseValue)}
                      </div>
                    </div>
                    <div className="font-semibold">
                      {money(commission.amount)}
                    </div>
                  </div>
                ))}
                {!commissions.length && (
                  <div className="p-6 text-sm text-slate-500">
                    Nenhuma comissÃƒÂ£o encontrada.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

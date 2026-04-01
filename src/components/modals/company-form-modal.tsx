/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Edit,
  Plus,
  Loader2,
  CheckCircle2,
  Search as SearchIcon,
  Building2,
  MapPin,
  Phone,
  Mail,
  Bell,
  InfoIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useError } from "@/contexts/error-context";
import { useCompanySettings } from "@/hooks/use-company-settings";

// --- Interfaces ---
interface CompanyData {
  id?: string;
  name: string;
  cnpj: string;
  email: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  ramoAtividade?: string;
  notificationDays?: number;
  status: string;
}

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: CompanyData | null;
  onSubmit: (values: any) => Promise<void>;
  isLoading: boolean;
}

// --- Helpers e Schema ---
const cleanMask = (value: string | undefined) =>
  value ? value.replace(/\D/g, "") : "";
const formatCNPJ = (v: string | undefined) => {
  if (!v) return "";
  return v
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    .substring(0, 18);
};
const formatPhone = (v: string | undefined) => {
  if (!v) return "";
  let r = v.replace(/\D/g, "");
  if (r.length > 11) r = r.substring(0, 11);
  return r.replace(/^(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");
};
const formatCEP = (v: string | undefined) => {
  if (!v) return "";
  return v
    .replace(/\D/g, "")
    .replace(/^(\d{5})(\d)/, "$1-$2")
    .substring(0, 9);
};

const companySchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  cnpj: z
    .string()
    .min(14, "CNPJ inválido")
    .transform((v) => cleanMask(v)),
  email: z.string().email("E-mail inválido"),
  telefone: z
    .string()
    .min(10, "Telefone inválido")
    .transform((v) => cleanMask(v)),
  cep: z
    .string()
    .min(8, "CEP inválido")
    .transform((v) => cleanMask(v)),
  endereco: z.string().min(1, "Endereço obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro obrigatório"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  estado: z.string().length(2, "UF inválida"),
  ramoAtividade: z.string().optional(),
  notificationDays: z
    .number()
    .min(1, "Mínimo 1 dia")
    .max(90, "Máximo 90 dias")
    .optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

// 🔥 COMPONENTE DE INPUT COM SKELETON (Apenas no número)
function NotificationDaysInput({
  value,
  onChange,
  isLoading,
}: {
  value: number;
  onChange: (value: number) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {isLoading ? (
        <>
          <Skeleton className="h-10 w-32" />
          <span className="text-sm text-gray-500">dias</span>
        </>
      ) : (
        <>
          <Input
            type="number"
            min={1}
            max={90}
            className="w-32 bg-white"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          />
          <span className="text-sm text-gray-500">dias</span>
        </>
      )}
    </div>
  );
}

export function CompanyFormModal({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isLoading: isSubmitting,
}: CompanyFormModalProps) {
  const { showError } = useError();
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "basic" | "address" | "notifications"
  >("basic");

  // 🔥 Busca dados dinâmicos do banco (notificações)
  const { data: settings, isLoading: isLoadingSettings } = useCompanySettings(
    initialData?.id || "",
  );

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      cnpj: "",
      email: "",
      telefone: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      ramoAtividade: "",
      notificationDays: 7,
    },
  });

  // 🔥 Reset do formulário com os dados corretos
  useEffect(() => {
    if (!isOpen) return;

    // Para criação de nova empresa (sem initialData)
    if (!initialData) {
      form.reset({
        name: "",
        cnpj: "",
        email: "",
        telefone: "",
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        ramoAtividade: "",
        notificationDays: 7,
      });
      return;
    }

    // Para edição: reseta os dados básicos sempre (exceto notificationDays que pode estar carregando)
    const baseData = {
      name: initialData.name,
      cnpj: formatCNPJ(initialData.cnpj),
      email: initialData.email,
      telefone: formatPhone(initialData.telefone),
      cep: formatCEP(initialData.cep),
      endereco: initialData.endereco,
      numero: initialData.numero,
      complemento: initialData.complemento || "",
      bairro: initialData.bairro,
      cidade: initialData.cidade,
      estado: initialData.estado,
      ramoAtividade: initialData.ramoAtividade || "",
      // Se já tem settings, usa, senão mantém o que veio do initialData
      notificationDays:
        settings?.notificationDays ?? initialData.notificationDays ?? 7,
    };

    form.reset(baseData);
  }, [isOpen, initialData, settings, form]);

  // 🔥 Efeito separado apenas para sincronizar notificationDays quando settings chegar
  useEffect(() => {
    if (settings?.notificationDays && initialData) {
      const currentValue = form.getValues("notificationDays");
      // Só atualiza se for diferente
      if (currentValue !== settings.notificationDays) {
        form.setValue("notificationDays", settings.notificationDays);
      }
    }
  }, [settings, initialData, form]);

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, "");
    if (rawCep.length !== 8) return;
    setIsCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();
      if (data.erro) return showError("CEP Inválido", "CEP não encontrado.");
      form.setValue("endereco", data.logradouro);
      form.setValue("bairro", data.bairro);
      form.setValue("cidade", data.localidade);
      form.setValue("estado", data.uf);
    } catch (err) {
      showError("Erro", "Erro ao buscar CEP.");
    } finally {
      setIsCepLoading(false);
    }
  };

  const internalOnSubmit = async (values: CompanyFormValues) => {
    const payload: any = { ...values };
    // Lógica de CNPJ idêntica ao seu original
    const cnpjLimpo = cleanMask(values.cnpj);
    if (initialData && cnpjLimpo === cleanMask(initialData.cnpj))
      delete payload.cnpj;

    // Converte para null campos vazios
    payload.complemento = values.complemento || null;
    payload.ramoAtividade = values.ramoAtividade || null;

    await onSubmit(payload);
  };

  const currentNotificationDays = form.watch("notificationDays") || 7;

  // 🔥 Determina se deve mostrar skeleton no input de dias
  const shouldShowSkeleton =
    !!(activeTab === "notifications" && initialData && isLoadingSettings);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 bg-white">
        <DialogHeader className="px-6 py-4 border-b bg-[#F9F7F2] shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-full ${initialData ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}
            >
              {initialData ? (
                <Edit className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-[#2D3436] text-xl font-bold">
                {initialData ? "Editar Empresa" : "Nova Empresa"}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b bg-white shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("basic")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === "basic"
                  ? "bg-orange-50 text-orange-600 border-b-2 border-orange-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Dados Básicos
            </button>
            <button
              onClick={() => setActiveTab("address")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === "address"
                  ? "bg-orange-50 text-orange-600 border-b-2 border-orange-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Endereço
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === "notifications"
                  ? "bg-orange-50 text-orange-600 border-b-2 border-orange-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Notificações
              {initialData &&
                isLoadingSettings &&
                activeTab !== "notifications" && (
                  <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin" />
                )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6 py-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(internalOnSubmit)}
                className="space-y-6"
              >
                {/* ABA 1: BÁSICO */}
                {activeTab === "basic" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razão Social</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) =>
                                field.onChange(formatCNPJ(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <FormControl>
                              <Input className="pl-9" {...field} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <FormControl>
                              <Input
                                className="pl-9"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(formatPhone(e.target.value))
                                }
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ramoAtividade"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Ramo de Atividade</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* ABA 2: ENDEREÇO */}
                {activeTab === "address" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <FormField
                        control={form.control}
                        name="cep"
                        render={({ field }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  onBlur={handleCepBlur}
                                  onChange={(e) =>
                                    field.onChange(formatCEP(e.target.value))
                                  }
                                />
                                {isCepLoading && (
                                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endereco"
                        render={({ field }) => (
                          <FormItem className="md:col-span-7">
                            <FormLabel>Logradouro</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="numero"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <FormField
                        control={form.control}
                        name="complemento"
                        render={({ field }) => (
                          <FormItem className="md:col-span-4">
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bairro"
                        render={({ field }) => (
                          <FormItem className="md:col-span-4">
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cidade"
                        render={({ field }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="estado"
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel>UF</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                maxLength={2}
                                className="uppercase"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* ABA 3: NOTIFICAÇÕES */}
                {activeTab === "notifications" && (
                  <div className="space-y-4 p-2">
                    <div className="flex items-center gap-2 mb-4">
                      <Bell className="h-5 w-5 text-orange-500" />
                      <h3 className="text-sm font-bold text-[#2C3E50] uppercase">
                        Configurações de Notificação
                      </h3>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <FormItem>
                        <FormLabel>Dias de Antecedência</FormLabel>
                        <FormControl>
                          <NotificationDaysInput
                            value={currentNotificationDays}
                            onChange={(value) =>
                              form.setValue("notificationDays", value)
                            }
                            isLoading={shouldShowSkeleton}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                      <Alert className="mt-4 bg-white">
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle>Como funciona</AlertTitle>
                        <AlertDescription className="text-xs">
                          {shouldShowSkeleton ? (
                            <div className="space-y-2">
                              <Skeleton className="h-3 w-48" />
                              <Skeleton className="h-3 w-64" />
                            </div>
                          ) : (
                            `Com ${currentNotificationDays} dias de antecedência, você receberá notificações de itens que vencem. O valor padrão é 7.`
                          )}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </ScrollArea>
        </div>

        <div className="px-6 py-4 border-t bg-[#F9F7F2] flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(internalOnSubmit)}
            disabled={isSubmitting || (!!initialData && isLoadingSettings)}
            className="bg-[#D35400] text-white min-w-[140px] hover:bg-[#D35400]/90"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {initialData ? "Salvar Alterações" : "Criar Empresa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

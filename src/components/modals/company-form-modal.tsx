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
import { Separator } from "@/components/ui/separator";
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

// Schema com todos os campos de endereço obrigatórios
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
  ramoAtividade: z.string().optional(),
  cep: z.string().min(8, "CEP obrigatório"),
  endereco: z.string().min(1, "Endereço obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro obrigatório"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  estado: z.string().length(2, "UF obrigatória (2 caracteres)"),
  notificationDays: z
    .number()
    .min(1, "Mínimo 1 dia")
    .max(90, "Máximo 90 dias")
    .optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

// Componente de Input com Skeleton
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
          <span className="text-sm text-[#7A7E83]">dias</span>
        </>
      ) : (
        <>
          <Input
            type="number"
            min={1}
            max={90}
            className="w-32 bg-white border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          />
          <span className="text-sm text-[#7A7E83]">dias</span>
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
  const [activeTab, setActiveTab] = useState<"general" | "notifications">("general");

  const companyId = initialData?.id;
  const { data: settings, isLoading: isLoadingSettings } = useCompanySettings(
    companyId as string,
  );

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      cnpj: "",
      email: "",
      telefone: "",
      ramoAtividade: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      notificationDays: 7,
    },
  });

  // Reset do formulário
  useEffect(() => {
    if (!isOpen) return;

    if (!initialData) {
      form.reset({
        name: "",
        cnpj: "",
        email: "",
        telefone: "",
        ramoAtividade: "",
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        notificationDays: 7,
      });
      return;
    }

    const baseData = {
      name: initialData.name,
      cnpj: formatCNPJ(initialData.cnpj),
      email: initialData.email,
      telefone: formatPhone(initialData.telefone),
      ramoAtividade: initialData.ramoAtividade || "",
      cep: formatCEP(initialData.cep),
      endereco: initialData.endereco,
      numero: initialData.numero,
      complemento: initialData.complemento || "",
      bairro: initialData.bairro,
      cidade: initialData.cidade,
      estado: initialData.estado,
      notificationDays: settings?.notificationDays ?? initialData.notificationDays ?? 7,
    };

    form.reset(baseData);
  }, [isOpen, initialData, settings, form]);

  // Sincronizar notificationDays
  useEffect(() => {
    if (settings?.notificationDays && initialData) {
      const currentValue = form.getValues("notificationDays");
      if (currentValue !== settings.notificationDays) {
        form.setValue("notificationDays", settings.notificationDays);
      }
    }
  }, [settings, initialData, form]);

  // Busca CEP via ViaCEP
  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, "");
    if (rawCep.length !== 8) return;
    
    setIsCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();
      
      if (data.erro) {
        showError("CEP Inválido", "CEP não encontrado.");
        return;
      }
      
      form.setValue("endereco", data.logradouro || "");
      form.setValue("bairro", data.bairro || "");
      form.setValue("cidade", data.localidade || "");
      form.setValue("estado", data.uf || "");
    } catch (err) {
      showError("Erro", "Erro ao buscar CEP.");
    } finally {
      setIsCepLoading(false);
    }
  };

  // Validação antes de submeter
  const validateAddressBeforeSubmit = (values: CompanyFormValues): boolean => {
    const requiredFields = [
      { field: values.cep, name: "CEP" },
      { field: values.endereco, name: "Endereço" },
      { field: values.numero, name: "Número" },
      { field: values.bairro, name: "Bairro" },
      { field: values.cidade, name: "Cidade" },
      { field: values.estado, name: "UF" },
    ];

    const missingFields = requiredFields.filter(f => !f.field || f.field.trim() === "");
    
    if (missingFields.length > 0) {
      const missingNames = missingFields.map(f => f.name).join(", ");
      showError(
        "Campos obrigatórios", 
        `Preencha os seguintes campos de endereço: ${missingNames}`
      );
      return false;
    }
    
    return true;
  };

  const internalOnSubmit = async (values: CompanyFormValues) => {
    if (!validateAddressBeforeSubmit(values)) {
      return;
    }

    const payload: any = { ...values };
    
    const cnpjLimpo = cleanMask(values.cnpj);
    if (initialData && cnpjLimpo === cleanMask(initialData.cnpj)) {
      delete payload.cnpj;
    }

    payload.complemento = values.complemento || null;
    payload.ramoAtividade = values.ramoAtividade || null;

    await onSubmit(payload);
  };

  const currentNotificationDays = form.watch("notificationDays") || 7;
  const shouldShowSkeleton = !!(activeTab === "notifications" && initialData && isLoadingSettings);

  // Verifica se há campos de endereço obrigatórios faltando
  const watchCep = form.watch("cep");
  const watchEndereco = form.watch("endereco");
  const watchNumero = form.watch("numero");
  const watchBairro = form.watch("bairro");
  const watchCidade = form.watch("cidade");
  const watchEstado = form.watch("estado");
  
  const isAddressComplete = !!(
    watchCep && watchCep.replace(/\D/g, "").length === 8 &&
    watchEndereco?.trim() &&
    watchNumero?.trim() &&
    watchBairro?.trim() &&
    watchCidade?.trim() &&
    watchEstado?.trim().length === 2
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 bg-white rounded-xl shadow-xl">
        <DialogHeader className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F5F6FA] shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-full ${
                initialData 
                  ? "bg-[#2F80ED]/10 text-[#2F80ED]" 
                  : "bg-[#D35400]/10 text-[#D35400]"
              }`}
            >
              {initialData ? (
                <Edit className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-[#353A40] text-xl font-bold">
                {initialData ? "Editar Empresa" : "Nova Empresa"}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-[#E2E8F0] bg-white shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("general")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === "general"
                  ? "bg-[#F5F6FA] text-[#2F80ED] border-b-2 border-[#2F80ED]"
                  : "text-[#7A7E83] hover:text-[#353A40]"
              }`}
            >
              Dados Gerais
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === "notifications"
                  ? "bg-[#F5F6FA] text-[#2F80ED] border-b-2 border-[#2F80ED]"
                  : "text-[#7A7E83] hover:text-[#353A40]"
              }`}
            >
              Notificações
              {initialData && isLoadingSettings && activeTab !== "notifications" && (
                <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin text-[#2F80ED]" />
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
                {/* ABA: DADOS GERAIS */}
                {activeTab === "general" && (
                  <div className="space-y-6">
                    {/* Seção: Dados da Empresa */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="h-4 w-4 text-[#2F80ED]" />
                        <h3 className="text-sm font-semibold text-[#353A40] uppercase tracking-wider">
                          Dados da Empresa
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#353A40] font-medium">
                                Razão Social <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
                                />
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
                              <FormLabel className="text-[#353A40] font-medium">
                                CNPJ <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(formatCNPJ(e.target.value))
                                  }
                                  className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
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
                              <FormLabel className="text-[#353A40] font-medium">
                                E-mail <span className="text-red-500">*</span>
                              </FormLabel>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#7A7E83]" />
                                <FormControl>
                                  <Input 
                                    className="pl-9 border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]" 
                                    {...field} 
                                  />
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
                              <FormLabel className="text-[#353A40] font-medium">
                                Telefone <span className="text-red-500">*</span>
                              </FormLabel>
                              <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[#7A7E83]" />
                                <FormControl>
                                  <Input
                                    className="pl-9 border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
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
                              <FormLabel className="text-[#353A40] font-medium">
                                Ramo de Atividade
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator className="bg-[#E2E8F0]" />

                    {/* Seção: Endereço */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-4 w-4 text-[#2F80ED]" />
                        <h3 className="text-sm font-semibold text-[#353A40] uppercase tracking-wider">
                          Endereço
                        </h3>
                        <span className="text-xs text-[#7A7E83]">* Campos obrigatórios</span>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="cep"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#353A40] font-medium">
                                  CEP <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      {...field}
                                      onBlur={handleCepBlur}
                                      onChange={(e) =>
                                        field.onChange(formatCEP(e.target.value))
                                      }
                                      placeholder="00000-000"
                                      className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
                                    />
                                    {isCepLoading && (
                                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-[#2F80ED]" />
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                          <FormField
                            control={form.control}
                            name="endereco"
                            render={({ field }) => (
                              <FormItem className="sm:col-span-8">
                                <FormLabel className="text-[#353A40] font-medium">
                                  Logradouro <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Rua, Avenida, etc"
                                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="numero"
                            render={({ field }) => (
                              <FormItem className="sm:col-span-4">
                                <FormLabel className="text-[#353A40] font-medium">
                                  Número <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="123"
                                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                          <FormField
                            control={form.control}
                            name="complemento"
                            render={({ field }) => (
                              <FormItem className="sm:col-span-4">
                                <FormLabel className="text-[#353A40] font-medium">
                                  Complemento
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Apto, Sala, etc"
                                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bairro"
                            render={({ field }) => (
                              <FormItem className="sm:col-span-8">
                                <FormLabel className="text-[#353A40] font-medium">
                                  Bairro <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Centro"
                                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                          <FormField
                            control={form.control}
                            name="cidade"
                            render={({ field }) => (
                              <FormItem className="sm:col-span-8">
                                <FormLabel className="text-[#353A40] font-medium">
                                  Cidade <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="São Paulo"
                                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="estado"
                            render={({ field }) => (
                              <FormItem className="sm:col-span-4">
                                <FormLabel className="text-[#353A40] font-medium">
                                  UF <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    maxLength={2}
                                    className="uppercase border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED]/20 text-[#353A40]"
                                    placeholder="SP"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {!isAddressComplete && (
                        <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                          <InfoIcon className="h-4 w-4 text-yellow-600" />
                          <AlertTitle className="text-yellow-800 text-sm">
                            Atenção
                          </AlertTitle>
                          <AlertDescription className="text-xs text-yellow-700">
                            Preencha todos os campos de endereço (CEP, Logradouro, Número, Bairro, Cidade e UF) 
                            para salvar a empresa.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                )}

                {/* ABA: NOTIFICAÇÕES */}
                {activeTab === "notifications" && (
                  <div className="space-y-4 p-2">
                    <div className="flex items-center gap-2 mb-4">
                      <Bell className="h-5 w-5 text-[#2F80ED]" />
                      <h3 className="text-sm font-bold text-[#353A40] uppercase">
                        Configurações de Notificação
                      </h3>
                    </div>
                    <div className="bg-[#F5F6FA] border border-[#E2E8F0] rounded-lg p-4">
                      <FormItem>
                        <FormLabel className="text-[#353A40] font-medium">
                          Dias de Antecedência
                        </FormLabel>
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
                      <Alert className="mt-4 bg-white border-[#E2E8F0]">
                        <InfoIcon className="h-4 w-4 text-[#2F80ED]" />
                        <AlertTitle className="text-[#353A40] text-sm">
                          Como funciona
                        </AlertTitle>
                        <AlertDescription className="text-xs text-[#7A7E83]">
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

        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F5F6FA] flex justify-end gap-3 shrink-0 rounded-b-xl">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="border-[#CBD5E1] text-[#353A40] hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(internalOnSubmit)}
            disabled={isSubmitting || (!!initialData && isLoadingSettings) || !isAddressComplete}
            className="bg-[#D35400] text-white min-w-[160px] hover:bg-[#D35400]/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {initialData ? "Salvando..." : "Criando..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {initialData ? "Salvar Alterações" : "Criar Empresa"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
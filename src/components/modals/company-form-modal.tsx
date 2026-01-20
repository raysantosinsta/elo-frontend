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
  Mail
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
import { Separator } from "@/components/ui/separator";
import { useError } from "@/contexts/error-context";

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
}

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: CompanyData | null;
  onSubmit: (values: any) => Promise<void>;
  isLoading: boolean;
}

// --- Helpers e Schema ---
const cleanMask = (value: string | undefined) => value ? value.replace(/\D/g, "") : "";

const formatPhone = (v: string | undefined) => {
  if (!v) return "";
  let r = v.replace(/\D/g, "");
  if (r.length > 11) r = r.substring(0, 11);
  if (r.length > 10) return r.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (r.length > 5) return r.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  if (r.length > 2) return r.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return r.replace(/^(\d*)/, "($1");
};

const formatCNPJ = (v: string | undefined) => {
  if (!v) return "";
  return v.replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").substring(0, 18);
};

const formatCEP = (v: string | undefined) => {
  if (!v) return "";
  return v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);
};

const companySchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  cnpj: z.string().min(14, "CNPJ inválido").transform((v) => cleanMask(v)),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(10, "Telefone inválido").transform((v) => cleanMask(v)),
  cep: z.string().min(8, "CEP inválido").transform((v) => cleanMask(v)),
  endereco: z.string().min(1, "Endereço obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro obrigatório"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  estado: z.string().length(2, "UF inválida"),
  ramoAtividade: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export function CompanyFormModal({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isLoading,
}: CompanyFormModalProps) {
  const { showError } = useError();
  const [isCepLoading, setIsCepLoading] = useState(false);
  const isEditing = !!initialData;

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "", cnpj: "", email: "", telefone: "", cep: "",
      endereco: "", numero: "", complemento: "", bairro: "",
      cidade: "", estado: "", ramoAtividade: "",
    },
  });

  // Reset form when modal opens or data changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
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
        });
      } else {
        form.reset({
          name: "", cnpj: "", email: "", telefone: "", cep: "",
          endereco: "", numero: "", complemento: "", bairro: "",
          cidade: "", estado: "", ramoAtividade: "",
        });
      }
    }
  }, [isOpen, initialData, form]);

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, "");
    if (rawCep.length !== 8) return;
    setIsCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        showError("CEP Inválido", "O CEP informado não foi encontrado.");
        return;
      }
      form.setValue("endereco", data.logradouro);
      form.setValue("bairro", data.bairro);
      form.setValue("cidade", data.localidade);
      form.setValue("estado", data.uf);
      form.setFocus("numero");
    } catch (err) {
      showError("Erro na Busca", "Não foi possível consultar o CEP.");
    } finally {
      setIsCepLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 bg-white border-[#F5F0E6]">
        
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-[#F5F0E6] bg-[#F9F7F2] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full ${isEditing ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
              {isEditing ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-[#2D3436] text-xl font-bold">
                {isEditing ? "Editar Empresa" : "Nova Empresa"}
              </DialogTitle>
              <DialogDescription className="text-[#95A5A6]">
                {isEditing ? "Atualize os dados cadastrais." : "Preencha os dados para registrar uma nova empresa."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
                
                {/* Seção 1: Identificação */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                    <Building2 className="h-4 w-4 text-orange-500" /> Identificação
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão Social</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cnpj" render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={18} onChange={e => field.onChange(formatCNPJ(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <FormControl><Input className="pl-9" {...field} /></FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="telefone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <FormControl>
                            <Input className="pl-9" {...field} maxLength={15} onChange={e => field.onChange(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="ramoAtividade" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Ramo de Atividade</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Seção 2: Endereço */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                    <MapPin className="h-4 w-4 text-orange-500" /> Endereço
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <FormField control={form.control} name="cep" render={({ field }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel>CEP</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input {...field} maxLength={9} onChange={e => field.onChange(formatCEP(e.target.value))} onBlur={handleCepBlur} className="pr-8" />
                          </FormControl>
                          {isCepLoading ? (
                            <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-orange-500" />
                          ) : (
                            <SearchIcon className="absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="endereco" render={({ field }) => (
                      <FormItem className="md:col-span-7"><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="numero" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="bairro" render={({ field }) => (
                      <FormItem className="md:col-span-4"><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="cidade" render={({ field }) => (
                      <FormItem className="md:col-span-4"><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="estado" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>UF</FormLabel><FormControl><Input {...field} maxLength={2} className="uppercase" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="complemento" render={({ field }) => (
                      <FormItem className="md:col-span-12"><FormLabel>Complemento</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>

              </form>
            </Form>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F5F0E6] bg-[#F9F7F2] flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="border-slate-300 text-slate-700">
            Cancelar
          </Button>
          <Button onClick={() => form.handleSubmit(onSubmit)()} disabled={isLoading} className="bg-[#D35400] hover:bg-[#D35400]/90 text-white min-w-[140px]">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} 
            {isEditing ? "Salvar Alterações" : "Criar Empresa"}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
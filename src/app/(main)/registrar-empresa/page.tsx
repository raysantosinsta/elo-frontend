/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// 1. CORREÇÃO: Importar api diretamente do serviço
import { api } from "@/services/api";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// --- Schema de Validação ---
const companyFormSchema = z.object({
  name: z.string().min(2, "Nome da empresa é obrigatório (min. 2 caracteres)"),
  cnpj: z
    .string()
    .min(14, "CNPJ inválido")
    .transform((v) => v.replace(/\D/g, "")),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  cep: z
    .string()
    .min(8, "CEP inválido")
    .transform((v) => v.replace(/\D/g, "")),
  endereco: z.string().min(1, "Endereço é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().length(2, "UF inválida (2 letras)"),
  ramoAtividade: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export default function CompanyRegistrationPage() {
  const router = useRouter();

  // 2. CORREÇÃO: Removemos o useAuth aqui
  // const { api } = useAuth(); <--- REMOVIDO

  const [isLoading, setIsLoading] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
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
    },
    mode: "onChange",
  });

  // --- Helpers Visuais (Máscaras) ---
  const formatCNPJ = (v: string | undefined | null) => {
    if (!v) return "";
    return v
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
      .substring(0, 18);
  };

  const formatPhone = (v: string | undefined | null) => {
    if (!v) return "";
    return v
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)(\d{4})(\d{4})/, "($1) $2 $3-$4")
      .substring(0, 15);
  };

  const formatCEP = (v: string | undefined | null) => {
    if (!v) return "";
    return v
      .replace(/\D/g, "")
      .replace(/^(\d{5})(\d)/, "$1-$2")
      .substring(0, 9);
  };

  // --- Busca de CEP (Pública) ---
  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, "");
    if (rawCep.length !== 8) return;

    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        form.setValue("endereco", data.logradouro);
        form.setValue("bairro", data.bairro);
        form.setValue("cidade", data.localidade);
        form.setValue("estado", data.uf);
        form.setFocus("numero");

        toast.info("Endereço localizado", {
          description: `${data.logradouro}, ${data.bairro}`,
        });
      } else {
        toast.error("CEP não encontrado");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP", error);
    } finally {
      setIsCepLoading(false);
    }
  };

  // --- SUBMIT USANDO AXIOS (API) ---
  async function onSubmit(data: CompanyFormValues) {
    setIsLoading(true);

    try {
      console.log("Enviando payload via Axios:", data);

      // A instância 'api' já injeta o Header Authorization e URL Base
      await api.post("/companies", data);

      toast.success("Empresa cadastrada!", {
        description: `A empresa ${data.name} foi registrada com sucesso.`,
        duration: 5000,
      });

      form.reset();
      // router.push('/dashboard/companies') 
    } catch (error: any) {
      console.error("Erro completo:", error); 

      let errorMessage = "Erro ao conectar com o servidor.";

      // Tratamento de erro do Axios
      if (error.response) {
        const responseData = error.response.data;

        if (typeof responseData === "string") {
          errorMessage = responseData;
        } else if (responseData?.message) {
          if (Array.isArray(responseData.message)) {
            errorMessage = responseData.message.join(", "); // Erros de validação (DTO)
          } else {
            errorMessage = responseData.message; // Erros manuais
          }
        }

        if (error.response.status === 401) {
          errorMessage = "Sessão expirada. Faça login novamente.";
        }
      }

      toast.error("Falha no cadastro", {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F0E6] py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
      <Card className="w-full max-w-4xl bg-white shadow-xl border border-[#95A5A6]/20 rounded-xl overflow-hidden">
        {/* Header */}
        <CardHeader className="bg-white border-b border-[#F5F0E6] pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#2C3E50] hover:text-[#2D3436] hover:bg-[#F5F0E6] -ml-2"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F5F0E6] rounded-lg">
              <Building2 className="w-8 h-8 text-[#2D3436]" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-[#2D3436]">
                Cadastrar Nova Empresa
              </CardTitle>
              <CardDescription className="text-[#95A5A6] mt-1">
                Preencha os dados institucionais para iniciar o fluxo de
                produção.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Dados Corporativos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2C3E50] flex items-center gap-2">
                  <span className="w-1 h-6 bg-[#D35400] rounded-full inline-block"></span>
                  Dados Corporativos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#2D3436]">
                          Razão Social / Nome Fantasia
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Confecções Silva LTDA"
                            className="focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#2D3436]">CNPJ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            className="focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                            {...field}
                            onChange={(e) =>
                              field.onChange(formatCNPJ(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#2D3436]">
                          E-mail Corporativo
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="contato@empresa.com"
                            className="focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#2D3436]">
                          Telefone / WhatsApp
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            className="focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                            {...field}
                            onChange={(e) =>
                              field.onChange(formatPhone(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ramoAtividade"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[#2D3436]">
                          Ramo de Atividade (Opcional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Confecção de Moda Praia"
                            className="focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator className="bg-[#95A5A6]/30" />

              {/* Localização */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2C3E50] flex items-center gap-2">
                  <span className="w-1 h-6 bg-[#D35400] rounded-full inline-block"></span>
                  Localização
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel className="text-[#2D3436]">CEP</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              placeholder="00000-000"
                              maxLength={9}
                              className="focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30 pr-10"
                              {...field}
                              onChange={(e) =>
                                field.onChange(formatCEP(e.target.value))
                              }
                              onBlur={handleCepBlur}
                            />
                          </FormControl>
                          {isCepLoading ? (
                            <Loader2 className="absolute right-3 top-2.5 h-5 w-5 text-[#D35400] animate-spin" />
                          ) : (
                            <Search className="absolute right-3 top-2.5 h-5 w-5 text-[#95A5A6]" />
                          )}
                        </div>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco"
                    render={({ field }) => (
                      <FormItem className="md:col-span-7">
                        <FormLabel className="text-[#2D3436]">
                          Logradouro
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-[#95A5A6]" />
                            <Input
                              placeholder="Rua, Avenida..."
                              className="pl-10 focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[#2D3436]">Número</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123"
                            className="focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem className="md:col-span-4">
                        <FormLabel className="text-[#2D3436]">Bairro</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Centro"
                            className="focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem className="md:col-span-4">
                        <FormLabel className="text-[#2D3436]">Cidade</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="São Paulo"
                            className="focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[#2D3436]">UF</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="SP"
                            maxLength={2}
                            className="uppercase focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem className="md:col-span-12">
                        <FormLabel className="text-[#2D3436]">
                          Complemento (Opcional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Galpão B, Sala 3..."
                            className="focus-visible:ring-[#2C3E50] border-[#95A5A6]/40 bg-[#F5F0E6]/30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[#D35400]" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-[#F5F0E6]">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#95A5A6] text-[#2D3436] hover:bg-[#F5F0E6]"
                  onClick={() => form.reset()}
                >
                  Limpar Formulário
                </Button>
                <Button
                  type="submit"
                  className="bg-[#D35400] hover:bg-[#D35400]/90 text-white min-w-[150px] transition-all duration-300 shadow-md hover:shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Cadastrar Empresa
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
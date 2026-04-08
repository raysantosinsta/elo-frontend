/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon,
  MapPinIcon,
  PlusIcon,
  Trash2Icon,
  Loader2,
  UserIcon,
  MapPin, 
  ArrowUpDown,
  CheckCircleIcon,
  AlertCircleIcon
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// --- IMPORTAÇÕES DO SEU PROJETO ---
import { useRoutes } from "@/hooks/useRoutes";
import { userService } from "@/services/userService";
import { User } from "@/types/chat";

// --- SCHEMA DE VALIDAÇÃO ---
const stopSchema = z.object({
  name: z.string().min(1, "Número/Identificação é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "UF é obrigatória").max(2),
  zipCode: z.string().min(8, "CEP inválido"),
  latitude: z.number().optional().default(0),
  longitude: z.number().optional().default(0),
  notes: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(3, "Título muito curto"),
  description: z.string().optional(),
  routeDate: z.date().optional(),
  userAssignedId: z.string().optional().nullable(),
  orderBy: z.enum(["DISTANCE", "PRIORITY"]).default("DISTANCE"),
  stops: z.array(stopSchema).min(1, "Adicione pelo menos uma parada"),
});

type FormValues = z.infer<typeof formSchema>;

// 🎯 Componente de Skeleton para loading
const FormSkeleton = () => (
  <div className="space-y-6">
    <div className="h-12 w-full bg-white/10 rounded-lg animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-24 bg-white/10 rounded-lg animate-pulse" />
      <div className="h-24 bg-white/10 rounded-lg animate-pulse" />
    </div>
    <div className="h-32 bg-white/10 rounded-lg animate-pulse" />
  </div>
);

// 🎯 Componente de StopItem memoizado
const StopItem = memo(({ stop, index, onRemove, onZipChange, form, inputStyle, labelStyle }: any) => {
  return (
    <Card className="pt-6 px-4 pb-4 space-y-4 bg-white/5 border-white/10">
      <div className="flex justify-between items-center border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-[#D35400] text-white px-2 py-1 rounded uppercase tracking-wider">
            Parada {index + 1}
          </span>
          {form.watch(`stops.${index}.latitude`) !== 0 && form.watch(`stops.${index}.longitude`) !== 0 && (
            <CheckCircleIcon className="h-3 w-3 text-green-400" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-red-500/10 transition-colors"
          onClick={() => onRemove(index)}
        >
          <Trash2Icon className="h-4 w-4 text-red-500" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3">
          <FormField
            control={form.control}
            name={`stops.${index}.zipCode`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel className={labelStyle}>CEP</FormLabel>
                <FormControl>
                  <Input
                    className={inputStyle}
                    {...f}
                    maxLength={8}
                    onChange={(e) => {
                      f.onChange(e);
                      onZipChange(index, e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="md:col-span-6">
          <FormField
            control={form.control}
            name={`stops.${index}.address`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel className={labelStyle}>Rua</FormLabel>
                <FormControl>
                  <Input className={inputStyle} {...f} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="md:col-span-3">
          <FormField
            control={form.control}
            name={`stops.${index}.name`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel className={labelStyle}>Número</FormLabel>
                <FormControl>
                  <Input className={inputStyle} placeholder="123" {...f} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name={`stops.${index}.city`}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel className={labelStyle}>Cidade</FormLabel>
              <FormControl>
                <Input className={inputStyle} {...f} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`stops.${index}.state`}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel className={labelStyle}>UF</FormLabel>
              <FormControl>
                <Input className={inputStyle} maxLength={2} {...f} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Card>
  );
});

StopItem.displayName = 'StopItem';

// 🎯 Componente de Resumo memoizado
const ReviewSummary = memo(({ form, users, fields }: any) => {
  const selectedUser = users.find((u: any) => u.id === form.watch("userAssignedId"));
  
  return (
    <Card className="bg-[#2C3E50] border-white/10 shadow-xl text-[#D1D5DB]">
      <CardHeader>
        <CardTitle className="text-white text-xl">Confirmar Criação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-5 bg-white/5 rounded-lg space-y-4 text-sm border border-white/10">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white font-semibold">Título:</span>
            <span className="text-[#D1D5DB]">{form.watch("title") || "Não informado"}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white font-semibold">Algoritmo:</span>
            <span className="text-[#D1D5DB]">
              {form.watch("orderBy") === "DISTANCE" ? "📍 Proximidade" : "🎯 Prioridade"}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white font-semibold">Motorista:</span>
            <span className="text-[#D1D5DB]">{selectedUser?.name || "Não atribuído"}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white font-semibold">Data da Operação:</span>
            <span className="text-[#D1D5DB]">
              {form.watch("routeDate")
                ? format(form.watch("routeDate")!, "dd/MM/yyyy", { locale: ptBR })
                : "Não definida"}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white font-semibold">Total de Paradas:</span>
            <span className="bg-[#D35400] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {fields.length} {fields.length === 1 ? "DESTINO" : "DESTINOS"}
            </span>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg font-bold bg-[#D35400] hover:bg-[#E67E22] text-white transition-all shadow-lg active:scale-[0.98]"
        >
          Salvar e Gerar Rota
        </Button>

        <p className="text-center text-[#6B7280] text-xs">
          Ao confirmar, a rota será enviada para o dispositivo do motorista.
        </p>
      </CardContent>
    </Card>
  );
});

ReviewSummary.displayName = 'ReviewSummary';

import { memo } from 'react';

export default function CreateRoutePage() {
  const router = useRouter();
  const { useCreateRoute } = useRoutes();
  const createRoute = useCreateRoute();

  const [activeTab, setActiveTab] = useState("basic");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      orderBy: "DISTANCE",
      stops: [],
      userAssignedId: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stops",
  });

  // 🔥 Carregar usuários com cache
  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await userService.getUsersByName("");
        setUsers(data);
      } catch {
        toast.error("Erro ao carregar funcionários.");
      } finally {
        setIsLoadingUsers(false);
      }
    }
    loadUsers();
  }, []);

  // 🔥 Debounce do CEP
  const handleZipCodeChange = useCallback(async (index: number, zip: string) => {
    const cleanedZip = zip.replace(/\D/g, "");
    form.setValue(`stops.${index}.zipCode`, cleanedZip);
    
    if (cleanedZip.length === 8) {
      const toastId = `cep-${index}`;
      toast.loading("Buscando endereço...", { id: toastId });
      
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanedZip}/json/`);
        const data = await res.json();
        
        if (!data.erro) {
          form.setValue(`stops.${index}.address`, data.logradouro, { shouldValidate: true });
          form.setValue(`stops.${index}.neighborhood`, data.bairro, { shouldValidate: true });
          form.setValue(`stops.${index}.city`, data.localidade, { shouldValidate: true });
          form.setValue(`stops.${index}.state`, data.uf, { shouldValidate: true });
          toast.success("Endereço encontrado!", { id: toastId });
        } else {
          toast.error("CEP não encontrado", { id: toastId });
        }
      } catch {
        toast.error("Erro ao consultar CEP.", { id: toastId });
      }
    }
  }, [form]);

  // 🔥 Geocodificação otimizada
  const geocodeStopIfNeeded = useCallback(async (stop: any) => {
    if (stop.latitude && stop.latitude !== 0) return stop;
    
    const fullAddress = `${stop.address}, ${stop.name}, ${stop.city}, ${stop.state}, Brasil`;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          ...stop,
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
    } catch (error) {
      console.error("Erro ao geocodificar:", error);
    }
    return stop;
  }, []);

  const onSubmit = useCallback(async (data: FormValues) => {
    setIsGeocoding(true);
    const loadingToast = toast.loading("Preparando rota...");
    
    try {
      // Geocodificar automaticamente as paradas sem coordenadas
      const stopsWithCoords = await Promise.all(
        data.stops.map((stop) => geocodeStopIfNeeded(stop))
      );

      const payload = {
        title: data.title,
        description: data.description || "",
        routeDate: data.routeDate?.toISOString(),
        userAssignedId: data.userAssignedId || undefined,
        orderBy: data.orderBy,
        stops: stopsWithCoords,
      };
      
      await createRoute.mutateAsync(payload as any);
      
      toast.dismiss(loadingToast);
      toast.success("Rota criada com sucesso!", {
        duration: 3000,
        action: {
          label: "Ver Rotas",
          onClick: () => router.push("/routes"),
        },
      });
      
      router.push("/routes");
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error("Erro ao salvar rota.", {
        description: err?.message || "Tente novamente mais tarde",
      });
    } finally {
      setIsGeocoding(false);
    }
  }, [createRoute, geocodeStopIfNeeded, router]);

  // 🔥 Adicionar parada com feedback
  const handleAddStop = useCallback(() => {
    append({
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      latitude: 0,
      longitude: 0,
    });
    toast.success("Nova parada adicionada", { duration: 1500 });
  }, [append]);

  // 🔥 Remover parada com confirmação
  const handleRemoveStop = useCallback((index: number) => {
    if (fields.length === 1) {
      toast.warning("É necessário pelo menos uma parada");
      return;
    }
    remove(index);
    toast.success("Parada removida", { duration: 1500 });
  }, [fields.length, remove]);

  // 🔥 Estatísticas para o resumo
  const stats = useMemo(() => ({
    totalStops: fields.length,
    hasCoordinates: fields.filter((_, idx) => 
      form.watch(`stops.${idx}.latitude`) !== 0 && form.watch(`stops.${idx}.longitude`) !== 0
    ).length,
  }), [fields.length, form]);

  // --- CLASSES DE ESTILO REUTILIZÁVEIS ---
  const inputStyle = "bg-[#2C3E50]/50 border-white/10 text-white placeholder:text-[#6B7280] focus-visible:ring-[#D35400] transition-all";
  const labelStyle = "text-[#D1D5DB]";
  const cardStyle = "bg-[#2C3E50] border-white/10 shadow-xl";

  // 🔥 Prefetch da página de rotas
  const prefetchRoutes = useCallback(() => {
    router.prefetch("/routes");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#2C3E50] text-[#D1D5DB] pb-12">
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header com stats */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Criar Nova Rota</h1>
          <p className="text-[#9CA3AF] mt-1">
            Preencha as informações abaixo para criar uma rota de entrega
          </p>
          {stats.totalStops > 0 && (
            <div className="flex gap-3 mt-3 text-xs">
              <span className="text-[#6B7280]">Total de paradas: <span className="text-white font-semibold">{stats.totalStops}</span></span>
              <span className="text-green-400">✓ {stats.hasCoordinates} geocodificadas</span>
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
                <TabsTrigger
                  value="basic"
                  className="data-[state=active]:bg-[#D35400] data-[state=active]:text-white text-[#9CA3AF] transition-all"
                >
                  1. Definições
                </TabsTrigger>
                <TabsTrigger
                  value="stops"
                  className="data-[state=active]:bg-[#D35400] data-[state=active]:text-white text-[#9CA3AF] transition-all"
                >
                  2. Paradas ({fields.length})
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className="data-[state=active]:bg-[#D35400] data-[state=active]:text-white text-[#9CA3AF] transition-all"
                >
                  3. Revisão
                </TabsTrigger>
              </TabsList>

              {/* ABA DEFINIÇÕES */}
              <TabsContent value="basic" className="pt-4 space-y-4">
                <Card className={cardStyle}>
                  <CardHeader>
                    <CardTitle className="text-white">Informações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelStyle}>Título da Rota</FormLabel>
                          <FormControl>
                            <Input
                              className={inputStyle}
                              placeholder="Ex: Entregas Expressas"
                              {...field}
                              onFocus={prefetchRoutes}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="userAssignedId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(labelStyle, "flex items-center gap-2")}>
                              <UserIcon className="w-4 h-4 text-[#D35400]" /> Atribuir Funcionário
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger className={inputStyle}>
                                  <SelectValue placeholder={isLoadingUsers ? "Carregando..." : "Selecione"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#2C3E50] border-white/10 text-[#D1D5DB]">
                                <SelectItem value="none">Nenhum</SelectItem>
                                {users.map((u) => (
                                  <SelectItem key={u.id} value={u.id} className="focus:bg-[#D35400] focus:text-white">
                                    {u.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-[#6B7280]">
                              Defina o responsável pela execução.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="orderBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelStyle}>Algoritmo de Rota</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className={inputStyle}>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#2C3E50] border-white/10 text-[#D1D5DB]">
                                <SelectItem value="DISTANCE">
                                  <MapPin className="w-4 h-4 text-[#D35400] mr-2 inline" />
                                  Proximidade (reordenado pelo GPS)
                                </SelectItem>
                                <SelectItem value="PRIORITY">
                                  <ArrowUpDown className="w-4 h-4 text-[#D35400] mr-2 inline" />
                                  Prioridade (ordem manual)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-[#6B7280]">
                              {field.value === "DISTANCE" 
                                ? "A rota será reordenada automaticamente com base na localização do motorista" 
                                : "A ordem das paradas será exatamente como você definir"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="routeDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className={labelStyle}>Data da Operação</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(inputStyle, "pl-3 text-left font-normal", !field.value && "text-[#9CA3AF]")}
                              >
                                {field.value
                                  ? format(field.value, "PPP", { locale: ptBR })
                                  : "Escolher data"}
                                <CalendarIcon className="ml-auto h-4 w-4 text-[#9CA3AF]" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-white/10 bg-[#2C3E50]" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                locale={ptBR}
                                className="text-white"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="bg-[#D35400] hover:bg-[#D35400]/80 text-white transition-all active:scale-95"
                    onClick={() => setActiveTab("stops")}
                  >
                    Próximo →
                  </Button>
                </div>
              </TabsContent>

              {/* ABA PARADAS */}
              <TabsContent value="stops" className="pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-white">Destinos da Rota</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[#D35400] text-[#D35400] hover:bg-[#D35400] hover:text-white transition-all"
                    onClick={handleAddStop}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" /> Adicionar Parada
                  </Button>
                </div>
                
                {fields.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="text-center py-12">
                      <MapPinIcon className="mx-auto h-12 w-12 text-[#6B7280] mb-4" />
                      <p className="text-[#9CA3AF]">Nenhuma parada adicionada</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 border-[#D35400] text-[#D35400] hover:bg-[#D35400] hover:text-white"
                        onClick={handleAddStop}
                      >
                        <PlusIcon className="h-4 w-4 mr-1" /> Adicionar primeira parada
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <StopItem
                        key={field.id}
                        stop={field}
                        index={index}
                        onRemove={handleRemoveStop}
                        onZipChange={handleZipCodeChange}
                        form={form}
                        inputStyle={inputStyle}
                        labelStyle={labelStyle}
                      />
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[#9CA3AF] hover:text-white transition-colors"
                    onClick={() => setActiveTab("basic")}
                  >
                    ← Voltar
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#D35400] text-white hover:bg-[#D35400]/80 transition-all active:scale-95"
                    onClick={() => setActiveTab("review")}
                    disabled={fields.length === 0}
                  >
                    Revisar Rota →
                  </Button>
                </div>
              </TabsContent>

              {/* ABA REVISÃO */}
              <TabsContent value="review" className="pt-4 space-y-4">
                <ReviewSummary form={form} users={users} fields={fields} />
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[#9CA3AF] hover:text-white transition-colors"
                    onClick={() => setActiveTab("stops")}
                  >
                    ← Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRoute.isPending || isGeocoding || fields.length === 0}
                    className="bg-[#D35400] hover:bg-[#E67E22] text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {createRoute.isPending || isGeocoding ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        {isGeocoding ? "Geocodificando..." : "Salvando..."}
                      </>
                    ) : (
                      "Salvar e Gerar Rota"
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
}
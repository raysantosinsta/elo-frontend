/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
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
  ArrowUpDown
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

export default function CreateRoutePage() {
  const router = useRouter();
  const { useCreateRoute } = useRoutes();
  const createRoute = useCreateRoute();

  const [activeTab, setActiveTab] = useState("basic");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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

  useEffect(() => {
    async function loadUsers() {
      setIsLoadingUsers(true);
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

  const handleZipCodeChange = async (index: number, zip: string) => {
    const cleanedZip = zip.replace(/\D/g, "");
    form.setValue(`stops.${index}.zipCode`, cleanedZip);
    if (cleanedZip.length === 8) {
      toast.loading("Buscando endereço...", { id: `cep-${index}` });
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanedZip}/json/`);
        const data = await res.json();
        if (!data.erro) {
          form.setValue(`stops.${index}.address`, data.logradouro, {
            shouldValidate: true,
          });
          form.setValue(`stops.${index}.neighborhood`, data.bairro, {
            shouldValidate: true,
          });
          form.setValue(`stops.${index}.city`, data.localidade, {
            shouldValidate: true,
          });
          form.setValue(`stops.${index}.state`, data.uf, {
            shouldValidate: true,
          });
          toast.success("Endereço encontrado!", { id: `cep-${index}` });
        }
      } catch {
        toast.error("Erro ao consultar CEP.");
      }
    }
  };

  const geocodeStopIfNeeded = async (stop: any, index: number) => {
  if (stop.latitude && stop.latitude !== 0) return stop;
  
  const fullAddress = `${stop.address}, ${stop.name}, ${stop.city}, ${stop.state}, Brasil`;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1`,
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
};

  const onSubmit = async (data: FormValues) => {
    try {

// Geocodificar automaticamente as paradas sem coordenadas
    const stopsWithCoords = await Promise.all(
      data.stops.map((stop, idx) => geocodeStopIfNeeded(stop, idx))
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
      toast.success("Rota criada!");
      router.push("/routes");
    } catch (err: any) {
      toast.error("Erro ao salvar rota.");
    }
  };

  // --- CLASSES DE ESTILO REUTILIZÁVEIS ---
  const inputStyle =
    "bg-[#2C3E50]/50 border-white/10 text-white placeholder:text-[#6B7280]";
  const labelStyle = "text-[#D1D5DB]";
  const cardStyle = "bg-[#2C3E50] border-white/10 shadow-xl";

  return (
    <div className="min-h-screen bg-[#2C3E50] text-[#D1D5DB] pb-12">
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
                <TabsTrigger
                  value="basic"
                  className="data-[state=active]:bg-[#D35400] data-[state=active]:text-white text-[#9CA3AF]"
                >
                  1. Definições
                </TabsTrigger>
                <TabsTrigger
                  value="stops"
                  className="data-[state=active]:bg-[#D35400] data-[state=active]:text-white text-[#9CA3AF]"
                >
                  2. Paradas ({fields.length})
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className="data-[state=active]:bg-[#D35400] data-[state=active]:text-white text-[#9CA3AF]"
                >
                  3. Revisão
                </TabsTrigger>
              </TabsList>

              {/* ABA DEFINIÇÕES */}
              <TabsContent value="basic" className="pt-4 space-y-4">
                <Card className={cardStyle}>
                  <CardHeader>
                    <CardTitle className="text-white">
                      Informações Gerais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelStyle}>
                            Título da Rota
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={inputStyle}
                              placeholder="Ex: Entregas Expressas"
                              {...field}
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
                            <FormLabel
                              className={cn(
                                labelStyle,
                                "flex items-center gap-2",
                              )}
                            >
                              <UserIcon className="w-4 h-4 text-[#D35400]" />{" "}
                              Atribuir Funcionário
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger className={inputStyle}>
                                  <SelectValue
                                    placeholder={
                                      isLoadingUsers
                                        ? "Carregando..."
                                        : "Selecione"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#2C3E50] border-white/10 text-[#D1D5DB]">
                                {users.map((u) => (
                                  <SelectItem
                                    key={u.id}
                                    value={u.id}
                                    className="focus:bg-[#D35400] focus:text-white"
                                  >
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
                            <FormLabel className={labelStyle}>
                              Algoritmo de Rota
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className={inputStyle}>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#2C3E50] border-white/10 text-[#D1D5DB]">
                                <SelectItem value="DISTANCE">
                                  <MapPin className="w-4 h-4 text-[#D35400] mr-2" />
                                  Proximidade
                                </SelectItem>
                                <SelectItem value="PRIORITY">
                                  <ArrowUpDown className="w-4 h-4 text-[#D35400] mr-2" />
                                  Prioridade
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="routeDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className={labelStyle}>
                            Data da Operação
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  inputStyle,
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-[#9CA3AF]",
                                )}
                              >
                                {field.value
                                  ? format(field.value, "PPP", { locale: ptBR })
                                  : "Escolher data"}
                                <CalendarIcon className="ml-auto h-4 w-4 text-[#9CA3AF]" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 border-white/10 bg-[#2C3E50]"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                locale={ptBR}
                                className="text-white"
                              />
                            </PopoverContent>
                          </Popover>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="bg-[#D35400] hover:bg-[#D35400]/80 text-white"
                    onClick={() => setActiveTab("stops")}
                  >
                    Próximo
                  </Button>
                </div>
              </TabsContent>

              {/* ABA PARADAS */}
              <TabsContent value="stops" className="pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-white">
                    Destinos da Rota
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[#D35400] text-[#D35400] hover:bg-[#D35400] hover:text-white"
                    onClick={() =>
                      append({
                        name: "",
                        address: "",
                        city: "",
                        state: "",
                        zipCode: "",
                        latitude: 0,
                        longitude: 0,
                      })
                    }
                  >
                    <PlusIcon className="h-4 w-4 mr-1" /> Add Parada
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <Card
                    key={field.id}
                    className="pt-6 px-4 pb-4 space-y-4 bg-white/5 border-white/10"
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="text-xs font-bold bg-[#D35400] text-white px-2 py-1 rounded uppercase tracking-wider">
                        Parada {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-red-500/10"
                        onClick={() => remove(index)}
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
                              <Input
                                className={inputStyle}
                                {...f}
                                maxLength={8}
                                onChange={(e) => {
                                  f.onChange(e);
                                  handleZipCodeChange(index, e.target.value);
                                }}
                              />
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
                              <Input className={inputStyle} {...f} />
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
                              <FormLabel className={labelStyle}>
                                Número
                              </FormLabel>
                              <Input
                                className={inputStyle}
                                placeholder="123"
                                {...f}
                              />
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
                            <Input className={inputStyle} {...f} />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`stops.${index}.state`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className={labelStyle}>UF</FormLabel>
                            <Input
                              className={inputStyle}
                              maxLength={2}
                              {...f}
                            />
                          </FormItem>
                        )}
                      />
                      {/* <div className="col-span-2 flex items-end">
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full bg-white/10 text-white hover:bg-white/20 border-none"
                          onClick={() => getCoordinatesFromAddress(index)}
                        >
                          <MapPinIcon className="h-4 w-4 mr-2 text-[#D35400]" />{" "}
                          Validar no Mapa
                        </Button>
                      </div> */}
                    </div>
                  </Card>
                ))}
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[#9CA3AF]"
                    onClick={() => setActiveTab("basic")}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#D35400] text-white hover:bg-[#D35400]/80"
                    onClick={() => setActiveTab("review")}
                  >
                    Revisar Rota
                  </Button>
                </div>
              </TabsContent>

              {/* ABA REVISÃO */}
              <TabsContent value="review" className="pt-4 space-y-4">
                <Card className="bg-[#2C3E50] border-white/10 shadow-xl text-[#D1D5DB]">
                  <CardHeader>
                    <CardTitle className="text-white text-xl">
                      Confirmar Criação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Box de Resumo com fundo rgba(255,255,255,0.05) */}
                    <div className="p-5 bg-white/5 rounded-lg space-y-4 text-sm border border-white/10">
                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-white font-semibold">
                          Título:
                        </span>
                        <span className="text-[#D1D5DB]">
                          {form.watch("title") || "Não informado"}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-white font-semibold">
                          Motorista:
                        </span>
                        <span className="text-[#D1D5DB]">
                          {users.find(
                            (u) => u.id === form.watch("userAssignedId"),
                          )?.name || "Não atribuído"}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-white font-semibold">
                          Data da Operação:
                        </span>
                        <span className="text-[#D1D5DB]">
                          {form.watch("routeDate")
                            ? format(form.watch("routeDate")!, "dd/MM/yyyy", {
                                locale: ptBR,
                              })
                            : "Não definida"}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-white font-semibold">
                          Total de Paradas:
                        </span>
                        <span className="bg-[#D35400] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {fields.length}{" "}
                          {fields.length === 1 ? "DESTINO" : "DESTINOS"}
                        </span>
                      </div>
                    </div>

                    {/* Botão de Destaque #D35400 */}
                    <Button
                      type="submit"
                      disabled={createRoute.isPending}
                      className="w-full h-14 text-lg font-bold bg-[#D35400] hover:bg-[#E67E22] text-white transition-all shadow-lg"
                    >
                      {createRoute.isPending ? (
                        <>
                          <Loader2 className="animate-spin mr-3 h-5 w-5" />
                          Processando...
                        </>
                      ) : (
                        "Salvar e Gerar Rota"
                      )}
                    </Button>

                    <p className="text-center text-[#6B7280] text-xs">
                      Ao confirmar, a rota será enviada para o dispositivo do
                      motorista.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
}

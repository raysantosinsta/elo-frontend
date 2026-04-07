/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, Loader2, PlusIcon, Trash2Icon, EditIcon, MapPinIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { useRoutes } from "@/hooks/useRoutes";
import { UpdateRouteDto } from "@/services/api";
import { userService } from "@/services/userService";
import { User } from "@/types/chat";

// --- SCHEMA ---
const stopSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Número/Nome é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "UF é obrigatória").max(2),
  zipCode: z.string().min(8, "CEP inválido"),
  latitude: z.number(),
  longitude: z.number(),
  notes: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
});

const formSchema = z.object({
  title: z.string().min(3, "Título muito curto"),
  description: z.string().optional().nullable(),
  userAssignedId: z.string().optional().nullable(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "FINISHED", "CANCELED"]),
  orderBy: z.enum(["DISTANCE", "PRIORITY"]),
  stops: z.array(stopSchema).min(1, "Adicione pelo menos uma parada"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditRoutePage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const { useGetRouteById, useUpdateRoute } = useRoutes();
  const { data: route, isLoading: isLoadingRoute } = useGetRouteById(routeId);
  const updateRoute = useUpdateRoute();

  const [activeTab, setActiveTab] = useState("basic");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null);
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "SCHEDULED",
      orderBy: "DISTANCE",
      stops: [],
      userAssignedId: null,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "stops",
  });

  // Form para editar parada individual
  const stopForm = useForm<any>({
    resolver: zodResolver(stopSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      latitude: 0,
      longitude: 0,
      notes: "",
      complement: "",
      neighborhood: "",
    },
  });

  // 1. Carregar Usuários
  useEffect(() => {
    async function loadUsers() {
      try {
        console.log("LOG: Iniciando busca de usuários...");
        const data = await userService.getUsersByName("");
        console.log("LOG: Usuários carregados:", data.length);
        setUsers(data);
      } catch (err) {
        console.error("LOG: Erro ao carregar usuários", err);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    loadUsers();
  }, []);

  // 2. Resetar formulário quando dados chegarem
  useEffect(() => {
    if (route && !isLoadingUsers) {
      console.log("LOG: Populando formulário com os seguintes dados:", {
        userAssignedId: route.userAssigned?.id || (route as any).userAssignedId,
        orderBy: (route as any).orderBy,
      });

      const sortedStops = [...route.stops].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );

      form.reset({
        title: route.title,
        description: route.description || "",
        status: route.status,
        orderBy: (route as any).orderBy || "DISTANCE",
        userAssignedId:
          route.userAssigned?.id || (route as any).userAssignedId || "none",
        stops: sortedStops.map((s: any) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          city: s.city,
          state: s.state,
          zipCode: s.zipCode,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          notes: s.notes || "",
          complement: s.complement || "",
          neighborhood: s.neighborhood || "",
        })),
      });

      console.log("LOG: Valores atuais do form após reset:", form.getValues());
    }
  }, [route, isLoadingUsers, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      const payload: UpdateRouteDto = {
        title: data.title,
        status: data.status,
        description: data.description ?? undefined,
        orderBy: data.orderBy as "DISTANCE" | "PRIORITY",
        userAssignedId:
          data.userAssignedId === "none"
            ? undefined
            : (data.userAssignedId ?? undefined),

        stops: data.stops.map((s: any) => ({
          name: s.name,
          address: s.address,
          city: s.city,
          state: s.state,
          zipCode: s.zipCode,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          complement: s.complement ?? undefined,
          neighborhood: s.neighborhood ?? undefined,
          notes: s.notes ?? undefined,
        })),
      };

      await updateRoute.mutateAsync({ id: routeId, data: payload });
      toast.success("Rota atualizada com sucesso!");
      router.push(`/routes/${routeId}`);
    } catch (err) {
      toast.error("Erro ao atualizar a rota.");
      console.error(err);
    }
  };

  const handleEditStop = (index: number) => {
    const stop = form.getValues(`stops.${index}`);
    stopForm.reset(stop);
    setEditingStopIndex(index);
    setIsStopDialogOpen(true);
  };

  const handleSaveStop = () => {
    const updatedStop = stopForm.getValues();
    if (editingStopIndex !== null) {
      update(editingStopIndex, updatedStop);
      toast.success("Parada atualizada!");
    }
    setIsStopDialogOpen(false);
    setEditingStopIndex(null);
  };

  const handleAddStop = () => {
    const newStop = {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      latitude: 0,
      longitude: 0,
      notes: "",
      complement: "",
      neighborhood: "",
    };
    stopForm.reset(newStop);
    setEditingStopIndex(null);
    setIsStopDialogOpen(true);
  };

  const handleSaveNewStop = () => {
    const newStop = stopForm.getValues();
    append(newStop);
    toast.success("Parada adicionada!");
    setIsStopDialogOpen(false);
  };

  if (isLoadingRoute || isLoadingUsers) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">Sincronizando dados...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold">Editar Rota</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Dados Gerais</TabsTrigger>
              <TabsTrigger value="stops">Paradas ({fields.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="pt-4 space-y-4">
              <Card>
                <CardContent className="grid gap-6 pt-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título da Rota</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Rota Centro-Sul" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Descrição opcional da rota..."
                            value={field.value || ""}
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
                          <FormLabel>Motorista Responsável</FormLabel>
                          <Select
                            key={`select-user-${field.value}`}
                            onValueChange={field.onChange}
                            defaultValue={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o motorista" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SCHEDULED">Agendada</SelectItem>
                              <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                              <SelectItem value="FINISHED">Finalizada</SelectItem>
                              <SelectItem value="CANCELED">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="orderBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ordem das Paradas</FormLabel>
                          <Select
                            key={`select-order-${field.value}`}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="DISTANCE">
                                Menor Distância (Automático)
                              </SelectItem>
                              <SelectItem value="PRIORITY">
                                Ordem Manual (Prioridade)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stops" className="pt-4 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Lista de Paradas</h2>
                <Button type="button" onClick={handleAddStop}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Adicionar Parada
                </Button>
              </div>

              {fields.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Nenhuma parada adicionada. Clique em &ldquo;Adicionar Parada&ldquo; para começar.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Parada {index + 1}</Badge>
                            {form.watch(`stops.${index}.name`) && (
                              <span className="font-medium">
                                {form.watch(`stops.${index}.name`)}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditStop(index)}
                            >
                              <EditIcon className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2Icon className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-muted-foreground">Endereço:</span>
                              <p>{form.watch(`stops.${index}.address`) || "-"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cidade/UF:</span>
                              <p>
                                {form.watch(`stops.${index}.city`) || "-"}/
                                {form.watch(`stops.${index}.state`) || "-"}
                              </p>
                            </div>
                          </div>
                          {form.watch(`stops.${index}.notes`) && (
                            <div>
                              <span className="text-muted-foreground">Observações:</span>
                              <p className="text-sm">{form.watch(`stops.${index}.notes`)}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateRoute.isPending}>
              {updateRoute.isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Dialog para Editar/Adicionar Parada */}
      <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStopIndex !== null ? "Editar Parada" : "Nova Parada"}
            </DialogTitle>
          </DialogHeader>

          <Form {...stopForm}>
            <form className="space-y-4">
              <FormField
                control={stopForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número/Nome da Parada *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Parada 1, Empresa ABC" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={stopForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Rua, número, complemento" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={stopForm.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={stopForm.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={stopForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={stopForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF *</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={2} placeholder="SP" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={stopForm.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="00000-000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={stopForm.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="any" 
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={stopForm.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="any" 
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={stopForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ""}
                        placeholder="Informações adicionais sobre a parada..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStopDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={editingStopIndex !== null ? handleSaveStop : handleSaveNewStop}
                >
                  {editingStopIndex !== null ? "Salvar Alterações" : "Adicionar Parada"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
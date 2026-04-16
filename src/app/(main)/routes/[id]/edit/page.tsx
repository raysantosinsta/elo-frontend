/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  Loader2,
  PlusIcon,
  Trash2Icon,
  EditIcon,
  MapPinIcon,
  GripVerticalIcon,
  CalendarIcon,
  UserIcon,
  FileTextIcon,
  CheckCircleIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useRoutes } from "@/hooks/useRoutes";
import { UpdateRouteDto } from "@/services/api";
import { userService } from "@/services/userService";
import { User } from "@/types/chat";

// Constantes de Status
const statusText: Record<string, string> = {
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em Andamento",
  FINISHED: "Finalizada",
  CANCELED: "Cancelada",
};

// --- SCHEMA ---
const stopSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Número/Nome é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "UF é obrigatória").max(2),
  zipCode: z.string().optional(),
  latitude: z.number().optional().default(0),
  longitude: z.number().optional().default(0),
  notes: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
});

const formSchema = z.object({
  title: z.string().min(3, "Título é obrigatório (mínimo 3 caracteres)"),
  description: z.string().optional().nullable(),
  routeDate: z.date().optional().nullable(),
  userAssignedId: z.string().optional().nullable(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "FINISHED", "CANCELED"]),
  orderBy: z.enum(["DISTANCE", "PRIORITY"]),
  stops: z.array(stopSchema).min(1, "Adicione pelo menos uma parada"),
});

type FormValues = z.infer<typeof formSchema>;

// Componente Ripple Button
const RippleButton = ({ children, onClick, className, ...props }: any) => {
  const [ripple, setRipple] = useState<{
    x: number;
    y: number;
    active: boolean;
  }>({ x: 0, y: 0, active: false });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
    setTimeout(() => setRipple((prev) => ({ ...prev, active: false })), 500);
    onClick?.(e);
  };

  return (
    <Button
      ref={buttonRef}
      onClick={handleClick}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {children}
      {ripple.active && (
        <span
          className="absolute bg-white/30 rounded-full pointer-events-none"
          style={{
            width: 300,
            height: 300,
            left: ripple.x - 150,
            top: ripple.y - 150,
            opacity: 0,
            animation: "ripple 0.5s ease-out",
          }}
        />
      )}
    </Button>
  );
};

// Componente de Skeleton Loading
const FormSkeleton = () => (
  <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-8">
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-32 bg-gray-200 rounded" />
        <div className="h-12 w-64 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-96 bg-gray-200 rounded-xl" />
    </div>
  </div>
);

// Estilos padronizados
const inputStyle =
  "bg-white border-gray-200 text-[#2C3E50] placeholder:text-[#95A5A6] focus-visible:ring-[#D35400] focus-visible:border-[#D35400] transition-all";
const labelStyle = "text-[#2C3E50] font-medium";
const cardStyle = "border-0 shadow-md rounded-xl overflow-hidden bg-white";

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
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isFormReady, setIsFormReady] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      routeDate: null,
      status: "SCHEDULED",
      orderBy: "DISTANCE",
      stops: [],
      userAssignedId: null,
    },
  });

  const { fields, append, remove, update, move } = useFieldArray({
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

  const currentOrderBy = form.watch("orderBy");
  const isPriorityMode = currentOrderBy === "PRIORITY";

  // Carregar Usuários
  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await userService.getUsersByName("");
        setUsers(data);
      } catch (err) {
        console.error("Erro ao carregar usuários", err);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    loadUsers();
  }, []);

  // Resetar formulário quando dados chegarem
  useEffect(() => {
    if (route && !isLoadingUsers && !isFormReady) {
      const sortedStops = [...route.stops].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );

      console.log("📝 Resetando formulário com dados:", {
        title: route.title,
        description: route.description,
        status: route.status,
        orderBy: route.orderBy,
        userAssignedId: route.userAssigned?.id || null,
        routeDate: route.routeDate,
        stopsCount: sortedStops.length,
      });

      form.reset({
        title: route.title,
        description: route.description || "",
        routeDate: route.routeDate ? new Date(route.routeDate) : null,
        status: route.status as any,
        orderBy: (route.orderBy as "DISTANCE" | "PRIORITY") || "DISTANCE",
        userAssignedId: route.userAssigned?.id || null,
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

      setIsFormReady(true);
    }
  }, [route, isLoadingUsers, form, isFormReady]);

  const onSubmit = async (data: FormValues) => {
    console.log("📝 Enviando formulário:", data);

    try {
      let userAssignedId = data.userAssignedId;
      if (
        userAssignedId === "none" ||
        userAssignedId === "" ||
        userAssignedId === null
      ) {
        userAssignedId = undefined;
      }

      const payload: UpdateRouteDto = {
        title: data.title,
        status: data.status,
        description: data.description ?? undefined,
        routeDate: data.routeDate ? data.routeDate.toISOString() : undefined,
        orderBy: data.orderBy as "DISTANCE" | "PRIORITY",
        userAssignedId: userAssignedId,
        stops: data.stops.map((s: any, index: number) => ({
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
          order: index + 1,
        })),
      };

      await updateRoute.mutateAsync({ id: routeId, data: payload });
      toast.success("Rota atualizada com sucesso!");
      router.push(`/routes/${routeId}`);
    } catch (err) {
      console.error("Erro no submit:", err);
      toast.error("Erro ao atualizar a rota.");
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

  const handleRemoveStop = (index: number) => {
    if (fields.length === 1) {
      toast.warning("É necessário pelo menos uma parada");
      return;
    }
    remove(index);
    toast.success("Parada removida");
  };

  const handleDragStart = (index: number) => {
    if (!isPriorityMode) return;
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isPriorityMode) return;
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    move(draggedItemIndex, index);
    setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1);
      toast.success("Parada movida para cima");
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < fields.length - 1) {
      move(index, index + 1);
      toast.success("Parada movida para baixo");
    }
  };

  if (isLoadingRoute || isLoadingUsers) {
    return <FormSkeleton />;
  }

  const isSubmitDisabled = updateRoute.isPending || fields.length === 0;

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              className="-ml-4 h-8 text-[#95A5A6] hover:text-[#2C3E50] hover:bg-transparent"
              onClick={() => router.back()}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-[#2C3E50] mt-2">
              Editar Rota
            </h1>
            <p className="text-[#95A5A6] mt-1">Altere as informações da rota</p>
          </div>
        </div>

        {isFormReady ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border border-gray-200 rounded-lg p-1 w-full sm:w-auto">
                  <TabsTrigger
                    value="basic"
                    className={cn(
                      "rounded-md px-6 py-2 text-[#95A5A6] transition-all data-[state=active]:bg-[#D35400] data-[state=active]:text-white",
                    )}
                  >
                    1. Dados Gerais
                  </TabsTrigger>
                  <TabsTrigger
                    value="stops"
                    className={cn(
                      "rounded-md px-6 py-2 text-[#95A5A6] transition-all data-[state=active]:bg-[#D35400] data-[state=active]:text-white",
                    )}
                  >
                    2. Paradas ({fields.length})
                  </TabsTrigger>
                </TabsList>

                {/* ABA DADOS GERAIS */}
                <TabsContent value="basic" className="space-y-6 mt-6">
                  <Card className={cardStyle}>
                    <CardContent className="p-6 space-y-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelStyle}>
                              Título da Rota *
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={inputStyle}
                                placeholder="Ex: Rota Centro-Sul"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />

                      {/* Só exibe o campo descrição se tiver valor */}
                      {(form.watch("description") || route?.description) && (
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>
                                Descrição
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  className={inputStyle}
                                  placeholder="Descrição opcional da rota..."
                                  rows={3}
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Data da Rota */}
                        <FormField
                          control={form.control}
                          name="routeDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className={labelStyle}>
                                <CalendarIcon className="h-4 w-4 inline mr-1 text-[#D35400]" />
                                Data Agendada
                              </FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        inputStyle,
                                        "pl-3 text-left font-normal justify-start",
                                        !field.value && "text-[#95A5A6]",
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4 text-[#D35400]" />
                                      {field.value
                                        ? format(field.value, "PPP", {
                                            locale: ptBR,
                                          })
                                        : "Selecionar data"}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0 bg-white border-gray-200"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={field.value || undefined}
                                    onSelect={field.onChange}
                                    initialFocus
                                    locale={ptBR}
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Status */}
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>
                                Status
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className={inputStyle}>
                                    <SelectValue placeholder="Selecione um status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white border-gray-200">
                                  <SelectItem
                                    value="SCHEDULED"
                                    className="text-[#2C3E50]"
                                  >
                                    Agendada
                                  </SelectItem>
                                  <SelectItem
                                    value="IN_PROGRESS"
                                    className="text-[#2C3E50]"
                                  >
                                    Em Andamento
                                  </SelectItem>
                                  <SelectItem
                                    value="FINISHED"
                                    className="text-[#2C3E50]"
                                  >
                                    Finalizada
                                  </SelectItem>
                                  <SelectItem
                                    value="CANCELED"
                                    className="text-[#2C3E50]"
                                  >
                                    Cancelada
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Responsável */}
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
                                <UserIcon className="h-4 w-4 text-[#D35400]" />
                                Responsável
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger className={inputStyle}>
                                    <SelectValue placeholder="Selecione um responsável" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white border-gray-200">
                                  <SelectItem
                                    value="none"
                                    className="text-[#2C3E50]"
                                  >
                                    Não atribuído
                                  </SelectItem>
                                  {users.map((u) => (
                                    <SelectItem
                                      key={u.id}
                                      value={u.id}
                                      className="text-[#2C3E50]"
                                    >
                                      {u.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Ordem das Paradas */}
                        <FormField
                          control={form.control}
                          name="orderBy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>
                                Rota Por
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className={inputStyle}>
                                    <SelectValue placeholder="Selecione o tipo de rota" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white border-gray-200">
                                  <SelectItem
                                    value="DISTANCE"
                                    className="text-[#2C3E50]"
                                  >
                                    Proximidade
                                  </SelectItem>
                                  <SelectItem
                                    value="PRIORITY"
                                    className="text-[#2C3E50]"
                                  >
                                    Prioridade
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {isPriorityMode && (
                                <p className="text-xs text-[#95A5A6] mt-1">
                                  ✓ Você pode arrastar as paradas para reordenar
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ABA PARADAS */}
                <TabsContent value="stops" className="space-y-6 mt-6">
                  <Card className={cardStyle}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="font-bold text-lg text-[#2C3E50]">
                            Lista de Paradas
                          </h3>
                          <p className="text-sm text-[#95A5A6] mt-1">
                            Gerencie as paradas da rota
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={handleAddStop}
                          className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-full"
                        >
                          <PlusIcon className="mr-2 h-4 w-4" />
                          Adicionar Parada
                        </Button>
                      </div>

                      {fields.length === 0 ? (
                        <div className="text-center py-12">
                          <MapPinIcon className="mx-auto h-12 w-12 text-[#95A5A6] mb-4" />
                          <p className="text-[#95A5A6]">
                            Nenhuma parada adicionada.
                          </p>
                          <p className="text-sm text-[#95A5A6] mt-1">
                            Clique em &ldquo;Adicionar Parada&rdquo; para
                            começar.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {fields.map((field, index) => (
                            <Card
                              key={field.id}
                              className={cn(
                                "border transition-all duration-200 hover:shadow-md",
                                isPriorityMode &&
                                  "cursor-move hover:border-[#D35400]/30",
                              )}
                              draggable={isPriorityMode}
                              onDragStart={() => handleDragStart(index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragEnd={handleDragEnd}
                            >
                              <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    {isPriorityMode && (
                                      <div className="cursor-grab active:cursor-grabbing">
                                        <GripVerticalIcon className="h-5 w-5 text-[#95A5A6]" />
                                      </div>
                                    )}
                                    <span className="w-8 h-8 rounded-full bg-[#D35400]/10 text-[#D35400] flex items-center justify-center text-xs font-bold">
                                      {index + 1}
                                    </span>
                                    <div>
                                      <p className="font-semibold text-[#2C3E50]">
                                        {field.name || `Parada ${index + 1}`}
                                      </p>
                                      <p className="text-sm text-[#95A5A6]">
                                        {field.address}, {field.city}/
                                        {field.state}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {isPriorityMode && (
                                      <>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleMoveUp(index)}
                                          disabled={index === 0}
                                          className="rounded-full h-8 w-8 p-0"
                                        >
                                          ↑
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleMoveDown(index)}
                                          disabled={index === fields.length - 1}
                                          className="rounded-full h-8 w-8 p-0"
                                        >
                                          ↓
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditStop(index)}
                                      className="rounded-full h-8 px-3"
                                    >
                                      <EditIcon className="h-3 w-3 mr-1" />
                                      Editar
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveStop(index)}
                                      className="rounded-full h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2Icon className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                {field.notes && (
                                  <div className="mt-3 ml-11 pl-4 border-l-2 border-[#D35400]/20">
                                    <p className="text-sm text-[#95A5A6]">
                                      <span className="font-medium text-[#2C3E50]">
                                        Observações:
                                      </span>{" "}
                                      {field.notes}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {isPriorityMode && fields.length > 1 && (
                        <div className="mt-4 p-3 bg-[#F5F0E6] rounded-lg text-sm text-[#95A5A6]">
                          💡 Dica: Você pode arrastar e soltar as paradas para
                          reordenar, ou usar os botões ↑ ↓ para mover.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Botões de ação */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="rounded-full border-gray-200 hover:border-[#D35400]/50"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-full px-6"
                >
                  {updateRoute.isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-[#D35400]" />
          </div>
        )}
      </div>

      {/* Dialog para Editar/Adicionar Parada */}
      <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50] text-xl">
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
                    <FormLabel className={labelStyle}>
                      Número/Nome da Parada *
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={inputStyle}
                        placeholder="Ex: Parada 1, Empresa ABC"
                        {...field}
                      />
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
                    <FormLabel className={labelStyle}>Endereço *</FormLabel>
                    <FormControl>
                      <Input
                        className={inputStyle}
                        placeholder="Rua, número, complemento"
                        {...field}
                      />
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
                      <FormLabel className={labelStyle}>Bairro</FormLabel>
                      <FormControl>
                        <Input
                          className={inputStyle}
                          {...field}
                          value={field.value || ""}
                        />
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
                      <FormLabel className={labelStyle}>Complemento</FormLabel>
                      <FormControl>
                        <Input
                          className={inputStyle}
                          {...field}
                          value={field.value || ""}
                        />
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
                      <FormLabel className={labelStyle}>Cidade *</FormLabel>
                      <FormControl>
                        <Input className={inputStyle} {...field} />
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
                      <FormLabel className={labelStyle}>UF *</FormLabel>
                      <FormControl>
                        <Input
                          className={inputStyle}
                          {...field}
                          maxLength={2}
                          placeholder="SP"
                        />
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
                    <FormLabel className={labelStyle}>CEP</FormLabel>
                    <FormControl>
                      <Input
                        className={inputStyle}
                        {...field}
                        placeholder="00000-000"
                      />
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
                      <FormLabel className={labelStyle}>Latitude</FormLabel>
                      <FormControl>
                        <Input
                          className={inputStyle}
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
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
                      <FormLabel className={labelStyle}>Longitude</FormLabel>
                      <FormControl>
                        <Input
                          className={inputStyle}
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
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
                    <FormLabel className={labelStyle}>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        className={inputStyle}
                        {...field}
                        value={field.value || ""}
                        placeholder="Informações adicionais sobre a parada..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStopDialogOpen(false)}
                  className="rounded-full"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={
                    editingStopIndex !== null
                      ? handleSaveStop
                      : handleSaveNewStop
                  }
                  className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-full"
                >
                  {editingStopIndex !== null
                    ? "Salvar Alterações"
                    : "Adicionar Parada"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 0.5;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
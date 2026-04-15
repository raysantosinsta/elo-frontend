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
  CalendarDaysIcon,
  MapPinIcon,
  Loader2,
  MapPin, 
  ArrowUpDown,
  CheckCircleIcon,
  Trash2Icon,
  UserIcon,
  ChevronDownIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { api } from "@/services/api";

// --- SCHEMA DE VALIDAÇÃO ---
const stopSchema = z.object({
  id: z.string().optional(),
  taskId: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  latitude: z.number().optional().default(0),
  longitude: z.number().optional().default(0),
  notes: z.string().optional(),
  assignedToName: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(3, "Título é obrigatório (mínimo 3 caracteres)"),
  routeDate: z.date().optional(),
  userAssignedId: z.string().optional().nullable(),
  orderBy: z.enum(["DISTANCE", "PRIORITY"]).default("DISTANCE"),
  stops: z.array(stopSchema).min(1, "Selecione pelo menos uma tarefa"),
});

type FormValues = z.infer<typeof formSchema>;

// 🎯 Interface para Task
interface Task {
  id: string;
  title: string;
  description?: string;
  userAssigned?: { id: string; name: string };
  taskAddress?: {
    endereco: string;
    numero?: string;
    bairro?: string;
    cidade: string;
    estado: string;
    cep: string;
    latitude?: number;
    longitude?: number;
  };
}

// 🎯 Componente de Skeleton
const FormSkeleton = () => (
  <div className="space-y-6">
    <div className="h-12 w-full bg-white/10 rounded-lg animate-pulse" />
    <div className="h-64 bg-white/10 rounded-lg animate-pulse" />
  </div>
);

// 🎯 Componente de Task Item para seleção
const TaskItem = memo(({ task, isSelected, onToggle }: any) => {
  const hasLocation = task.taskAddress?.latitude && task.taskAddress?.longitude;
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
        isSelected
          ? "bg-[#D35400]/20 border-[#D35400]/50"
          : "bg-white/5 border-white/10 hover:border-[#D35400]/30"
      )}
      onClick={() => onToggle(task.id)}
    >
      <div className="flex-shrink-0 pt-0.5">
        {isSelected ? (
          <CheckCircleIcon className="h-5 w-5 text-[#D35400]" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-[#9CA3AF]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium text-white truncate">{task.title}</h4>
          {hasLocation && (
            <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full">
              ✓ Geolocalizada
            </span>
          )}
        </div>
        {task.taskAddress && (
          <p className="text-sm text-[#9CA3AF] truncate mt-0.5">
            {task.taskAddress.endereco}, {task.taskAddress.cidade}/{task.taskAddress.estado}
          </p>
        )}
        {task.userAssigned && (
          <p className="text-xs text-[#6B7280] mt-1">
            Responsável: {task.userAssigned.name}
          </p>
        )}
        {/* 🔥 Descrição da tarefa */}
        {task.description && (
          <p className="text-xs text-[#6B7280] mt-1 line-clamp-2 italic">
            📝 {task.description}
          </p>
        )}
      </div>
    </div>
  );
});

TaskItem.displayName = "TaskItem";

// 🎯 Componente de StopItem (parada selecionada)
const StopItem = memo(({ stop, index, onRemove }: any) => {
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(index);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="w-6 h-6 rounded-full bg-[#D35400]/20 text-[#D35400] flex items-center justify-center text-xs font-bold">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{stop.name}</p>
          <p className="text-[#9CA3AF] text-xs truncate">{stop.address}, {stop.city}</p>
          {stop.assignedToName && (
            <p className="text-[#6B7280] text-xs truncate mt-0.5">
              Responsável: {stop.assignedToName}
            </p>
          )}
          {stop.notes && (
            <p className="text-[#6B7280] text-xs truncate mt-0.5 line-clamp-2 italic">
              📝 {stop.notes}
            </p>
          )}
        </div>
        {stop.latitude !== 0 && stop.longitude !== 0 && (
          <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemoveClick}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
        type="button"
      >
        <Trash2Icon className="h-4 w-4" />
      </Button>
    </div>
  );
});

StopItem.displayName = "StopItem";

import { memo } from 'react';

export default function CreateRoutePage() {
  const router = useRouter();
  const { useCreateRoute } = useRoutes();
  const createRoute = useCreateRoute();

  const [activeTab, setActiveTab] = useState("tasks");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      orderBy: "DISTANCE",
      stops: [],
      userAssignedId: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stops",
  });

  // 🔥 Carregar usuários
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

  // 🔥 Carregar tasks disponíveis (com endereço)
  const loadAvailableTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const response = await api.get("/tasks", {
        params: { hasLocation: "true", limit: 100 },
      });
      const tasks = response.data?.data || [];
      setAvailableTasks(tasks);
      
      if (tasks.length === 0) {
        toast.info("Nenhuma tarefa com endereço disponível", { duration: 3000 });
      } else {
        toast.success(`${tasks.length} tarefas disponíveis`, { duration: 2000 });
      }
    } catch (error) {
      console.error("Erro ao carregar tasks:", error);
      toast.error("Erro ao carregar lista de tarefas");
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  // Carregar tasks ao entrar na aba
  useEffect(() => {
    if (activeTab === "tasks" && availableTasks.length === 0 && !isLoadingTasks) {
      loadAvailableTasks();
    }
  }, [activeTab, availableTasks.length, isLoadingTasks, loadAvailableTasks]);

  // 🔥 Converter task para stop
  const convertTaskToStop = useCallback((task: Task) => {
    const address = task.taskAddress;
    return {
      taskId: task.id,
      name: task.title,
      address: address?.endereco || "",
      city: address?.cidade || "",
      state: address?.estado || "",
      latitude: address?.latitude || 0,
      longitude: address?.longitude || 0,
      notes: task.description || "",
      assignedToName: task.userAssigned?.name || "",
    };
  }, []);

  // 🔥 Adicionar tasks selecionadas como paradas
  const addSelectedTasks = useCallback(() => {
    const selectedTasks = availableTasks.filter(task => selectedTaskIds.has(task.id));
    
    if (selectedTasks.length === 0) {
      toast.warning("Nenhuma tarefa selecionada");
      return;
    }

    const existingTaskIds = new Set(fields.map(f => f.taskId).filter(Boolean));
    const newTasks = selectedTasks.filter(task => !existingTaskIds.has(task.id));
    
    if (newTasks.length === 0) {
      toast.warning("Todas as tarefas selecionadas já foram adicionadas");
      return;
    }

    newTasks.forEach(task => {
      const stop = convertTaskToStop(task);
      append(stop);
    });

    toast.success(`${newTasks.length} tarefa(s) adicionada(s) à rota`);
    
    const newSelectedIds = new Set(selectedTaskIds);
    newTasks.forEach(task => newSelectedIds.delete(task.id));
    setSelectedTaskIds(newSelectedIds);
  }, [availableTasks, selectedTaskIds, append, convertTaskToStop, fields]);

  // 🔥 Alternar seleção de task
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // 🔥 Remover parada
  const handleRemoveStop = useCallback((indexToRemove: number) => {
    if (indexToRemove >= 0 && indexToRemove < fields.length) {
      remove(indexToRemove);
      toast.success("Parada removida", { duration: 1500 });
    }
  }, [fields.length, remove]);

  // 🔥 Estatísticas
  const stats = useMemo(() => ({
    totalStops: fields.length,
    hasCoordinates: fields.filter(stop => 
      stop.latitude !== 0 && stop.longitude !== 0
    ).length,
  }), [fields]);

  // 🔥 Tasks já adicionadas
  const addedTaskIds = useMemo(() => new Set(fields.map(f => f.taskId).filter(Boolean)), [fields]);
  
  // 🔥 Tasks disponíveis que ainda não foram adicionadas
  const availableNotAdded = useMemo(() => 
    availableTasks.filter(task => !addedTaskIds.has(task.id)),
    [availableTasks, addedTaskIds]
  );

  const onSubmit = useCallback(async (data: FormValues) => {
    if (data.stops.length === 0) {
      toast.warning("Adicione pelo menos uma parada à rota");
      return;
    }
    
    const loadingToast = toast.loading("Criando rota...");
    
    try {
      const payload = {
        title: data.title,
        description: `Rota criada a partir de ${data.stops.length} tarefa(s)`,
        routeDate: data.routeDate?.toISOString(),
        userAssignedId: data.userAssignedId === "none" ? undefined : data.userAssignedId,
        orderBy: data.orderBy,
        stops: data.stops.map((stop: any) => ({
          name: stop.name,
          address: stop.address,
          complement: "",
          neighborhood: "",
          city: stop.city,
          state: stop.state,
          zipCode: "",
          latitude: stop.latitude || 0,
          longitude: stop.longitude || 0,
          notes: stop.notes || "",
        })),
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
    }
  }, [createRoute, router]);

  const inputStyle = "bg-[#2C3E50]/50 border-white/10 text-white placeholder:text-[#6B7280] focus-visible:ring-[#D35400] transition-all";
  const labelStyle = "text-[#D1D5DB]";
  const cardStyle = "bg-[#2C3E50] border-white/10 shadow-xl";

  return (
    <div className="min-h-screen bg-[#2C3E50] text-[#D1D5DB] pb-12">
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Criar Nova Rota</h1>
          <p className="text-[#9CA3AF] mt-1">
            Preencha as informações e selecione as tarefas que farão parte da rota
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
              <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
                <TabsTrigger
                  value="tasks"
                  className="data-[state=active]:bg-[#D35400] data-[state=active]:text-white text-[#9CA3AF] transition-all"
                >
                  1. Selecionar Tarefas
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className="data-[state=active]:bg-[#D35400] data-[state=active]:text-white text-[#9CA3AF] transition-all"
                >
                  2. Revisão ({stats.totalStops})
                </TabsTrigger>
              </TabsList>

              {/* ABA SELECIONAR TAREFAS */}
              <TabsContent value="tasks" className="pt-4 space-y-6">
                {/* Configurações da Rota */}
                <Card className={cardStyle}>
                  <CardContent className="grid gap-4 pt-6">
                    {/* 🔥 Campo Título */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelStyle}>Título da Rota *</FormLabel>
                          <FormControl>
                            <Input
                              className={inputStyle}
                              placeholder="Ex: Entregas Zona Sul, Visitas Técnicas..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Data */}
                      <FormField
                        control={form.control}
                        name="routeDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className={labelStyle}>Data</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(inputStyle, "pl-3 text-left font-normal justify-start", !field.value && "text-[#9CA3AF]")}
                                >
                                  <CalendarDaysIcon className="mr-2 h-4 w-4" />
                                  {field.value
                                    ? format(field.value, "PPP", { locale: ptBR })
                                    : "Escolher data"}
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

                      {/* Responsável */}
                      <FormField
                        control={form.control}
                        name="userAssignedId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(labelStyle, "flex items-center gap-2")}>
                              <UserIcon className="w-4 h-4 text-[#D35400]" /> Responsável
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Rota Por */}
                      <FormField
                        control={form.control}
                        name="orderBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelStyle}>Rota Por</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className={inputStyle}>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#2C3E50] border-white/10 text-[#D1D5DB]">
                                <SelectItem value="DISTANCE">
                                  <MapPin className="w-4 h-4 text-[#D35400] mr-2 inline" />
                                  Proximidade
                                </SelectItem>
                                <SelectItem value="PRIORITY">
                                  <ArrowUpDown className="w-4 h-4 text-[#D35400] mr-2 inline" />
                                  Prioridade
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

                {/* Seleção de Tarefas */}
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-white">Tarefas com Endereço</h3>
                </div>

                {isLoadingTasks ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="text-center py-12">
                      <Loader2 className="animate-spin mx-auto h-8 w-8 text-[#D35400] mb-4" />
                      <p className="text-[#9CA3AF]">Carregando tarefas...</p>
                    </CardContent>
                  </Card>
                ) : availableNotAdded.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="text-center py-12">
                      <MapPinIcon className="mx-auto h-12 w-12 text-[#6B7280] mb-4" />
                      <p className="text-[#9CA3AF]">
                        {availableTasks.length === 0 
                          ? "Nenhuma tarefa com endereço disponível"
                          : "Todas as tarefas já foram adicionadas à rota"}
                      </p>
                      <p className="text-[#6B7280] text-sm mt-1">
                        {availableTasks.length === 0 
                          ? "Cadastre tarefas com endereço para utilizá-las na rota"
                          : `Você já adicionou ${fields.length} tarefa(s)`}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {availableNotAdded.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        isSelected={selectedTaskIds.has(task.id)}
                        onToggle={toggleTaskSelection}
                      />
                    ))}
                  </div>
                )}

                {/* Paradas já adicionadas */}
                {fields.length > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-white">Paradas selecionadas ({fields.length})</h4>
                    </div>
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <StopItem
                          key={field.id}
                          stop={field}
                          index={index}
                          onRemove={handleRemoveStop}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="bg-green-600 hover:bg-green-700 text-white transition-all active:scale-95"
                      onClick={addSelectedTasks}
                      disabled={selectedTaskIds.size === 0}
                    >
                      Adicionar ({selectedTaskIds.size})
                    </Button>
                    <Button
                      type="button"
                      className="bg-[#D35400] text-white hover:bg-[#D35400]/80 transition-all active:scale-95"
                      onClick={() => setActiveTab("review")}
                      disabled={fields.length === 0}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ABA REVISÃO */}
              <TabsContent value="review" className="pt-4 space-y-4">
                <Card className="bg-[#2C3E50] border-white/10 shadow-xl text-[#D1D5DB]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-xl">Confirmar Criação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-5 bg-white/5 rounded-lg space-y-4 text-sm border border-white/10">
                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-white font-semibold">Título:</span>
                        <span className="text-[#D1D5DB]">{form.watch("title") || "Não informado"}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-white font-semibold">Total de Paradas:</span>
                        <span className="bg-[#D35400] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {fields.length} {fields.length === 1 ? "DESTINO" : "DESTINOS"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-white font-semibold">Rota Por:</span>
                        <span className="text-[#D1D5DB]">
                          {form.watch("orderBy") === "DISTANCE" ? "📍 Proximidade" : "🎯 Prioridade"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-white font-semibold">Responsável:</span>
                        <span className="text-[#D1D5DB]">
                          {users.find(u => u.id === form.watch("userAssignedId"))?.name || "Não atribuído"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-white font-semibold">Data:</span>
                        <span className="text-[#D1D5DB]">
                          {form.watch("routeDate")
                            ? format(form.watch("routeDate")!, "dd/MM/yyyy", { locale: ptBR })
                            : "Não definida"}
                        </span>
                      </div>
                    </div>

                    {/* Lista de paradas na revisão */}
                    {fields.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-white mb-3 text-sm">Paradas da Rota</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                              <span className="w-6 h-6 rounded-full bg-[#D35400]/20 text-[#D35400] flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{field.name}</p>
                                <p className="text-[#9CA3AF] text-xs truncate">{field.address}, {field.city}</p>
                                {field.assignedToName && (
                                  <p className="text-[#6B7280] text-xs truncate mt-0.5">
                                    Responsável: {field.assignedToName}
                                  </p>
                                )}
                                {field.notes && (
                                  <p className="text-[#6B7280] text-xs truncate mt-0.5 line-clamp-2 italic">
                                    📝 {field.notes}
                                  </p>
                                )}
                              </div>
                              {field.latitude !== 0 && field.longitude !== 0 && (
                                <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={createRoute.isPending || fields.length === 0}
                      className="w-full h-14 text-lg font-bold bg-[#D35400] hover:bg-[#E67E22] text-white transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                    >
                      {createRoute.isPending ? (
                        <>
                          <Loader2 className="animate-spin mr-2 h-5 w-5" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar e Gerar Rota"
                      )}
                    </Button>

                    <p className="text-center text-[#6B7280] text-xs">
                      Ao confirmar, a rota será enviada para o dispositivo do motorista.
                    </p>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[#9CA3AF] hover:text-white transition-colors"
                    onClick={() => setActiveTab("tasks")}
                  >
                    ← Voltar
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
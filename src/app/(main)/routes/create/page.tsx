/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
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
  X,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// Interface para Task
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

// Componente Ripple Button (igual ao RoutesPage)
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

// Componente de Skeleton (igual ao RoutesPage)
const FormSkeleton = () => (
  <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-8">
    <div className="max-w-5xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-lg" />
        <div className="h-96 bg-gray-200 rounded-lg" />
      </div>
    </div>
  </div>
);

// Componente de Task Item para seleção
const TaskItem = memo(({ task, isSelected, onToggle }: any) => {
  const hasLocation = task.taskAddress?.latitude && task.taskAddress?.longitude;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer",
        isSelected
          ? "border-[#D35400] bg-[#D35400]/10 shadow-md"
          : "border-gray-200 bg-white hover:bg-gray-50 hover:shadow-lg hover:border-[#D35400]/30",
      )}
      onClick={() => onToggle(task.id)}
    >
      <div className="flex-shrink-0 pt-0.5">
        {isSelected ? (
          <CheckCircleIcon className="h-5 w-5 text-[#D35400]" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-[#BDC3C7]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-[#2C3E50] truncate">
            {task.title}
          </h4>
          
        </div>
        {task.taskAddress && (
          <p className="text-sm text-[#95A5A6] truncate mt-1">
            {task.taskAddress.endereco}, {task.taskAddress.cidade}/
            {task.taskAddress.estado}
          </p>
        )}
        {task.userAssigned && (
          <p className="text-xs text-[#95A5A6] mt-1 flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            Responsável: {task.userAssigned.name}
          </p>
        )}
        {task.description && (
          <p className="text-sm text-[#95A5A6] mt-1 line-clamp-2 italic">
            Descrição: {task.description}
          </p>
        )}
      </div>
    </motion.div>
  );
});

TaskItem.displayName = "TaskItem";

// Componente de StopItem (parada selecionada)
const StopItem = memo(({ stop, index, onRemove }: any) => {
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(index);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="w-6 h-6 rounded-full bg-[#D35400]/10 text-[#D35400] flex items-center justify-center text-xs font-bold">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[#2C3E50] text-sm font-medium truncate">
            {stop.name}
          </p>
          <p className="text-[#95A5A6] text-xs truncate">
            {stop.address}, {stop.city}
          </p>
          {stop.assignedToName && (
            <p className="text-[#95A5A6] text-xs truncate mt-0.5 flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {stop.assignedToName}
            </p>
          )}
          {stop.notes && (
            <p className="text-[#95A5A6] text-sm truncate mt-0.5 line-clamp-2 italic">
               {stop.notes}
            </p>
          )}
        </div>
        {stop.latitude !== 0 && stop.longitude !== 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Coordenadas disponíveis</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemoveClick}
        className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 rounded-full h-8 w-8 p-0"
        type="button"
      >
        <Trash2Icon className="h-4 w-4" />
      </Button>
    </motion.div>
  );
});

StopItem.displayName = "StopItem";

export default function CreateRoutePage() {
  const router = useRouter();
  const { useCreateRoute } = useRoutes();
  const createRoute = useCreateRoute();

  const [activeTab, setActiveTab] = useState("tasks");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  // 🔥 NOVO: Controlar se as tarefas já foram carregadas para evitar loop
  const [hasLoadedTasks, setHasLoadedTasks] = useState(false);

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

  // Carregar usuários
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

  // Carregar tasks disponíveis (com endereço)
  const loadAvailableTasks = useCallback(async () => {
    // 🔥 EVITAR CARREGAMENTO DUPLICADO
    if (isLoadingTasks || hasLoadedTasks) return;
    
    setIsLoadingTasks(true);
    try {
      const response = await api.get("/tasks", {
        params: { hasLocation: "true", limit: 100, excludeCompleted: "true" },
      });
      const tasks = response.data?.data || [];
      setAvailableTasks(tasks);
      setHasLoadedTasks(true); // 🔥 MARCA COMO CARREGADO

      if (tasks.length === 0) {
        toast.info("Nenhuma tarefa disponível para criar rota", {
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar tasks:", error);
      toast.error("Erro ao carregar lista de tarefas");
      setHasLoadedTasks(true); // 🔥 MESMO COM ERRO, MARCA COMO CARREGADO PARA EVITAR LOOP
    } finally {
      setIsLoadingTasks(false);
    }
  }, [isLoadingTasks, hasLoadedTasks]);

  // Carregar tasks ao entrar na aba - 🔥 CORRIGIDO PARA EVITAR LOOP
  useEffect(() => {
    if (activeTab === "tasks" && !hasLoadedTasks && !isLoadingTasks) {
      loadAvailableTasks();
    }
  }, [activeTab, hasLoadedTasks, isLoadingTasks, loadAvailableTasks]);

  // Converter task para stop
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

  // Adicionar tasks selecionadas como paradas
  const addSelectedTasks = useCallback(() => {
    const selectedTasks = availableTasks.filter((task) =>
      selectedTaskIds.has(task.id),
    );

    if (selectedTasks.length === 0) {
      toast.warning("Nenhuma tarefa selecionada");
      return;
    }

    const existingTaskIds = new Set(
      fields.map((f) => f.taskId).filter(Boolean),
    );
    const newTasks = selectedTasks.filter(
      (task) => !existingTaskIds.has(task.id),
    );

    if (newTasks.length === 0) {
      toast.warning("Todas as tarefas selecionadas já foram adicionadas");
      return;
    }

    newTasks.forEach((task) => {
      const stop = convertTaskToStop(task);
      append(stop);
    });

    toast.success(`${newTasks.length} tarefa(s) adicionada(s) à rota`);

    const newSelectedIds = new Set(selectedTaskIds);
    newTasks.forEach((task) => newSelectedIds.delete(task.id));
    setSelectedTaskIds(newSelectedIds);
  }, [availableTasks, selectedTaskIds, append, convertTaskToStop, fields]);

  // Alternar seleção de task
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // Remover parada
  const handleRemoveStop = useCallback(
    (indexToRemove: number) => {
      if (indexToRemove >= 0 && indexToRemove < fields.length) {
        remove(indexToRemove);
        toast.success("Parada removida", { duration: 1500 });
      }
    },
    [fields.length, remove],
  );

  // Estatísticas
  const stats = useMemo(
    () => ({
      totalStops: fields.length,
      hasCoordinates: fields.filter(
        (stop) => stop.latitude !== 0 && stop.longitude !== 0,
      ).length,
    }),
    [fields],
  );

  // Tasks já adicionadas
  const addedTaskIds = useMemo(
    () => new Set(fields.map((f) => f.taskId).filter(Boolean)),
    [fields],
  );

  // Tasks disponíveis que ainda não foram adicionadas
  const availableNotAdded = useMemo(
    () => availableTasks.filter((task) => !addedTaskIds.has(task.id)),
    [availableTasks, addedTaskIds],
  );

  const onSubmit = useCallback(
    async (data: FormValues) => {
      if (data.stops.length === 0) {
        toast.warning("Adicione pelo menos uma parada à rota");
        return;
      }

      const loadingToast = toast.loading("Criando rota...");

      try {
        const payload = {
          title: data.title,
          description: "",
          routeDate: data.routeDate?.toISOString(),
          userAssignedId:
            data.userAssignedId === "none" ? undefined : data.userAssignedId,
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
    },
    [createRoute, router],
  );

  // Estilos padronizados com o RoutesPage
  const inputStyle =
    "bg-white border-gray-200 text-[#2C3E50] placeholder:text-[#95A5A6] focus-visible:ring-[#D35400] focus-visible:border-[#D35400] transition-all";
  const labelStyle = "text-[#2C3E50] font-medium";
  const cardStyle = "border-0 shadow-md rounded-xl overflow-hidden bg-white";

  if (isLoadingUsers) {
    return <FormSkeleton />;
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F0E6] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header com estilo consistente */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2C3E50]">Criar Rota</h1>
            <p className="text-[#95A5A6] mt-1">
              Preencha as informações 
            </p>
            {/* {stats.totalStops > 0 && (
              <div className="flex gap-3 mt-3">
                <Badge
                  variant="outline"
                  className="bg-white text-[#2C3E50] border-gray-200"
                >
                  Total: {stats.totalStops} parada(s)
                </Badge>
                <Badge className="bg-green-50 text-green-700 border border-green-200">
                  ✓ {stats.hasCoordinates} geocodificada(s)
                </Badge>
              </div>
            )} */}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <RippleButton
                  variant="outline"
                  onClick={() => router.push("/routes")}
                  className="rounded-full h-10 px-4 gap-2 border-gray-200 hover:border-[#D35400]/50"
                >
                  <X className="h-5 w-5" />
                  <span className="hidden sm:inline">Cancelar</span>
                </RippleButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cancelar rota</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="bg-white border border-gray-200 rounded-lg p-1 w-full sm:w-auto">
                <TabsTrigger
                  value="tasks"
                  className={cn(
                    "rounded-md px-6 py-2 text-[#95A5A6] transition-all data-[state=active]:bg-[#D35400] data-[state=active]:text-white",
                  )}
                >
                  1. Selecionar Tarefas
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className={cn(
                    "rounded-md px-6 py-2 text-[#95A5A6] transition-all data-[state=active]:bg-[#D35400] data-[state=active]:text-white",
                  )}
                >
                  2. Revisão 
                </TabsTrigger>
              </TabsList>

              {/* ABA SELECIONAR TAREFAS */}
              <TabsContent value="tasks" className="space-y-6 mt-6">
                {/* Configurações da Rota */}
                <Card className={cardStyle}>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
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
                                placeholder="Ex: Entregas Zona Sul, Visitas Técnicas..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Data */}
                        <FormField
                          control={form.control}
                          name="routeDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className={labelStyle}>
                                Data Agendada
                              </FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      inputStyle,
                                      "pl-3 text-left font-normal justify-start border-gray-200",
                                      !field.value && "text-[#95A5A6]",
                                    )}
                                  >
                                    <CalendarDaysIcon className="mr-2 h-4 w-4 text-[#D35400]" />
                                    {field.value
                                      ? format(field.value, "PPP", {
                                          locale: ptBR,
                                        })
                                      : "Escolher data"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0 bg-white border-gray-200"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    locale={ptBR}
                                    className="rounded-md"
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
                              <FormLabel
                                className={cn(
                                  labelStyle,
                                  "flex items-center gap-2",
                                )}
                              >
                                <UserIcon className="w-4 h-4 text-[#D35400]" />
                                Responsável
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
                                          : "Selecione um responsável"
                                      }
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white border-gray-200">
                                  <SelectItem
                                    value="none"
                                    className="text-[#2C3E50] focus:bg-[#D35400]/10"
                                  >
                                    Não atribuído
                                  </SelectItem>
                                  {users.map((u) => (
                                    <SelectItem
                                      key={u.id}
                                      value={u.id}
                                      className="text-[#2C3E50] focus:bg-[#D35400]/10"
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

                        {/* Rota Por */}
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
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className={inputStyle}>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white border-gray-200">
                                  <SelectItem
                                    value="DISTANCE"
                                    className="text-[#2C3E50] focus:bg-[#D35400]/10"
                                  >
                                    <MapPin className="w-4 h-4 text-[#D35400] mr-2 inline" />
                                    Proximidade
                                  </SelectItem>
                                  <SelectItem
                                    value="PRIORITY"
                                    className="text-[#2C3E50] focus:bg-[#D35400]/10"
                                  >
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
                    </div>
                  </CardContent>
                </Card>

                {/* Seleção de Tarefas */}
                <Card className={cardStyle}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="font-bold text-lg text-[#2C3E50]">
                          Tarefas 
                        </h3>
                        <p className="text-sm text-[#95A5A6] mt-1">
                          Selecione as tarefas 
                        </p>
                      </div>
                      {selectedTaskIds.size > 0 && (
                        <Badge className="bg-[#D35400] text-white">
                          {selectedTaskIds.size} selecionada(s)
                        </Badge>
                      )}
                    </div>

                    {isLoadingTasks ? (
                      <div className="text-center py-12">
                        <Loader2 className="animate-spin mx-auto h-8 w-8 text-[#D35400] mb-4" />
                        <p className="text-[#95A5A6]">Carregando tarefas...</p>
                      </div>
                    ) : availableNotAdded.length === 0 ? (
                      <div className="text-center py-12">
                        <MapPinIcon className="mx-auto h-12 w-12 text-[#BDC3C7] mb-4" />
                        <p className="text-[#95A5A6]">
                          {availableTasks.length === 0
                            ? "Nenhuma tarefa disponível para criar rota"
                            : "Todas as tarefas já foram adicionadas à rota"}
                        </p>
                        <p className="text-[#95A5A6] text-sm mt-1">
                          {availableTasks.length === 0
                            ? "Cadastre tarefas com endereço para utilizá-las na rota"
                            : `Você já adicionou ${fields.length} tarefa(s)`}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
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
                    <AnimatePresence>
                      {fields.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-6 pt-6 border-t border-gray-200"
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-[#2C3E50]">
                              Paradas selecionadas ({fields.length})
                            </h4>
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
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                      <Button
                        type="button"
                        className="bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95 rounded-full px-6"
                        onClick={addSelectedTasks}
                        disabled={selectedTaskIds.size === 0}
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Adicionar 
                      </Button>
                      <Button
                        type="button"
                        className="bg-[#2C3E50] text-white hover:bg-[#2C3E50]/90 transition-all active:scale-95 rounded-full px-6"
                        onClick={() => setActiveTab("review")}
                        disabled={fields.length === 0}
                      >
                        Próximo
                        <ChevronDownIcon className="h-4 w-4 ml-2 rotate-[-90deg]" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ABA REVISÃO */}
              <TabsContent value="review" className="space-y-6 mt-6">
                <Card className={cardStyle}>
                  <CardHeader className="pb-4 border-b border-gray-200">
                    <CardTitle className="text-[#2C3E50] text-xl">
                      Confirmar 
                    </CardTitle>
                    <p className="text-sm text-[#95A5A6] mt-1">
                      Revisar as informações 
                    </p>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Resumo */}
                    <div className="bg-[#F5F0E6] rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[#2C3E50] font-medium">
                          Título:
                        </span>
                        <span className="text-[#2C3E50]">
                          {form.watch("title") || "Não informado"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#2C3E50] font-medium">
                          Total de Paradas:
                        </span>
                        <Badge className="bg-[#D35400] text-white">
                          {fields.length}{" "}
                          {fields.length === 1 ? "parada" : "paradas"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#2C3E50] font-medium">
                          Rota Por:
                        </span>
                        <span className="text-[#2C3E50]">
                          {form.watch("orderBy") === "DISTANCE" ? (
                            <span>
                              <MapPin className="h-4 w-4 text-[#D35400] inline mr-1" />{" "}
                              Proximidade
                            </span>
                          ) : (
                            <span>
                              <ArrowUpDown className="h-4 w-4 text-[#D35400] inline mr-1" />{" "}
                              Prioridade
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#2C3E50] font-medium">
                          Responsável:
                        </span>
                        <span className="text-[#2C3E50]">
                          {users.find(
                            (u) => u.id === form.watch("userAssignedId"),
                          )?.name || "Não atribuído"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#2C3E50] font-medium">
                          Data Agendada:
                        </span>
                        <span className="text-[#2C3E50]">
                          {form.watch("routeDate")
                            ? format(form.watch("routeDate")!, "dd/MM/yyyy", {
                                locale: ptBR,
                              })
                            : "Não definida"}
                        </span>
                      </div>
                    </div>

                    {/* Lista de paradas na revisão */}
                    {fields.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-[#2C3E50] mb-3">
                          Pontos de parada
                        </h4>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {fields.map((field, index) => (
                            <div
                              key={field.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-[#F5F0E6]"
                            >
                              <span className="w-6 h-6 rounded-full bg-[#D35400]/10 text-[#D35400] flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[#2C3E50] text-sm font-medium truncate">
                                  {field.name}
                                </p>
                                <p className="text-[#95A5A6] text-xs truncate">
                                  {field.address}, {field.city}
                                </p>
                                {field.assignedToName && (
                                  <p className="text-[#95A5A6] text-xs truncate mt-0.5 flex items-center gap-1">
                                    <UserIcon className="h-3 w-3" />
                                    {field.assignedToName}
                                  </p>
                                )}
                              </div>
                              {field.latitude !== 0 &&
                                field.longitude !== 0 && (
                                  <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={createRoute.isPending || fields.length === 0}
                      className="w-full h-12 text-base font-semibold bg-[#D35400] hover:bg-[#E67E22] text-white transition-all shadow-md active:scale-[0.98] disabled:opacity-50 rounded-full"
                    >
                      {createRoute.isPending ? (
                        <>
                          <Loader2 className="animate-spin mr-2 h-5 w-5" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar"
                      )}
                    </Button>

                    
                  </CardContent>
                </Card>

                <div className="flex justify-start">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[#95A5A6] hover:text-[#2C3E50] transition-colors rounded-full"
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
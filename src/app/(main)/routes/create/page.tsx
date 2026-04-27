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
  FilterIcon,
  SearchIcon,
  CalendarIcon,
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
  scheduledDate: z.string().optional().nullable(), // ✅ Aceita null
  dueDate: z.string().optional().nullable(), // ✅ Aceita null
});

const formSchema = z.object({
  title: z.string().min(3, "Título é obrigatório (mínimo 3 caracteres)"),
  routeDate: z.date().optional(),
  userAssignedId: z.string().optional().nullable(),
  orderBy: z.enum(["DISTANCE", "PRIORITY"]).default("DISTANCE"),
  stops: z.array(stopSchema).min(1, "Selecione pelo menos uma tarefa"),
});

type FormValues = z.infer<typeof formSchema>;

// Interface para Task com status
interface Task {
  id: string;
  title: string;
  description?: string;
  status?: string;
  scheduledDate?: string;
  dueDate?: string;
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

// Componente de Skeleton
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

// Componente de Task Item para seleção (com badge de status)
const TaskItem = memo(({ task, isSelected, onToggle }: any) => {
  const getStatusBadge = () => {
    const status = task.status;
    if (status === "RESCHEDULED") {
      return (
        <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs">
          Reagendada
        </Badge>
      );
    }
    if (status === "PENDING") {
      return (
        <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">
          Pendente
        </Badge>
      );
    }
    return null;
  };

  // Função para verificar se o prazo está próximo ou vencido
  const getDueDateStyle = (dueDate: string) => {
    if (!dueDate) return "text-[#95A5A6]";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
      return "text-red-500"; // Vencido
    }
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      return "text-amber-600"; // Próximo do vencimento (3 dias ou menos)
    }
    return "text-[#95A5A6]"; // Normal
  };

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
          {getStatusBadge()}
        </div>

        {/* 📅 PRAZO FINAL (dueDate) - CORRIGIDO */}
        {task.dueDate && (
          <p
            className={cn(
              "text-xs mt-1 flex items-center gap-1",
              getDueDateStyle(task.dueDate),
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            Prazo final:{" "}
            {format(new Date(task.dueDate), "dd/MM/yyyy", {
              locale: ptBR,
            })}
          </p>
        )}

        {task.scheduledDate && (
          <p className="text-xs text-[#95A5A6] mt-1 flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            Agendado para:{" "}
            {format(new Date(task.scheduledDate), "dd/MM/yyyy", {
              locale: ptBR,
            })}
          </p>
        )}

        {task.taskAddress && (
          <p className="text-sm text-[#95A5A6] truncate mt-1">
            📍 {task.taskAddress.endereco}, {task.taskAddress.cidade}/
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
            📝 {task.description}
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

  // Função para verificar se o prazo está próximo ou vencido
  const getDueDateStyle = (dueDate: string) => {
    if (!dueDate) return "text-[#95A5A6]";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
      return "text-red-500"; // Vencido
    }
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      return "text-amber-600"; // Próximo do vencimento
    }
    return "text-[#95A5A6]";
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
            📍 {stop.address}, {stop.city}
          </p>

          {/* 📅 PRAZO FINAL (dueDate) - CORRIGIDO */}
          {stop.dueDate && (
            <p
              className={cn(
                "text-xs mt-1 flex items-center gap-1",
                getDueDateStyle(stop.dueDate),
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              Prazo final:{" "}
              {format(new Date(stop.dueDate), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}

          {stop.scheduledDate && (
            <p className="text-xs text-[#95A5A6] mt-1 flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Agendado para:{" "}
              {format(new Date(stop.scheduledDate), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </p>
          )}

          {stop.assignedToName && (
            <p className="text-xs text-[#95A5A6] mt-1 flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              Responsável: {stop.assignedToName}
            </p>
          )}
          {stop.notes && (
            <p className="text-[#95A5A6] text-sm truncate mt-0.5 line-clamp-2 italic">
              📝 {stop.notes}
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
  const [hasLoadedTasks, setHasLoadedTasks] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // FILTROS AVANÇADOS
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  const [titleFilter, setTitleFilter] = useState<string>("");
  const [dueDateStart, setDueDateStart] = useState<Date | undefined>(undefined);
  const [dueDateEnd, setDueDateEnd] = useState<Date | undefined>(undefined);

  // Estados temporários para o formulário de filtro
  const [tempAssignedTo, setTempAssignedTo] = useState<string>("all");
  const [tempTitle, setTempTitle] = useState<string>("");
  const [tempDueDateStart, setTempDueDateStart] = useState<Date | undefined>(
    undefined,
  );
  const [tempDueDateEnd, setTempDueDateEnd] = useState<Date | undefined>(
    undefined,
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      orderBy: "DISTANCE",
      stops: [],
      userAssignedId: null,
    },
    mode: "onChange", // IMPORTANTE: validar em tempo real
  });

  // Monitorar estado do formulário
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      console.log(
        `📝 [FORM] Campo "${name}" alterado:`,
        value[name as keyof typeof value],
      );
    });

    console.log("📋 [FORM] Estado inicial:", {
      isValid: form.formState.isValid,
      errors: form.formState.errors,
      values: form.getValues(),
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stops",
  });

  // Atualizar validação quando stops mudar
  useEffect(() => {
    console.log("📊 [STOPS] Paradas atualizadas:", fields.length);
    form.trigger("stops");
  }, [fields.length, form]);

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

  const loadAvailableTasks = useCallback(async () => {
    if (isLoadingTasks || hasLoadedTasks) return;

    setIsLoadingTasks(true);
    try {
      const params: any = {
        hasLocation: "true",
        status: "PENDING,RESCHEDULED",
        limit: 100,
      };

      if (assignedToFilter !== "all") {
        if (assignedToFilter === "none") {
          params.assignedToId = "none";
        } else {
          params.assignedToId = assignedToFilter;
        }
      }

      if (titleFilter && titleFilter.trim() !== "") {
        params.search = titleFilter.trim();
        console.log("✅ [TITLE] Adicionando filtro de busca:", params.search);
      }

      if (dueDateStart || dueDateEnd) {
        params.dateType = "due";

        if (dueDateStart) {
          // 🔥 Envia apenas a data no formato YYYY-MM-DD, sem converter para UTC
          const year = dueDateStart.getFullYear();
          const month = String(dueDateStart.getMonth() + 1).padStart(2, "0");
          const day = String(dueDateStart.getDate()).padStart(2, "0");
          params.startDate = `${year}-${month}-${day}`;
          console.log("📅 Data início (YYYY-MM-DD):", params.startDate);
        }

        if (dueDateEnd) {
          // 🔥 Envia apenas a data no formato YYYY-MM-DD, sem converter para UTC
          const year = dueDateEnd.getFullYear();
          const month = String(dueDateEnd.getMonth() + 1).padStart(2, "0");
          const day = String(dueDateEnd.getDate()).padStart(2, "0");
          params.endDate = `${year}-${month}-${day}`;
          console.log("📅 Data fim (YYYY-MM-DD):", params.endDate);
        }
      }

      console.log("📊 [API] Parâmetros completos:", params);
      const response = await api.get("/tasks", { params });
      const tasks = response.data?.data || [];
      setAvailableTasks(tasks);
      setHasLoadedTasks(true);
    } catch (error) {
      console.error("Erro ao carregar tasks:", error);
      toast.error("Erro ao carregar lista de tarefas");
      setHasLoadedTasks(true);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [
    isLoadingTasks,
    hasLoadedTasks,
    assignedToFilter,
    titleFilter,
    dueDateStart,
    dueDateEnd,
  ]);

  const applyFilters = useCallback(() => {
    console.log("🔄 Aplicando filtros...");
    setAssignedToFilter(tempAssignedTo);
    setTitleFilter(tempTitle);
    setDueDateStart(tempDueDateStart);
    setDueDateEnd(tempDueDateEnd);
    setHasLoadedTasks(false);
    setSelectedTaskIds(new Set());
  }, [tempAssignedTo, tempTitle, tempDueDateStart, tempDueDateEnd]);

  const clearFilters = useCallback(() => {
    console.log("🧹 Limpando todos os filtros");
    setTempAssignedTo("all");
    setTempTitle("");
    setTempDueDateStart(undefined);
    setTempDueDateEnd(undefined);
    setAssignedToFilter("all");
    setTitleFilter("");
    setDueDateStart(undefined);
    setDueDateEnd(undefined);
    setHasLoadedTasks(false);
    setSelectedTaskIds(new Set());
  }, []);

  useEffect(() => {
    if (activeTab === "tasks" && !hasLoadedTasks && !isLoadingTasks) {
      loadAvailableTasks();
    }
  }, [activeTab, hasLoadedTasks, isLoadingTasks, loadAvailableTasks]);

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
      scheduledDate: task.scheduledDate || null, // ✅ Pode ser null
      dueDate: task.dueDate || null, // ✅ Pode ser null
    };
  }, []);

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

  const handleRemoveStop = useCallback(
    (indexToRemove: number) => {
      if (indexToRemove >= 0 && indexToRemove < fields.length) {
        remove(indexToRemove);
        toast.success("Parada removida", { duration: 1500 });
      }
    },
    [fields.length, remove],
  );

  const addedTaskIds = useMemo(
    () => new Set(fields.map((f) => f.taskId).filter(Boolean)),
    [fields],
  );

  const availableNotAdded = useMemo(
    () => availableTasks.filter((task) => !addedTaskIds.has(task.id)),
    [availableTasks, addedTaskIds],
  );

  // Função de submit CORRIGIDA
  const handleSubmit = useCallback(
    async (data: FormValues) => {
      console.log("🚀 [CREATE ROUTE] Iniciando criação da rota...");
      console.log("📝 [CREATE ROUTE] Dados do formulário:", {
        title: data.title,
        routeDate: data.routeDate,
        userAssignedId: data.userAssignedId,
        orderBy: data.orderBy,
        stopsCount: data.stops.length,
      });

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

        console.log(
          "📦 [CREATE ROUTE] Payload enviado:",
          JSON.stringify(payload, null, 2),
        );
        const result = await createRoute.mutateAsync(payload as any);
        console.log("✅ [CREATE ROUTE] Resposta da API:", result);

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
        console.error("❌ [CREATE ROUTE] Erro:", err);
        toast.dismiss(loadingToast);
        toast.error("Erro ao salvar rota.", {
          description:
            err?.response?.data?.message ||
            err?.message ||
            "Tente novamente mais tarde",
        });
      }
    },
    [createRoute, router],
  );

  const inputStyle =
    "bg-white border-gray-200 text-[#2C3E50] placeholder:text-[#95A5A6] focus-visible:ring-[#D35400] focus-visible:border-[#D35400] transition-all";
  const labelStyle = "text-[#2C3E50] font-medium";
  const cardStyle = "border-0 shadow-md rounded-xl overflow-hidden bg-white";

  if (isLoadingUsers) {
    return <FormSkeleton />;
  }

  const activeFiltersCount = [
    assignedToFilter !== "all",
    !!titleFilter,
    !!dueDateStart || !!dueDateEnd,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen w-full bg-[#F5F0E6] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2C3E50]">Criar Rota</h1>
            <p className="text-[#95A5A6] mt-1">
              Preencha as informações para criar uma nova rota
            </p>
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
                <p>Cancelar criação da rota</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
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
                  2. Revisão e Confirmação
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="space-y-6 mt-6">
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
                                onChange={(e) => {
                                  console.log(
                                    "📝 Título alterado:",
                                    e.target.value,
                                  );
                                  field.onChange(e);
                                }}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    <SelectValue placeholder="Selecione um responsável" />
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
                    </div>
                  </CardContent>
                </Card>

                <Card className={cardStyle}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-[#2C3E50]">
                          Tarefas Disponíveis
                        </h3>
                        <p className="text-sm text-[#95A5A6] mt-1">
                          Selecione as tarefas que deseja adicionar à rota
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowAdvancedFilters(!showAdvancedFilters)
                        }
                        className="text-[#95A5A6] hover:text-[#D35400] relative"
                      >
                        <FilterIcon className="h-4 w-4 mr-1" />
                        Filtros
                        {activeFiltersCount > 0 && (
                          <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-[#D35400] text-white text-xs">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </div>

                    <AnimatePresence>
                      {showAdvancedFilters && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3"
                        >
                          <div>
                            <label className="text-sm font-medium text-[#2C3E50] block mb-1 flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-[#D35400]" />
                              Responsável
                            </label>
                            <select
                              value={tempAssignedTo}
                              onChange={(e) =>
                                setTempAssignedTo(e.target.value)
                              }
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
                            >
                              <option value="all">Todos os responsáveis</option>
                              <option value="none">Não atribuído</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-[#2C3E50] block mb-1 flex items-center gap-2">
                              <SearchIcon className="h-4 w-4 text-[#D35400]" />
                              Título da Tarefa
                            </label>
                            <Input
                              type="text"
                              value={tempTitle}
                              onChange={(e) => setTempTitle(e.target.value)}
                              placeholder="Buscar por título..."
                              className="bg-white border-gray-200"
                              onKeyDown={(e) =>
                                e.key === "Enter" && applyFilters()
                              }
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="text-sm font-medium text-[#2C3E50] block flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-[#D35400]" />
                              Prazo final
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-[#95A5A6] block mb-1">
                                  Data Início
                                </label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left",
                                        !tempDueDateStart && "text-[#95A5A6]",
                                      )}
                                    >
                                      <CalendarDaysIcon className="mr-2 h-4 w-4 text-[#D35400]" />
                                      {tempDueDateStart
                                        ? format(tempDueDateStart, "PPP", {
                                            locale: ptBR,
                                          })
                                        : "Data inicial"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 bg-white">
                                    <Calendar
                                      mode="single"
                                      selected={tempDueDateStart}
                                      onSelect={setTempDueDateStart}
                                      locale={ptBR}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div>
                                <label className="text-xs text-[#95A5A6] block mb-1">
                                  Data Fim
                                </label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left",
                                        !tempDueDateEnd && "text-[#95A5A6]",
                                      )}
                                    >
                                      <CalendarDaysIcon className="mr-2 h-4 w-4 text-[#D35400]" />
                                      {tempDueDateEnd
                                        ? format(tempDueDateEnd, "PPP", {
                                            locale: ptBR,
                                          })
                                        : "Data final"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 bg-white">
                                    <Calendar
                                      mode="single"
                                      selected={tempDueDateEnd}
                                      onSelect={setTempDueDateEnd}
                                      locale={ptBR}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              onClick={applyFilters}
                              className="flex-1 bg-[#D35400] hover:bg-[#E67E22] text-white"
                            >
                              <SearchIcon className="h-4 w-4 mr-2" />
                              Buscar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={clearFilters}
                              className="flex-1 border-gray-300 text-[#2C3E50] hover:bg-gray-100"
                            >
                              Limpar Filtros
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

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
                            ? "Nenhuma tarefa pendente ou reagendada encontrada"
                            : "Todas as tarefas já foram adicionadas à rota"}
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

                    <AnimatePresence>
                      {fields.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-6 pt-6 border-t border-gray-200"
                        >
                          <h4 className="font-semibold text-[#2C3E50] mb-3">
                            Paradas selecionadas ({fields.length})
                          </h4>
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
                        className="bg-green-600 text-white hover:bg-green-700 rounded-full px-6"
                        onClick={addSelectedTasks}
                        disabled={selectedTaskIds.size === 0}
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Adicionar à Rota
                      </Button>
                      <Button
                        type="button"
                        className="bg-[#2C3E50] text-white hover:bg-[#2C3E50]/90 rounded-full px-6"
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

              <TabsContent value="review" className="space-y-6 mt-6">
                <Card className={cardStyle}>
                  <CardHeader className="pb-4 border-b border-gray-200">
                    <CardTitle className="text-[#2C3E50] text-xl">
                      Confirmar Dados da Rota
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="bg-[#F5F0E6] rounded-xl p-5 space-y-3">
                      <div className="bg-[#F5F0E6] rounded-xl p-5 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-[#2C3E50] font-medium">
                            Título:
                          </span>
                          <span>{form.watch("title") || "Não informado"}</span>
                        </div>

                        {/* 🔥 DATA AGENDADA DA ROTA - ADICIONAR AQUI */}
                        <div className="flex justify-between">
                          <span className="text-[#2C3E50] font-medium">
                            Data Agendada:
                          </span>
                          <span>
                            {form.watch("routeDate")
                              ? format(form.watch("routeDate")!, "dd/MM/yyyy", {
                                  locale: ptBR,
                                })
                              : "Não definida"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-[#2C3E50] font-medium">
                            Total de Paradas:
                          </span>
                          <Badge className="bg-[#D35400] text-white">
                            {fields.length}{" "}
                            {fields.length === 1 ? "parada" : "paradas"}
                          </Badge>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-[#2C3E50] font-medium">
                            Rota Por:
                          </span>
                          <span>
                            {form.watch("orderBy") === "DISTANCE"
                              ? "Proximidade"
                              : "Prioridade"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-[#2C3E50] font-medium">
                            Responsável:
                          </span>
                          <span>
                            {users.find(
                              (u) => u.id === form.watch("userAssignedId"),
                            )?.name || "Não atribuído"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {fields.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-[#2C3E50] mb-3">
                          Pontos de parada
                        </h4>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {fields.map((field, index) => {
                            // Função para estilo do prazo
                            const getDueDateStyle = (dueDate: string) => {
                              if (!dueDate) return "text-[#95A5A6]";
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const due = new Date(dueDate);
                              due.setHours(0, 0, 0, 0);

                              if (due < today) return "text-red-500";
                              const diffDays = Math.ceil(
                                (due.getTime() - today.getTime()) /
                                  (1000 * 60 * 60 * 24),
                              );
                              if (diffDays <= 3) return "text-amber-600";
                              return "text-[#95A5A6]";
                            };

                            return (
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
                                    📍 {field.address}, {field.city}
                                  </p>

                                  {/* 📅 PRAZO FINAL NA REVISÃO */}
                                  {field.dueDate && (
                                    <p
                                      className={cn(
                                        "text-xs mt-1",
                                        getDueDateStyle(field.dueDate),
                                      )}
                                    >
                                      ⏰ Prazo final:{" "}
                                      {format(
                                        new Date(field.dueDate),
                                        "dd/MM/yyyy",
                                      )}
                                    </p>
                                  )}

                                  {field.scheduledDate && (
                                    <p className="text-xs text-[#95A5A6] mt-1">
                                      📅 Agendado para:{" "}
                                      {format(
                                        new Date(field.scheduledDate),
                                        "dd/MM/yyyy",
                                      )}
                                    </p>
                                  )}

                                  {field.assignedToName && (
                                    <p className="text-xs text-[#95A5A6] mt-1">
                                      👤 Responsável: {field.assignedToName}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      type="button" // Mudar para button
                      disabled={createRoute.isPending || fields.length === 0}
                      className="w-full h-12 text-base font-semibold bg-[#D35400] hover:bg-[#E67E22] text-white transition-all shadow-md active:scale-[0.98] disabled:opacity-50 rounded-full"
                      onClick={async () => {
                        console.log("🖱️ [BUTTON] Botão clicado!");

                        // 🔥 FORÇAR VALIDAÇÃO MANUAL
                        const isValid = await form.trigger();
                        console.log(
                          "✅ [VALIDATION] Resultado trigger():",
                          isValid,
                        );

                        if (!isValid) {
                          const errors = form.formState.errors;
                          console.log(
                            "❌ [VALIDATION] Erros encontrados:",
                            errors,
                          );

                          if (errors.title) {
                            toast.error(errors.title.message);
                          } else if (errors.stops) {
                            toast.error(errors.stops.message);
                          } else {
                            toast.error(
                              "Preencha todos os campos obrigatórios",
                            );
                          }
                          return;
                        }

                        // Verificação manual extra
                        const title = form.getValues("title");
                        const stops = form.getValues("stops");

                        console.log(
                          "🔍 [CHECK] Título:",
                          title,
                          "Length:",
                          title?.length,
                        );
                        console.log("🔍 [CHECK] Stops:", stops?.length);

                        if (!title || title.length < 3) {
                          toast.error(
                            "Título é obrigatório (mínimo 3 caracteres)",
                          );
                          return;
                        }

                        if (!stops || stops.length === 0) {
                          toast.error("Adicione pelo menos uma parada à rota");
                          return;
                        }

                        // Se passou, submeter
                        console.log("✅ [SUBMIT] Chamando handleSubmit...");
                        form.handleSubmit(handleSubmit)();
                      }}
                    >
                      {createRoute.isPending ? (
                        <>
                          <Loader2 className="animate-spin mr-2 h-5 w-5" />
                          Salvando...
                        </>
                      ) : (
                        "Criar Rota"
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <div className="flex justify-start">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTab("tasks")}
                  >
                    ← Voltar para seleção de tarefas
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

/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import { useRoutes } from "@/hooks/useRoutes";
import { userService } from "@/services/userService";
import { User } from "@/types/chat";
import {
  ArrowRight,
  ArrowUpDown,
  CalendarDaysIcon,
  CheckCircleIcon,
  Clock,
  Loader2,
  MapPin,
  MapPinIcon,
  PlusIcon,
  RefreshCcw,
  Search,
  Trash2Icon,
  UserIcon,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

// --- Interface Task ---
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

// --- Schema de Validação ---
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
  scheduledDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const formSchema = z.object({
  title: z.string().min(3, "Título é obrigatório (mínimo 3 caracteres)"),
  routeDate: z.date().optional(),
  userAssignedId: z.string().optional().nullable(),
  orderBy: z.enum(["DISTANCE", "PRIORITY"]).default("DISTANCE"),
  stops: z.array(stopSchema).min(1, "Selecione pelo menos uma tarefa"),
});

type FormValues = z.infer<typeof formSchema>;

// --- Funções Auxiliares ---
const getEffectiveDueDate = (task: Task): Date | null => {
  if (task.dueDate) return new Date(task.dueDate);
  if (task.scheduledDate) return new Date(task.scheduledDate);
  return null;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function CreateRoutePage() {
  const router = useRouter();
  const { useCreateRoute } = useRoutes();
  const createRoute = useCreateRoute();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [hasLoadedTasks, setHasLoadedTasks] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [search, setSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      orderBy: "DISTANCE",
      stops: [],
      userAssignedId: null,
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stops",
  });

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  // Carregar tarefas disponíveis
  const loadAvailableTasks = useCallback(async () => {
    if (isLoadingTasks || hasLoadedTasks) return;

    setIsLoadingTasks(true);
    try {
      const params: any = {
        hasLocation: "true",
        status: "PENDING,RESCHEDULED",
        limit: 100,
      };

      if (search && search.trim() !== "") {
        params.search = search.trim();
      }

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
  }, [isLoadingTasks, hasLoadedTasks, search]);

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
      scheduledDate: task.scheduledDate || null,
      dueDate: task.dueDate || null,
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

    // Em mobile, rolar para as paradas selecionadas
    if (isMobile && fields.length === 0) {
      setTimeout(() => {
        document
          .getElementById("selected-stops")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [
    availableTasks,
    selectedTaskIds,
    append,
    convertTaskToStop,
    fields,
    isMobile,
  ]);

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
      remove(indexToRemove);
      toast.success("Parada removida", { duration: 1500 });
    },
    [remove],
  );

  const addedTaskIds = new Set(fields.map((f) => f.taskId).filter(Boolean));
  const availableNotAdded = availableTasks.filter(
    (task) => !addedTaskIds.has(task.id),
  );

  const handleSubmit = useCallback(
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
        toast.success("Rota criada com sucesso!");
        router.push("/routes");
      } catch (err: any) {
        toast.dismiss(loadingToast);
        toast.error("Erro ao salvar rota.");
      }
    },
    [createRoute, router],
  );

  if (isLoadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F6FA] to-[#E8EDF5]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F80ED]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full bg-[#2F80ED] animate-ping opacity-20"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F6FA] via-[#F8F9FC] to-[#F5F6FA] font-sans">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* HEADER */}
        <header className="mb-6 sm:mb-8 lg:mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
            <div className="w-full sm:w-auto">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-[#353A40] to-[#2F80ED] bg-clip-text text-transparent mb-2">
                Criar Rota
              </h1>
              <p className="text-sm sm:text-base text-[#7A7E83] leading-relaxed">
                Preencha as informações para criar uma nova rota de entregas
              </p>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => router.push("/routes")}
                    variant="outline"
                    className="border-[#CBD5E1] text-[#353A40] bg-white/80 backdrop-blur-sm hover:bg-white rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cancelar criação da rota</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mt-4 sm:mt-6">
            <div className="h-1 w-20 bg-gradient-to-r from-[#2F80ED] to-[#56A0F3] rounded-full"></div>
          </div>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6 sm:space-y-8"
        >
          <div className="sticky top-0 z-10 bg-gradient-to-br from-[#F5F6FA] pt-2 pb-3 sm:pb-4">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full p-1 w-full sm:w-auto shadow-sm">
              <TabsTrigger
                value="tasks"
                className={cn(
                  "rounded-full px-3 sm:px-5 py-1.5 text-xs sm:text-sm text-[#7A7E83] transition-all duration-200",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2F80ED] data-[state=active]:to-[#56A0F3]",
                  "data-[state=active]:text-white data-[state=active]:shadow-md",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className="hidden sm:inline text-[10px] opacity-70">
                    1.
                  </span>
                  <span className="text-xs sm:text-sm">Selecionar Tarefas</span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="review"
                className={cn(
                  "rounded-full px-3 sm:px-5 py-1.5 text-xs sm:text-sm text-[#7A7E83] transition-all duration-200",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2F80ED] data-[state=active]:to-[#56A0F3]",
                  "data-[state=active]:text-white data-[state=active]:shadow-md",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className="hidden sm:inline text-[10px] opacity-70">
                    2.
                  </span>
                  <span className="text-xs sm:text-sm">
                    Revisão e Confirmação
                  </span>
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1 - Selecionar Tarefas */}
          <TabsContent
            value="tasks"
            className="space-y-6 sm:space-y-8 mt-6 sm:mt-8"
          >
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl sm:rounded-3xl border-0 overflow-hidden">
              <CardHeader className="border-b border-gray-100 pb-4 sm:pb-6 px-5 sm:px-8 pt-6 sm:pt-8">
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl text-[#353A40]">
                  <div className="p-2 bg-gradient-to-br from-[#2F80ED]/10 to-[#56A0F3]/10 rounded-xl">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-[#2F80ED]" />
                  </div>
                  Informações da Rota
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 sm:p-8 space-y-5 sm:space-y-6">
                <div>
                  <label className="text-sm sm:text-base font-semibold text-[#353A40] mb-2 block">
                    Título da Rota <span className="text-[#2F80ED]">*</span>
                  </label>
                  <Input
                    placeholder="Ex: Entregas Zona Sul, Visitas Técnicas..."
                    value={form.watch("title")}
                    onChange={(e) => form.setValue("title", e.target.value)}
                    className="bg-[#F8F9FC] border-gray-200 focus:border-[#2F80ED] focus:ring-2 focus:ring-[#2F80ED]/20 rounded-xl h-11 sm:h-12 text-sm sm:text-base transition-all"
                  />
                  {form.formState.errors.title && (
                    <p className="text-red-500 text-xs sm:text-sm mt-2 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="text-sm sm:text-base font-semibold text-[#353A40] mb-2 block">
                      Data Agendada
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left bg-[#F8F9FC] border-gray-200 rounded-xl h-11 sm:h-12",
                            "hover:bg-[#F8F9FC] transition-all",
                            !form.watch("routeDate") && "text-[#7A7E83]",
                          )}
                        >
                          <CalendarDaysIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-[#2F80ED]" />
                          {form.watch("routeDate")
                            ? format(form.watch("routeDate")!, "PPP", {
                                locale: ptBR,
                              })
                            : "Escolher data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white rounded-xl shadow-xl border-0">
                        <Calendar
                          mode="single"
                          selected={form.watch("routeDate")}
                          onSelect={(date) => form.setValue("routeDate", date)}
                          locale={ptBR}
                          className="rounded-xl"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm sm:text-base font-semibold text-[#353A40] mb-2 block">
                      Responsável
                    </label>
                    <Select
                      onValueChange={(value) =>
                        form.setValue("userAssignedId", value)
                      }
                      value={form.watch("userAssignedId") || undefined}
                    >
                      <SelectTrigger className="bg-[#F8F9FC] border-gray-200 rounded-xl h-11 sm:h-12">
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-xl shadow-xl border-0">
                        <SelectItem value="none">Não atribuído</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm sm:text-base font-semibold text-[#353A40] mb-2 block">
                    Otimizar Rota Por
                  </label>
                  <Select
                    onValueChange={(value: any) =>
                      form.setValue("orderBy", value)
                    }
                    value={form.watch("orderBy")}
                  >
                    <SelectTrigger className="bg-[#F8F9FC] border-gray-200 rounded-xl h-11 sm:h-12 px-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl shadow-xl border-0">
                      <SelectItem value="DISTANCE" className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#2F80ED] flex-shrink-0" />
                          <span className="text-sm">Proximidade</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="PRIORITY" className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="w-4 h-4 text-[#2F80ED] flex-shrink-0" />
                          <span className="text-sm">Prioridade</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl sm:rounded-3xl border-0 overflow-hidden">
              <CardHeader className="border-b border-gray-100 pb-4 sm:pb-6 px-5 sm:px-8 pt-6 sm:pt-8">
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl text-[#353A40]">
                  <div className="p-2 bg-gradient-to-br from-[#2F80ED]/10 to-[#56A0F3]/10 rounded-xl">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-[#2F80ED]" />
                  </div>
                  Tarefas Disponíveis
                  <span className="text-sm font-normal text-[#7A7E83] ml-auto bg-gray-100 px-2 sm:px-3 py-1 rounded-full">
                    {availableNotAdded.length} itens
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 sm:p-8">
                <div className="relative mb-5 sm:mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A7E83]" />
                  <Input
                    placeholder="Buscar tarefas por título..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setHasLoadedTasks(false);
                    }}
                    className="pl-10 bg-[#F8F9FC] border-gray-200 rounded-xl h-11 sm:h-12 text-sm sm:text-base transition-all focus:border-[#2F80ED] focus:ring-2 focus:ring-[#2F80ED]/20"
                  />
                </div>

                {isLoadingTasks ? (
                  <div className="text-center py-12 sm:py-16">
                    <Loader2 className="animate-spin mx-auto h-8 w-8 sm:h-10 sm:w-10 text-[#2F80ED] mb-4" />
                    <p className="text-[#7A7E83] text-sm sm:text-base">
                      Carregando tarefas...
                    </p>
                  </div>
                ) : availableNotAdded.length === 0 ? (
                  <div className="text-center py-12 sm:py-16">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4">
                      <MapPinIcon className="h-8 w-8 sm:h-10 sm:w-10 text-[#CBD5E1]" />
                    </div>
                    <p className="text-[#7A7E83] text-sm sm:text-base">
                      {availableTasks.length === 0
                        ? "Nenhuma tarefa pendente ou reagendada encontrada"
                        : "Todas as tarefas já foram adicionadas à rota"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {availableNotAdded.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "group flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                          "hover:shadow-md active:scale-[0.99]",
                          selectedTaskIds.has(task.id)
                            ? "border-[#2F80ED] bg-gradient-to-r from-[#2F80ED]/5 to-[#56A0F3]/5"
                            : "border-gray-200 bg-white hover:border-[#2F80ED]/50",
                        )}
                        onClick={() => toggleTaskSelection(task.id)}
                      >
                        <div className="flex-shrink-0 pt-0.5">
                          {selectedTaskIds.has(task.id) ? (
                            <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[#2F80ED] animate-scale-in" />
                          ) : (
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-[#CBD5E1] group-hover:border-[#2F80ED] transition-colors" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-[#353A40] text-sm sm:text-base truncate">
                              {task.title}
                            </h4>
                            {task.status === "RESCHEDULED" && (
                              <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs rounded-full px-2 py-0">
                                Reagendada
                              </Badge>
                            )}
                          </div>
                          {task.dueDate && (
                            <p className="text-xs text-[#7A7E83] flex items-center gap-1 mb-1">
                              <CalendarDaysIcon className="h-3 w-3" />
                              Prazo: {formatDate(task.dueDate)}
                            </p>
                          )}
                          {task.taskAddress && (
                            <p className="text-xs sm:text-sm text-[#7A7E83] truncate mb-1">
                              📍 {task.taskAddress.endereco},{" "}
                              {task.taskAddress.cidade}/
                              {task.taskAddress.estado}
                            </p>
                          )}
                          {task.userAssigned && (
                            <p className="text-xs text-[#7A7E83] flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              Responsável: {task.userAssigned.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-[#2F80ED] to-[#56A0F3] text-white hover:shadow-lg rounded-full px-6 py-2 sm:py-2.5 transition-all duration-200 transform active:scale-95"
                    onClick={addSelectedTasks}
                    disabled={selectedTaskIds.size === 0}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Adicionar à Rota ({selectedTaskIds.size})
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#353A40] text-white hover:bg-[#2A2F35] rounded-full px-6 py-2 sm:py-2.5 transition-all duration-200 transform active:scale-95 shadow-md"
                    onClick={() => setActiveTab("review")}
                    disabled={fields.length === 0}
                  >
                    Próximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Paradas Selecionadas */}
            {fields.length > 0 && (
              <Card
                id="selected-stops"
                className="bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl sm:rounded-3xl border-0 overflow-hidden animate-fade-in-up"
              >
                <CardHeader className="border-b border-gray-100 pb-4 sm:pb-6 px-5 sm:px-8 pt-6 sm:pt-8">
                  <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl text-[#353A40]">
                    <div className="p-2 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl">
                      <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                    </div>
                    Paradas Selecionadas ({fields.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 sm:p-8">
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gradient-to-r from-[#F8F9FC] to-white border border-gray-200 group hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#2F80ED] to-[#56A0F3] text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#353A40] text-sm sm:text-base font-medium truncate">
                              {field.name}
                            </p>
                            <p className="text-[#7A7E83] text-xs sm:text-sm truncate">
                              📍 {field.address}, {field.city}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStop(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 transition-all"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2 - Revisão e Confirmação */}
          <TabsContent
            value="review"
            className="space-y-6 sm:space-y-8 mt-6 sm:mt-8"
          >
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl sm:rounded-3xl border-0 overflow-hidden">
              <CardHeader className="border-b border-gray-100 pb-4 sm:pb-6 px-5 sm:px-8 pt-6 sm:pt-8">
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl text-[#353A40]">
                  <div className="p-2 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl">
                    <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  </div>
                  Confirmar Dados da Rota
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 sm:p-8 space-y-6 sm:space-y-8">
                <div className="bg-gradient-to-br from-[#F8F9FC] to-white rounded-2xl p-5 sm:p-6 space-y-4 border border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 py-2 border-b border-gray-200">
                    <span className="text-[#353A40] font-medium">Título:</span>
                    <span className="text-[#7A7E83] font-medium">
                      {form.watch("title") || "Não informado"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 py-2 border-b border-gray-200">
                    <span className="text-[#353A40] font-medium">
                      Data Agendada:
                    </span>
                    <span className="text-[#7A7E83]">
                      {form.watch("routeDate")
                        ? format(form.watch("routeDate")!, "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "Não definida"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 py-2 border-b border-gray-200">
                    <span className="text-[#353A40] font-medium">
                      Total de Paradas:
                    </span>
                    <Badge className="bg-gradient-to-r from-[#2F80ED] to-[#56A0F3] text-white rounded-full px-3 py-1 text-sm">
                      {fields.length}{" "}
                      {fields.length === 1 ? "parada" : "paradas"}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 py-2 border-b border-gray-200">
                    <span className="text-[#353A40] font-medium">
                      Otimização:
                    </span>
                    <span className="text-[#7A7E83] flex items-center gap-2">
                      {form.watch("orderBy") === "DISTANCE" ? (
                        <>
                          <MapPin className="h-4 w-4 text-[#2F80ED]" />
                          Proximidade
                        </>
                      ) : (
                        <>
                          <ArrowUpDown className="h-4 w-4 text-[#2F80ED]" />
                          Prioridade
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 py-2">
                    <span className="text-[#353A40] font-medium">
                      Responsável:
                    </span>
                    <span className="text-[#7A7E83]">
                      {users.find((u) => u.id === form.watch("userAssignedId"))
                        ?.name || "Não atribuído"}
                    </span>
                  </div>
                </div>

                {fields.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-[#353A40] mb-4 text-lg">
                      Pontos de parada
                    </h4>
                    <div className="space-y-2 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto custom-scrollbar">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-[#F8F9FC] to-white border border-gray-200"
                        >
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#2F80ED] to-[#56A0F3] text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#353A40] text-sm sm:text-base font-medium truncate">
                              {field.name}
                            </p>
                            <p className="text-[#7A7E83] text-xs sm:text-sm truncate">
                              📍 {field.address}, {field.city}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  disabled={createRoute.isPending || fields.length === 0}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-[#2F80ED] to-[#56A0F3] hover:from-[#1E5CB8] hover:to-[#2F80ED] text-white transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 rounded-full"
                  onClick={async () => {
                    const isValid = await form.trigger();
                    if (!isValid) {
                      if (form.formState.errors.title) {
                        toast.error(form.formState.errors.title.message);
                      } else if (form.formState.errors.stops) {
                        toast.error(form.formState.errors.stops.message);
                      } else {
                        toast.error("Preencha todos os campos obrigatórios");
                      }
                      return;
                    }
                    form.handleSubmit(handleSubmit)();
                  }}
                >
                  {createRoute.isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      Criando Rota...
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
                className="text-[#2F80ED] hover:text-[#1E5CB8] hover:bg-[#2F80ED]/10 rounded-full px-6 transition-all"
              >
                ← Voltar para seleção de tarefas
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out;
        }

        .animate-scale-in {
          animation: scaleIn 0.2s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        @media (max-width: 640px) {
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
        }
      `}</style>
    </div>
  );
}

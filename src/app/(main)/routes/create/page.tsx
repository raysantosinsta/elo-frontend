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
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [hasLoadedTasks, setHasLoadedTasks] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [search, setSearch] = useState("");

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
      selectedTaskIds.has(task.id)
    );

    if (selectedTasks.length === 0) {
      toast.warning("Nenhuma tarefa selecionada");
      return;
    }

    const existingTaskIds = new Set(fields.map((f) => f.taskId).filter(Boolean));
    const newTasks = selectedTasks.filter((task) => !existingTaskIds.has(task.id));

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
      remove(indexToRemove);
      toast.success("Parada removida", { duration: 1500 });
    },
    [remove]
  );

  const addedTaskIds = new Set(fields.map((f) => f.taskId).filter(Boolean));
  const availableNotAdded = availableTasks.filter((task) => !addedTaskIds.has(task.id));

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
        toast.success("Rota criada com sucesso!");
        router.push("/routes");
      } catch (err: any) {
        toast.dismiss(loadingToast);
        toast.error("Erro ao salvar rota.");
      }
    },
    [createRoute, router]
  );

  if (isLoadingUsers) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F6FA]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2F80ED]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-4 md:p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#353A40] mb-2">
              Criar Rota
            </h1>
            <p className="text-[#7A7E83] mt-1">
              Preencha as informações para criar uma nova rota de entregas
            </p>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => router.push("/routes")}
                  variant="outline"
                  className="border-[#CBD5E1] text-[#353A40] bg-white hover:bg-gray-50 rounded-full"
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
        </header>

        <hr className="border-[#E2E8F0] mb-6" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-200 rounded-lg p-1 w-full sm:w-auto">
            <TabsTrigger
              value="tasks"
              className={cn(
                "rounded-md px-6 py-2 text-[#7A7E83] transition-all data-[state=active]:bg-[#2F80ED] data-[state=active]:text-white"
              )}
            >
              1. Selecionar Tarefas
            </TabsTrigger>
            <TabsTrigger
              value="review"
              className={cn(
                "rounded-md px-6 py-2 text-[#7A7E83] transition-all data-[state=active]:bg-[#2F80ED] data-[state=active]:text-white"
              )}
            >
              2. Revisão e Confirmação
            </TabsTrigger>
          </TabsList>

          {/* TAB 1 - Selecionar Tarefas */}
          <TabsContent value="tasks" className="space-y-6 mt-6">
            <Card className="bg-white shadow-lg rounded-xl">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                  <MapPin className="h-5 w-5 text-[#2F80ED]" />
                  Informações da Rota
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-[#353A40] mb-2 block">
                    Título da Rota *
                  </label>
                  <Input
                    placeholder="Ex: Entregas Zona Sul, Visitas Técnicas..."
                    value={form.watch("title")}
                    onChange={(e) => form.setValue("title", e.target.value)}
                    className="bg-[#F5F6FA] border-[#E2E8F0]"
                  />
                  {form.formState.errors.title && (
                    <p className="text-red-500 text-xs mt-1">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#353A40] mb-2 block">
                      Data Agendada
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left bg-[#F5F6FA] border-[#E2E8F0]",
                            !form.watch("routeDate") && "text-[#7A7E83]"
                          )}
                        >
                          <CalendarDaysIcon className="mr-2 h-4 w-4 text-[#2F80ED]" />
                          {form.watch("routeDate")
                            ? format(form.watch("routeDate")!, "PPP", { locale: ptBR })
                            : "Escolher data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white">
                        <Calendar
                          mode="single"
                          selected={form.watch("routeDate")}
                          onSelect={(date) => form.setValue("routeDate", date)}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-[#353A40] mb-2 block">
                      Responsável
                    </label>
                    <Select
                      onValueChange={(value) => form.setValue("userAssignedId", value)}
                      value={form.watch("userAssignedId") || undefined}
                    >
                      <SelectTrigger className="bg-[#F5F6FA] border-[#E2E8F0]">
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
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
                  <label className="text-sm font-semibold text-[#353A40] mb-2 block">
                    Otimizar Rota Por
                  </label>
                  <Select
                    onValueChange={(value: any) => form.setValue("orderBy", value)}
                    value={form.watch("orderBy")}
                  >
                    <SelectTrigger className="bg-[#F5F6FA] border-[#E2E8F0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="DISTANCE">
                        <MapPin className="w-4 h-4 text-[#2F80ED] mr-2 inline" />
                        Proximidade
                      </SelectItem>
                      <SelectItem value="PRIORITY">
                        <ArrowUpDown className="w-4 h-4 text-[#2F80ED] mr-2 inline" />
                        Prioridade
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-xl">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                  <Clock className="h-5 w-5 text-[#2F80ED]" />
                  Tarefas Disponíveis
                  <span className="text-sm font-normal text-[#7A7E83] ml-auto">
                    {availableNotAdded.length} itens
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A7E83]" />
                  <Input
                    placeholder="Buscar tarefas por título..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setHasLoadedTasks(false);
                    }}
                    className="pl-10 bg-[#F5F6FA] border-[#E2E8F0]"
                  />
                </div>

                {isLoadingTasks ? (
                  <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto h-8 w-8 text-[#2F80ED] mb-4" />
                    <p className="text-[#7A7E83]">Carregando tarefas...</p>
                  </div>
                ) : availableNotAdded.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPinIcon className="mx-auto h-12 w-12 text-[#CBD5E1] mb-4" />
                    <p className="text-[#7A7E83]">
                      {availableTasks.length === 0
                        ? "Nenhuma tarefa pendente ou reagendada encontrada"
                        : "Todas as tarefas já foram adicionadas à rota"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {availableNotAdded.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                          selectedTaskIds.has(task.id)
                            ? "border-[#2F80ED] bg-[#2F80ED]/10"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        )}
                        onClick={() => toggleTaskSelection(task.id)}
                      >
                        <div className="flex-shrink-0 pt-0.5">
                          {selectedTaskIds.has(task.id) ? (
                            <CheckCircleIcon className="h-5 w-5 text-[#2F80ED]" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-[#CBD5E1]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-[#353A40] truncate">
                              {task.title}
                            </h4>
                            {task.status === "RESCHEDULED" && (
                              <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs">
                                Reagendada
                              </Badge>
                            )}
                          </div>
                          {task.dueDate && (
                            <p className="text-xs text-[#7A7E83] mt-1 flex items-center gap-1">
                              <CalendarDaysIcon className="h-3 w-3" />
                              Prazo: {formatDate(task.dueDate)}
                            </p>
                          )}
                          {task.taskAddress && (
                            <p className="text-sm text-[#7A7E83] truncate mt-1">
                              📍 {task.taskAddress.endereco}, {task.taskAddress.cidade}/{task.taskAddress.estado}
                            </p>
                          )}
                          {task.userAssigned && (
                            <p className="text-xs text-[#7A7E83] mt-1 flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              Responsável: {task.userAssigned.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    className="bg-[#2F80ED] text-white hover:bg-[#1E5CB8] rounded-full px-6"
                    onClick={addSelectedTasks}
                    disabled={selectedTaskIds.size === 0}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Adicionar à Rota
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#353A40] text-white hover:bg-[#353A40]/90 rounded-full px-6"
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
              <Card className="bg-white shadow-lg rounded-xl">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    Paradas Selecionadas ({fields.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#F5F6FA] border border-gray-200"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-[#2F80ED]/10 text-[#2F80ED] flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#353A40] text-sm font-medium truncate">
                              {field.name}
                            </p>
                            <p className="text-[#7A7E83] text-xs truncate">
                              📍 {field.address}, {field.city}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStop(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 rounded-full h-8 w-8 p-0"
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
          <TabsContent value="review" className="space-y-6 mt-6">
            <Card className="bg-white shadow-lg rounded-xl">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-[#353A40]">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  Confirmar Dados da Rota
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-[#F5F6FA] rounded-xl p-5 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#353A40] font-medium">Título:</span>
                    <span>{form.watch("title") || "Não informado"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#353A40] font-medium">Data Agendada:</span>
                    <span>
                      {form.watch("routeDate")
                        ? format(form.watch("routeDate")!, "dd/MM/yyyy", { locale: ptBR })
                        : "Não definida"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#353A40] font-medium">Total de Paradas:</span>
                    <Badge className="bg-[#2F80ED] text-white">
                      {fields.length} {fields.length === 1 ? "parada" : "paradas"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#353A40] font-medium">Otimização:</span>
                    <span>{form.watch("orderBy") === "DISTANCE" ? "Proximidade" : "Prioridade"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#353A40] font-medium">Responsável:</span>
                    <span>
                      {users.find((u) => u.id === form.watch("userAssignedId"))?.name || "Não atribuído"}
                    </span>
                  </div>
                </div>

                {fields.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-[#353A40] mb-3">Pontos de parada</h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#F5F6FA]">
                          <span className="w-6 h-6 rounded-full bg-[#2F80ED]/10 text-[#2F80ED] flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#353A40] text-sm font-medium truncate">
                              {field.name}
                            </p>
                            <p className="text-[#7A7E83] text-xs truncate">
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
                  className="w-full h-12 text-base font-semibold bg-[#2F80ED] hover:bg-[#1E5CB8] text-white transition-all shadow-md active:scale-[0.98] disabled:opacity-50 rounded-full"
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
                className="text-[#2F80ED] hover:text-[#1E5CB8]"
              >
                ← Voltar para seleção de tarefas
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
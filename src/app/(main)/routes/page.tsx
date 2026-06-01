/* eslint-disable prefer-const */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/routes/page.tsx
"use client";

import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRoutes } from "@/hooks/useRoutes";
import { cn } from "@/lib/utils";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangleIcon,
  CalendarIcon,
  FilterIcon,
  MoreHorizontalIcon,
  PlusIcon,
  UsersIcon,
  X,
  CheckCircle2,
  Loader2,
  ChevronDown,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  FuelIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Import do GenericTable e tipos
import { Column, GenericTable } from "@/components/generic-table";

// ─── Paleta ELO PRODUTIVO ──────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border border-blue-200",
  IN_PROGRESS: "bg-[#2F80ED]/10 text-[#2F80ED] border border-[#2F80ED]/20",
  FINISHED: "bg-green-50 text-green-700 border border-green-200",
  CANCELED: "bg-gray-100 text-gray-500 border border-gray-200",
};

const statusText: Record<string, string> = {
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em Andamento",
  FINISHED: "Finalizada",
  CANCELED: "Cancelada",
};

// Opções de status incluindo "Atrasadas"
const statusOptions = [
  { value: "all", label: "Todas" },
  { value: "SCHEDULED", label: "Agendadas" },
  { value: "IN_PROGRESS", label: "Em Andamento" },
  { value: "FINISHED", label: "Finalizadas" },
  { value: "OVERDUE", label: "Atrasadas" },
];

// Componente de Autocomplete
interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  emptyMessage?: string;
}

const Autocomplete = ({
  options,
  value,
  onChange,
  placeholder = "Selecionar...",
  label,
  icon,
  emptyMessage = "Nenhum resultado encontrado.",
}: AutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-medium text-[#7A7E83] flex items-center gap-1">
          {icon}
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal transition-all duration-200 hover:border-[#2F80ED]/50 bg-white border-[#CBD5E1]"
          >
            <div className="flex items-center gap-2 truncate">
              {icon && <span className="text-[#7A7E83]">{icon}</span>}
              <span className="truncate text-[#353A40]">{displayValue}</span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#7A7E83]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0 bg-white border border-[#E2E8F0] rounded-xl"
          align="start"
        >
          <div className="flex items-center border-b border-[#E2E8F0] px-3">
            <input
              placeholder="Buscar..."
              className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[#7A7E83] text-[#353A40]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-sm text-[#7A7E83]">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-[#F5F6FA] cursor-pointer text-[#353A40]",
                    value === option.value && "bg-[#F5F6FA]",
                  )}
                  onClick={() => {
                    onChange(option.value === value ? "all" : option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <CheckCircle2
                    className={cn(
                      "mr-2 h-4 w-4 text-[#2F80ED]",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

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

// Componente de toast customizado
const CustomToast = ({
  message,
  type = "success",
}: {
  message: string;
  type?: "success" | "error";
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 bg-white rounded-lg shadow-lg p-3 border-l-4",
        type === "success" ? "border-green-500" : "border-red-500",
      )}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      ) : (
        <AlertTriangleIcon className="h-5 w-5 text-red-500" />
      )}
      <span className="text-sm text-[#353A40]">{message}</span>
    </div>
  );
};

const ITEMS_PER_PAGE = 10;

export default function RoutesPage() {
  const router = useRouter();
  const { useGetAllRoutes, useDeleteRoute } = useRoutes();

  const { data: apiRoutes, isLoading, refetch } = useGetAllRoutes();
  const deleteRoute = useDeleteRoute();

  // Normalizar os dados da API para o formato esperado pelo componente
  const routes: Route[] = useMemo(() => {
    if (!apiRoutes) return [];
    return apiRoutes.map(
      (route: any): Route => ({
        ...route,
        routeDate: route.routeDate ?? null,
      }),
    );
  }, [apiRoutes]);

  // Estados de busca e filtros
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // VALORES TEMPORÁRIOS
  const [tempStatusFilter, setTempStatusFilter] = useState<string>("all");
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(
    undefined,
  );
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(undefined);
  const [tempUserAssignedFilter, setTempUserAssignedFilter] =
    useState<string>("all");

  // VALORES APLICADOS
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<string>("all");
  const [appliedStartDate, setAppliedStartDate] = useState<Date | undefined>(
    undefined,
  );
  const [appliedEndDate, setAppliedEndDate] = useState<Date | undefined>(
    undefined,
  );
  const [appliedUserAssignedFilter, setAppliedUserAssignedFilter] =
    useState<string>("all");

  const [showFilters, setShowFilters] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const calculateTotalIntervalTime = useCallback((route: any): number => {
    if (!route.tasks || route.tasks.length === 0) return 0;

    return route.tasks.reduce((total: number, task: any) => {
      const intervalValue = task.intervalTime || 0;
      return (
        total +
        (typeof intervalValue === "number"
          ? intervalValue
          : Number(intervalValue) || 0)
      );
    }, 0);
  }, []);

  const formatMinutes = useCallback((minutes: number): string => {
    if (!minutes || minutes === 0) return "-";

    const totalMinutes = Number(minutes);
    if (isNaN(totalMinutes) || totalMinutes === 0) return "-";

    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (mins > 0) return `${hours}h ${mins}min`;
      return `${hours}h`;
    }

    return `${totalMinutes}min`;
  }, []);

  const parseDurationToMinutes = useCallback((durationStr: string): number => {
    if (!durationStr || durationStr === "-") return 0;

    let totalMinutes = 0;
    const hoursMatch = durationStr.match(/(\d+)h/);
    if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
    const minutesMatch = durationStr.match(/(\d+)min/);
    if (minutesMatch) totalMinutes += parseInt(minutesMatch[1], 10);

    return totalMinutes;
  }, []);

  const calculateTotalDuration = useCallback(
    (route: any): string => {
      const totalIntervalTime = calculateTotalIntervalTime(route);
      const routeDurationMinutes = parseDurationToMinutes(
        route.formattedDuration || "0min",
      );
      const totalMinutes = routeDurationMinutes + totalIntervalTime;
      return formatMinutes(totalMinutes);
    },
    [calculateTotalIntervalTime, parseDurationToMinutes, formatMinutes],
  );

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedStatusFilter !== "all") count++;
    if (appliedStartDate) count++;
    if (appliedEndDate) count++;
    if (appliedUserAssignedFilter !== "all") count++;
    return count;
  }, [
    appliedStatusFilter,
    appliedStartDate,
    appliedEndDate,
    appliedUserAssignedFilter,
  ]);

  // Resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [
    appliedStatusFilter,
    appliedStartDate,
    appliedEndDate,
    appliedUserAssignedFilter,
  ]);

  // Função para obter data atual às 00:00:00
  const getTodayDate = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  // Função para obter data daqui a 7 dias às 23:59:59
  const getDatePlus7Days = useCallback(() => {
    const date = addDays(new Date(), 7);
    date.setHours(23, 59, 59, 999);
    return date;
  }, []);

  // Função para aplicar filtro com datas padrão
  const handleFilterButtonClick = useCallback(async () => {
    const today = getTodayDate();
    const sevenDaysLater = getDatePlus7Days();

    setTempStartDate(today);
    setTempEndDate(sevenDaysLater);
    setAppliedStartDate(today);
    setAppliedEndDate(sevenDaysLater);
    setShowFilters(true);

    setIsFiltering(true);
    await refetch();
    setIsFiltering(false);

    toast.custom(
      (t) => (
        <CustomToast
          message={`Filtro aplicado: ${format(today, "dd/MM/yyyy")} até ${format(sevenDaysLater, "dd/MM/yyyy")}`}
          type="success"
        />
      ),
      { duration: 3000 },
    );
  }, [getTodayDate, getDatePlus7Days, refetch]);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  // Lista de Responsaveis para autocomplete
  const driverOptions = useMemo(() => {
    if (!routes)
      return [
        { value: "all", label: "Todos" },
        { value: "none", label: "Não atribuído" },
      ];
    const driverMap = new Map();
    routes.forEach((route) => {
      if (route.userAssigned?.id && !driverMap.has(route.userAssigned.id)) {
        driverMap.set(route.userAssigned.id, route.userAssigned);
      }
    });
    const drivers = Array.from(driverMap.values());
    return [
      { value: "all", label: "Todos" },
      { value: "none", label: "Não atribuído" },
      ...drivers.map((driver) => ({ value: driver.id, label: driver.name })),
    ];
  }, [routes]);

  const handleClearFilters = () => {
    setTempStatusFilter("all");
    setTempStartDate(undefined);
    setTempEndDate(undefined);
    setTempUserAssignedFilter("all");

    setAppliedStatusFilter("all");
    setAppliedStartDate(undefined);
    setAppliedEndDate(undefined);
    setAppliedUserAssignedFilter("all");

    toast.custom(
      (t) => <CustomToast message="Filtros limpos" type="success" />,
      { duration: 1500 },
    );
  };

  const handleApplyFilters = async () => {
    if (isFiltering) return;

    setIsFiltering(true);

    setAppliedStatusFilter(tempStatusFilter);
    setAppliedStartDate(tempStartDate);
    setAppliedEndDate(tempEndDate);
    setAppliedUserAssignedFilter(tempUserAssignedFilter);

    try {
      await refetch();
      toast.custom(
        (t) => <CustomToast message="Filtros aplicados" type="success" />,
        { duration: 1500 },
      );
    } catch (error) {
      console.error("Erro ao aplicar filtros:", error);
      toast.custom(
        (t) => <CustomToast message="Erro ao aplicar filtros" type="error" />,
        { duration: 1500 },
      );
    } finally {
      setIsFiltering(false);
    }
  };

  const handleCloseFilters = useCallback(() => {
    if (!isFiltering) {
      setShowFilters(false);
    }
  }, [isFiltering]);

  const hasActiveFilters = useMemo(() => {
    return activeFiltersCount > 0;
  }, [activeFiltersCount]);

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];

    let filtered = routes.filter((route) => {
      let matchesStatus = true;

      if (appliedStatusFilter === "OVERDUE") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const routeDate = route.routeDate ? new Date(route.routeDate) : null;
        matchesStatus =
          routeDate !== null &&
          routeDate < today &&
          route.status !== "FINISHED";
      } else {
        matchesStatus =
          appliedStatusFilter === "all" || route.status === appliedStatusFilter;
      }

      let matchesDate = true;
      if (appliedStartDate && route.routeDate) {
        const routeDate = new Date(route.routeDate);
        const startOfDayDate = startOfDay(appliedStartDate);
        if (routeDate < startOfDayDate) matchesDate = false;
      }
      if (appliedEndDate && route.routeDate) {
        const routeDate = new Date(route.routeDate);
        const endOfDayDate = endOfDay(appliedEndDate);
        if (routeDate > endOfDayDate) matchesDate = false;
      }

      const matchesDriver =
        appliedUserAssignedFilter === "all" ||
        (appliedUserAssignedFilter === "none" && !route.userAssigned) ||
        route.userAssigned?.id === appliedUserAssignedFilter;

      return matchesStatus && matchesDate && matchesDriver;
    });

    return filtered;
  }, [
    routes,
    appliedStatusFilter,
    appliedStartDate,
    appliedEndDate,
    appliedUserAssignedFilter,
  ]);

  // Paginação
  const paginatedRoutes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredRoutes.slice(startIndex, endIndex);
  }, [filteredRoutes, currentPage]);

  const totalPages = Math.ceil(filteredRoutes.length / ITEMS_PER_PAGE);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await deleteRoute.mutateAsync(deleteId);
      setDeleteId(null);
      toast.custom((t) => (
        <CustomToast message="Rota excluída com sucesso" type="success" />
      ));
      refetch();
    } catch {
      toast.custom((t) => (
        <CustomToast message="Erro ao excluir rota" type="error" />
      ));
    } finally {
      setIsDeleting(false);
    }
  }, [deleteId, deleteRoute, refetch]);

  /* eslint-disable prefer-const */

  interface ApiRoute {
    id: string;
    title: string;
    status: string;
    routeDate?: string | null;
    stops: any[];
    formattedDistance: string;
    formattedDuration: string;
    formattedFuelConsumption?: string; // 🔥 NOVO: consumo formatado
    fuelConsumptionLitres?: number | null; // 🔥 NOVO: valor bruto
    userAssigned: { id: string; name: string } | null;
    description: string | null;
    createdAt: string;
    orderBy?: string;
    totalDistanceMeters?: number;
    totalDurationSeconds?: number;
  }

  // Tipo para o componente (com valores normalizados)
  interface Route {
    tasks: any;
    id: string;
    title: string;
    status: string;
    routeDate: string | null;
    stops: any[];
    formattedDistance: string;
    formattedDuration: string;
    formattedFuelConsumption?: string; // 🔥 NOVO
    fuelConsumptionLitres?: number | null; // 🔥 NOVO
    userAssigned: { id: string; name: string } | null;
    description: string | null;
    createdAt: string;
    orderBy?: string;
    totalDistanceMeters?: number;
    totalDurationSeconds?: number;
  }

  const getColumns = useCallback(
    (): Column<Route>[] => [
      {
        header: "Título",
        className: "font-semibold",
        cell: (route) => (
          <Link
            href={`/routes/${route.id}`}
            className="relative group/link hover:text-[#2F80ED] transition-colors duration-200 font-semibold text-[#353A40]"
            prefetch={true}
          >
            {route.title}
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#2F80ED] group-hover/link:w-full transition-all duration-300" />
          </Link>
        ),
      },
      {
        header: "Status",
        cell: (route) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const routeDate = route.routeDate ? new Date(route.routeDate) : null;
          const isOverdue =
            routeDate !== null &&
            routeDate < today &&
            route.status !== "FINISHED";

          if (isOverdue && route.status !== "FINISHED") {
            return (
              <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs font-medium shadow-none">
                Atrasada
              </Badge>
            );
          }

          return (
            <Badge
              className={`${statusColors[route.status]} text-xs font-medium shadow-none`}
            >
              {statusText[route.status]}
            </Badge>
          );
        },
      },
      {
        header: "Data agendada",
        cell: (route) => (
          <span className="text-[#7A7E83]">
            {route.routeDate
              ? format(new Date(route.routeDate), "dd/MM/yyyy", {
                  locale: ptBR,
                })
              : "-"}
          </span>
        ),
      },
      {
        header: "Paradas",
        className: "text-center",
        cell: (route) => (
          <span className="font-medium text-[#353A40] text-center block">
            {route.stops?.length || 0}
          </span>
        ),
      },
      {
        header: "Distância",
        cell: (route) => (
          <span className="text-[#353A40]">
            {route.formattedDistance || "-"}
          </span>
        ),
      },
      {
        header: "Combustível", // 🔥 NOVA COLUNA
        cell: (route) => {
          const fuel = route.formattedFuelConsumption;
          return (
            <div className="flex items-center gap-1.5">
              <FuelIcon className="h-3.5 w-3.5 text-[#2F80ED]" />
              <span className="text-[#353A40] font-medium">
                {fuel || "Não calculado"}
              </span>
            </div>
          );
        },
      },
      {
        header: "Duração",
        cell: (route) => (
          <span className="text-[#353A40] font-medium">
            {route.formattedDuration || "-"}
          </span>
        ),
      },
      {
        header: "Tempo de visita",
        cell: (route) => {
          const totalIntervalTime = calculateTotalIntervalTime(route);
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[#353A40] font-medium cursor-help">
                    {formatMinutes(totalIntervalTime)}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-[#353A40] text-white border-0">
                  <p className="text-sm">
                    Soma dos intervalos de todas as tarefas da rota
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        header: "Total",
        cell: (route) => {
          const stopsCount = route.stops?.length || 0;
          if (stopsCount <= 1) {
            return (
              <div className="flex items-center gap-1">
                <span className="text-[#7A7E83] text-sm">-</span>
              </div>
            );
          }
          const totalDuration = calculateTotalDuration(route);
          const totalIntervalTime = calculateTotalIntervalTime(route);
          const routeDuration = route.formattedDuration || "0min";
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 cursor-help">
                    <span className="text-[#353A40] font-semibold">
                      {totalDuration}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#353A40] text-white border-0">
                  <div className="space-y-1 text-sm p-1">
                    <p>🚗 Duração da rota: {routeDuration}</p>
                    <p>
                      ⏱️ Intervalo de tempo: {formatMinutes(totalIntervalTime)}
                    </p>
                    <div className="border-t border-gray-600 my-1"></div>
                    <p className="font-bold">
                      ✨ Total da rota: {totalDuration}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        header: "Responsável",
        cell: (route) => (
          <div className="flex items-center gap-1">
            <span className="text-[#353A40]">
              {route.userAssigned?.name || "Não atribuído"}
            </span>
          </div>
        ),
      },
      {
        header: "Descrição",
        className: "min-w-[200px]",
        cell: (route) =>
          route.description ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="truncate text-[#7A7E83] cursor-help max-w-[200px]">
                    {route.description.length > 50
                      ? `${route.description.substring(0, 50)}...`
                      : route.description}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#353A40] text-white">
                  <p className="max-w-xs">{route.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-[#7A7E83] text-sm">-</span>
          ),
      },
      {
        header: "Criado em",
        cell: (route) => (
          <span className="text-[#7A7E83] whitespace-nowrap">
            {route.createdAt
              ? format(new Date(route.createdAt), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })
              : "-"}
          </span>
        ),
      },
      {
        header: "Ações",
        className: "text-right",
        cell: (route) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-[#7A7E83] hover:text-[#2F80ED]"
              >
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-lg"
            >
              <DropdownMenuLabel className="text-[#7A7E83] text-xs">
                Ações
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => router.push(`/routes/${route.id}`)}
                className="cursor-pointer text-[#353A40] hover:bg-[#F5F6FA]"
              >
                <EyeIcon className="mr-2 h-4 w-4 text-[#2F80ED]" />
                Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/routes/${route.id}/edit`)}
                className="cursor-pointer text-[#353A40] hover:bg-[#F5F6FA]"
              >
                <PencilIcon className="mr-2 h-4 w-4 text-[#2F80ED]" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#E2E8F0]" />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer hover:bg-red-50"
                onClick={() => setDeleteId(route.id)}
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router, calculateTotalIntervalTime, calculateTotalDuration, formatMinutes],
  );

  const columns = useMemo(() => getColumns(), [getColumns]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-32 bg-[#E2E8F0] rounded" />
            <div className="h-64 bg-[#E2E8F0] rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F6FA] font-sans">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="px-4 md:px-8">
          <PageHeader title="Rotas" description="Gerencie as rotas do sistema.">
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <RippleButton
                      variant="outline"
                      onClick={handleFilterButtonClick}
                      className={cn(
                        "rounded-full h-10 px-4 gap-2 transition-all duration-200 border-[#CBD5E1] bg-white",
                        showFilters &&
                          "bg-[#2F80ED] text-white hover:bg-[#1E5CB8] border-none",
                      )}
                    >
                      <FilterIcon className="h-5 w-5" />
                      <span className="hidden sm:inline text-[#353A40]">
                        Filtrar
                      </span>
                      {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-[#2F80ED] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          {activeFiltersCount}
                        </span>
                      )}
                    </RippleButton>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#353A40] text-white">
                    <p>Aplicar filtro para rotas</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/routes/create" prefetch={true}>
                      <RippleButton className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white shadow-sm transition-all duration-200 rounded-full h-10 px-4 gap-2">
                        <PlusIcon className="h-5 w-5" />
                        <span className="hidden sm:inline">Criar</span>
                      </RippleButton>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#353A40] text-white">
                    <p>Criar nova rota</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </PageHeader>
        </div>
        {/* Painel de Filtros */}
        <div className="px-4 md:px-8">
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <Card className="border border-[#E2E8F0] shadow-sm rounded-xl overflow-hidden bg-white">
                  <CardContent className=" space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Autocomplete
                        options={statusOptions}
                        value={tempStatusFilter}
                        onChange={setTempStatusFilter}
                        label="Status"
                        icon={<AlertTriangleIcon className="h-3 w-3" />}
                        placeholder="Selecionar status..."
                        emptyMessage="Nenhum status encontrado."
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#353A40] flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3 text-[#7A7E83]" />
                        Rotas agendadas
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-[#7A7E83]">
                            Data inicial
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-white border-[#CBD5E1] text-[#353A40]"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-[#7A7E83]" />
                                {tempStartDate
                                  ? format(tempStartDate, "dd/MM/yyyy")
                                  : "Selecionar data inicial"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-white border border-[#E2E8F0] rounded-xl">
                              <Calendar
                                mode="single"
                                selected={tempStartDate}
                                onSelect={setTempStartDate}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium text-[#7A7E83]">
                            Data final
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-white border-[#CBD5E1] text-[#353A40]"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-[#7A7E83]" />
                                {tempEndDate
                                  ? format(tempEndDate, "dd/MM/yyyy")
                                  : "Selecionar data final"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-white border border-[#E2E8F0] rounded-xl">
                              <Calendar
                                mode="single"
                                selected={tempEndDate}
                                onSelect={setTempEndDate}
                                locale={ptBR}
                                disabled={(date) =>
                                  tempStartDate ? date < tempStartDate : false
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Autocomplete
                        options={driverOptions}
                        value={tempUserAssignedFilter}
                        onChange={setTempUserAssignedFilter}
                        label="Responsavel"
                        icon={<UsersIcon className="h-3 w-3" />}
                        placeholder="Selecionar Responsavel..."
                        emptyMessage="Nenhum Responsavel encontrado."
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearFilters}
                          className="text-[#7A7E83] hover:text-[#2F80ED] hover:bg-[#F5F6FA]"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Limpar filtros
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleApplyFilters}
                        disabled={isFiltering}
                        className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white"
                      >
                        {isFiltering ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Aplicando...
                          </>
                        ) : (
                          "Aplicar filtros"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Resultados encontrados */}
        {filteredRoutes.length > 0 && (
          <div className="px-4 md:px-8">
            <div className="text-right text-xs text-[#7A7E83]">
              {filteredRoutes.length} resultado
              {filteredRoutes.length !== 1 ? "s" : ""} encontrado
              {filteredRoutes.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {/* GenericTable - SEM padding lateral */}
        <GenericTable
          title="Listagem"
          data={paginatedRoutes}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="Nenhuma rota encontrada."
          pagination={{
            currentPage: currentPage,
            totalPages: totalPages,
            onPageChange: (page) => setCurrentPage(page),
            totalItems: filteredRoutes.length,
            itemsPerPage: ITEMS_PER_PAGE,
          }}
          className="!mx-0 !w-full rounded-none" // Remove bordas arredondadas também
        />

        {/* Dialog de exclusão */}
        <div className="px-4 md:px-8">
          <AlertDialog
            open={!!deleteId}
            onOpenChange={() => !isDeleting && setDeleteId(null)}
          >
            <AlertDialogContent className="bg-white border border-[#E2E8F0] rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[#353A40]">
                  Excluir Rota
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[#7A7E83]">
                  Esta ação removerá todos os dados da rota do sistema. Esta
                  ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isDeleting}
                  className="border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA]"
                >
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    "Confirmar Exclusão"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

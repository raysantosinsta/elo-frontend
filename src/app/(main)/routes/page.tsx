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
import { Checkbox } from "@/components/ui/checkbox";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { debounce } from "lodash";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ClockIcon,
  FilterIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RulerIcon,
  UsersIcon,
  X,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Import do GenericTable e tipos
import { Column, GenericTable } from "@/components/generic-table";

// ─── Tipagem da Rota (alinhada com o que a API retorna) ──────────────────────
interface ApiRoute {
  id: string;
  title: string;
  status: string;
  routeDate?: string | null;  // Pode ser string, null ou undefined
  stops: any[];
  formattedDistance: string;
  formattedDuration: string;
  userAssigned: { id: string; name: string } | null;
  description: string | null;
  createdAt: string;
  orderBy?: string;
  totalDistanceMeters?: number;
  totalDurationSeconds?: number;
}

// Tipo para o componente (com valores normalizados)
interface Route {
  id: string;
  title: string;
  status: string;
  routeDate: string | null;  // Normalizado para string | null
  stops: any[];
  formattedDistance: string;
  formattedDuration: string;
  userAssigned: { id: string; name: string } | null;
  description: string | null;
  createdAt: string;
  orderBy?: string;
  totalDistanceMeters?: number;
  totalDurationSeconds?: number;
}

// ─── Paleta alinhada ──────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border border-blue-200",
  IN_PROGRESS: "bg-[#D35400]/10 text-[#D35400] border border-[#D35400]/20",
  FINISHED: "bg-green-50 text-green-700 border border-green-200",
  CANCELED: "bg-gray-100 text-gray-500 border border-gray-200",
};

const statusText: Record<string, string> = {
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em Andamento",
  FINISHED: "Finalizada",
  CANCELED: "Cancelada",
};

// Opções para filtros de métricas
const stopOptions = [
  { value: "1-5", label: "1 a 5 paradas" },
  { value: "6-10", label: "6 a 10 paradas" },
  { value: "11-20", label: "11 a 20 paradas" },
  { value: "20+", label: "Mais de 20 paradas" },
];

const distanceOptions = [
  { value: "0-10", label: "Até 10 km" },
  { value: "10-50", label: "10 a 50 km" },
  { value: "50-100", label: "50 a 100 km" },
  { value: "100+", label: "Mais de 100 km" },
];

const durationOptions = [
  { value: "0-30", label: "Até 30 min" },
  { value: "30-60", label: "30 a 60 min" },
  { value: "60-120", label: "1 a 2 horas" },
  { value: "120+", label: "Mais de 2 horas" },
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

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-medium text-[#95A5A6] flex items-center gap-1">
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
            className="w-full justify-between font-normal transition-all duration-200 hover:border-[#D35400]/50"
          >
            <div className="flex items-center gap-2 truncate">
              {icon && <span className="text-[#95A5A6]">{icon}</span>}
              <span className="truncate">{displayValue}</span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <input
              placeholder="Buscar..."
              className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[#95A5A6]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-sm text-[#95A5A6]">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 cursor-pointer",
                    value === option.value && "bg-gray-50"
                  )}
                  onClick={() => {
                    onChange(option.value === value ? "all" : option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <CheckCircle2
                    className={cn(
                      "mr-2 h-4 w-4 text-[#D35400]",
                      value === option.value ? "opacity-100" : "opacity-0"
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
      <span className="text-sm text-gray-700">{message}</span>
    </div>
  );
};

const ITEMS_PER_PAGE = 5;

export default function RoutesPage() {
  const router = useRouter();
  const { useGetAllRoutes, useDeleteRoute } = useRoutes();

  const { data: apiRoutes, isLoading, refetch } = useGetAllRoutes();
  const deleteRoute = useDeleteRoute();

  // Normalizar os dados da API para o formato esperado pelo componente
  const routes: Route[] = useMemo(() => {
    if (!apiRoutes) return [];
    return apiRoutes.map((route: any): Route => ({
      ...route,
      routeDate: route.routeDate ?? null, // Converter undefined para null
    }));
  }, [apiRoutes]);

  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterFlashTrigger, setFilterFlashTrigger] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // VALORES TEMPORÁRIOS
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(undefined);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(undefined);
  const [tempCreatedStartDate, setTempCreatedStartDate] = useState<Date | undefined>(undefined);
  const [tempCreatedEndDate, setTempCreatedEndDate] = useState<Date | undefined>(undefined);
  const [tempUserAssignedFilter, setTempUserAssignedFilter] = useState<string>("all");
  const [tempOrderByFilter, setTempOrderByFilter] = useState<string>("all");
  const [tempStopRange, setTempStopRange] = useState<string>("all");
  const [tempDistanceRange, setTempDistanceRange] = useState<string>("all");
  const [tempDurationRange, setTempDurationRange] = useState<string>("all");
  const [tempIsOverdue, setTempIsOverdue] = useState<boolean>(false);
  const [tempIsUpcoming, setTempIsUpcoming] = useState<boolean>(false);

  // VALORES APLICADOS
  const [appliedStartDate, setAppliedStartDate] = useState<Date | undefined>(undefined);
  const [appliedEndDate, setAppliedEndDate] = useState<Date | undefined>(undefined);
  const [appliedCreatedStartDate, setAppliedCreatedStartDate] = useState<Date | undefined>(undefined);
  const [appliedCreatedEndDate, setAppliedCreatedEndDate] = useState<Date | undefined>(undefined);
  const [appliedUserAssignedFilter, setAppliedUserAssignedFilter] = useState<string>("all");
  const [appliedOrderByFilter, setAppliedOrderByFilter] = useState<string>("all");
  const [appliedStopRange, setAppliedStopRange] = useState<string>("all");
  const [appliedDistanceRange, setAppliedDistanceRange] = useState<string>("all");
  const [appliedDurationRange, setAppliedDurationRange] = useState<string>("all");
  const [appliedIsOverdue, setAppliedIsOverdue] = useState<boolean>(false);
  const [appliedIsUpcoming, setAppliedIsUpcoming] = useState<boolean>(false);

  const [showFilters, setShowFilters] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [shakeFilterButton, setShakeFilterButton] = useState(false);

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedStartDate) count++;
    if (appliedEndDate) count++;
    if (appliedCreatedStartDate) count++;
    if (appliedCreatedEndDate) count++;
    if (appliedUserAssignedFilter !== "all") count++;
    if (appliedOrderByFilter !== "all") count++;
    if (searchTerm !== "") count++;
    if (statusFilter !== "all") count++;
    if (appliedStopRange !== "all") count++;
    if (appliedDistanceRange !== "all") count++;
    if (appliedDurationRange !== "all") count++;
    if (appliedIsOverdue) count++;
    if (appliedIsUpcoming) count++;
    return count;
  }, [
    appliedStartDate, appliedEndDate, appliedCreatedStartDate, appliedCreatedEndDate,
    appliedUserAssignedFilter, appliedOrderByFilter, searchTerm, statusFilter,
    appliedStopRange, appliedDistanceRange, appliedDurationRange, appliedIsOverdue, appliedIsUpcoming
  ]);

  // Resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, appliedStartDate, appliedEndDate, appliedCreatedStartDate, 
      appliedCreatedEndDate, appliedUserAssignedFilter, appliedOrderByFilter, 
      appliedStopRange, appliedDistanceRange, appliedDurationRange, appliedIsOverdue, appliedIsUpcoming]);

  // Lista de Responsaveis para autocomplete
  const driverOptions = useMemo(() => {
    if (!routes) return [{ value: "all", label: "Todos" }, { value: "none", label: "Não atribuído" }];
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
      ...drivers.map((driver) => ({ value: driver.id, label: driver.name }))
    ];
  }, [routes]);

  // Opções para autocomplete
  const stopAutocompleteOptions = [{ value: "all", label: "Todas" }, ...stopOptions];
  const distanceAutocompleteOptions = [{ value: "all", label: "Todas" }, ...distanceOptions];
  const durationAutocompleteOptions = [{ value: "all", label: "Todas" }, ...durationOptions];

  // Debounce da busca
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
      setFilterFlashTrigger((prev) => prev + 1);
    }, 300),
    [],
  );

  const parseRange = (range: string, type: string) => {
    if (range === "all") return { min: undefined, max: undefined };

    switch (type) {
      case "stops":
        if (range === "1-5") return { min: 1, max: 5 };
        if (range === "6-10") return { min: 6, max: 10 };
        if (range === "11-20") return { min: 11, max: 20 };
        if (range === "20+") return { min: 21, max: undefined };
        break;
      case "distance":
        if (range === "0-10") return { min: 0, max: 10 };
        if (range === "10-50") return { min: 10, max: 50 };
        if (range === "50-100") return { min: 50, max: 100 };
        if (range === "100+") return { min: 100, max: undefined };
        break;
      case "duration":
        if (range === "0-30") return { min: 0, max: 30 };
        if (range === "30-60") return { min: 30, max: 60 };
        if (range === "60-120") return { min: 60, max: 120 };
        if (range === "120+") return { min: 120, max: undefined };
        break;
    }
    return { min: undefined, max: undefined };
  };

  const handleClearFilters = () => {
    setTempStartDate(undefined);
    setTempEndDate(undefined);
    setTempCreatedStartDate(undefined);
    setTempCreatedEndDate(undefined);
    setTempUserAssignedFilter("all");
    setTempOrderByFilter("all");
    setTempStopRange("all");
    setTempDistanceRange("all");
    setTempDurationRange("all");
    setTempIsOverdue(false);
    setTempIsUpcoming(false);

    setAppliedStartDate(undefined);
    setAppliedEndDate(undefined);
    setAppliedCreatedStartDate(undefined);
    setAppliedCreatedEndDate(undefined);
    setAppliedUserAssignedFilter("all");
    setAppliedOrderByFilter("all");
    setAppliedStopRange("all");
    setAppliedDistanceRange("all");
    setAppliedDurationRange("all");
    setAppliedIsOverdue(false);
    setAppliedIsUpcoming(false);

    setSearchTerm("");
    setStatusFilter("all");
    setFilterFlashTrigger((prev) => prev + 1);

    toast.custom(
      (t) => <CustomToast message="Filtros limpos" type="success" />,
      { duration: 1500 },
    );
  };

  const handleApplyFilters = async () => {
    setIsFiltering(true);

    setAppliedStartDate(tempStartDate);
    setAppliedEndDate(tempEndDate);
    setAppliedCreatedStartDate(tempCreatedStartDate);
    setAppliedCreatedEndDate(tempCreatedEndDate);
    setAppliedUserAssignedFilter(tempUserAssignedFilter);
    setAppliedOrderByFilter(tempOrderByFilter);
    setAppliedStopRange(tempStopRange);
    setAppliedDistanceRange(tempDistanceRange);
    setAppliedDurationRange(tempDurationRange);
    setAppliedIsOverdue(tempIsOverdue);
    setAppliedIsUpcoming(tempIsUpcoming);
    setFilterFlashTrigger((prev) => prev + 1);

    await refetch();
    setIsFiltering(false);
    toast.custom(
      (t) => <CustomToast message="Filtros aplicados" type="success" />,
      { duration: 1500 },
    );
  };

  const hasActiveFilters = useMemo(() => {
    return activeFiltersCount > 0;
  }, [activeFiltersCount]);

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];

    const stopLimits = parseRange(appliedStopRange, "stops");
    const distanceLimits = parseRange(appliedDistanceRange, "distance");
    const durationLimits = parseRange(appliedDurationRange, "duration");

    let filtered = routes.filter((route) => {
      const matchesSearch = route.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || route.status === statusFilter;

      let matchesDate = true;
      if (appliedStartDate && route.routeDate) {
        const routeDate = new Date(route.routeDate);
        if (routeDate < appliedStartDate) matchesDate = false;
      }
      if (appliedEndDate && route.routeDate) {
        const routeDate = new Date(route.routeDate);
        const endOfDay = new Date(appliedEndDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (routeDate > endOfDay) matchesDate = false;
      }

      let matchesCreatedDate = true;
      if (appliedCreatedStartDate && route.createdAt) {
        const createdDate = new Date(route.createdAt);
        if (createdDate < appliedCreatedStartDate) matchesCreatedDate = false;
      }
      if (appliedCreatedEndDate && route.createdAt) {
        const createdDate = new Date(route.createdAt);
        const endOfDay = new Date(appliedCreatedEndDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (createdDate > endOfDay) matchesCreatedDate = false;
      }

      const matchesDriver =
        appliedUserAssignedFilter === "all" ||
        (appliedUserAssignedFilter === "none" && !route.userAssigned) ||
        route.userAssigned?.id === appliedUserAssignedFilter;
      const matchesOrderBy =
        appliedOrderByFilter === "all" ||
        route.orderBy === appliedOrderByFilter;

      const stopsCount = route.stops?.length || 0;
      let matchesStops = true;
      if (stopLimits.min !== undefined && stopsCount < stopLimits.min)
        matchesStops = false;
      if (stopLimits.max !== undefined && stopsCount > stopLimits.max)
        matchesStops = false;

      const distanceKm = route.totalDistanceMeters
        ? route.totalDistanceMeters / 1000
        : 0;
      let matchesDistance = true;
      if (distanceLimits.min !== undefined && distanceKm < distanceLimits.min)
        matchesDistance = false;
      if (distanceLimits.max !== undefined && distanceKm > distanceLimits.max)
        matchesDistance = false;

      const durationMin = route.totalDurationSeconds
        ? route.totalDurationSeconds / 60
        : 0;
      let matchesDuration = true;
      if (durationLimits.min !== undefined && durationMin < durationLimits.min)
        matchesDuration = false;
      if (durationLimits.max !== undefined && durationMin > durationLimits.max)
        matchesDuration = false;

      let matchesOverdue = true;
      if (appliedIsOverdue) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const routeDate = route.routeDate ? new Date(route.routeDate) : null;
        matchesOverdue =
          routeDate !== null &&
          routeDate < today &&
          route.status !== "FINISHED";
      }

      let matchesUpcoming = true;
      if (appliedIsUpcoming) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);
        const routeDate = route.routeDate ? new Date(route.routeDate) : null;
        matchesUpcoming =
          routeDate !== null &&
          routeDate >= today &&
          routeDate <= nextWeek &&
          route.status !== "FINISHED";
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate &&
        matchesCreatedDate &&
        matchesDriver &&
        matchesOrderBy &&
        matchesStops &&
        matchesDistance &&
        matchesDuration &&
        matchesOverdue &&
        matchesUpcoming
      );
    });

    return filtered;
  }, [
    routes,
    searchTerm,
    statusFilter,
    appliedStartDate,
    appliedEndDate,
    appliedCreatedStartDate,
    appliedCreatedEndDate,
    appliedUserAssignedFilter,
    appliedOrderByFilter,
    appliedStopRange,
    appliedDistanceRange,
    appliedDurationRange,
    appliedIsOverdue,
    appliedIsUpcoming,
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
      setShakeFilterButton(true);
      setTimeout(() => setShakeFilterButton(false), 500);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteId, deleteRoute, refetch]);

  // Definição das colunas para o GenericTable
  const columns: Column<Route>[] = useMemo(() => [
    {
      header: "Título",
      className: "font-semibold",
      cell: (route) => (
        <Link
          href={`/routes/${route.id}`}
          className="relative group/link hover:text-[#D35400] transition-colors duration-200 font-semibold"
          prefetch={true}
        >
          {route.title}
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#D35400] group-hover/link:w-full transition-all duration-300" />
        </Link>
      ),
    },
    {
      header: "Status",
      cell: (route) => (
        <Badge className={`${statusColors[route.status]} text-xs font-medium shadow-none`}>
          {statusText[route.status]}
        </Badge>
      ),
    },
    {
      header: "Data agendada",
      cell: (route) => (
        <span className="text-[#95A5A6]">
          {route.routeDate ? format(new Date(route.routeDate), "dd/MM/yyyy", { locale: ptBR }) : "-"}
        </span>
      ),
    },
    {
      header: "Paradas",
      className: "text-center",
      cell: (route) => (
        <span className="font-medium text-[#2C3E50] text-center block">
          {route.stops?.length || 0}
        </span>
      ),
    },
    {
      header: "Distância",
      cell: (route) => <span className="text-[#2C3E50]">{route.formattedDistance || "-"}</span>,
    },
    {
      header: "Duração",
      cell: (route) => <span className="text-[#2C3E50]">{route.formattedDuration || "-"}</span>,
    },
    {
      header: "Responsavel",
      cell: (route) => (
        <div className="flex items-center gap-1">
          <UsersIcon className="h-3 w-3 text-[#95A5A6]" />
          <span className="text-[#2C3E50]">{route.userAssigned?.name || "Não atribuído"}</span>
        </div>
      ),
    },
    {
      header: "Descrição",
      className: "min-w-[200px]",
      cell: (route) => (
        route.description ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="truncate text-[#95A5A6] cursor-help max-w-[200px]">
                  {route.description.length > 50
                    ? `${route.description.substring(0, 50)}...`
                    : route.description}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{route.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-[#95A5A6] text-sm">-</span>
        )
      ),
    },
    {
      header: "Criado em",
      cell: (route) => (
        <span className="text-[#95A5A6] whitespace-nowrap">
          {route.createdAt
            ? format(new Date(route.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
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
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-[#95A5A6] text-xs">Ações</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push(`/routes/${route.id}`)}>
              <EyeIcon className="mr-2 h-4 w-4 text-[#95A5A6]" />
              Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/routes/${route.id}/edit`)}>
              <PencilIcon className="mr-2 h-4 w-4 text-[#95A5A6]" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600" 
              onClick={() => setDeleteId(route.id)}
            >
              <Trash2Icon className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-32 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F0E6] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="Rotas"
          description="Gerencie as rotas do sistema."
          searchValue={searchTerm}
          onSearchChange={(value) => debouncedSetSearch(value)}
          searchPlaceholder="Pesquisar por titulo..."
        >
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <RippleButton
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "rounded-full h-10 px-4 gap-2 transition-all duration-200",
                      showFilters && "bg-[#D35400] text-white hover:bg-[#D35400]/90"
                    )}
                  >
                    <FilterIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Filtrar</span>
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#D35400] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </RippleButton>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filtrar rotas</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/routes/create" prefetch={true}>
                    <RippleButton className="bg-[#D35400] hover:bg-[#D35400]/90 text-white shadow-md transition-all duration-200 rounded-full h-10 px-4 gap-2">
                      <PlusIcon className="h-5 w-5" />
                      <span className="hidden sm:inline">Criar</span>
                    </RippleButton>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Criar nova rota</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </PageHeader>

        {/* Painel de Filtros */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <Card className="border-0 shadow-md rounded-xl overflow-hidden">
                <CardContent className="p-4 space-y-4">
                  {/* Linha 1: Filtros de Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[#95A5A6] flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" /> Data Inicial da Rota
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {tempStartDate ? format(tempStartDate, "dd/MM/yyyy") : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={tempStartDate} onSelect={setTempStartDate} locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[#95A5A6] flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" /> Data Final da Rota
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {tempEndDate ? format(tempEndDate, "dd/MM/yyyy") : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={tempEndDate} onSelect={setTempEndDate} locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[#95A5A6] flex items-center gap-1">
                        <CalendarDaysIcon className="h-3 w-3" /> Criado a partir de
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {tempCreatedStartDate ? format(tempCreatedStartDate, "dd/MM/yyyy") : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={tempCreatedStartDate} onSelect={setTempCreatedStartDate} locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[#95A5A6] flex items-center gap-1">
                        <CalendarDaysIcon className="h-3 w-3" /> Criado até
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {tempCreatedEndDate ? format(tempCreatedEndDate, "dd/MM/yyyy") : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={tempCreatedEndDate} onSelect={setTempCreatedEndDate} locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Linha 2: Filtros de Usuário e Ordenação */}
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

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[#95A5A6] flex items-center gap-1">
                        <AlertTriangleIcon className="h-3 w-3" /> Status 
                      </label>
                      <div className="flex gap-3 pt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="overdue"
                            checked={tempIsOverdue}
                            onCheckedChange={(checked) => {
                              setTempIsOverdue(checked === true);
                              if (checked) setTempIsUpcoming(false);
                            }}
                          />
                          <label htmlFor="overdue" className="text-sm cursor-pointer">Atrasadas</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="upcoming"
                            checked={tempIsUpcoming}
                            onCheckedChange={(checked) => {
                              setTempIsUpcoming(checked === true);
                              if (checked) setTempIsOverdue(false);
                            }}
                          />
                          <label htmlFor="upcoming" className="text-sm cursor-pointer">Próximas 7 dias</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Linha 3: Filtros de Métricas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                    <Autocomplete
                      options={stopAutocompleteOptions}
                      value={tempStopRange}
                      onChange={setTempStopRange}
                      label="Quantidade de Paradas"
                      icon={<MapPinIcon className="h-3 w-3" />}
                      placeholder="Selecionar faixa de paradas..."
                      emptyMessage="Nenhuma faixa encontrada."
                    />

                    <Autocomplete
                      options={distanceAutocompleteOptions}
                      value={tempDistanceRange}
                      onChange={setTempDistanceRange}
                      label="Distância Total"
                      icon={<RulerIcon className="h-3 w-3" />}
                      placeholder="Selecionar distância..."
                      emptyMessage="Nenhuma faixa encontrada."
                    />

                    <Autocomplete
                      options={durationAutocompleteOptions}
                      value={tempDurationRange}
                      onChange={setTempDurationRange}
                      label="Duração Estimada"
                      icon={<ClockIcon className="h-3 w-3" />}
                      placeholder="Selecionar duração..."
                      emptyMessage="Nenhuma faixa encontrada."
                    />
                  </div>

                  {/* Botões de ação dos filtros */}
                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Limpar filtros
                      </Button>
                    )}
                    <Button size="sm" onClick={handleApplyFilters} disabled={isFiltering}>
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

        {/* Filtro de status em Tabs */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 bg-white border border-gray-200 rounded-lg p-1">
            {(["all", "SCHEDULED", "IN_PROGRESS", "FINISHED"] as const).map((val) => (
              <Button
                key={val}
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter(val)}
                className={cn(
                  "px-4 h-8 text-[#95A5A6] hover:text-[#2C3E50] transition-all duration-200 rounded-md",
                  statusFilter === val && "bg-[#D35400] text-white hover:bg-[#D35400]/90"
                )}
              >
                {{ all: "Todas", SCHEDULED: "Agendadas", IN_PROGRESS: "Em Andamento", FINISHED: "Finalizadas" }[val]}
              </Button>
            ))}
          </div>

          {searchTerm && filteredRoutes.length > 0 && (
            <div className="text-right text-xs text-[#95A5A6]">
              {filteredRoutes.length} resultado{filteredRoutes.length !== 1 ? "s" : ""} encontrado{filteredRoutes.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* GenericTable com paginação */}
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
            itemsPerPage: ITEMS_PER_PAGE
          }}
        />

        {/* Dialog de exclusão */}
        <AlertDialog open={!!deleteId} onOpenChange={() => !isDeleting && setDeleteId(null)}>
          <AlertDialogContent className="bg-white border border-gray-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#2C3E50]">Excluir Rota</AlertDialogTitle>
              <AlertDialogDescription className="text-[#95A5A6]">
                Esta ação removerá todos os dados da rota do sistema. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
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
  );
}
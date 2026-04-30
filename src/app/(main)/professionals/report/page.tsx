/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Services & Contexts
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";

// UI Components
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  ActivityIcon,
  BriefcaseIcon,
  Edit,
  Eye,
  FilterIcon,
  Loader2,
  MoreVertical,
  Power,
  Save,
  Trash2,
  UserPlus,
  UsersIcon,
  XCircle,
} from "lucide-react";

// Charts
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// --- CONSTANTS & TYPES ---

const COLORS = {
  grafite: "#2D3436",
  bege: "#F5F0E6",
  terracota: "#D35400",
  areia: "#95A5A6",
  azulPetroleo: "#2C3E50",
  white: "#FFFFFF",
  success: "#27AE60",
  danger: "#C0392B",
  warning: "#F39C12",
};

interface ProfessionalMetrics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  pendingTasks: number;
  inProgressTasks: number;
}

interface ProfessionalReportItem {
  id: string;
  name: string;
  email: string;
  contact?: string;
  role: string;
  professionalRole: string | null;
  status: "ACTIVE" | "INACTIVE";
  company?: {
    id: string;
    name: string;
  };
  companyRole?: {
    id: string;
    name: string;
    level: number;
    description?: string;
  };
  metrics: ProfessionalMetrics;
}

interface ReportSummary {
  totalProfessionals: number;
  activeProfessionals: number;
  inactiveProfessionals: number;
  companies: string[];
}

// --- FUNÇÕES HELPER PARA RENDERIZAÇÃO SEGURA ---

/**
 * Converte qualquer valor para string de forma segura
 * Evita erro "Objects are not valid as a React child"
 */
const safeString = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    // Se for um objeto, tenta pegar a propriedade 'name'
    if (value.name && typeof value.name === "string") return value.name;
    if (value.label && typeof value.label === "string") return value.label;
    // Se não tiver name, retorna vazio
    console.warn("Objeto não pôde ser convertido para string:", value);
    return "";
  }
  return String(value);
};

/**
 * Obtém o nome da empresa de forma segura
 */
const getCompanyName = (company?: { id: string; name: string }): string => {
  if (!company) return "";
  if (typeof company === "object") return company.name || "";
  return safeString(company);
};

/**
 * Obtém o nome do cargo na empresa de forma segura
 */
const getCompanyRoleName = (
  companyRole?: { id: string; name: string } | string | null,
): string => {
  if (!companyRole) return "";
  if (typeof companyRole === "object") return companyRole.name || "";
  return safeString(companyRole);
};

// --- SUB-COMPONENTS ---

const SummaryCard = ({
  title,
  value,
  icon: Icon,
  subtext,
  colorClass,
}: {
  title: string;
  value: number | string;
  icon: any;
  subtext: string;
  colorClass: string;
}) => (
  <Card
    className="border-l-4 shadow-sm hover:shadow-md transition-all duration-300 bg-white"
    style={{ borderLeftColor: colorClass }}
  >
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold tracking-wide text-[#95A5A6] uppercase">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div className="text-3xl font-bold text-[#2D3436]">
          {safeString(value)}
        </div>
        <Icon className="h-6 w-6 opacity-80" style={{ color: colorClass }} />
      </div>
      <p className="text-xs text-[#95A5A6] mt-2 font-medium">{subtext}</p>
    </CardContent>
  </Card>
);

// --- MAIN PAGE COMPONENT ---

export default function ProfessionalsReportPage() {
  const { user } = useAuth();
  const router = useRouter();

  // State Data
  const [professionals, setProfessionals] = useState<ProfessionalReportItem[]>(
    [],
  );
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ProfessionalReportItem | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // --- API HANDLERS ---

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const { data } = await api.get("/reports/professionals/", { params });

      setProfessionals(data.professionals);
      setSummary(data.summary);
    } catch (error) {
      console.error("Erro crítico ao buscar dados:", error);
      toast.error("Não foi possível carregar o relatório.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate]);

  // --- ACTIONS HANDLERS ---

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/users/${id}/status/${newStatus}`);

      toast.success(
        `Usuário ${newStatus === "ACTIVE" ? "ativado" : "desativado"} com sucesso!`,
      );

      setProfessionals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
      );
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Erro ao alterar status.";
      toast.error(msg);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir este usuário? Essa ação não pode ser desfeita.",
      )
    )
      return;

    try {
      await api.delete(`/users/${id}`);

      toast.success("Usuário excluído com sucesso.");
      setProfessionals((prev) => prev.filter((p) => p.id !== id));
    } catch (error: any) {
      const msg = error.response?.data?.message || "Erro ao excluir usuário.";
      toast.error(msg);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setTimeout(() => {
      alert("Exportação de profissionais em desenvolvimento.");
      setExporting(false);
    }, 1000);
  };

  // --- EDIT MODAL HANDLERS ---

  const openEditModal = (user: ProfessionalReportItem) => {
    setEditingUser({ ...user });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSaving(true);

    try {
      const payload = {
        name: editingUser.name,
        email: editingUser.email,
        contact: editingUser.contact,
        professionalRole: editingUser.professionalRole,
      };

      await api.patch(`/users/${editingUser.id}`, payload);

      toast.success("Usuário atualizado com sucesso!");

      setProfessionals((prev) =>
        prev.map((p) => (p.id === editingUser.id ? { ...p, ...payload } : p)),
      );
      setIsEditModalOpen(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Erro ao atualizar usuário";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // --- EFFECTS ---

  useEffect(() => {
    if (user) fetchReport();
  }, [fetchReport, user]);

  // --- RENDER HELPERS ---

  const clearFilters = () => {
    setStatusFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const chartData = professionals
    .map((p) => ({
      name: p.name.split(" ")[0],
      Completas: p.metrics.completedTasks,
      Pendentes: p.metrics.pendingTasks,
      Eficiencia: p.metrics.completionRate,
    }))
    .sort((a, b) => b.Completas - a.Completas)
    .slice(0, 10);

  const pieData = summary
    ? [
        { name: "Ativos", value: summary.activeProfessionals },
        { name: "Inativos", value: summary.inactiveProfessionals },
      ]
    : [];

  if (loading && !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F0E6]">
        <Loader2 className="h-12 w-12 animate-spin text-[#D35400]" />
        <p className="mt-4 text-[#2D3436] font-medium">Carregando dados...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F0E6] p-4 md:p-8 font-sans">
      <div className="container mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-[#95A5A6]/30 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#2D3436]">
              Performance da Equipe
            </h1>
            <p className="text-[#95A5A6] mt-1 text-lg">
              Gerenciamento e análise de profissionais.
            </p>
          </div>
          {/* <div className="flex gap-2">
            <Button
              onClick={() => router.push("/signup")}
              className="bg-[#2C3E50] hover:bg-[#34495E] text-white shadow-md transition-all active:scale-95"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Profissional
            </Button>
          </div> */}
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <SummaryCard
            title="Total Profissionais"
            value={summary?.totalProfessionals || 0}
            icon={UsersIcon}
            subtext="Cadastrados no sistema"
            colorClass={COLORS.azulPetroleo}
          />
          <SummaryCard
            title="Ativos Agora"
            value={summary?.activeProfessionals || 0}
            icon={ActivityIcon}
            subtext="Disponíveis para tarefas"
            colorClass={COLORS.success}
          />
          <SummaryCard
            title="Total Tarefas"
            value={professionals.reduce(
              (acc, curr) => acc + curr.metrics.totalTasks,
              0,
            )}
            icon={BriefcaseIcon}
            subtext="Distribuídas entre a equipe"
            colorClass={COLORS.grafite}
          />
        </section>

        {/* FILTERS */}
        <Card className="mb-8 border-[#95A5A6]/40 bg-white/80 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-4 border-b border-[#95A5A6]/20">
            <CardTitle className="flex items-center gap-2 text-base text-[#2C3E50]">
              <FilterIcon className="h-4 w-4" /> Filtrar Lista
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-2 w-full md:w-1/3">
                <Label className="text-[#2D3436]">Status do Usuário</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-[#95A5A6] focus:ring-[#D35400]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ACTIVE">Ativos</SelectItem>
                    <SelectItem value="INACTIVE">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pb-0.5">
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-[#95A5A6] hover:text-[#D35400] hover:bg-[#F5F0E6]"
                >
                  <XCircle className="mr-2 h-4 w-4" /> Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABS CONTENT */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="bg-white border border-[#95A5A6]/30 p-1">
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-[#2C3E50] data-[state=active]:text-white"
            >
              Lista de Profissionais
            </TabsTrigger>
            <TabsTrigger
              value="charts"
              className="data-[state=active]:bg-[#2C3E50] data-[state=active]:text-white"
            >
              Gráficos Comparativos
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="list"
            className="animate-in fade-in-50 duration-500"
          >
            <Card className="border-[#95A5A6]/20 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-[#FAFAFA] border-b border-[#95A5A6]/20">
                <CardTitle className="text-[#2D3436]">
                  Profissionais Cadastrados
                </CardTitle>
                <CardDescription>
                  Gerencie o status e visualize o desempenho da equipe.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[300px] text-[#2C3E50] font-bold">
                        Profissional
                      </TableHead>
                      <TableHead className="text-[#2C3E50] font-bold">
                        Cargo
                      </TableHead>
                      <TableHead className="text-[#2C3E50] font-bold text-center">
                        Tarefas
                      </TableHead>
                      <TableHead className="text-[#2C3E50] font-bold text-center">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-[#2C3E50] font-bold">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professionals.length > 0 ? (
                      professionals.map((prof) => (
                        <TableRow
                          key={prof.id}
                          className="hover:bg-[#F5F0E6]/50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-[#95A5A6]">
                                <AvatarFallback className="bg-[#2C3E50] text-white">
                                  {safeString(
                                    prof.name.substring(0, 2).toUpperCase(),
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-[#2D3436]">
                                  {safeString(prof.name)}
                                </div>
                                <div className="text-xs text-[#95A5A6]">
                                  {safeString(prof.email)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium text-[#2D3436]">
                              {safeString(
                                prof.professionalRole || "Não informado",
                              )}
                            </div>
                            {/* Exibe o nome da empresa com segurança */}
                            {user?.role === "MASTER" && prof.company && (
                              <div className="text-xs text-[#95A5A6] mt-1">
                                Empresa: {getCompanyName(prof.company)}
                              </div>
                            )}
                            {/* Exibe o cargo na empresa com segurança */}
                            {prof.companyRole && (
                              <div className="text-xs text-[#95A5A6] mt-1">
                                Cargo: {getCompanyRoleName(prof.companyRole)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <Badge
                                variant="secondary"
                                className="bg-[#2C3E50] text-white hover:bg-[#34495E]"
                              >
                                Total: {safeString(prof.metrics.totalTasks)}
                              </Badge>
                              <span className="text-[10px] text-gray-500 mt-1">
                                {safeString(prof.metrics.completedTasks)}{" "}
                                concluídas
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge
                              className={cn(
                                "shadow-none",
                                prof.status === "ACTIVE"
                                  ? "bg-[#27AE60] hover:bg-[#219150]"
                                  : "bg-[#95A5A6] hover:bg-[#7F8C8D]",
                              )}
                            >
                              {prof.status === "ACTIVE" ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => openEditModal(prof)}
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/professionals/report/${prof.id}`,
                                    )
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" /> Ver Relatório
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggleStatus(prof.id, prof.status)
                                  }
                                >
                                  <Power className="mr-2 h-4 w-4" />
                                  {prof.status === "ACTIVE"
                                    ? "Desativar"
                                    : "Ativar"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteUser(prof.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-12 text-[#95A5A6]"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <UsersIcon className="h-10 w-10 mb-2 opacity-20" />
                            <p>Nenhum profissional encontrado.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GRAPHICS TAB */}
          <TabsContent
            value="charts"
            className="animate-in fade-in-50 duration-500"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-[#95A5A6]/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#2D3436]">
                    Top 10 - Volume de Tarefas
                  </CardTitle>
                  <CardDescription>
                    Comparativo de tarefas completas vs pendentes
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e0e0e0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#95A5A6" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#95A5A6" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#F5F0E6" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="Completas"
                        fill={COLORS.success}
                        stackId="a"
                        radius={[0, 0, 4, 4]}
                        barSize={30}
                      />
                      <Bar
                        dataKey="Pendentes"
                        fill={COLORS.azulPetroleo}
                        stackId="a"
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-[#95A5A6]/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#2D3436]">
                    Status da Equipe
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Ativos"
                                ? COLORS.success
                                : COLORS.areia
                            }
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* --- MODAL DE EDIÇÃO --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
            <DialogDescription>
              Faça alterações no perfil do usuário aqui. Clique em salvar quando
              terminar.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={safeString(editingUser.name)}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={safeString(editingUser.email)}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact">Telefone</Label>
                <Input
                  id="contact"
                  value={safeString(editingUser.contact || "")}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, contact: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profRole">Cargo Profissional</Label>
                <Input
                  id="profRole"
                  value={safeString(editingUser.professionalRole || "")}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      professionalRole: e.target.value,
                    })
                  }
                  placeholder="Ex: Costureira, Modelista"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="bg-[#D35400] hover:bg-[#A04000] text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

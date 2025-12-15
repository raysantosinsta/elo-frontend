'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  AlertCircle,
  CalendarIcon,
  FilterIcon,
  Layers,
  LayoutDashboard,
  Search,
  Shirt
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

// --- Interfaces ---
interface FlowReportItem {
  id: string;
  title: string;
  orderNumber: string;
  productRef: string;
  quantity: number;
  priority: number;
  dueDate: string | null;
  stageName: string;
  stageColor: string | null;
  flowName: string;
  assignedTo?: string;
}

interface FlowReportSummary {
  totalCards: number;
  totalPieces: number; // Soma das quantidades
  overdueItems: number;
  byStage: Array<{ name: string; count: number; pieces: number; color: string }>;
  byPriority: Array<{ name: string; value: number }>;
}

interface FlowOption {
  id: string;
  name: string;
}

export default function ProductionReportsPage() {
  const { user, authFetch } = useAuth();

  const [items, setItems] = useState<FlowReportItem[]>([]);
  const [summary, setSummary] = useState<FlowReportSummary | null>(null);
  const [flows, setFlows] = useState<FlowOption[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Filtros
  const [flowId, setFlowId] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Carregar lista de fluxos ao iniciar
  useEffect(() => {
    if (user) {
      fetchFlows();
    }
  }, [user]);

  // Carregar dados do relatório quando filtros mudam
  useEffect(() => {
    if (user) {
      const delayDebounceFn = setTimeout(() => {
        fetchReport();
      }, 500); // Debounce para o search
      return () => clearTimeout(delayDebounceFn);
    }
  }, [user, flowId, search, startDate, endDate]);

  const fetchFlows = async () => {
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_NESTJS_API_URL}/reports-flow/flows-list`);
      if (res.ok) setFlows(await res.json());
    } catch (error) {
      console.error('Erro ao buscar fluxos:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (flowId && flowId !== "all") params.append("flowId", flowId);
      if (search) params.append("search", search);
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());

      const url = `${process.env.NEXT_PUBLIC_NESTJS_API_URL}/reports-flow/analytics?${params.toString()}`;
      const response = await authFetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Erro ao buscar analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 4) return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Alta</Badge>;
    if (priority === 3) return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">Média</Badge>;
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Baixa</Badge>;
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Esteira de Produção</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhamento de lotes, quantidades e gargalos no fluxo produtivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={() => fetchReport()}>
             Atualizar Dados
           </Button>
        </div>
      </div>

      {/* Cards de KPIs (Key Performance Indicators) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lotes/Ordens Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{summary?.totalCards || 0}</div>
              <LayoutDashboard className="h-5 w-5 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Peças</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-indigo-700">
                {summary?.totalPieces.toLocaleString('pt-BR') || 0}
              </div>
              <Shirt className="h-5 w-5 text-indigo-500 opacity-70" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Soma das quantidades</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fluxos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{flows.length}</div>
              <Layers className="h-5 w-5 text-orange-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atrasados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-600">{summary?.overdueItems || 0}</div>
              <AlertCircle className="h-5 w-5 text-red-500 opacity-70" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lotes fora do prazo</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-muted/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* Filtro de Texto */}
            <div className="md:col-span-4 space-y-2">
              <Label>Buscar Referência, OP ou Título</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Ex: REF-2024, OP-001..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filtro de Esteira/Fluxo */}
            <div className="md:col-span-3 space-y-2">
              <Label>Fluxo de Produção</Label>
              <Select value={flowId} onValueChange={setFlowId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fluxo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fluxos</SelectItem>
                  {flows.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

             <div className="md:col-span-1">
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setFlowId('all');
                    setSearch('');
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                >
                  Limpar
                </Button>
             </div>

          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Gráfica</TabsTrigger>
          <TabsTrigger value="list">Lista Detalhada</TabsTrigger>
        </TabsList>

        {/* TAB 1: GRÁFICOS */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Gráfico: Volume por Etapa */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Volume de Produção por Etapa</CardTitle>
                <CardDescription>Comparativo entre quantidade de ordens e quantidade total de peças.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.byStage || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip 
                      formatter={(value, name) => [
                        value, 
                        name === 'count' ? 'Ordens (Cards)' : 'Peças (Qtd)'
                      ]}
                      contentStyle={{ borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" name="Ordens" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar yAxisId="right" dataKey="pieces" name="Total Peças" fill="#82ca9d" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* TAB 2: TABELA */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Ordens de Produção</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Atualizado: Removido "OP" do título */}
                    <TableHead>Referência</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Fluxo</TableHead>
                    <TableHead>Etapa Atual</TableHead>
                    <TableHead className="text-right">Qtd. Peças</TableHead>
                    <TableHead className="text-center">Prioridade</TableHead>
                    {/* Removido: TableHead Prazo */}
                    <TableHead>Resp.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      {/* Ajustado colSpan para 7 (era 8) */}
                      <TableCell colSpan={7} className="text-center h-24">Carregando dados...</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      {/* Ajustado colSpan para 7 (era 8) */}
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Nenhum item encontrado.</TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-semibold text-gray-800">{item.productRef}</div>
                          {/* Removido: item.orderNumber */}
                        </TableCell>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.flowName}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                             <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: item.stageColor || '#ccc'}} 
                             />
                             {item.stageName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                        <TableCell className="text-center">
                          {getPriorityBadge(item.priority)}
                        </TableCell>
                        {/* Removido: TableCell do Prazo */}
                        <TableCell>
                           {item.assignedTo ? (
                             <Avatar className="h-6 w-6" title={item.assignedTo}>
                               <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                 {item.assignedTo.substring(0,2).toUpperCase()}
                               </AvatarFallback>
                             </Avatar>
                           ) : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
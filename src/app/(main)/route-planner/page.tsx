/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, Clock, Loader2, MapPin, Navigation, Timer, Car, Filter, X, User, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

// --- TIPAGEM ---
interface TaskAddress {
  id: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento?: string;
  latitude: number;
  longitude: number;
}

interface Professional {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority?: number;
  columnId: string;
  taskAddress: TaskAddress;
  assignedTo?: Professional;
  userAssigned?: Professional; // Ajuste para compatibilidade com backend
}

interface RouteStats {
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  formattedDuration: string;
  formattedDistance: string;
}

// --- FUNÇÕES AUXILIARES DE FORMATAÇÃO (Frontend Fallback) ---
const formatDuration = (seconds: number): string => {
  if (!seconds) return "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
};

const formatDistance = (meters: number): string => {
  if (!meters) return "0 km";
  return `${(meters / 1000).toFixed(1)} km`;
};

export default function RoutePlannerPage() {
  const router = useRouter();
  const { user } = useAuth();

  // --- ESTADOS ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // --- ESTADOS DOS FILTROS ---
  const [users, setUsers] = useState<Professional[]>([]);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("all");

  // Controle de Ordenação
  const [orderBy, setOrderBy] = useState<'DISTANCE' | 'PRIORITY'>('DISTANCE');

  // Resumo da Rota (Tempo e Distância)
  const [routeSummary, setRouteSummary] = useState<RouteStats | null>(null);

  // 1. Carregar Lista de Usuários
  useEffect(() => {
    async function fetchUsers() {
      if (!user?.company?.id) return;
      try {
        const { data } = await api.get(`/users/company/${user.company.id}`);
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar usuários", err);
      }
    }
    fetchUsers();
  }, [user?.company?.id]);

  // 2. Fetch das Tarefas Disponíveis
  const fetchAvailableTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};

      if (filterStartDate) params.startDate = new Date(filterStartDate).toISOString();
      if (filterEndDate) params.endDate = new Date(filterEndDate).toISOString();
      if (filterAssignedTo && filterAssignedTo !== "all") {
        params.assignedToId = filterAssignedTo;
      }

      const { data } = await api.get('/routes/available-tasks', { params });
      
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setTasks([]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar tarefas', error);
    } finally {
      setLoading(false);
    }
  }, [filterStartDate, filterEndDate, filterAssignedTo]);

  useEffect(() => {
    fetchAvailableTasks();
  }, [fetchAvailableTasks]);

  // 3. Pegar Geolocalização
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('Erro GPS', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // 4. Toggle de Seleção
  const toggleSelection = (id: string) => {
    setRouteSummary(null);
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 5. Calcular Rota (CORRIGIDO)
  const handleCalculateRoute = async () => {
    if (!userLocation) {
      alert('Aguardando localização do GPS...');
      return;
    }

    try {
      setIsOptimizing(true);
      setRouteSummary(null);
      
      const payload = {
        taskIds: selectedTaskIds,
        driverLatitude: userLocation.lat,
        driverLongitude: userLocation.lng,
        orderBy: orderBy,
      };

      // Usando instância da API configurada (axios)
      const { data } = await api.post('/routes/calculate-best-path', payload);

      console.log("Rota Calculada (Debug):", data); 

      // Recupera lista de rota
      const optimizedRoute = data.route || []; 
      
      // Recupera estatísticas (com fallback se o backend não mandar formatado)
      const statsFromApi = data.stats || {};
      const rawDuration = Number(statsFromApi.totalDurationSeconds || 0);
      const rawDistance = Number(statsFromApi.totalDistanceMeters || 0);

      const finalStats: RouteStats = {
          totalDurationSeconds: rawDuration,
          totalDistanceMeters: rawDistance,
          formattedDuration: statsFromApi.formattedDuration || formatDuration(rawDuration),
          formattedDistance: statsFromApi.formattedDistance || formatDistance(rawDistance)
      };

      // Mapeia para formato do Driver (garantindo responsável)
      const routeForDriver = optimizedRoute.map((t: Task) => ({
        id: t.id,
        title: t.title,
        lat: Number(t.taskAddress.latitude),
        lng: Number(t.taskAddress.longitude),
        endereco: `${t.taskAddress.endereco}, ${t.taskAddress.numero}`,
        columnId: t.columnId,
        taskAddress: t.taskAddress,
        userAssigned: t.userAssigned || t.assignedTo // Fallback para ambas as props
      }));

      // Salva no LocalStorage
      localStorage.setItem('rotaAtiva', JSON.stringify(routeForDriver));
      localStorage.removeItem('rotaIndex');
      
      if (finalStats.totalDurationSeconds) {
          localStorage.setItem('rotaTotalDuration', String(finalStats.totalDurationSeconds));
      }

      // IMPORTANTE: Atualiza o estado para exibir o banner azul
      setRouteSummary(finalStats);

    } catch (error: any) {
      console.error(error);
      alert('Erro ao gerar rota. Verifique se os endereços possuem coordenadas válidas.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // 6. Iniciar Navegação
  const startNavigation = () => {
    localStorage.setItem('rotaStartTime', new Date().toISOString());
    router.push('/driver');
  };

  const getPriorityLabel = (p?: number) => {
    if (p === 1) return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">ALTA</span>;
    if (p === 2) return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">MÉDIA</span>;
    return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">BAIXA</span>;
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Planejador de Rotas</h1>
          <p className="text-slate-500">Selecione as visitas e calcule o melhor trajeto.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-end sm:items-center">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => { setOrderBy('DISTANCE'); setRouteSummary(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                orderBy === 'DISTANCE'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Navigation size={16} /> Proximidade
            </button>
            <button
              onClick={() => { setOrderBy('PRIORITY'); setRouteSummary(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                orderBy === 'PRIORITY'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Clock size={16} /> Prioridade
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
            
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 mr-2">
                <Filter size={18} />
                Filtros:
            </div>

            {/* Filtro Data Inicial */}
            <div className="flex flex-col gap-1 w-full md:w-auto">
                <label className="text-[10px] uppercase font-bold text-slate-400">Data Inicial</label>
                <div className="relative">
                    <input 
                        type="date" 
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full md:w-40 pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Calendar size={14} className="absolute left-2.5 top-3 text-slate-400" />
                </div>
            </div>

            {/* Filtro Data Final */}
            <div className="flex flex-col gap-1 w-full md:w-auto">
                <label className="text-[10px] uppercase font-bold text-slate-400">Data Final</label>
                <div className="relative">
                    <input 
                        type="date" 
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full md:w-40 pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Calendar size={14} className="absolute left-2.5 top-3 text-slate-400" />
                </div>
            </div>

            {/* Filtro Responsável */}
            <div className="flex flex-col gap-1 w-full md:w-auto min-w-[200px]">
                <label className="text-[10px] uppercase font-bold text-slate-400">Responsável</label>
                <div className="relative">
                    <select
                        value={filterAssignedTo}
                        onChange={(e) => setFilterAssignedTo(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todos os responsáveis</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                    <User size={14} className="absolute left-2.5 top-3 text-slate-400" />
                </div>
            </div>

            {/* Botão Limpar Filtros */}
            {(filterStartDate || filterEndDate || filterAssignedTo !== "all") && (
                <button
                    onClick={() => {
                        setFilterStartDate("");
                        setFilterEndDate("");
                        setFilterAssignedTo("all");
                    }}
                    className="mb-0.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                >
                    <X size={16} /> Limpar
                </button>
            )}
        </div>
      </div>

      {/* RESUMO DA ROTA GERADA */}
      {routeSummary && (
        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl animate-in fade-in slide-in-from-top-4 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full">
                    <Timer size={32} className="text-white" />
                </div>
                <div>
                    <h3 className="text-indigo-100 text-sm font-semibold uppercase tracking-wider mb-1">Tempo Total Estimado</h3>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-extrabold tracking-tight">{routeSummary.formattedDuration}</span>
                        <span className="text-lg text-indigo-200 font-medium">({routeSummary.formattedDistance})</span>
                    </div>
                </div>
            </div>

            <button
                onClick={startNavigation}
                className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
            >
                <Car size={20} /> INICIAR NAVEGAÇÃO
            </button>
        </div>
      )}

      {/* BOTÃO DE CALCULAR (só aparece se não tiver rota gerada) */}
      {!routeSummary && (
        <div className="flex justify-end">
            <button
                onClick={handleCalculateRoute}
                disabled={selectedTaskIds.length < 1 || !userLocation || isOptimizing}
                className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold shadow-md transition-all w-full md:w-auto ${
                selectedTaskIds.length > 0
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
            >
                {isOptimizing ? <Loader2 className="animate-spin" /> : <Activity size={20} />}
                {isOptimizing ? "Calculando Rota..." : "Visualizar tempo"}
            </button>
        </div>
      )}

      {/* TABELA DE TAREFAS */}
      <div className="border rounded-xl shadow-sm bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 w-12 text-center">#</th>
              <th className="p-4 font-medium text-slate-700">Tarefa</th>
              <th className="p-4 font-medium text-slate-700">Endereço</th>
              <th className="p-4 font-medium text-slate-700 hidden sm:table-cell">Bairro/Cidade</th>
              <th className="p-4 font-medium text-slate-700 w-24 text-center">Prioridade</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="animate-spin" />
                        Carregando tarefas...
                    </div>
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  Nenhuma tarefa encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                    selectedTaskIds.includes(task.id) ? 'bg-blue-50/60' : ''
                  }`}
                  onClick={() => toggleSelection(task.id)}
                >
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(task.id)}
                      readOnly
                      className="w-4 h-4 rounded border-gray-300 pointer-events-none text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-4 font-medium">
                    <div className="text-slate-900">{task.title}</div>
                    {task.description && (
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.description}</div>
                    )}
                    {task.userAssigned && (
                        <div className="text-[10px] text-indigo-600 flex items-center gap-1 mt-1">
                            <User size={10} /> {task.userAssigned.name}
                        </div>
                    )}
                  </td>
                  <td className="p-4 text-slate-600">
                    <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="line-clamp-1">
                        {task.taskAddress?.endereco}, {task.taskAddress?.numero}
                        </span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 hidden sm:table-cell">
                    {task.taskAddress?.bairro} - {task.taskAddress?.cidade}
                  </td>
                  <td className="p-4 text-center">
                    {getPriorityLabel(task.priority)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
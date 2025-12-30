/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { api } from '@/services/api';
import { Activity, Clock, Loader2, MapPin, Navigation, Timer, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority?: number;
  columnId: string;
  taskAddress: TaskAddress;
}

interface RouteStats {
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  formattedDuration: string;
  formattedDistance: string;
}

export default function RoutePlannerPage() {
  const router = useRouter();

  // --- ESTADOS ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Controle de Ordenação
  const [orderBy, setOrderBy] = useState<'DISTANCE' | 'PRIORITY'>('DISTANCE');

  // NOVO: Resumo da Rota (Tempo e Distância)
  const [routeSummary, setRouteSummary] = useState<RouteStats | null>(null);

  // 1. Fetch das Tarefas Disponíveis
  useEffect(() => {
    async function fetchAvailableTasks() {
      try {
        const { data } = await api.get('/routes/available-tasks');
        if (Array.isArray(data)) {
          setTasks(data);
        } else {
          setTasks([]);
        }
      } catch (error: any) {
        console.error('Erro ao buscar tarefas', error);
        const message = error.response?.data?.message || 'Erro ao buscar tarefas';
        alert(message);
      } finally {
        setLoading(false);
      }
    }
    fetchAvailableTasks();
  }, [router]);

  // 2. Pegar Geolocalização
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('Erro GPS', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // 3. Toggle de Seleção (Checkbox)
  const toggleSelection = (id: string) => {
    setRouteSummary(null);
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 4. Calcular Rota (Comunicação com Backend)
  const handleCalculateRoute = async () => {
    if (!userLocation) {
      alert('Aguardando localização do GPS...');
      return;
    }

    try {
      setIsOptimizing(true);
      setRouteSummary(null);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const payload = {
        taskIds: selectedTaskIds,
        driverLatitude: userLocation.lat,
        driverLongitude: userLocation.lng,
        orderBy: orderBy,
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/routes/calculate-best-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Erro ao calcular rota');

      const data = await response.json();
      
      const optimizedRoute = data.route || []; 
      const stats = data.stats;

      const routeForDriver = optimizedRoute.map((t: Task) => ({
        id: t.id,
        title: t.title,
        lat: t.taskAddress.latitude,
        lng: t.taskAddress.longitude,
        endereco: `${t.taskAddress.endereco}, ${t.taskAddress.numero}`,
        columnId: t.columnId,
        taskAddress: t.taskAddress,
      }));

      // Salva no LocalStorage
      localStorage.setItem('rotaAtiva', JSON.stringify(routeForDriver));
      localStorage.removeItem('rotaIndex');

      // --- ATUALIZAÇÃO IMPORTANTE ---
      // Salva a duração total prevista para usar no cronômetro do Driver
      if (stats && stats.totalDurationSeconds) {
          localStorage.setItem('rotaTotalDuration', String(stats.totalDurationSeconds));
      }

      if (stats) {
        setRouteSummary(stats);
      } else {
        startNavigation(); // Se não tem stats, vai direto e inicia o timer lá
      }

    } catch (error) {
      console.error(error);
      alert('Erro ao gerar rota no servidor.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // 5. Iniciar Navegação
  const startNavigation = () => {
    // --- ATUALIZAÇÃO IMPORTANTE ---
    // Marca o momento exato do início da rota para o cálculo regressivo
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
                  Nenhuma tarefa pendente com endereço cadastrado.
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
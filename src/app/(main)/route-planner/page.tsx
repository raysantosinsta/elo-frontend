/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { api } from '@/services/api';
import { Activity, Clock, Loader2, MapPin, Navigation } from 'lucide-react';
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
    priority?: number; // Adicionado para exibir na tabela se quiser
    columnId: string; // IMPORTANTE: Adicionado para salvar na rota
    taskAddress: TaskAddress;
}

export default function RoutePlannerPage() {
    const router = useRouter();

    // --- ESTADOS ---
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    
    // Novo estado para controlar o critério de ordenação
    const [orderBy, setOrderBy] = useState<'DISTANCE' | 'PRIORITY'>('DISTANCE');

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
                console.error("Erro ao buscar tarefas", error);
                const message = error.response?.data?.message || "Erro ao buscar tarefas";
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
                (err) => console.error("Erro GPS", err)
            );
        }
    }, []);

    // 3. Toggle de Seleção (Checkbox)
    const toggleSelection = (id: string) => {
        setSelectedTaskIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // 4. Calcular Rota (Action Principal)
    const handleStartRoute = async () => {
        if (!userLocation) {
            alert("Aguardando localização do GPS...");
            return;
        }

        try {
            setIsOptimizing(true);
            const token = localStorage.getItem('accessToken');

            if (!token) {
                alert("Sessão inválida. Faça login novamente.");
                router.push('/login');
                return;
            }

            // Payload com o novo campo 'orderBy'
            const payload = {
                taskIds: selectedTaskIds,
                driverLatitude: userLocation.lat,
                driverLongitude: userLocation.lng,
                orderBy: orderBy // 'DISTANCE' ou 'PRIORITY'
            };

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            
            const response = await fetch(`${apiUrl}/routes/calculate-best-path`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401) {
                alert("Sessão expirada.");
                router.push('/login');
                return;
            }

            if (!response.ok) throw new Error('Erro ao calcular rota');

            const optimizedRoute = await response.json();

            // Mapeia para o formato simplificado que o DriverPage espera,
            // MAS preservando columnId e taskAddress completo
            const routeForDriver = optimizedRoute.map((t: Task) => ({
                id: t.id,
                title: t.title,
                lat: t.taskAddress.latitude,
                lng: t.taskAddress.longitude,
                endereco: `${t.taskAddress.endereco}, ${t.taskAddress.numero}`,
                // Dados cruciais para a criação de nova tarefa no destino
                columnId: t.columnId,
                taskAddress: t.taskAddress
            }));

            localStorage.setItem('rotaAtiva', JSON.stringify(routeForDriver));
            localStorage.removeItem('rotaIndex'); // Reseta o índice
            router.push('/driver');

        } catch (error) {
            console.error(error);
            alert("Erro ao gerar rota no servidor.");
        } finally {
            setIsOptimizing(false);
        }
    };

    // Helper para exibir prioridade na tabela
    const getPriorityLabel = (p?: number) => {
        if (p === 1) return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">ALTA</span>;
        if (p === 2) return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">MÉDIA</span>;
        return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">BAIXA</span>;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            
            {/* HEADER COM CONTROLES */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Planejador de Rotas</h1>
                    <p className="text-slate-500">Defina a ordem e inicie o trajeto.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    
                    {/* BOTÕES DE ORDENAÇÃO */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setOrderBy('DISTANCE')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                orderBy === 'DISTANCE' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Navigation size={16} /> Proximidade
                        </button>
                        <button
                            onClick={() => setOrderBy('PRIORITY')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                orderBy === 'PRIORITY' 
                                    ? 'bg-white text-orange-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Clock size={16} /> Prioridade
                        </button>
                    </div>

                    {/* BOTÃO GERAR ROTA */}
                    <button
                        onClick={handleStartRoute}
                        disabled={selectedTaskIds.length < 1 || !userLocation || isOptimizing}
                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold shadow-lg transition-all ${
                            selectedTaskIds.length > 0
                                ? orderBy === 'DISTANCE' 
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {isOptimizing ? <Loader2 className="animate-spin" /> : <Activity size={20} />}
                        {selectedTaskIds.length > 0 ? "Iniciar Rota" : "Selecione..."}
                    </button>
                </div>
            </div>

            {/* TABELA DE TAREFAS */}
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4 w-12 text-center">#</th>
                            <th className="p-4 font-medium text-slate-700">Tarefa</th>
                            <th className="p-4 font-medium text-slate-700">Endereço</th>
                            <th className="p-4 font-medium text-slate-700">Bairro/Cidade</th>
                            <th className="p-4 font-medium text-slate-700 w-24 text-center">Prioridade</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center">Carregando tarefas disponíveis...</td></tr>
                        ) : tasks.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma tarefa pendente com endereço.</td></tr>
                        ) : (
                            tasks.map((task) => (
                                <tr
                                    key={task.id}
                                    className={`hover:bg-slate-50 cursor-pointer ${selectedTaskIds.includes(task.id) ? 'bg-blue-50' : ''}`}
                                    onClick={() => toggleSelection(task.id)}
                                >
                                    <td className="p-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedTaskIds.includes(task.id)}
                                            readOnly
                                            className="w-4 h-4 rounded border-gray-300 pointer-events-none"
                                        />
                                    </td>
                                    <td className="p-4 font-medium">
                                        {task.title}
                                        <div className="text-xs text-slate-500 line-clamp-1">{task.description}</div>
                                    </td>
                                    <td className="p-4 flex items-center gap-2 text-slate-600">
                                        <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                                        <span className="line-clamp-1">
                                            {task.taskAddress?.endereco}, {task.taskAddress?.numero}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600">
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
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { api } from '@/services/api';
import { Loader2, MapPin, Navigation } from 'lucide-react';
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
    columnId: string; // IMPORTANTE: Adicionado para salvar na rota
    taskAddress: TaskAddress; 
}

export default function RoutePlannerPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

    const router = useRouter();

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

    // 3. Toggle de Seleção
    const toggleSelection = (id: string) => {
        setSelectedTaskIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // 4. Calcular Rota
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

            const payload = {
                taskIds: selectedTaskIds,
                driverLatitude: userLocation.lat,
                driverLongitude: userLocation.lng
            };

            // Ajuste a URL se necessário (localhost vs produção)
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

            // --- CORREÇÃO PRINCIPAL AQUI ---
            // Salvamos o columnId e o taskAddress completo para o DriverPage usar
            const routeForDriver = optimizedRoute.map((t: Task) => ({
                id: t.id,
                title: t.title,
                lat: t.taskAddress.latitude,
                lng: t.taskAddress.longitude,
                endereco: `${t.taskAddress.endereco}, ${t.taskAddress.numero}`,
                // DADOS EXTRAS IMPORTANTES:
                columnId: t.columnId,
                taskAddress: t.taskAddress
            }));

            localStorage.setItem('rotaAtiva', JSON.stringify(routeForDriver));
            localStorage.removeItem('rotaIndex'); // Reseta o índice para começar da primeira
            router.push('/driver');

        } catch (error) {
            console.error(error);
            alert("Erro ao gerar rota no servidor.");
        } finally {
            setIsOptimizing(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Planejador de Rotas</h1>
                    <p className="text-slate-500">Selecione as tarefas. O servidor calculará o melhor trajeto.</p>
                </div>

                <button
                    onClick={handleStartRoute}
                    disabled={selectedTaskIds.length < 1 || !userLocation || isOptimizing}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg transition-all ${selectedTaskIds.length > 0
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    {isOptimizing ? <Loader2 className="animate-spin" /> : <Navigation size={20} />}
                    {selectedTaskIds.length > 0 ? "Gerar Rota Otimizada" : "Selecione Tarefas"}
                </button>
            </div>

            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4 w-12 text-center">#</th>
                            <th className="p-4 font-medium text-slate-700">Tarefa</th>
                            <th className="p-4 font-medium text-slate-700">Endereço</th>
                            <th className="p-4 font-medium text-slate-700">Bairro/Cidade</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center">Carregando tarefas disponíveis...</td></tr>
                        ) : tasks.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhuma tarefa pendente com endereço.</td></tr>
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
                                        <div className="text-xs text-slate-500">{task.description}</div>
                                    </td>
                                    <td className="p-4 flex items-center gap-2 text-slate-600">
                                        <MapPin size={16} />
                                        {task.taskAddress?.endereco}, {task.taskAddress?.numero}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {task.taskAddress?.bairro} - {task.taskAddress?.cidade}
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
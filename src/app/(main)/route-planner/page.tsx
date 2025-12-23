/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Loader2, MapPin, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// --- TIPAGEM (Espelhando o seu Prisma/Backend) ---
interface TaskAddress {
    id: string;
    endereco: string;
    numero: string;
    bairro: string;
    cidade: string;
    latitude: number;
    longitude: number;
}

interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    taskAddress: TaskAddress; // No seu service 'available-tasks', o address já vem garantido
}

export default function RoutePlannerPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false); // Loading específico do botão
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    
    // Localização do Usuário (Motorista)
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

    const router = useRouter();

    // 1. Fetch das Tarefas Disponíveis (Usando seu novo Controller)
    useEffect(() => {
        async function fetchAvailableTasks() {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) return router.push('/login');

                // CHAMA O SEU ENDPOINT: GET /routes/available-tasks
                const response = await fetch('http://localhost:3000/routes/available-tasks', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 401) return router.push('/login');

                const data = await response.json();
                
                // O seu service retorna direto o array: return this.prisma.task.findMany(...)
                if (Array.isArray(data)) {
                    setTasks(data);
                } else {
                    setTasks([]);
                }

            } catch (error) {
                console.error("Erro ao buscar tarefas", error);
            } finally {
                setLoading(false);
            }
        }

        fetchAvailableTasks();
    }, [router]);

    // 2. Pegar Geolocalização (Necessário para o ponto de partida do backend)
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

    // 4. A LÓGICA AGORA É NO BACKEND (POST /routes/calculate-best-path)
const handleStartRoute = async () => {
    if (!userLocation) {
        alert("Aguardando localização do GPS...");
        return;
    }

    try {
        setIsOptimizing(true);
        
        // --- CORREÇÃO FEITA AQUI ---
        // Agora buscamos 'accessToken' (o nome correto)
        const token = localStorage.getItem('accessToken'); 
        // ---------------------------

        if (!token) {
            alert("Sessão inválida. Faça login novamente.");
            router.push('/login');
            return;
        }

        // Monta o DTO que o seu controller espera (OptimizeRouteDto)
        const payload = {
            taskIds: selectedTaskIds,
            driverLatitude: userLocation.lat,
            driverLongitude: userLocation.lng
        };

        const response = await fetch('http://localhost:3000/routes/calculate-best-path', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Agora o token vai cheio!
            },
            body: JSON.stringify(payload)
        });

        if (response.status === 401) {
            alert("Sessão expirada.");
            router.push('/login');
            return;
        }

        if (!response.ok) throw new Error('Erro ao calcular rota');

        // O Backend devolve o array de tarefas JÁ ORDENADO
        const optimizedRoute = await response.json();

        // Transformamos para o formato simples que a página do motorista espera
        const routeForDriver = optimizedRoute.map((t: Task) => ({
            id: t.id,
            title: t.title,
            lat: t.taskAddress.latitude,
            lng: t.taskAddress.longitude,
            endereco: `${t.taskAddress.endereco}, ${t.taskAddress.numero}`
        }));

        // Salva e Redireciona
        localStorage.setItem('rotaAtiva', JSON.stringify(routeForDriver));
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
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg transition-all ${
                        selectedTaskIds.length > 0 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {isOptimizing ? <Loader2 className="animate-spin" /> : <Navigation size={20} />}
                    {selectedTaskIds.length > 0 ? "Gerar Rota Otimizada" : "Selecione Tarefas"}
                </button>
            </div>

            {/* Tabela */}
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
                                        {task.taskAddress.endereco}, {task.taskAddress.numero}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {task.taskAddress.bairro} - {task.taskAddress.cidade}
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
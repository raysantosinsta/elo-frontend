'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

const DriverMap = dynamic(() => import('@/components/DriverMap'), {
    ssr: false,
    loading: () => <div className="h-screen w-full flex items-center justify-center bg-slate-100">Carregando GPS...</div>
});

interface RoutePoint {
    id: string;
    title: string;
    lat: number;
    lng: number;
    endereco: string;
}

export default function DriverPage() {
    const router = useRouter();
    const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'COMPLETED' | 'FAILED'>('COMPLETED');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        const storedRoute = localStorage.getItem('rotaAtiva');
        const savedIndex = localStorage.getItem('rotaIndex');
        if (storedRoute) {
            setRoutePoints(JSON.parse(storedRoute));
            if (savedIndex) setCurrentStopIndex(Number(savedIndex));
        } else {
            router.push('/');
        }
    }, [router]);

    useEffect(() => {
        if (!navigator.geolocation) return;
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
            (err) => console.error(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
    }, []);

    const handleOpenModal = (type: 'COMPLETED' | 'FAILED') => {
        setActionType(type);
        setComment('');
        setIsModalOpen(true);
    };

    const confirmFinalization = async () => {
        if (!comment && actionType === 'FAILED') {
            alert("Motivo é obrigatório em caso de falha.");
            return;
        }

        setIsSubmitting(true);
        const task = routePoints[currentStopIndex];
        const token = localStorage.getItem('accessToken');

        try {
            // O Backend já faz o reagendamento automático baseado no status
            const response = await fetch(`http://localhost:3000/routes/tasks/${task.id}/finalize`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: actionType,
                    finalComment: comment || (actionType === 'COMPLETED' ? 'Entrega realizada' : 'Não entregue')
                })
            });

            if (!response.ok) throw new Error("Erro na API");

            // Lógica de Avanço
            const nextIndex = currentStopIndex + 1;
            if (nextIndex >= routePoints.length) {
                alert("Rota Finalizada!");
                localStorage.removeItem('rotaAtiva');
                localStorage.removeItem('rotaIndex');
                router.push('/');
            } else {
                setCurrentStopIndex(nextIndex);
                localStorage.setItem('rotaIndex', String(nextIndex));
                setIsModalOpen(false);
            }
        } catch (error) {
            alert("Erro ao finalizar. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentTask = routePoints[currentStopIndex];
    if (!currentTask) return null;

    return (
        <div className="relative h-screen w-full flex flex-col bg-slate-100 overflow-hidden">
            
            {/* Header com Info da Tarefa Atual */}
            <div className="absolute top-4 left-4 right-4 z-[500] pointer-events-none">
                <div className="bg-white/95 backdrop-blur shadow-lg rounded-2xl p-4 border border-slate-200 pointer-events-auto">
                    <div className="flex justify-between items-start mb-2">
                        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                            <ArrowLeft size={20} />
                        </button>
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                            Parada {currentStopIndex + 1}/{routePoints.length}
                        </span>
                    </div>
                    <h2 className="font-bold text-lg text-slate-800 leading-tight">{currentTask.title}</h2>
                    <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm">
                        <MapPin size={14} className="text-blue-500" />
                        <span className="truncate">{currentTask.endereco}</span>
                    </div>
                </div>
            </div>

            {/* Mapa Interno */}
            <div className="flex-1 z-0">
                <DriverMap 
                    route={routePoints} 
                    myLocation={currentPosition}
                    currentStopIndex={currentStopIndex}
                />
            </div>

            {/* Footer de Ações */}
            <div className="z-[500] bg-white p-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] border-t border-slate-100">
                <h3 className="text-center text-slate-400 text-xs font-semibold uppercase mb-4 tracking-wider">
                    Ações da Visita
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => handleOpenModal('FAILED')}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 active:scale-95 transition-all"
                    >
                        <AlertTriangle size={24} className="mb-1" />
                        <span className="font-bold">Problema</span>
                    </button>
                    
                    <button 
                        onClick={() => handleOpenModal('COMPLETED')}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 active:scale-95 transition-all"
                    >
                        <CheckCircle size={24} className="mb-1" />
                        <span className="font-bold">Concluir</span>
                    </button>
                </div>
            </div>

            {/* Modal de Finalização */}
            {isModalOpen && (
                <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
                        <div className="text-center mb-4">
                            <h3 className={`text-xl font-bold ${actionType === 'COMPLETED' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {actionType === 'COMPLETED' ? 'Confirmar Sucesso' : 'Relatar Problema'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                {actionType === 'COMPLETED' 
                                    ? 'A tarefa será reagendada para daqui a 30 dias.' 
                                    : 'A tarefa será reagendada para amanhã.'}
                            </p>
                        </div>

                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Observação Final
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                            placeholder={actionType === 'COMPLETED' ? "Ex: Entregue na portaria..." : "Ex: Cliente ausente..."}
                        />

                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">
                                Voltar
                            </button>
                            <button 
                                onClick={confirmFinalization}
                                disabled={isSubmitting}
                                className={`flex-1 py-3 text-white font-bold rounded-xl flex justify-center items-center gap-2
                                    ${actionType === 'COMPLETED' ? 'bg-emerald-600' : 'bg-red-600'}
                                `}
                            >
                                {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
'use client';

import { useRoutes } from '@/hooks/useRoutes';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  FileText,
  Loader2,
  MapPin,
  Navigation,
  Play
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Importação dinâmica do mapa
const RouteMap = dynamic(() => import('@/components/DriverMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 flex-col gap-2">
      <Loader2 className="animate-spin text-blue-600" size={32} />
      <span className="text-slate-500 font-medium">Carregando Mapa...</span>
    </div>
  ),
});

export default function DriverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = searchParams.get('routeId');
  
  const { useGetRouteById, useMarkStopVisited, useUpdateRoute } = useRoutes();
  const { data: route, isLoading: isLoadingRoute, refetch } = useGetRouteById(routeId || '');
  const markStopVisited = useMarkStopVisited();
  const updateRoute = useUpdateRoute();
  
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [visitedStops, setVisitedStops] = useState<string[]>([]);
  const [isGPSActive, setIsGPSActive] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'COMPLETED' | 'FAILED'>('COMPLETED');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  
  const watchIdRef = useRef<number | null>(null);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  // Carregar estado salvo do localStorage
  useEffect(() => {
    if (routeId) {
      const savedIndex = localStorage.getItem(`driver_route_${routeId}_index`);
      const savedVisited = localStorage.getItem(`driver_route_${routeId}_visited`);
      
      if (savedIndex) setCurrentStopIndex(parseInt(savedIndex));
      if (savedVisited) setVisitedStops(JSON.parse(savedVisited));
    }
  }, [routeId]);

  // Salvar estado no localStorage
  useEffect(() => {
    if (routeId && route) {
      localStorage.setItem(`driver_route_${routeId}_index`, String(currentStopIndex));
      localStorage.setItem(`driver_route_${routeId}_visited`, JSON.stringify(visitedStops));
    }
  }, [routeId, currentStopIndex, visitedStops, route]);

  // Monitorar GPS
  useEffect(() => {
    if (!navigator.geolocation || !isGPSActive) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn('GPS Init Error:', err)
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error('GPS Error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isGPSActive]);

  const currentStop = route?.stops[currentStopIndex];
  const totalStops = route?.stops.length || 0;
  const completedStops = visitedStops.length;
  const isFinished = completedStops === totalStops && totalStops > 0;

  // Verificar chegada ao destino
  useEffect(() => {
    if (!currentPosition || !currentStop) return;

    const distance = calculateDistance(
      currentPosition[0],
      currentPosition[1],
      currentStop.latitude,
      currentStop.longitude
    );

    const ARRIVAL_RADIUS_METERS = 50;
    const isVisited = visitedStops.includes(currentStop.id || String(currentStopIndex));

    if (distance <= ARRIVAL_RADIUS_METERS && !isVisited && !isModalOpen) {
      toast.success(`✅ Você chegou em: ${currentStop.name || `Parada ${currentStopIndex + 1}`}`);
      setIsModalOpen(true);
    }
  }, [currentPosition, currentStop, visitedStops, isModalOpen, currentStopIndex]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startSimulation = () => {
    if (!currentStop) {
      toast.warning('Destino não encontrado');
      return;
    }

    if (!currentPosition) {
      toast.warning('Aguardando sinal de GPS');
      return;
    }

    setIsGPSActive(false);
    setIsSimulating(true);

    const steps = 150;
    const speed = 20;
    let step = 0;
    const startLat = currentPosition[0];
    const startLng = currentPosition[1];
    const endLat = currentStop.latitude;
    const endLng = currentStop.longitude;

    if (simulationInterval.current) clearInterval(simulationInterval.current);

    simulationInterval.current = setInterval(() => {
      step++;
      const progress = step / steps;
      const newLat = startLat + (endLat - startLat) * progress;
      const newLng = startLng + (endLng - startLng) * progress;
      setCurrentPosition([newLat, newLng]);

      if (step >= steps) {
        if (simulationInterval.current) clearInterval(simulationInterval.current);
        setCurrentPosition([endLat, endLng]);
        setIsSimulating(false);
        toast.success('Simulação concluída!');
      }
    }, speed);
  };

  const resumeRealGPS = () => {
    setIsGPSActive(true);
    setIsSimulating(false);
    if (simulationInterval.current) clearInterval(simulationInterval.current);
    toast.info('GPS em tempo real ativado');
  };

  const confirmFinalization = async () => {
    if (!currentStop) return;

    setIsSubmitting(true);
    try {
      await markStopVisited.mutateAsync({
        routeId: routeId!,
        stopId: currentStop.id!,
        notes: comment
      });

      const newVisitedStops = [...visitedStops, currentStop.id!];
      setVisitedStops(newVisitedStops);

      const nextIndex = currentStopIndex + 1;
      if (nextIndex >= (route?.stops.length || 0)) {
        // Finalizar rota
        await updateRoute.mutateAsync({
          id: routeId!,
          data: { status: 'FINISHED' }
        });
        
        localStorage.removeItem(`driver_route_${routeId}_index`);
        localStorage.removeItem(`driver_route_${routeId}_visited`);
        
        toast.success('Rota finalizada com sucesso!');
        router.push('/routes');
      } else {
        setCurrentStopIndex(nextIndex);
        toast.success(`Parada ${currentStopIndex + 1} concluída! Próximo destino.`);
      }

      setIsModalOpen(false);
      setComment('');
      refetch();
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      toast.error('Erro ao finalizar parada');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingRoute) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
          <span className="text-slate-600">Carregando rota...</span>
        </div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Rota não encontrada</h2>
          <button
            onClick={() => router.push('/routes')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Voltar para rotas
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
          <h2 className="text-2xl font-bold mb-2">Rota Finalizada!</h2>
          <p className="text-gray-600 mb-6">
            Parabéns! Você completou todas as {totalStops} paradas desta rota.
          </p>
          <button
            onClick={() => router.push('/routes')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Voltar para rotas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full flex flex-col bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-[500] pointer-events-none">
        <div className="bg-white/95 backdrop-blur shadow-lg rounded-2xl p-4 border border-slate-200 pointer-events-auto">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                {completedStops}/{totalStops}
              </span>
            </div>
            <div className="flex gap-2">
              {!isGPSActive && !isSimulating && (
                <button
                  onClick={resumeRealGPS}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-2 py-1.5 rounded-full"
                >
                  <Navigation size={12} /> GPS
                </button>
              )}
              {!isSimulating && (
                <button
                  onClick={startSimulation}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-full"
                >
                  <Play size={12} fill="currentColor" /> Simular
                </button>
              )}
            </div>
          </div>
          
          <h2 className="font-bold text-lg text-slate-800 line-clamp-1">
            {currentStop?.name || `Parada ${currentStopIndex + 1}`}
          </h2>
          
          <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm">
            <MapPin size={14} className="text-blue-500 shrink-0" />
            <span className="truncate">{currentStop?.address}</span>
          </div>

          <div className="flex gap-3 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {currentStop?.city}/{currentStop?.state}
            </span>
            <span className="flex items-center gap-1">
              <FileText size={12} /> CEP: {currentStop?.zipCode}
            </span>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 z-0">
        <RouteMap
          stops={route.stops}
          currentStopIndex={currentStopIndex}
          myLocation={currentPosition}
          visitedStops={visitedStops}
          onStopClick={(stop, index) => {
            if (!visitedStops.includes(stop.id!)) {
              setCurrentStopIndex(index);
            }
          }}
        />
      </div>

      {/* Modal de Finalização */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-emerald-600">
                Chegou ao Destino!
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Confirme a visita para {currentStop?.name || `Parada ${currentStopIndex + 1}`}
              </p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                Observações
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Adicione observações sobre esta visita..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200"
              >
                Fechar
              </button>
              <button
                onClick={confirmFinalization}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar Visita'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
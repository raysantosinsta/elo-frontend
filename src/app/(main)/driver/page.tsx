/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
"use client";

import { useRoutes } from "@/hooks/useRoutes";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  FileText,
  Loader2,
  MapPin,
  Navigation,
  Play,
  Copy,
  CalendarPlus,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Importação dinâmica do mapa
const RouteMap = dynamic(() => import("@/components/DriverMap"), {
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
  const routeId = searchParams.get("routeId");

  const {
    useGetRouteById,
    useMarkStopVisited,
    useUpdateRoute,
    useDuplicateRoute,
  } = useRoutes();
  const {
    data: route,
    isLoading: isLoadingRoute,
    refetch,
  } = useGetRouteById(routeId || "");
  const markStopVisited = useMarkStopVisited();
  const updateRoute = useUpdateRoute();
  const duplicateRoute = useDuplicateRoute();

  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<
    [number, number] | null
  >(null);
  const [visitedStops, setVisitedStops] = useState<string[]>([]);
  const [isGPSActive, setIsGPSActive] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para o novo fluxo de criar rota
  const [showNewRouteOption, setShowNewRouteOption] = useState(false);
  const [newRouteDate, setNewRouteDate] = useState("");
  const [newRouteObservations, setNewRouteObservations] = useState("");
  const [isCreatingNewRoute, setIsCreatingNewRoute] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Estado para armazenar as paradas otimizadas por proximidade
  const [optimizedStops, setOptimizedStops] = useState<any[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  // Carregar estado salvo do localStorage
  useEffect(() => {
    if (routeId) {
      const savedIndex = localStorage.getItem(`driver_route_${routeId}_index`);
      const savedVisited = localStorage.getItem(
        `driver_route_${routeId}_visited`,
      );

      if (savedIndex) setCurrentStopIndex(parseInt(savedIndex));
      if (savedVisited) setVisitedStops(JSON.parse(savedVisited));
    }
  }, [routeId]);

  // Salvar estado no localStorage
  useEffect(() => {
    if (routeId && route) {
      localStorage.setItem(
        `driver_route_${routeId}_index`,
        String(currentStopIndex),
      );
      localStorage.setItem(
        `driver_route_${routeId}_visited`,
        JSON.stringify(visitedStops),
      );
    }
  }, [routeId, currentStopIndex, visitedStops, route]);

  // Monitorar GPS
  useEffect(() => {
    if (!navigator.geolocation || !isGPSActive) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn("GPS Init Error:", err),
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    return () => {
      if (watchIdRef.current)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isGPSActive]);

  // Função para calcular distância entre dois pontos (em metros)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 🔥 FUNÇÃO PRINCIPAL: Reordenar paradas por proximidade à localização REAL do motorista
  const reorderStopsByProximity = (stops: any[], currentLatLng: [number, number], visitedIds: string[]) => {
    if (!stops.length) return [];
    
    // Separar paradas não visitadas
    const notVisited = stops.filter(stop => !visitedIds.includes(stop.id));
    const alreadyVisited = stops.filter(stop => visitedIds.includes(stop.id));
    
    if (notVisited.length === 0) return alreadyVisited;
    
    // Algoritmo do vizinho mais próximo a partir da posição atual
    const ordered: any[] = [];
    const remaining = [...notVisited];
    let currentPos = {
      lat: currentLatLng[0],
      lng: currentLatLng[1],
    };
    
    let iteration = 0;
    const maxIterations = remaining.length;
    
    while (remaining.length > 0 && iteration < maxIterations) {
      iteration++;
      let nearestIndex = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        const stop = remaining[i];
        const distance = calculateDistance(
          currentPos.lat,
          currentPos.lng,
          stop.latitude,
          stop.longitude,
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }
      
      const nearest = remaining[nearestIndex];
      ordered.push(nearest);
      currentPos = {
        lat: nearest.latitude,
        lng: nearest.longitude,
      };
      remaining.splice(nearestIndex, 1);
    }
    
    // Adicionar qualquer parada restante e as já visitadas no final
    return [...ordered, ...remaining, ...alreadyVisited];
  };

  // 🔥 EFEITO: Reordenar paradas quando a localização do GPS mudar ou quando a rota for carregada
  useEffect(() => {
    if (!route || !route.stops) {
      setOptimizedStops([]);
      return;
    }

    // Se for PRIORIDADE, manter ordem original
    if (route.orderBy === "PRIORITY") {
      setOptimizedStops(route.stops);
      return;
    }

    // Se for DISTANCE e temos localização do GPS, reordenar
    if (route.orderBy === "DISTANCE" && currentPosition) {
      const reordered = reorderStopsByProximity(route.stops, currentPosition, visitedStops);
      setOptimizedStops(reordered);
      
      // Atualizar o índice atual baseado na nova ordem
      const currentStopId = route.stops[currentStopIndex]?.id;
      if (currentStopId) {
        const newIndex = reordered.findIndex(s => s.id === currentStopId);
        if (newIndex !== -1 && newIndex !== currentStopIndex) {
          setCurrentStopIndex(newIndex);
        }
      }
    } 
    // Se for DISTANCE mas não temos localização ainda, usar ordem original
    else if (route.orderBy === "DISTANCE" && !currentPosition) {
      setOptimizedStops(route.stops);
    }
    // Outros casos
    else {
      setOptimizedStops(route.stops);
    }
  }, [route, currentPosition, visitedStops]);

  // Usar stops otimizados ou os originais
  const displayStops = optimizedStops.length ? optimizedStops : route?.stops || [];
  const currentStop = displayStops[currentStopIndex];
  const totalStops = displayStops.length;
  const completedStops = visitedStops.length;

  // Verificar se é a última parada
  const isLastStop = currentStopIndex === totalStops - 1;

  // Verificar se a rota está finalizada
  const isFinished =
    route?.status === "FINISHED" ||
    (completedStops === totalStops && totalStops > 0);

  // Verificar chegada ao destino
  useEffect(() => {
    if (!currentPosition || !currentStop) return;

    const distance = calculateDistance(
      currentPosition[0],
      currentPosition[1],
      currentStop.latitude,
      currentStop.longitude,
    );

    const ARRIVAL_RADIUS_METERS = 50;
    const isVisited = visitedStops.includes(currentStop.id);

    if (distance <= ARRIVAL_RADIUS_METERS && !isVisited && !isModalOpen) {
      toast.success(
        `✅ Você chegou em: ${currentStop.name || `Parada ${currentStopIndex + 1}`}`,
      );
      setIsModalOpen(true);
      setShowNewRouteOption(false);
      setNewRouteDate("");
      setNewRouteObservations("");
    }
  }, [
    currentPosition,
    currentStop,
    visitedStops,
    isModalOpen,
    currentStopIndex,
  ]);

  const startSimulation = () => {
    if (!currentStop) {
      toast.warning("Destino não encontrado");
      return;
    }

    if (!currentPosition) {
      toast.warning("Aguardando sinal de GPS");
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
        if (simulationInterval.current)
          clearInterval(simulationInterval.current);
        setCurrentPosition([endLat, endLng]);
        setIsSimulating(false);
        toast.success("Simulação concluída!");
      }
    }, speed);
  };

  const resumeRealGPS = () => {
    setIsGPSActive(true);
    setIsSimulating(false);
    if (simulationInterval.current) clearInterval(simulationInterval.current);
    toast.info("GPS em tempo real ativado");
  };

  const confirmFinalization = async () => {
    if (!currentStop) return;

    setIsSubmitting(true);
    try {
      // Marcar parada como visitada
      await markStopVisited.mutateAsync({
        routeId: routeId!,
        stopId: currentStop.id!,
        notes: comment,
      });

      const newVisitedStops = [...visitedStops, currentStop.id!];
      setVisitedStops(newVisitedStops);

      const nextIndex = currentStopIndex + 1;

      // Verificar se é a última parada
      if (nextIndex >= totalStops) {
        // Marcar rota como FINALIZADA
        await updateRoute.mutateAsync({
          id: routeId!,
          data: { status: "FINISHED" },
        });

        // Limpar localStorage
        localStorage.removeItem(`driver_route_${routeId}_index`);
        localStorage.removeItem(`driver_route_${routeId}_visited`);

        toast.success("🎉 Rota finalizada com sucesso!", {
          duration: 3000,
          icon: "✅",
        });

        // Redirecionar para a lista de rotas após 1.5 segundos
        setTimeout(() => {
          router.push("/routes");
        }, 1500);
      } else {
        setCurrentStopIndex(nextIndex);
        toast.success(
          `✅ Parada ${currentStopIndex + 1} concluída! Próximo destino: ${displayStops[nextIndex]?.name || `Parada ${nextIndex + 1}`}`,
        );

        // Fechar modal e limpar campos
        setIsModalOpen(false);
        setComment("");
        setShowNewRouteOption(false);
        setNewRouteDate("");
        setNewRouteObservations("");
      }

      refetch();
    } catch (error) {
      console.error("Erro ao finalizar:", error);
      toast.error("Erro ao finalizar parada. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewRoute = async () => {
    if (!route) return;

    if (!newRouteDate) {
      toast.warning("Selecione uma data para a nova rota");
      return;
    }

    setIsCreatingNewRoute(true);

    // Mostrar toast de loading
    const loadingToast = toast.loading("Criando nova rota...", {
      duration: Infinity,
    });

    try {
      // 🔥 Marcar a última parada como visitada com texto padrão "tudo certo"
      if (currentStop && !visitedStops.includes(currentStop.id!)) {
        await markStopVisited.mutateAsync({
          routeId: routeId!,
          stopId: currentStop.id!,
          notes: "tudo certo",
        });

        const newVisitedStops = [...visitedStops, currentStop.id!];
        setVisitedStops(newVisitedStops);
      }

      // Formata a data para exibição no título
      const formattedDate = new Date(newRouteDate).toLocaleDateString("pt-BR");
      let newTitle = `${route.title} (Reagendada - ${formattedDate})`;

      // Observações do modal vão para o description da ROTA
      let description = route.description || "";
      if (newRouteObservations) {
        description = description
          ? `${description}\n\n📝 ${newRouteObservations}`
          : newRouteObservations;
      }

      // Criar a nova rota duplicada (SEM as observações das paradas)
      await duplicateRoute.mutateAsync({
        id: routeId!,
        data: {
          title: newTitle,
          routeDate: newRouteDate,
          description: description,
        },
      });

      // Marcar a rota atual como FINALIZADA
      await updateRoute.mutateAsync({
        id: routeId!,
        data: { status: "FINISHED" },
      });

      // Limpar localStorage
      localStorage.removeItem(`driver_route_${routeId}_index`);
      localStorage.removeItem(`driver_route_${routeId}_visited`);

      // Remover toast de loading e mostrar sucesso
      toast.dismiss(loadingToast);
      toast.success("✅ Rota reagendada com sucesso!", {
        duration: 4000,
        description: `Nova rota: ${newTitle} | Data: ${formattedDate}`,
      });

      // Fechar modal
      setIsModalOpen(false);
      setShowNewRouteOption(false);
      setComment("");
      setNewRouteDate("");
      setNewRouteObservations("");

      // Redirecionar para a lista de rotas
      setTimeout(() => {
        router.push("/routes");
      }, 1500);
    } catch (error) {
      console.error("Erro ao criar nova rota:", error);
      toast.dismiss(loadingToast);
      toast.error("❌ Erro ao reagendar rota", {
        description: "Tente novamente ou contate o suporte.",
      });
    } finally {
      setIsCreatingNewRoute(false);
    }
  };

  // Efeito para marcar rota como concluída quando todas as paradas forem visitadas
  useEffect(() => {
    const checkAndFinishRoute = async () => {
      if (isFinishing || !route || route.status === "FINISHED") {
        return;
      }

      if (visitedStops.length === totalStops && totalStops > 0) {
        setIsFinishing(true);

        try {
          await updateRoute.mutateAsync({
            id: routeId!,
            data: { status: "FINISHED" },
          });

          localStorage.removeItem(`driver_route_${routeId}_index`);
          localStorage.removeItem(`driver_route_${routeId}_visited`);

          toast.success("🎉 Rota finalizada com sucesso!", {
            duration: 4000,
            icon: "✅",
          });

          setTimeout(() => {
            router.push("/routes");
          }, 2000);
        } catch (error) {
          console.error("Erro ao finalizar rota:", error);
          setIsFinishing(false);
        }
      }
    };

    checkAndFinishRoute();
  }, [visitedStops, totalStops, route, routeId, updateRoute, router, isFinishing]);

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
            onClick={() => router.push("/routes")}
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
            onClick={() => router.push("/routes")}
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

      {/* Mapa - usando displayStops otimizadas */}
      <div className="flex-1 z-0">
        <RouteMap
          stops={displayStops}
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

      {/* Modal de Finalização com Nova Opção */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
            {!showNewRouteOption ? (
              <>
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-emerald-600">
                    Chegou ao Destino!
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Confirme a visita para{" "}
                    {currentStop?.name || `Parada ${currentStopIndex + 1}`}
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

                <div className="flex flex-col gap-2">
                  <button
                    onClick={confirmFinalization}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin inline mr-2" size={18} />
                        Confirmando...
                      </>
                    ) : (
                      "Confirmar Visita"
                    )}
                  </button>

                  {isLastStop && (
                    <button
                      onClick={() => setShowNewRouteOption(true)}
                      className="w-full py-3 border-2 border-blue-600 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy size={18} />
                      Agendar
                    </button>
                  )}

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200"
                  >
                    Fechar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-blue-600">
                    Agendar Rota
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Reaproveitar todos os {totalStops} destinos desta rota
                  </p>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                    Nova Data *
                  </label>
                  <input
                    type="date"
                    value={newRouteDate}
                    onChange={(e) => setNewRouteDate(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                    Observações
                  </label>
                  <textarea
                    value={newRouteObservations}
                    onChange={(e) => setNewRouteObservations(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Observações para a nova rota (opcional)..."
                    rows={3}
                  />
                </div>

                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Resumo:</p>
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {route?.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {totalStops} destino{totalStops !== 1 ? "s" : ""} •
                    {route?.formattedDistance || " Distância não calculada"}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleCreateNewRoute}
                    disabled={isCreatingNewRoute || !newRouteDate}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreatingNewRoute ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Criando...
                      </>
                    ) : (
                      <>
                        <CalendarPlus size={18} />
                        Criar Rota
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setShowNewRouteOption(false);
                      setNewRouteDate("");
                      setNewRouteObservations("");
                    }}
                    className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200"
                  >
                    Voltar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
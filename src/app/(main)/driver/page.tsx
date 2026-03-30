/* eslint-disable @typescript-eslint/no-explicit-any */
// app/driver/page.tsx
"use client";

import { api } from "@/services/api";
import { useError } from "@/contexts/error-context";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Play,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Importação Dinâmica do Mapa para evitar erro de 'window is not defined'
const DriverMap = dynamic(() => import("@/components/DriverMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 flex-col gap-2">
      <Loader2 className="animate-spin text-blue-600" size={32} />
      <span className="text-slate-500 font-medium">Carregando Mapa...</span>
    </div>
  ),
});

interface RoutePoint {
  id: string;
  title: string;
  lat: number;
  lng: number;
  endereco: string;
  columnId?: string;
  taskAddress?: any;
  userAssigned?: { id: string; name: string };
  userAssignedId?: string;
}

export default function DriverPage() {
  const router = useRouter();
  const { showError } = useError();

  // --- ESTADOS ---
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<
    [number, number] | null
  >(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

  // --- TIMER ---
  const [timeRemainingString, setTimeRemainingString] =
    useState<string>("--:--");
  const [isLate, setIsLate] = useState(false);

  // --- SIMULAÇÃO ---
  const [isGPSActive, setIsGPSActive] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  // --- MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"COMPLETED" | "FAILED">(
    "COMPLETED",
  );
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FORM NOVA TAREFA ---
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");

  const watchIdRef = useRef<number | null>(null);

  // 1. Carrega a rota do LocalStorage
  useEffect(() => {
    try {
      const storedRoute = localStorage.getItem("rotaAtiva");
      const savedIndex = localStorage.getItem("rotaIndex");

      if (storedRoute) {
        const parsedRoute: RoutePoint[] = JSON.parse(storedRoute);

        // Validação: Garante que os pontos têm coordenadas válidas
        const validRoute = parsedRoute.filter(
          (p) =>
            p.lat !== undefined &&
            p.lng !== undefined &&
            !isNaN(Number(p.lat)) &&
            !isNaN(Number(p.lng)),
        );

        console.log("📍 Rota Carregada:", validRoute); // DEBUG: Veja no console se tem 2 itens

        if (validRoute.length > 0) {
          setRoutePoints(validRoute);
          if (savedIndex) {
            const idx = Number(savedIndex);
            setCurrentStopIndex(idx < validRoute.length ? idx : 0);
          }
        } else {
          toast.error("Rota inválida ou sem coordenadas.");
          router.push("/route-planner");
        }
      } else {
        // Se não tiver rota, volta pro planejador
        router.push("/route-planner");
      }
    } catch (error) {
      console.error("Erro ao carregar rota:", error);
      router.push("/route-planner");
    } finally {
      setIsLoadingRoute(false);
    }
  }, [router]);

  // 2. CRONÔMETRO
  useEffect(() => {
    const updateTimer = () => {
      const storedStartTime = localStorage.getItem("rotaStartTime");
      const storedDuration = localStorage.getItem("rotaTotalDuration");

      if (!storedStartTime || !storedDuration) return;

      const startTime = new Date(storedStartTime).getTime();
      const totalDurationMs = Number(storedDuration) * 1000;
      const now = Date.now();

      const endTime = startTime + totalDurationMs;
      const remainingMs = endTime - now;

      if (remainingMs <= 0) {
        setIsLate(true);
        const overdueSeconds = Math.abs(remainingMs / 1000);
        setTimeRemainingString(`+${formatSeconds(overdueSeconds)}`);
      } else {
        setIsLate(false);
        const remainingSeconds = remainingMs / 1000;
        setTimeRemainingString(formatSeconds(remainingSeconds));
      }
    };

    const formatSeconds = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // 3. Monitora GPS Real
  useEffect(() => {
    if (!navigator.geolocation || !isGPSActive) return;

    // Pega posição inicial rápida
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

  // --- SIMULAÇÃO ---
  const startSimulation = () => {
    const destination = routePoints[currentStopIndex];
    if (!currentPosition) {
      toast.warning("Aguardando sinal de GPS para iniciar simulação.");
      return;
    }
    if (!destination) {
      toast.error("Destino não encontrado.");
      return;
    }

    setIsGPSActive(false);
    setIsSimulating(true);

    const steps = 150;
    const speed = 20;
    let step = 0;
    const startLat = currentPosition[0],
      startLng = currentPosition[1];
    const endLat = destination.lat,
      endLng = destination.lng;

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
        toast.success("Você chegou ao destino (Simulação)!");
      }
    }, speed);
  };

  const resumeRealGPS = () => {
    setIsGPSActive(true);
    toast.info("GPS em tempo real ativado.");
  };

  useEffect(() => {
    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, []);

  // --- HANDLERS DO MODAL ---
  const handleOpenModal = (type: "COMPLETED" | "FAILED") => {
    setActionType(type);
    setComment("");
    const today = new Date().toISOString().split("T")[0];
    setRescheduleDate(today);
    setNewTaskDate(today);
    setNewTaskTitle("");
    setNewTaskDescription("");
    setIsModalOpen(true);
  };

  const confirmFinalization = async () => {
    if (!comment && actionType === "FAILED") {
      showError(
        "Campo Obrigatório",
        "Por favor, descreva o motivo do problema.",
      );
      return;
    }
    if (
      actionType === "COMPLETED" &&
      !newTaskTitle.trim() &&
      routePoints.length === 0
    ) {
      // Lógica ajustada
      // Apenas valida titulo se for criar nova tarefa OBRIGATÓRIA, aqui é opcional na maioria dos fluxos
      // Se for obrigatório criar próxima tarefa, mantenha a validação
    }

    setIsSubmitting(true);
    const task = routePoints[currentStopIndex];

    try {
      // 1. Atualiza a tarefa ATUAL
      if (actionType === "FAILED") {
        const formattedDate = rescheduleDate
          ? `${rescheduleDate}T12:00:00`
          : undefined;
        await api.patch(`/routes/tasks/${task.id}/finalize`, {
          status: "FAILED",
          finalComment: comment,
          scheduledAt: formattedDate
            ? new Date(formattedDate).toISOString()
            : undefined,
        });
        toast.error("Tarefa marcada com problema.");
      } else {
        await api.patch(`/routes/tasks/${task.id}/finalize`, {
          status: "COMPLETED",
          finalComment: comment,
        });
        toast.success("Tarefa concluída!");

        // 2. Cria a NOVA tarefa (se preenchido)
        if (newTaskTitle) {
          if (!task.columnId) {
            toast.error(
              "Erro ao criar próxima tarefa: Coluna não identificada.",
            );
          } else {
            const newDateFormatted = newTaskDate
              ? `${newTaskDate}T09:00:00`
              : undefined;

            const addressPayload = task.taskAddress
              ? {
                  cep: task.taskAddress.cep,
                  endereco: task.taskAddress.endereco,
                  numero: task.taskAddress.numero,
                  bairro: task.taskAddress.bairro,
                  cidade: task.taskAddress.cidade,
                  estado: task.taskAddress.estado,
                  complemento: task.taskAddress.complemento || "",
                  latitude: Number(task.taskAddress.latitude),
                  longitude: Number(task.taskAddress.longitude),
                }
              : {
                  cep: "00000-000",
                  endereco: task.endereco.split(",")[0],
                  numero: task.endereco.split(",")[1] || "S/N",
                  bairro: "N/A",
                  cidade: "N/A",
                  estado: "UF",
                  latitude: Number(task.lat),
                  longitude: Number(task.lng),
                };

            const finalDescription = `${newTaskDescription}\n\n> Histórico: ${comment || "Sem observações na conclusão anterior."}`;

            await api.post("/tasks", {
              title: newTaskTitle,
              columnId: task.columnId,
              description: finalDescription.trim(),
              assignedToId: task.userAssigned?.id || task.userAssignedId,
              scheduledAt: newDateFormatted
                ? new Date(newDateFormatted).toISOString()
                : undefined,
              dueDate: newDateFormatted
                ? new Date(newDateFormatted).toISOString()
                : undefined,
              address: addressPayload,
            });
            toast.success("Próxima visita agendada.");
          }
        }
      }

      // Avança para a próxima
      const nextIndex = currentStopIndex + 1;
      if (nextIndex >= routePoints.length) {
        // FIM DA ROTA
        localStorage.removeItem("rotaAtiva");
        localStorage.removeItem("rotaIndex");
        localStorage.removeItem("rotaStartTime");
        localStorage.removeItem("rotaTotalDuration");
        toast.success("Rota finalizada com sucesso!");
        router.push("/Kanban");
      } else {
        setCurrentStopIndex(nextIndex);
        localStorage.setItem("rotaIndex", String(nextIndex));
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Erro na finalização:", error);
      toast.error("Erro ao finalizar tarefa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERIZAÇÃO ---

  // 1. Loading Inicial
  if (isLoadingRoute) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100 flex-col gap-2">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="text-slate-600 font-medium">
          Preparando navegação...
        </span>
      </div>
    );
  }

  // 2. Validação se existe tarefa atual
  const currentTask = routePoints[currentStopIndex];
  if (!currentTask) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100 flex-col gap-4 p-4 text-center">
        <AlertTriangle className="text-amber-500" size={48} />
        <h2 className="text-xl font-bold text-slate-800">
          Nenhuma tarefa ativa
        </h2>
        <p className="text-slate-500">
          A rota parece estar vazia ou foi concluída.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full flex flex-col bg-slate-100 overflow-hidden">
      {/* HEADER FLUTUANTE */}
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
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                {currentStopIndex + 1}/{routePoints.length}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <div
                className={`flex items-center gap-1 px-2 py-1.5 rounded-full border text-[10px] font-bold shadow-sm transition-colors ${isLate ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-slate-800 text-white border-slate-700"}`}
              >
                <Clock size={10} />
                <span>
                  {timeRemainingString} {isLate ? "ATRASADO" : ""}
                </span>
              </div>
              {!isGPSActive && !isSimulating && (
                <button
                  onClick={resumeRealGPS}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] px-2 py-1.5 rounded-full font-bold border border-slate-200"
                >
                  <Navigation size={10} /> GPS OFF
                </button>
              )}
              {!isSimulating && (
                <button
                  onClick={startSimulation}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-3 py-1.5 rounded-full font-bold shadow-sm active:scale-95"
                >
                  <Play size={10} fill="currentColor" />{" "}
                  {currentStopIndex > 0 && !isGPSActive ? "PRÓX" : "SIM"}
                </button>
              )}
            </div>
          </div>
          <h2
            className="font-bold text-lg text-slate-800 leading-tight line-clamp-1"
            title={currentTask.title}
          >
            {currentTask.title}
          </h2>
          <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm">
            <MapPin size={14} className="text-blue-500 shrink-0" />
            <span className="truncate">{currentTask.endereco}</span>
          </div>
        </div>
      </div>

      {/* MAPA */}
      <div className="flex-1 z-0 relative">
        {/* Passamos o array completo de routePoints para o Mapa decidir como desenhar */}
        <DriverMap
          route={routePoints}
          myLocation={currentPosition}
          currentStopIndex={currentStopIndex}
          key={`${routePoints.length}-${currentStopIndex}`}
        />
      </div>

      {/* FOOTER ACTIONS */}
      <div className="z-[500] bg-white p-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] border-t border-slate-100">
        <h3 className="text-center text-slate-400 text-xs font-semibold uppercase mb-4 tracking-wider">
          Ações da Visita
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleOpenModal("FAILED")}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 active:scale-95 transition-all hover:bg-red-100"
          >
            <AlertTriangle size={24} className="mb-1" />
            <span className="font-bold">Problema</span>
          </button>
          <button
            onClick={() => handleOpenModal("COMPLETED")}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 active:scale-95 transition-all hover:bg-emerald-100"
          >
            <CheckCircle size={24} className="mb-1" />
            <span className="font-bold">Concluir</span>
          </button>
        </div>
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4">
              <h3
                className={`text-xl font-bold ${actionType === "COMPLETED" ? "text-emerald-600" : "text-red-600"}`}
              >
                {actionType === "COMPLETED"
                  ? "Tarefa Concluída!"
                  : "Reportar Problema"}
              </h3>
            </div>

            {actionType === "FAILED" && (
              <div className="mb-4 bg-red-50 p-3 rounded-xl border border-red-100">
                <label className="text-xs font-bold text-red-700 mb-1 block uppercase">
                  Reagendar Para
                </label>
                <input
                  type="date"
                  className="w-full p-2 bg-white rounded-lg border border-red-200"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
            )}

            {actionType === "COMPLETED" && (
              <div className="mb-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-3">
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider border-b border-emerald-200 pb-2 mb-2">
                  Criar Próxima Tarefa
                </h4>
                <div>
                  <label className="text-[10px] font-bold text-emerald-600 block mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Retorno ao Cliente"
                    className="w-full p-2 rounded-lg border border-emerald-200 text-sm"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-600 block mb-1">
                    Descrição (Opcional)
                  </label>
                  <textarea
                    placeholder="Detalhes..."
                    className="w-full p-2 rounded-lg border border-emerald-200 text-sm min-h-[60px]"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-600 block mb-1">
                    Data Agendamento
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 rounded-lg border border-emerald-200 text-sm"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                {actionType === "COMPLETED"
                  ? "Comentário da Finalização (Atual)"
                  : "Motivo do Problema"}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl mb-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Escreva aqui..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl font-medium text-slate-600 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmFinalization}
                disabled={isSubmitting}
                className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all ${actionType === "COMPLETED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                {isSubmitting ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

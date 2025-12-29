// app/driver/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  MapPin,
  AlertTriangle,
  PlusCircle,
  Calendar,
  Play,
  Navigation
} from "lucide-react";
import dynamic from "next/dynamic";
import { api } from "@/services/api";

// Importação dinâmica do mapa (evita erro de 'window not defined')
const DriverMap = dynamic(() => import("@/components/DriverMap"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-slate-100 flex-col gap-2">
      <Loader2 className="animate-spin text-blue-600" size={32} />
      <span className="text-slate-500 font-medium">Carregando GPS...</span>
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
}

export default function DriverPage() {
  const router = useRouter();

  // --- ESTADOS PRINCIPAIS ---
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);

  // --- ESTADOS DE SIMULAÇÃO ---
  // isGPSActive: true = usa GPS do celular. false = usa posição simulada.
  const [isGPSActive, setIsGPSActive] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  // --- ESTADOS DO MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"COMPLETED" | "FAILED">("COMPLETED");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- INPUTS DO FORMULÁRIO ---
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");

  const watchIdRef = useRef<number | null>(null);

  // 1. Carrega a rota do LocalStorage
  useEffect(() => {
    const storedRoute = localStorage.getItem("rotaAtiva");
    const savedIndex = localStorage.getItem("rotaIndex");

    if (storedRoute) {
      setRoutePoints(JSON.parse(storedRoute));
      if (savedIndex) setCurrentStopIndex(Number(savedIndex));
    } else {
      router.push("/route-planner");
    }
  }, [router]);

  // 2. Monitora GPS Real
  // Só roda se o navegador tiver suporte E se a simulação não tiver "roubado" o controle (isGPSActive)
  useEffect(() => {
    if (!navigator.geolocation || !isGPSActive) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Atualiza apenas se o modo GPS estiver ativo
        setCurrentPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.error("Erro GPS:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isGPSActive]);

  // --- SIMULAÇÃO DE MOVIMENTO ---
  const startSimulation = () => {
    const destination = routePoints[currentStopIndex];
    
    // Validações básicas
    if (!currentPosition) {
      alert("Aguardando sinal inicial do GPS...");
      return;
    }
    if (!destination) {
      alert("Nenhum destino encontrado.");
      return;
    }

    // 1. Trava o GPS Real para ele não interferir
    setIsGPSActive(false);
    setIsSimulating(true);
    
    // Configuração da Animação
    const steps = 150; // Quantidade de passos (maior = mais suave/lento)
    const speed = 20;  // Velocidade em ms entre os passos
    let step = 0;

    const startLat = currentPosition[0];
    const startLng = currentPosition[1];
    const endLat = destination.lat;
    const endLng = destination.lng;

    // Limpa intervalo anterior se existir
    if (simulationInterval.current) clearInterval(simulationInterval.current);

    simulationInterval.current = setInterval(() => {
      step++;
      const progress = step / steps;

      // Interpolação Linear (calcula posição intermediária)
      const newLat = startLat + (endLat - startLat) * progress;
      const newLng = startLng + (endLng - startLng) * progress;

      setCurrentPosition([newLat, newLng]);

      // Verifica se chegou ao fim
      if (step >= steps) {
        if (simulationInterval.current) clearInterval(simulationInterval.current);
        
        // 2. Força a posição final EXATA do destino
        setCurrentPosition([endLat, endLng]);
        
        // 3. Finaliza animação, mas MANTÉM isGPSActive = false 
        // (Isso faz o carro ficar parado no destino esperando a próxima ordem)
        setIsSimulating(false);
      }
    }, speed);
  };

  // Botão para o usuário voltar ao GPS Real se quiser
  const resumeRealGPS = () => {
    setIsGPSActive(true);
    // O useEffect vai disparar e pegar a posição real em instantes
  };

  // Cleanup geral
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
    
    setIsModalOpen(true);
  };

  const confirmFinalization = async () => {
    // Validações
    if (!comment && actionType === "FAILED") {
      alert("Por favor, descreva o motivo do problema.");
      return;
    }
    if (actionType === "COMPLETED" && !newTaskTitle.trim()) {
      alert("Por favor, informe o título da nova tarefa.");
      return;
    }

    setIsSubmitting(true);
    const task = routePoints[currentStopIndex];

    try {
      // 1. Se FALHOU (Reagendar mesma tarefa)
      if (actionType === "FAILED") {
        const formattedDate = rescheduleDate ? `${rescheduleDate}T12:00:00` : undefined;
        await api.patch(`/routes/tasks/${task.id}/finalize`, {
          status: "FAILED",
          finalComment: comment,
          scheduledAt: formattedDate ? new Date(formattedDate).toISOString() : undefined,
        });
      } 
      
      // 2. Se CONCLUIU (Finalizar + Criar Nova)
      else {
        // A) Finaliza a atual
        await api.patch(`/routes/tasks/${task.id}/finalize`, {
          status: "COMPLETED",
          finalComment: comment,
        });

        // B) Cria a nova tarefa
        if (newTaskTitle) {
          // Proteção contra dados antigos no cache
          if (!task.columnId) {
            alert("ERRO: Dados da rota desatualizados. Recarregue a rota no planejador.");
            setIsSubmitting(false);
            return;
          }

          const newDateFormatted = newTaskDate ? `${newTaskDate}T09:00:00` : undefined;
          
          // Fallback robusto para endereço
          const addressPayload = task.taskAddress ? {
            cep: task.taskAddress.cep,
            endereco: task.taskAddress.endereco,
            numero: task.taskAddress.numero,
            bairro: task.taskAddress.bairro,
            cidade: task.taskAddress.cidade,
            estado: task.taskAddress.estado,
            complemento: task.taskAddress.complemento || "",
            latitude: Number(task.taskAddress.latitude),
            longitude: Number(task.taskAddress.longitude)
          } : {
            cep: "00000-000",
            endereco: task.endereco.split(',')[0] || "Endereço copiado",
            numero: task.endereco.split(',')[1] || "S/N",
            bairro: "Não informado",
            cidade: "Não informado",
            estado: "UF",
            latitude: Number(task.lat),
            longitude: Number(task.lng)
          };

          const newTaskPayload = {
            title: newTaskTitle,
            columnId: task.columnId,
            description: `Nova tarefa criada em campo. Origem: ${task.title}`,
            scheduledAt: newDateFormatted ? new Date(newDateFormatted).toISOString() : undefined,
            dueDate: newDateFormatted ? new Date(newDateFormatted).toISOString() : undefined,
            address: addressPayload
          };

          await api.post('/tasks', newTaskPayload);
        }
      }

      // 3. Avançar para a próxima parada
      const nextIndex = currentStopIndex + 1;

      if (nextIndex >= routePoints.length) {
        alert("Rota finalizada com sucesso!");
        localStorage.removeItem("rotaAtiva");
        localStorage.removeItem("rotaIndex");
        router.push("/");
      } else {
        setCurrentStopIndex(nextIndex);
        localStorage.setItem("rotaIndex", String(nextIndex));
        setIsModalOpen(false);
        // O carro continua parado na posição do destino anterior (start da nova perna)
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Erro ao salvar. Tente novamente.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTask = routePoints[currentStopIndex];
  if (!currentTask) return null;

  return (
    <div className="relative h-screen w-full flex flex-col bg-slate-100 overflow-hidden">
      {/* --- HEADER FLUTUANTE --- */}
      <div className="absolute top-4 left-4 right-4 z-[500] pointer-events-none">
        <div className="bg-white/95 backdrop-blur shadow-lg rounded-2xl p-4 border border-slate-200 pointer-events-auto">
          
          <div className="flex justify-between items-start mb-2">
            {/* Botão Voltar + Indicador de Parada */}
            <div className="flex items-center gap-2">
              <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                <ArrowLeft size={20} />
              </button>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                Parada {currentStopIndex + 1} de {routePoints.length}
              </span>
            </div>
            
            {/* Controles de Simulação/GPS */}
            <div className="flex gap-2 items-center">
              
              {/* Botão para retomar GPS Real (só aparece se estiver desligado) */}
              {!isGPSActive && !isSimulating && (
                <button 
                  onClick={resumeRealGPS}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] px-2 py-1.5 rounded-full font-bold transition-all border border-slate-200"
                  title="Usar localização real"
                >
                  <Navigation size={10} /> GPS REAL
                </button>
              )}

              {/* Botão de Ação: SIMULAR / PRÓXIMO */}
              {!isSimulating && (
                <button 
                  onClick={startSimulation}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-3 py-1.5 rounded-full font-bold shadow-sm transition-all active:scale-95"
                >
                  <Play size={10} fill="currentColor" /> {currentStopIndex > 0 && !isGPSActive ? "PRÓXIMO" : "SIMULAR"}
                </button>
              )}
              
              {/* Indicador de Movimento */}
              {isSimulating && (
                <span className="text-[10px] font-bold text-indigo-600 animate-pulse flex items-center bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                  MOVENDO...
                </span>
              )}
            </div>
          </div>

          <h2 className="font-bold text-lg text-slate-800 leading-tight">{currentTask.title}</h2>
          <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm">
            <MapPin size={14} className="text-blue-500" />
            <span className="truncate">{currentTask.endereco}</span>
          </div>
        </div>
      </div>

      {/* --- MAPA --- */}
      <div className="flex-1 z-0">
        <DriverMap
          route={routePoints}
          myLocation={currentPosition}
          currentStopIndex={currentStopIndex}
        />
      </div>

      {/* --- FOOTER ACTIONS --- */}
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

      {/* --- MODAL UNIFICADO --- */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="text-center mb-4">
              <h3 className={`text-xl font-bold ${actionType === "COMPLETED" ? "text-emerald-600" : "text-red-600"}`}>
                {actionType === "COMPLETED" ? "Tarefa Concluída!" : "Reportar Problema"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {actionType === "COMPLETED" 
                  ? "Finalize esta e crie a próxima." 
                  : "O que houve? Vamos tentar de novo."}
              </p>
            </div>

            {/* SEÇÃO: PROBLEMA */}
            {actionType === "FAILED" && (
              <div className="mb-4 bg-red-50 p-3 rounded-xl border border-red-100">
                <label className="block text-sm font-bold text-red-800 mb-1 flex items-center gap-2">
                   <Calendar className="w-4 h-4" /> Nova Tentativa
                </label>
                <input
                  type="date"
                  className="w-full p-2 bg-white border border-red-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
            )}

            {/* SEÇÃO: CONCLUÍDO */}
            {actionType === "COMPLETED" && (
              <div className="mb-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm border-b border-emerald-200 pb-2 mb-2">
                  <PlusCircle className="w-4 h-4" /> Criar Próxima Tarefa
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">Título da Nova Tarefa *</label>
                  <input
                    type="text"
                    placeholder="Ex: Retorno p/ assinatura..."
                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">Data Agendada</label>
                  <input
                    type="date"
                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-emerald-600/70 italic">* O endereço será copiado da tarefa atual.</p>
              </div>
            )}

            {/* COMENTÁRIO */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {actionType === "COMPLETED" ? "Comentário Final (Opcional)" : "Descreva o Problema *"}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-500 outline-none min-h-[80px]"
                placeholder={actionType === "COMPLETED" ? "Observações sobre a conclusão..." : "Cliente ausente, endereço errado..."}
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmFinalization}
                disabled={isSubmitting}
                className={`flex-1 py-3 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-colors
                  ${actionType === "COMPLETED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                  ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}
                `}
              >
                {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
                {actionType === "COMPLETED" ? "Confirmar e Criar" : "Salvar Problema"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
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
} from "lucide-react";
import dynamic from "next/dynamic";
import { api } from "@/services/api";

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
}

export default function DriverPage() {
  const router = useRouter();

  // --- ESTADOS ---
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<
    [number, number] | null
  >(null);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"COMPLETED" | "FAILED">(
    "COMPLETED"
  );
  const [comment, setComment] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  // 1. Carrega a rota
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

  // 2. Monitora GPS
  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.error("Erro GPS:", err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // --- Localize a função handleOpenModal e substitua ---
  const handleOpenModal = (type: "COMPLETED" | "FAILED") => {
    setActionType(type);
    setComment("");

    // Agora apenas sugere a data de HOJE, para o motorista escolher a data real
    const today = new Date().toISOString().split("T")[0];
    setRescheduleDate(today);

    setIsModalOpen(true);
  };

  // No confirmaFinalization do page.tsx
  const confirmFinalization = async () => {
    if (!comment && actionType === "FAILED") {
      alert("Por favor, descreva o motivo do problema.");
      return;
    }

    setIsSubmitting(true);
    const task = routePoints[currentStopIndex];

    try {
      const formattedDate = rescheduleDate
        ? `${rescheduleDate}T12:00:00`
        : undefined;

      await api.patch(`/routes/tasks/${task.id}/finalize`, {
        status: actionType,
        finalComment: comment,
        scheduledAt: formattedDate
          ? new Date(formattedDate).toISOString()
          : undefined,
      });

      const nextIndex = currentStopIndex + 1;

      // Se era a última parada da rota atual
      if (nextIndex >= routePoints.length) {
        alert("Ações salvas com sucesso!");
        localStorage.removeItem("rotaAtiva");
        localStorage.removeItem("rotaIndex");
        router.push("/");
      } else {
        setCurrentStopIndex(nextIndex);
        localStorage.setItem("rotaIndex", String(nextIndex));
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTask = routePoints[currentStopIndex];
  if (!currentTask) return null;

  return (
    <div className="relative h-screen w-full flex flex-col bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-[500] pointer-events-none">
        <div className="bg-white/95 backdrop-blur shadow-lg rounded-2xl p-4 border border-slate-200 pointer-events-auto">
          <div className="flex justify-between items-start mb-2">
            <button
              onClick={() => router.back()}
              className="text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft size={20} />
            </button>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
              Parada {currentStopIndex + 1} de {routePoints.length}
            </span>
          </div>
          <h2 className="font-bold text-lg text-slate-800 leading-tight">
            {currentTask.title}
          </h2>
          <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm">
            <MapPin size={14} className="text-blue-500" />
            <span className="truncate">{currentTask.endereco}</span>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 z-0">
        <DriverMap
          route={routePoints}
          myLocation={currentPosition}
          currentStopIndex={currentStopIndex}
        />
      </div>

      {/* Footer */}
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

      {/* Modal Unificado */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
            <div className="text-center mb-4">
              <h3
                className={`text-xl font-bold ${
                  actionType === "COMPLETED"
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {actionType === "COMPLETED"
                  ? "Confirmar Entrega"
                  : "Reportar Problema"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {actionType === "COMPLETED"
                  ? "Tudo certo? Agende a próxima visita."
                  : "O que houve? Agende uma nova tentativa."}
              </p>
            </div>

            {/* DATA DE REAGENDAMENTO (Agora aparece para os dois casos) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {actionType === "COMPLETED"
                  ? "Próxima Visita"
                  : "Nova Tentativa"}
              </label>
              <input
                type="date"
                className={`w-full p-3 border rounded-xl text-sm outline-none 
                                    ${
                                      actionType === "FAILED"
                                        ? "focus:ring-red-500 bg-red-50 border-red-200"
                                        : "focus:ring-emerald-500 bg-emerald-50 border-emerald-200"
                                    }
                                `}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>

            {/* COMENTÁRIO */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Observação{" "}
                {actionType === "FAILED" && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-500 outline-none min-h-[80px]"
                placeholder={
                  actionType === "COMPLETED"
                    ? "Ex: Recebido por Ana na portaria..."
                    : "Ex: Cliente não estava, campainha estragada..."
                }
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
                                    ${
                                      actionType === "COMPLETED"
                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                        : "bg-red-600 hover:bg-red-700"
                                    }
                                    ${
                                      isSubmitting
                                        ? "opacity-70 cursor-not-allowed"
                                        : ""
                                    }
                                `}
              >
                {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
                {actionType === "COMPLETED" ? "Confirmar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// src/contexts/RealtimeTaskContext.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { createContext, useEffect } from "react";
import { toast } from "sonner"; // ou useToast do shadcn

interface RealtimeTaskContextType {
  subscribeToTasks: () => void;
}

const RealtimeTaskContext = createContext<RealtimeTaskContextType | null>(null);

export function RealtimeTaskProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("public:tasks")
      .on(
        "postgres_changes",
        {
          event: "*", // ou "INSERT" e "UPDATE"
          schema: "public",
          table: "tasks",
          filter: `assignedToId=eq.${user.id}`, // só tarefas atribuídas a mim
        },
        (payload: { new: any; old: any; eventType: string; }) => {
          console.log("Nova tarefa atribuída!", payload);

          const task = payload.new as any;
          const oldTask = payload.old as any;

          // Caso 1: Nova tarefa criada e atribuída a mim
          if (payload.eventType === "INSERT" && task.assignedToId === user.id) {
            toast.success(`Nova tarefa atribuída: ${task.title}`, {
              description: `Por: ${task.createdBy?.name || "Alguém"}`,
              action: {
                label: "Ver",
                onClick: () => window.location.href = `/tasks/${task.id}`,
              },
            });
          }

          // Caso 2: Tarefa existente foi atribuída a mim agora
          if (
            payload.eventType === "UPDATE" &&
            oldTask?.assignedToId !== user.id &&
            task.assignedToId === user.id
          ) {
            toast.success(`Você foi atribuído à tarefa: ${task.title}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <RealtimeTaskContext.Provider value={{ subscribeToTasks: () => {} }}>
      {children}
    </RealtimeTaskContext.Provider>
  );
}
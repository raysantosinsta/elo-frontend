"use client";

import { useEffect, useRef } from "react";
import { socketService } from "./socket";

export function useSocket() {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      socketService.connect();
      isInitialized.current = true;
    }

    return () => {
      // Não desconecta aqui para manter a conexão entre componentes
      // A desconexão pode ser feita manualmente quando necessário
    };
  }, []);

  return socketService;
}
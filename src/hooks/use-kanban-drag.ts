/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "sonner";

interface BaseItem {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface UseKanbanDragProps<T extends BaseItem> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  idField: keyof T;
  moveCallback: (
    itemId: string,
    newColumnId: string,
    responsibleId?: string,
    type?: "user" | "supplier",
  ) => Promise<any>; // Mudado para any para capturar resposta
  onRequireResponsible?: (
    itemId: string,
    targetColumnId: string,
    targetColumnName: string,
  ) => void;
  onMoveSuccess?: () => void;
  onMoveError?: (error: any) => void; // Callback opcional para erro
}

export function useKanbanDrag<T extends BaseItem>({
  items,
  setItems,
  idField,
  moveCallback,
  onRequireResponsible,
  onMoveSuccess,
  onMoveError,
}: UseKanbanDragProps<T>) {
  const onDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData("itemId", itemId);
    e.dataTransfer.effectAllowed = "move";
    console.log("[useKanbanDrag] Drag iniciado para item:", itemId);
  };

  const moveItem = async (
    itemId: string,
    targetColumnId: string,
    targetColumnName?: string,
  ) => {
    console.log("📦 moveItem EXECUTADO:", {
      itemId,
      targetColumnId,
      targetColumnName,
    });

    const item = items.find((i) => i.id === itemId);

    if (!item) {
      console.error("[useKanbanDrag] Item não encontrado:", itemId);
      toast.error("Item não encontrado");
      return;
    }

    if (item[idField] === targetColumnId) {
      console.log("[useKanbanDrag] Item já está na coluna destino, ignorando");
      return;
    }

    console.log("[useKanbanDrag] moveItem chamado", {
      itemId,
      targetColumnId,
      targetColumnName,
      currentColumn: item[idField],
    });

    // 🔥 IMPORTANTE: Verifica se há callback de responsável
    if (onRequireResponsible) {
      console.log("[useKanbanDrag] Chamando onRequireResponsible");
      onRequireResponsible(
        itemId,
        targetColumnId,
        targetColumnName || "destino",
      );
      return;
    }

    await executeMove(itemId, targetColumnId);
  };

  const executeMove = async (
    itemId: string,
    targetColumnId: string,
    responsibleId?: string,
    type?: "user" | "supplier",
  ) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      console.error(
        "[useKanbanDrag] executeMove: Item não encontrado:",
        itemId,
      );
      return;
    }

    console.log("[useKanbanDrag] executeMove", {
      itemId,
      targetColumnId,
      responsibleId,
      type,
      currentColumn: item[idField],
    });

    const previousItems = [...items];
    const previousColumnId = item[idField];

    // Atualização otimista
    // Atualização otimista - preserva todas as propriedades do item
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i, // 🔥 Mantém todas as propriedades originais (incluindo flowColor)
              [idField]: targetColumnId,
            }
          : i,
      ),
    );

    const toastId = toast.loading("Movendo item...");

    try {
      // Adiciona timeout de 30 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Executa o movimento
      const response = await moveCallback(
        itemId,
        targetColumnId,
        responsibleId,
        type,
      );

      clearTimeout(timeoutId);

      console.log("[useKanbanDrag] Movimento concluído com sucesso:", response);

      toast.success("Item movido com sucesso!", { id: toastId });

      if (onMoveSuccess) {
        onMoveSuccess();
      }
    } catch (error: any) {
      console.error("[useKanbanDrag] Erro ao mover item:", error);

      // Log detalhado do erro
      console.error("[useKanbanDrag] Detalhes do erro:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code,
        name: error.name,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
        },
      });

      // Verifica se foi erro de timeout
      if (
        error.code === "ECONNABORTED" ||
        error.message?.includes("timeout") ||
        error.name === "AbortError" ||
        error.code === "ERR_CANCELED"
      ) {
        console.log(
          "[useKanbanDrag] Timeout detectado, mantendo atualização otimista",
        );

        toast.warning(
          "A movimentação pode ter sido concluída, mas não foi possível confirmar. Atualize a página para ver o estado real.",
          {
            id: toastId,
            duration: 8000,
            action: {
              label: "Atualizar",
              onClick: () => window.location.reload(),
            },
          },
        );

        // Tenta recarregar os dados após 2 segundos
        setTimeout(() => {
          if (onMoveSuccess) {
            console.log("[useKanbanDrag] Recarregando dados após timeout");
            onMoveSuccess();
          }
        }, 2000);

        return;
      }

      // Se for erro 500, verifica se foi sucesso no backend
      if (error.response?.status === 500) {
        console.log(
          "[useKanbanDrag] Erro 500 detectado - pode ter sido sucesso no backend",
        );

        toast.warning(
          "O item pode ter sido movido, mas houve um erro na resposta. Atualize a página para confirmar.",
          {
            id: toastId,
            duration: 8000,
            action: {
              label: "Atualizar",
              onClick: () => window.location.reload(),
            },
          },
        );

        // Não faz rollback - mantém a atualização otimista
        setTimeout(() => {
          if (onMoveSuccess) {
            console.log("[useKanbanDrag] Recarregando dados após erro 500");
            onMoveSuccess();
          }
        }, 2000);

        return;
      }

      // Para outros erros, faz rollback
      setItems(previousItems);

      // Mostra mensagem de erro
      const errorMessage =
        error.response?.data?.message || error.message || "Erro desconhecido";

      if (error.response?.status === 400) {
        toast.error(errorMessage, { id: toastId });
      } else {
        toast.error(`Erro ao mover item: ${errorMessage}`, { id: toastId });
      }

      if (onMoveError) {
        onMoveError(error);
      }
    }
  };

  return {
    onDragStart,
    moveItem,
    executeMove,
  };
}

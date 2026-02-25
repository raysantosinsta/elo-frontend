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
  moveCallback: (itemId: string, newColumnId: string, responsibleId?: string, type?: 'user' | 'supplier') => Promise<void>;
  onRequireResponsible?: (itemId: string, targetColumnId: string, targetColumnName: string) => void;
}

export function useKanbanDrag<T extends BaseItem>({
  items,
  setItems,
  idField,
  moveCallback,
  onRequireResponsible,
}: UseKanbanDragProps<T>) {

  const onDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData("itemId", itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const moveItem = async (itemId: string, targetColumnId: string, targetColumnName?: string) => {
      console.log('📦 moveItem EXECUTADO:', { itemId, targetColumnId, targetColumnName });

    const item = items.find((i) => i.id === itemId);
    
    if (!item || item[idField] === targetColumnId) return;

    console.log('[useKanbanDrag] moveItem chamado', { itemId, targetColumnId, targetColumnName });

    // 🔥 IMPORTANTE: Verifica se há callback de responsável
    if (onRequireResponsible) {
      console.log('[useKanbanDrag] Chamando onRequireResponsible');
      onRequireResponsible(itemId, targetColumnId, targetColumnName || "destino");
      return; // Interrompe aqui - o modal vai continuar
    }

    // Se não precisa de responsável, executa direto
    await executeMove(itemId, targetColumnId);
  };

  const executeMove = async (itemId: string, targetColumnId: string, responsibleId?: string, type?: 'user' | 'supplier') => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    console.log('[useKanbanDrag] executeMove', { itemId, targetColumnId, responsibleId, type });

    const previousItems = [...items];

    // Atualização otimista
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, [idField]: targetColumnId } : i
      )
    );

    try {
      await moveCallback(itemId, targetColumnId, responsibleId, type);
    } catch (error) {
      console.error("Erro ao mover item:", error);
      // Rollback
      setItems(previousItems);
      toast.error("Erro ao mover o item. A ação foi desfeita.");
    }
  };

  return {
    onDragStart,
    moveItem,
    executeMove,
  };
}
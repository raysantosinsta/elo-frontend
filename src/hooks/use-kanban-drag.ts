import { toast } from "sonner";

// Interface genérica para garantir que o item tenha pelo menos um ID
// e permita acesso dinâmico a propriedades (como 'columnId' ou 'stageId')
interface BaseItem {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface UseKanbanDragProps<T extends BaseItem> {
  // A lista atual de itens (tasks ou flowItems)
  items: T[];
  // Função para atualizar o estado local dos itens
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  // O nome do campo que define a coluna (ex: 'columnId' para Tasks, 'stageId' para FlowItems)
  idField: keyof T;
  // A função assíncrona que chama a API
  moveCallback: (itemId: string, newColumnId: string) => Promise<void>;
}

export function useKanbanDrag<T extends BaseItem>({
  items,
  setItems,
  idField,
  moveCallback,
}: UseKanbanDragProps<T>) {

  /**
   * Deve ser passado para o evento `onDragStart` do Card ou Container do Item.
   * Configura o ID do item que está sendo arrastado.
   */
  const onDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData("itemId", itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  /**
   * Função lógica para mover o item.
   * Não depende do evento 'DragEvent', facilitando o uso com o componente KanbanColumn.
   * * @param itemId ID do item sendo movido
   * @param targetColumnId ID da coluna de destino
   */
  const moveItem = async (itemId: string, targetColumnId: string) => {
    const item = items.find((i) => i.id === itemId);
    
    // Se o item não existe ou já está na coluna destino, ignora
    if (!item || item[idField] === targetColumnId) return;

    // 1. Guardar estado anterior para rollback em caso de erro
    const previousItems = [...items];

    // 2. Atualização Otimista (Optimistic Update) - Atualiza a UI imediatamente
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, [idField]: targetColumnId } : i
      )
    );

    try {
      // 3. Chama a API
      await moveCallback(itemId, targetColumnId);
    } catch (error) {
      console.error("Erro ao mover item:", error);
      // 4. Rollback: Volta o estado anterior se der erro
      setItems(previousItems);
      toast.error("Erro ao mover o item. A ação foi desfeita.");
    }
  };

  return {
    onDragStart,
    moveItem,
  };
}
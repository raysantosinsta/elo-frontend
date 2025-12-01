// src/app/Kanban/page.tsx
import ProductKanban from "@/app/Kanban/ProductKanban"; // seu componente atual
import ProtectedRoute from "@/components/ProtectedRoute";

export default function KanbanPage() {
  return (
    <ProtectedRoute>
      <ProductKanban />
    </ProtectedRoute>
  );
}
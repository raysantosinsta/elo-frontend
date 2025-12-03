// src/app/Kanban/page.tsx
import ProtectedRoute from "@/components/ProtectedRoute";
import ProductFlowKanban from "./ProductKanbanFlow";

export default function KanbanFlowPage() {
  return (
    <ProtectedRoute>
      <ProductFlowKanban />
    </ProtectedRoute>
  );
}
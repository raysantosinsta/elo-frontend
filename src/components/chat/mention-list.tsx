"use client";

import { User } from "@/types/chat";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon } from "lucide-react";
import { useMemo } from "react";

// --- HELPERS ---
const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

interface MentionListProps {
  users: User[] | undefined | null;
  onSelect: (user: User) => void;
  selectedIndex: number;
  position: { top: number; left: number };
}

export function MentionList({
  users,
  onSelect,
  selectedIndex,
  position,
}: MentionListProps) {
  // 🔥 Garante que SEMPRE será array e memoiza para performance
  const safeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);

  // Early return limpo
  if (safeUsers.length === 0) return null;

  return (
    <div
      className="fixed z-50 flex w-64 flex-col overflow-hidden rounded-xl border border-[#95A5A6]/20 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150"
      style={{ 
        top: position.top, 
        left: position.left,
        // Garante que não estoure a tela se estiver muito em baixo (opcional, mas boa prática)
        maxHeight: "240px" 
      }}
      role="listbox"
      aria-label="Sugestões de menção"
    >
      {/* Header Visual Opcional */}
      <div className="bg-[#F5F0E6]/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#95A5A6]">
        Mencionar
      </div>

      <div className="custom-scrollbar overflow-y-auto p-1">
        {safeUsers.map((user, index) => {
          const isSelected = index === selectedIndex;

          return (
            <button
              key={user.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-200 ${
                isSelected
                  ? "bg-[#F5F0E6] text-[#2D3436]" // Highlight: Algodão Cru + Grafite
                  : "text-[#2D3436] hover:bg-[#F5F0E6]/50"
              }`}
              onClick={() => onSelect(user)}
              // UX CRÍTICA: Previne que o input perca o foco ao clicar na lista
              onMouseDown={(e) => e.preventDefault()}
            >
              {/* Avatar com fallback e cor da marca */}
              <div 
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ${
                  isSelected ? "bg-[#D35400]" : "bg-[#2C3E50]" // Terracota no hover, Azul padrão
                }`}
              >
                {user.name ? getInitials(user.name) : <UserIcon className="h-4 w-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-none">
                  {user.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-[#95A5A6]">
                  {user.professionalRole || user.email || "Colaborador"}
                </p>
              </div>

              {/* Badge de Profissional */}
              {user.professionalRole && (
                <Badge 
                  variant="secondary" 
                  className="bg-[#D35400]/10 text-[#D35400] hover:bg-[#D35400]/20 text-[9px] px-1.5 h-5 rounded"
                >
                  Pro
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
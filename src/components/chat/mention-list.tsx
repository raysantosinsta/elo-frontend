"use client";

import { User } from "@/types/chat";
import { Badge } from "@/components/ui/badge";

interface MentionListProps {
  users: User[] | undefined | null; // ← aceita qualquer formato sem quebrar
  onSelect: (user: User) => void;
  selectedIndex: number;
  position: { top: number; left: number };
}

export function MentionList({
  users,
  onSelect,
  selectedIndex,
  position
}: MentionListProps) {

  // 🔥 Garante que SEMPRE será array
  const safeUsers = Array.isArray(users) ? users : [];

  if (safeUsers.length === 0) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className="absolute z-50 w-64 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {safeUsers.map((user, index) => (
        <div
          key={user.id}
          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-accent ${
            index === selectedIndex ? "bg-accent" : ""
          }`}
          onClick={() => onSelect(user)}
        >
          {/* Avatar com iniciais */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-bold">
            {getInitials(user.name)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.professionalRole || "Usuário"}
            </p>
          </div>

          {user.isProfessional && (
            <Badge variant="secondary" className="text-xs">
              Prof
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

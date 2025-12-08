"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types/chat";
import { Send, Loader2, User as UserIcon } from "lucide-react";
import { useMentions } from "@/hooks/use-app-features";

// --- TYPES ---

interface MessageInputProps {
  onSendMessage: (message: string, mentionedUserId?: string) => void;
  disabled?: boolean;
}

interface MentionListProps {
  users: User[];
  onSelect: (user: User) => void;
  selectedIndex: number;
  position: { top: number; left: number };
  isLoading?: boolean;
}

// --- SUB-COMPONENT: MENTION LIST ---

function MentionList({ users, onSelect, selectedIndex, position, isLoading }: MentionListProps) {
  // UX: Não mostrar nada se vazio e não carregando
  if (!isLoading && users.length === 0) return null;

  return (
    <div 
      className="fixed z-50 min-w-[240px] max-w-[300px] overflow-hidden rounded-xl border border-[#95A5A6]/20 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100 ease-out"
      role="listbox"
      style={{ 
        // Lógica de posicionamento mantida ("popover" style)
        bottom: `calc(100vh - ${position.top}px + 8px)`, 
        left: `${position.left}px`,
      }}
    >
      {/* Header da Lista (Opcional, para contexto) */}
      <div className="bg-[#F5F0E6]/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#95A5A6]">
        Sugestões
      </div>

      <div className="max-h-[240px] overflow-y-auto p-1 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-[#D35400]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-xs font-medium text-[#95A5A6]">Buscando...</span>
          </div>
        ) : (
          users.map((user, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
                  isSelected 
                    ? "bg-[#F5F0E6] text-[#2D3436]" // Highlight: Algodão Cru
                    : "text-[#2D3436] hover:bg-[#F5F0E6]/50"
                }`}
                onClick={() => onSelect(user)}
                onMouseDown={(e) => e.preventDefault()} // UX: Mantém foco no input
              >
                {/* Avatar Placeholder */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
                    isSelected ? "bg-[#D35400]" : "bg-[#95A5A6]"
                }`}>
                  <span className="text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium leading-none">
                    {user.name}
                  </div>
                  <div className="mt-1 truncate text-xs text-[#95A5A6]">
                    {user.email}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

export function MessageInput({ onSendMessage, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmedMentions = useRef<User[]>([]);

  const {
    results,
    showList,
    position,
    selectedIndex,
    isLoading,
    handleInputChange,
    insertMention,
    handleKeyDown,
    close
  } = useMentions();

  // --- HANDLERS ---

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    setMessage(value);
    handleInputChange(value, cursorPosition, inputRef.current || undefined);
  };

  const handleSelectUser = (user: User) => {
    if (!inputRef.current) return;

    confirmedMentions.current.push(user);

    const cursorPosition = inputRef.current.selectionStart || 0;
    const { text, cursor } = insertMention(message, user, cursorPosition);
    
    setMessage(text);
    close();
    
    // UX: Recupera foco e posição do cursor
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(cursor, cursor);
      }
    }, 0);
  };

  const handleKeyDownWrapper = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Se a lista de menções estiver visível, o hook controla a navegação
    if (showList) {
      handleKeyDown(e, handleSelectUser);
      return;
    }

    // Envio rápido com Enter (sem Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getMentionedUserId = (finalMessage: string): string | undefined => {
    if (confirmedMentions.current.length === 0) return undefined;
    // Validação robusta: verifica se a menção ainda existe no texto final
    const foundUser = confirmedMentions.current.find(user => 
      finalMessage.includes(`@${user.name}`)
    );
    return foundUser?.id;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) return;

    const mentionedUserId = getMentionedUserId(message);
    
    onSendMessage(message.trim(), mentionedUserId);
    
    setMessage("");
    confirmedMentions.current = [];
    close();
  };

  // UX: Fecha a lista ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

  // --- RENDER ---

  return (
    <div className="relative w-full">
      {/* Lista de Menções (Renderização Condicional) */}
      {showList && (
        <MentionList
          users={results}
          onSelect={handleSelectUser}
          selectedIndex={selectedIndex}
          position={position}
          isLoading={isLoading}
        />
      )}
      
      <form 
        onSubmit={handleSubmit} 
        className="group relative flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-[#95A5A6]/20 transition-all focus-within:shadow-md focus-within:ring-[#D35400]/50"
      >
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Digite sua mensagem... (@ para mencionar)"
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDownWrapper}
            disabled={disabled}
            autoComplete="off"
            // A11y Attributes
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-haspopup="listbox"
            // Styling overrides for seamless integration
            className="h-10 w-full border-0 bg-transparent px-3 text-[#2D3436] placeholder:text-[#95A5A6] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={disabled || !message.trim()}
          size="icon"
          className={`h-9 w-9 shrink-0 transition-all duration-200 ${
            !message.trim() 
              ? "bg-[#95A5A6]/20 text-[#95A5A6]" // Estado inativo: Cinza claro
              : "bg-[#D35400] text-white hover:bg-[#D35400]/90 shadow-md hover:shadow-lg hover:-translate-y-0.5" // Estado ativo: Terracota + Microinteração
          }`}
          aria-label="Enviar mensagem"
        >
          <Send className="h-4 w-4" strokeWidth={2.5} />
        </Button>
      </form>
    </div>
  );
}
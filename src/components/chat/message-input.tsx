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
  if (!isLoading && users.length === 0) return null;

  return (
    <div 
      className="fixed z-50 min-w-[240px] max-w-[300px] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg animate-in fade-in zoom-in-95 duration-100 ease-out"
      role="listbox"
      style={{ 
        bottom: `calc(100vh - ${position.top}px + 8px)`, 
        left: `${position.left}px`,
      }}
    >
      <div className="bg-[#F5F6FA] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#7A7E83]">
        Sugestões
      </div>

      <div className="max-h-[240px] overflow-y-auto p-1 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-[#2F80ED]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-xs font-medium text-[#7A7E83]">Buscando...</span>
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
                    ? "bg-[#F5F6FA] text-[#353A40]"
                    : "text-[#353A40] hover:bg-[#F5F6FA]"
                }`}
                onClick={() => onSelect(user)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
                    isSelected ? "bg-[#2F80ED]" : "bg-[#7A7E83]"
                }`}>
                  <span className="text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium leading-none text-[#353A40]">
                    {user.name}
                  </div>
                  <div className="mt-1 truncate text-xs text-[#7A7E83]">
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
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(cursor, cursor);
      }
    }, 0);
  };

  const handleKeyDownWrapper = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showList) {
      handleKeyDown(e, handleSelectUser);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getMentionedUserId = (finalMessage: string): string | undefined => {
    if (confirmedMentions.current.length === 0) return undefined;
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
        className="group relative flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-[#E2E8F0] transition-all focus-within:shadow-md focus-within:ring-[#2F80ED]/50"
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
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-haspopup="listbox"
            className="h-10 w-full border-0 bg-transparent px-3 text-[#353A40] placeholder:text-[#7A7E83] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={disabled || !message.trim()}
          size="icon"
          className={`h-9 w-9 shrink-0 transition-all duration-200 ${
            !message.trim() 
              ? "bg-[#7A7E83]/20 text-[#7A7E83]"
              : "bg-[#2F80ED] text-white hover:bg-[#1E5CB8] shadow-sm hover:shadow-md hover:-translate-y-0.5"
          }`}
          aria-label="Enviar mensagem"
        >
          <Send className="h-4 w-4" strokeWidth={2.5} />
        </Button>
      </form>
    </div>
  );
}
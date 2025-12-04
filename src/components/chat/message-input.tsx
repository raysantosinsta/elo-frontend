"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types/chat";
import { Send } from "lucide-react";
import { useMentions } from "@/hooks/use-app-features";

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

function MentionList({ users, onSelect, selectedIndex, position, isLoading }: MentionListProps) {
  // Se não estiver carregando e não tiver usuários, não renderiza
  if (!isLoading && users.length === 0) return null;

  return (
    <div 
      className="fixed bg-background border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto min-w-64"
      // Ajuste visual: renderiza a lista subindo a partir da posição (estilo tooltip de chat)
      style={{ 
        bottom: `calc(100vh - ${position.top}px)`, 
        left: `${position.left}px`,
      }}
    >
      {isLoading ? (
        <div className="p-3 text-sm text-muted-foreground">Carregando...</div>
      ) : (
        users.map((user, index) => (
          <button
            key={user.id}
            type="button"
            className={`w-full text-left p-2 hover:bg-muted/50 rounded-lg flex items-center gap-2 transition-colors ${
              index === selectedIndex ? 'bg-muted' : ''
            }`}
            onClick={() => onSelect(user)}
            // Previne perder o foco do input ao clicar
            onMouseDown={(e) => e.preventDefault()} 
          >
            <div className="flex-1 overflow-hidden">
              <div className="font-medium truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {user.email}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

export function MessageInput({ onSendMessage, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Ref para armazenar usuários que foram selecionados durante a digitação
  // Isso resolve o problema de 'results' estar vazio na hora do envio
  const confirmedMentions = useRef<User[]>([]);

  const {
    results,          // Nome corrigido (vem do hook)
    showList,         // Nome corrigido
    position,         // Nome corrigido
    selectedIndex,    // Agora existe no hook atualizado
    isLoading,
    handleInputChange,
    insertMention,
    handleKeyDown,    // Agora existe no hook atualizado
    close
  } = useMentions();

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    setMessage(value);
    handleInputChange(value, cursorPosition, inputRef.current || undefined);
  };

  const handleSelectUser = (user: User) => {
    if (!inputRef.current) return;

    // 1. Guarda o usuário na lista de confirmados
    confirmedMentions.current.push(user);

    // 2. Insere o texto
    const cursorPosition = inputRef.current.selectionStart || 0;
    const { text, cursor } = insertMention(message, user, cursorPosition);
    
    setMessage(text);
    close();
    
    // 3. Devolve o foco e ajusta o cursor
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(cursor, cursor);
      }
    }, 0);
  };

  // Wrapper para lidar com navegação na lista vs envio de mensagem
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

    // Procura nos usuários confirmados se algum ainda está presente no texto final
    // Ex: O usuário pode ter selecionado "@Joao", mas depois apagou e escreveu "@Pedro" manualmente
    const foundUser = confirmedMentions.current.find(user => 
      finalMessage.includes(`@${user.name}`)
    );

    return foundUser?.id;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) return;

    // Busca o ID com base no histórico de seleções + texto atual
    const mentionedUserId = getMentionedUserId(message);
    
    onSendMessage(message.trim(), mentionedUserId);
    
    // Limpeza
    setMessage("");
    confirmedMentions.current = []; // Limpa histórico de menções
    close();
  };

  // Fecha lista ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Se clicar fora do input E fora da lista (a lista é portal ou fixed, mas o clique fecha)
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

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
      
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Digite sua mensagem... (@ para mencionar)"
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDownWrapper}
            disabled={disabled}
            className="pr-4 w-full"
            autoComplete="off"
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={disabled || !message.trim()}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
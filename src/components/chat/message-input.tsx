"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types/chat";
import { Send } from "lucide-react";
import { useMentions } from "@/hooks/useMentions";

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
  if (!isLoading && users.length === 0) return null;

  return (
    <div 
      className="fixed bg-background border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto min-w-64"
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        transform: 'translateY(8px)'
      }}
    >
      {isLoading ? (
        <div className="p-3 text-sm text-muted-foreground">Carregando usuários...</div>
      ) : (
        users.map((user, index) => (
          <button
            key={user.id}
            type="button"
            className={`w-full text-left p-2 hover:bg-muted rounded-lg flex items-center gap-2 ${
              index === selectedIndex ? 'bg-muted' : ''
            }`}
            onClick={() => onSelect(user)}
          >
            <div className="flex-1">
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">
                {user.email} • {user.phone}
              </div>
            </div>
            {user.isProfessional && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                {user.professionalRole || 'Profissional'}
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
}

export function MessageInput({ onSendMessage, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    mentionResults,
    showMentionList,
    mentionPosition,
    selectedIndex,
    isLoading,
    handleInputChange,
    insertMention,
    closeMentionList,
    handleKeyDown
  } = useMentions();

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    setMessage(value);
    handleInputChange(value, cursorPosition, inputRef.current || undefined);
  };

  const handleSelectUser = (user: User) => {
    if (!inputRef.current) return;

    const cursorPosition = inputRef.current.selectionStart || 0;
    const { newText, newCursorPosition } = insertMention(message, user, cursorPosition);
    
    setMessage(newText);
    closeMentionList();
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };


  const handleKeyDownWrapper = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionList) {
      handleKeyDown(e, handleSelectUser);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

 

// CORREÇÃO na função extractMentionedUserId
const extractMentionedUserId = (finalMessage: string, availableUsers: User[]): string | undefined => {
  if (!availableUsers || availableUsers.length === 0) {
    console.log('🔍 Nenhum usuário disponível para verificar a menção.');
    return undefined;
  }

  // Encontra o primeiro usuário disponível cujo nome está na mensagem após um '@'
  const mentionedUser = availableUsers.find(user => 
    finalMessage.includes(`@${user.name}`)
  );

  if (mentionedUser) {
    console.log(`✅ Usuário encontrado para menção: ${mentionedUser.name} (${mentionedUser.id})`);
    return mentionedUser.id;
  }

  console.log(`❌ Nenhuma menção correspondente encontrada na mensagem para os usuários disponíveis.`);
  return undefined;
};

// ATUALIZAR o handleSubmit para passar os mentionResults
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!message.trim() || disabled) return;

  // 🔥 CORREÇÃO: Passar os mentionResults disponíveis
  const mentionedUserId = extractMentionedUserId(message, mentionResults);
  
  console.log(`📤 Enviando mensagem: "${message}"`, mentionedUserId ? `Menção: ${mentionedUserId}` : 'Sem menção');

  onSendMessage(message.trim(), mentionedUserId);
  setMessage("");
  closeMentionList();
};

  // Fechar menções ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        closeMentionList();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeMentionList]);

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Digite sua mensagem... Use @ para mencionar"
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDownWrapper}
            disabled={disabled}
            className="pr-4"
          />
          
          {showMentionList && (
            <MentionList
              users={mentionResults}
              onSelect={handleSelectUser}
              selectedIndex={selectedIndex}
              position={mentionPosition}
              isLoading={isLoading}
            />
          )}
        </div>
        
        <Button 
          type="submit" 
          disabled={disabled || !message.trim()}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
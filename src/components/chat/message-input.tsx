"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMentions } from "@/hooks/useMentions";
import { User } from "@/types/chat";
import { Send } from "lucide-react";
import { KeyboardEvent, useCallback, useRef, useState } from "react";
import { MentionList } from "./mention-list";

interface MessageInputProps {
  onSendMessage: (message: string, mentionedUserId?: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [mentionedUserId, setMentionedUserId] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    mentionQuery,
    mentionResults,
    showMentionList,
    mentionPosition,
    handleInputChange,
    handleKeyDown: handleMentionKeyDown,
    insertMention,
    closeMentionList,
    selectedIndex,
  } = useMentions();

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const newValue = target.value;
    const cursorPosition = target.selectionStart || 0;
    
    setMessage(newValue);
    handleInputChange(newValue, cursorPosition);
    setMentionedUserId(undefined); // Resetar menção ao editar
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    handleMentionKeyDown(e, handleSelectMention);
  };

  const handleSelectMention = useCallback((user: User) => {
    if (!inputRef.current) return;

    const cursorPosition = inputRef.current.selectionStart || 0;
    const { newText, newCursorPosition, mentionedUserId } = insertMention(
      message,
      user,
      cursorPosition
    );

    setMessage(newText);
    setMentionedUserId(mentionedUserId);
    closeMentionList();

    // Restaurar foco e posição do cursor
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  }, [message, insertMention, closeMentionList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), mentionedUserId);
      setMessage("");
      setMentionedUserId(undefined);
      closeMentionList();
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... Use @ para mencionar"
            disabled={disabled}
            className="flex-1 pr-4"
          />
          
          {showMentionList && (
            <MentionList
              users={mentionResults}
              onSelect={handleSelectMention}
              selectedIndex={selectedIndex}
              position={mentionPosition}
            />
          )}
        </div>
        
        <Button type="submit" disabled={!message.trim() || disabled} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
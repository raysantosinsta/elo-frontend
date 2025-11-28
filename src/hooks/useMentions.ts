"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { User } from "@/types/chat";
import { api } from "@/lib/api";

export function useMentions() {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<User[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const mentionTriggerIndex = useRef(-1);
  const timeoutRef = useRef<number | null>(null);

  // Cleanup do timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // CORREÇÃO no useMentions hook - melhor debounce
const handleInputChange = useCallback(
  (text: string, cursorPosition: number, inputElement?: HTMLInputElement) => {
    const atIndex = text.lastIndexOf("@", cursorPosition - 1);

    // Verificar se o @ está no início ou após espaço/nova linha
    if (atIndex !== -1 && (atIndex === 0 || text[atIndex - 1] === " " || text[atIndex - 1] === "\n")) {
      // Pegar apenas o texto entre o @ e o cursor (sem espaços)
      const textAfterAt = text.substring(atIndex + 1, cursorPosition);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      // Se encontrou espaço, pegar apenas a primeira palavra
      const query = spaceIndex !== -1 ? textAfterAt.substring(0, spaceIndex) : textAfterAt;
      
      console.log(`🔍 Detecção de menção: "${textAfterAt}" → Query: "${query}"`);

      // Se a query estiver vazia ou só tiver espaço, não mostrar
      if (!query.trim()) {
        setShowMentionList(false);
        return;
      }

      setMentionQuery(query);
      setShowMentionList(true);
      mentionTriggerIndex.current = atIndex;
      setSelectedIndex(0);

      // Calcular posição real se tiver o elemento
      if (inputElement) {
        const rect = inputElement.getBoundingClientRect();
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        
        setMentionPosition({ 
          top: rect.bottom + scrollY, 
          left: rect.left + scrollX 
        });
      }

      // 🔥 MELHORIA: Debounce mais eficiente
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      setIsLoading(true);
      timeoutRef.current = window.setTimeout(() => {
        api.getUsersForMention(query)
          .then((users) => {
            console.log(`✅ ${users.length} usuários encontrados para "${query}"`);
            setMentionResults(users);
            setIsLoading(false);
            
            // 🔥 CORREÇÃO: Se não há resultados, fechar a lista
            if (users.length === 0) {
              setShowMentionList(false);
            }
          })
          .catch((error) => {
            console.error('❌ Erro na busca de menções:', error);
            setIsLoading(false);
            setMentionResults([]);
            setShowMentionList(false);
          });
      }, 300);
    } else {
      setShowMentionList(false);
    }
  },
  []
);

  const closeMentionList = useCallback(() => {
    setShowMentionList(false);
    setSelectedIndex(0);
  }, []);

  const insertMention = useCallback(
    (text: string, user: User, cursorPosition: number) => {
      const start = mentionTriggerIndex.current;
      const end = cursorPosition;

      const beforeMention = text.substring(0, start);
      const afterMention = text.substring(end);
      
      // Substituir apenas a query pela menção completa
      const newText = `${beforeMention}@${user.name} ${afterMention}`;
      const newCursorPosition = start + user.name.length + 2; // +2 para "@" e espaço

      console.log(`📝 Inserindo menção: @${user.name}`, {
        start, end, newCursorPosition
      });

      return {
        newText,
        newCursorPosition,
        mentionedUserId: user.id,
      };
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, onSelect: (user: User) => void) => {
      if (!showMentionList || mentionResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prevIndex) =>
          Math.min(prevIndex + 1, mentionResults.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        if (mentionResults[selectedIndex]) {
          onSelect(mentionResults[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeMentionList();
      } else if (e.key === "Backspace" && mentionQuery === "") {
        closeMentionList();
      }
    },
    [showMentionList, mentionResults, selectedIndex, mentionQuery, closeMentionList]
  );

  return {
    mentionQuery,
    mentionResults,
    showMentionList,
    mentionPosition,
    selectedIndex,
    isLoading,
    handleInputChange,
    insertMention,
    closeMentionList,
    handleKeyDown,
  };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { User } from "@/types/chat";
import { api } from "@/lib/api";

// Busca real no backend
const getUsersForMention = async (query: string): Promise<User[]> => {
  if (!query.trim()) return [];

  try {
    const results = await api.searchUsers(query);

    if (!Array.isArray(results)) {
      console.error("Backend não retornou array:", results);
      return [];
    }

    return results;
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return [];
  }
};



export function useMentions() {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<User[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const mentionTriggerIndex = useRef(-1);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = useCallback(
    (text: string, cursorPosition: number) => {
      const atIndex = text.lastIndexOf("@", cursorPosition - 1);

      if (atIndex !== -1 && (atIndex === 0 || text[atIndex - 1] === " ")) {
        const query = text.substring(atIndex + 1, cursorPosition);
        setMentionQuery(query);
        setShowMentionList(true);
        mentionTriggerIndex.current = atIndex;
        setSelectedIndex(0);

        // debounce para evitar flood no backend
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
          getUsersForMention(query).then(setMentionResults);
        }, 200);

        // TODO: Calcular posição real depois
        setMentionPosition({ top: 40, left: 0 });
      } else {
        setShowMentionList(false);
      }
    },
    []
  );

  const closeMentionList = useCallback(() => {
    setShowMentionList(false);
  }, []);

  const insertMention = useCallback(
    (text: string, user: User, cursorPosition: number) => {
      const start = mentionTriggerIndex.current;
      const end = cursorPosition;

      const newText = `${text.substring(0, start)}@${user.name} ${text.substring(
        end
      )}`;
      const newCursorPosition = start + user.name.length + 2;

      return {
        newText,
        newCursorPosition,
        mentionedUserId: user.id,
      };
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, onSelect: (user: User) => void) => {
      if (!showMentionList) return;

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
      }
    },
    [showMentionList, mentionResults, closeMentionList, selectedIndex]
  );

  return {
    mentionQuery,
    mentionResults,
    showMentionList,
    mentionPosition,
    selectedIndex,
    handleInputChange,
    insertMention,
    closeMentionList,
    handleKeyDown,
  };
}

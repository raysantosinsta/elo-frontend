"use client";

import { useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/types/chat";
import { MessageCircle } from "lucide-react";

// --- Funções Auxiliares ---
const formatMessage = (text: string) => {
  const parts = text.split(/(@[^\s@]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={index}
          className="bg-blue-100 text-blue-800 px-1 rounded mx-1 font-medium"
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 45%)`;
};

const GenericAvatar = ({ name, className = "" }: { name: string; className?: string }) => {
  const initials = name ? name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2) : "??";
  const backgroundColor = stringToColor(name || "");

  return (
    <div 
      className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${className}`}
      style={{ backgroundColor }}
    >
      {initials}
    </div>
  );
};

// --- Componente Principal ---

interface ChatMessagesProps {
  messages: ChatMessage[];
  currentUserId: string;
}

export function ChatMessages({
  messages,
  currentUserId,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 🔥 CORREÇÃO CRÍTICA: Filtra IDs duplicados antes de renderizar
  // Isso resolve o erro "two children with the same key"
  const uniqueMessages = useMemo(() => {
    const seen = new Set();
    const safeMessages = Array.isArray(messages) ? messages : [];
    
    return safeMessages.filter(msg => {
      if (!msg.id) return false; // Proteção contra mensagens sem ID
      const duplicate = seen.has(msg.id);
      seen.add(msg.id);
      return !duplicate;
    });
  }, [messages]);

  // Scroll automático usando a lista filtrada
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [uniqueMessages]); 

  const isSameSender = (currentIndex: number): boolean => {
    if (currentIndex === 0) return false;
    const currentMessage = uniqueMessages[currentIndex];
    const previousMessage = uniqueMessages[currentIndex - 1];
    return currentMessage.senderId === previousMessage.senderId;
  };

  const shouldShowAvatar = (currentIndex: number): boolean => {
    if (currentIndex === uniqueMessages.length - 1) return true;
    const currentMessage = uniqueMessages[currentIndex];
    const nextMessage = uniqueMessages[currentIndex + 1];
    return currentMessage.senderId !== nextMessage.senderId;
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-none"> 
      <CardContent className="p-4 flex-1 overflow-y-auto h-0 min-h-0">
        {uniqueMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-center mb-4">
              <div className="h-16 w-16 mx-auto mb-2 flex items-center justify-center rounded-full bg-muted">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Nenhuma mensagem ainda</h3>
              <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {uniqueMessages.map((message, index) => {
              const isCurrentUser = message.senderId === currentUserId;
              const sameSenderAsPrevious = isSameSender(index);
              const showAvatar = shouldShowAvatar(index);

              return (
                <div
                  key={message.id} // Agora garantimos que este ID é único
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} ${sameSenderAsPrevious ? "mt-1" : "mt-4"}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
                    {showAvatar ? (
                      <GenericAvatar 
                        name={message.sender?.name || "Usuário"}
                        className={isCurrentUser ? "order-2" : "order-1"}
                      />
                    ) : (
                      <div className="w-8 flex-shrink-0" />
                    )}

                    <div className={`rounded-lg p-3 shadow-sm ${isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"} ${!showAvatar ? (isCurrentUser ? "mr-11" : "ml-11") : ""}`}>
                      {!sameSenderAsPrevious && !isCurrentUser && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold opacity-90">{message.sender?.name}</span>
                          {message.sender?.isProfessional && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{message.sender.professionalRole || "Pro"}</Badge>
                          )}
                        </div>
                      )}
                      <div className="text-sm break-words leading-relaxed">{formatMessage(message.message)}</div>
                      <div className={`text-[10px] mt-1 text-right ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground/80"}`}>
                        {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/types/chat";
import { useChatSocket } from "@/hooks/useChatSocket";

interface ChatMessagesProps {
  messages: ChatMessage[];
  currentUserId: string;
  companyId?: string;
  chatId: string;
  onNewMessage?: (message: ChatMessage) => void;
}

// Função para estilizar menções no texto
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

export function ChatMessages({ 
  messages, 
  currentUserId, 
  companyId, 
  chatId,
  onNewMessage 
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
  const containerRef = useRef<HTMLDivElement>(null);

  // Usar WebSocket para receber mensagens em tempo real
  useChatSocket({
    chatId,
    currentUserId,
    companyId,
    onNewMessage: (newMessage: ChatMessage) => {
      setLocalMessages(prev => {
        // Evitar duplicatas
        if (!prev.find(msg => msg.id === newMessage.id)) {
          return [...prev, newMessage];
        }
        return prev;
      });
      
      // Chamar callback do parent se fornecido
      if (onNewMessage) {
        onNewMessage(newMessage);
      }
    },
    onUserNotification: (notification) => {
      console.log("Nova notificação:", notification);
    }
  });

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    // Scroll para baixo quando novas mensagens chegarem
    scrollToBottom();
  }, [localMessages]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isSameSender = (currentIndex: number): boolean => {
    if (currentIndex === 0) return false;
    const currentMessage = localMessages[currentIndex];
    const previousMessage = localMessages[currentIndex - 1];
    return currentMessage.senderId === previousMessage.senderId;
  };

  const shouldShowAvatar = (currentIndex: number): boolean => {
    if (currentIndex === localMessages.length - 1) return true;
    const currentMessage = localMessages[currentIndex];
    const nextMessage = localMessages[currentIndex + 1];
    return currentMessage.senderId !== nextMessage.senderId;
  };

  return (
    <Card className="flex-1">
      <CardContent 
        ref={containerRef}
        className="p-4 h-full overflow-y-auto"
      >
        {localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-center mb-4">
              {/* <Avatar className="h-16 w-16 mx-auto mb-2">
                <AvatarFallback className="text-lg">
                  💬
                </AvatarFallback>
              </Avatar> */}
              <h1>ola</h1>
              <h3 className="text-lg font-semibold">Nenhuma mensagem ainda</h3>
              <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {localMessages.map((message, index) => {
              const isCurrentUser = message.senderId === currentUserId;
              const sameSenderAsPrevious = isSameSender(index);
              const showAvatar = shouldShowAvatar(index);
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} ${
                    sameSenderAsPrevious ? "mt-1" : "mt-4"
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[85%] ${
                      isCurrentUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    {showAvatar ? (
                    //   <Avatar className="h-8 w-8 flex-shrink-0">
                    //     <AvatarFallback className="text-xs">
                    //       {getInitials(message.sender.name)}
                    //     </AvatarFallback>
                    //   </Avatar>
                    <h1>oi</h1>
                    ) : (
                      <div className="w-8 flex-shrink-0" /> // Espaço vazio para alinhar
                    )}
                    
                    {/* Mensagem */}
                    <div
                      className={`rounded-lg p-3 ${
                        isCurrentUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      } ${!showAvatar ? "ml-11" : ""}`}
                    >
                      {/* Cabeçalho da mensagem (nome e badges) */}
                      {!sameSenderAsPrevious && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.sender.name}
                          </span>
                          {message.sender.isProfessional && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs"
                            >
                              {message.sender.professionalRole || "Profissional"}
                            </Badge>
                          )}
                          {message.mentionedProfessionalId && (
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              @Mencionado
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Conteúdo da mensagem */}
                      <div className="text-sm break-words">
                        {formatMessage(message.message)}
                      </div>
                      
                      {/* Timestamp */}
                      <div className={`text-xs mt-2 ${
                        isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}>
                        {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
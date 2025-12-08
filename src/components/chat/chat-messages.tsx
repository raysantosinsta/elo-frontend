"use client";

import { useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/types/chat";
import { MessageCircle, User as UserIcon } from "lucide-react";

// --- HELPERS (Design System & Utils) ---

// Formata menções (@nome) usando a cor Azul Petróleo
const formatMessage = (text: string) => {
  const parts = text.split(/(@[^\s@]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={index}
          className="mx-0.5 inline-block rounded bg-[#2C3E50]/10 px-1.5 py-0.5 text-xs font-bold text-[#2C3E50]"
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

// Gera cores consistentes baseadas no nome, evitando cores muito claras
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Hue gira 360, Saturation fixo alto, Lightness médio para escuro para garantir contraste com texto branco
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 40%)`; 
};

// Avatar Component: Polido e Consistente
const GenericAvatar = ({ name, className = "" }: { name: string; className?: string }) => {
  const initials = name 
    ? name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2) 
    : "??";
  
  const backgroundColor = stringToColor(name || "");

  return (
    <div 
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ring-2 ring-white ${className}`}
      style={{ backgroundColor }}
      aria-label={`Avatar de ${name}`}
    >
      {name ? initials : <UserIcon className="h-4 w-4" />}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

interface ChatMessagesProps {
  messages: ChatMessage[];
  currentUserId: string;
}

export function ChatMessages({
  messages,
  currentUserId,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 🛡️ SECURITY & PERFORMANCE: Deduplicação e Memoização
  const uniqueMessages = useMemo(() => {
    const seen = new Set();
    const safeMessages = Array.isArray(messages) ? messages : [];
    
    return safeMessages.filter(msg => {
      if (!msg.id) return false;
      const duplicate = seen.has(msg.id);
      seen.add(msg.id);
      return !duplicate;
    });
  }, [messages]);

  // Auto-scroll suave
  useEffect(() => {
    if (uniqueMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [uniqueMessages.length]); // Dependência no length evita scroll excessivo em re-renders simples

  // Logic Helpers
  const isSameSender = (currentIndex: number): boolean => {
    if (currentIndex === 0) return false;
    return uniqueMessages[currentIndex].senderId === uniqueMessages[currentIndex - 1].senderId;
  };

  return (
    // Removido o <Card> externo para evitar bordas duplas com o container pai
    // Fundo transparente para herdar o "Algodão Cru" da página
    <div className="flex h-full flex-col"> 
      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        
        {/* EMPTY STATE */}
        {uniqueMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-white p-6 shadow-sm ring-1 ring-[#95A5A6]/20">
              <MessageCircle className="h-10 w-10 text-[#95A5A6]" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[#2D3436]">Nenhuma mensagem ainda</h3>
              <p className="max-w-xs text-sm text-[#95A5A6]">
                Este é o início da sua conversa. Envie uma mensagem para começar o atendimento.
              </p>
            </div>
          </div>
        ) : (
          /* MESSAGE LIST */
          <div className="space-y-1 pb-4">
            {uniqueMessages.map((message, index) => {
              const isCurrentUser = message.senderId === currentUserId;
              const sameSenderAsPrevious = isSameSender(index);
              
              // Agrupamento visual: Se for o mesmo remetente, margem menor
              const marginTop = sameSenderAsPrevious ? "mt-1" : "mt-6";

              return (
                <div
                  key={message.id}
                  className={`flex w-full ${isCurrentUser ? "justify-end" : "justify-start"} ${marginTop} animate-in slide-in-from-bottom-2 fade-in duration-300`}
                >
                  <div className={`flex max-w-[85%] gap-2 md:max-w-[70%] ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
                    
                    {/* AVATAR: Só mostra na primeira mensagem do bloco ou se mudou o remetente */}
                    {!sameSenderAsPrevious ? (
                      <GenericAvatar 
                        name={message.sender?.name || "Usuário"}
                        className="mt-1"
                      />
                    ) : (
                      <div className="w-8 shrink-0" /> // Espaçador para manter alinhamento
                    )}

                    {/* BUBBLE */}
                    <div className={`group relative flex flex-col rounded-2xl px-4 py-2 shadow-sm ${
                      isCurrentUser 
                        ? "bg-[#D35400] text-white rounded-tr-sm" // Terracota (Minha msg)
                        : "bg-white border border-[#95A5A6]/20 text-[#2D3436] rounded-tl-sm" // Branco (Outros)
                    }`}>
                      
                      {/* HEADER DA MENSAGEM (Nome + Cargo) - Só aparece para 'Outros' */}
                      {!sameSenderAsPrevious && !isCurrentUser && (
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2D3436]">
                            {message.sender?.name}
                          </span>
                          {message.sender?.isProfessional && (
                            <Badge 
                              variant="secondary" 
                              className="h-4 rounded px-1 text-[9px] font-normal bg-[#2C3E50]/10 text-[#2C3E50] hover:bg-[#2C3E50]/20"
                            >
                              {message.sender.professionalRole || "Pro"}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* CONTEÚDO */}
                      <div className="break-words text-sm leading-relaxed">
                        {formatMessage(message.message)}
                      </div>

                      {/* TIMESTAMP */}
                      <span className={`mt-1 block text-[10px] w-full text-right ${
                        isCurrentUser ? "text-white/70" : "text-[#95A5A6]"
                      }`}>
                        {new Date(message.createdAt).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
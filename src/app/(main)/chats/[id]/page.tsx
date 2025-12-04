"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { ChatMessages } from "@/components/chat/chat-messages";
import { MessageInput } from "@/components/chat/message-input";
import { api } from "@/lib/api";
import { Chat, ChatMessage } from "@/types/chat";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Calendar, Badge } from "lucide-react";
import Link from "next/link";
import { useChatSocket } from "@/hooks/useChatSocket";

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");

  // Decodificar token para obter currentUserId e companyId
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const decoded = jwtDecode<{ sub: string; companyId: string }>(token);
        setCurrentUserId(decoded.sub);
        setCompanyId(decoded.companyId);
      } catch (error) {
        console.error("Falha ao decodificar token", error);
        toast.error("Token inválido. Faça login novamente.");
      }
    } else {
      toast.error("Token não encontrado. Faça login.");
    }
  }, []);

  const loadChatData = useCallback(async () => {
    if (!currentUserId || !companyId || !chatId) return;
    
    try {
      setLoading(true);
      setError(null);
      const [chatData, messagesData] = await Promise.all([
        api.getChat(chatId),
        api.getChatMessages(chatId),
      ]);
      setChat(chatData);
      setMessages(messagesData);
    } catch (error) {
      console.error("Erro ao carregar chat:", error);
      setError("Erro ao carregar o chat. Verifique se o ID é válido.");
      toast.error("Erro ao carregar o chat");
    } finally {
      setLoading(false);
    }
  }, [chatId, currentUserId, companyId]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  const handleNewMessage = useCallback((newMessage: ChatMessage) => {
    setMessages(prev => {
      if (!prev.find(msg => msg.id === newMessage.id)) {
        return [...prev, newMessage];
      }
      return prev;
    });

    if (newMessage.mentionedProfessionalId === currentUserId) {
      toast.info(`Você foi mencionado por ${newMessage.sender.name}`, {
        description: newMessage.message,
        action: {
          label: "Responder",
          onClick: () => {
            const input = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (input) {
              input.focus();
              input.value = `@${newMessage.sender.name} `;
            }
          },
        },
      });
    }
  }, [currentUserId]);

  const handleSendMessage = async (messageText: string, mentionedUserId?: string) => {
    if (!messageText.trim() || !currentUserId) return;

    setSending(true);
    try {
      await api.createMessage({
        chatId,
        senderId: currentUserId,
        message: messageText,
        mentionedProfessionalId: mentionedUserId,
      });
      toast.success("Mensagem enviada!");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleRetry = () => {
    loadChatData();
  };

  useChatSocket({
    chatId,
    currentUserId,
    companyId,
    onNewMessage: handleNewMessage,
    onUserNotification: (notification) => {
      if (notification.type === 'mention' || notification.title?.includes('mencionado')) {
        toast.info(`Você foi mencionado por ${notification.mentionedBy}`, {
          description: notification.message,
          action: {
            label: "Ver",
            onClick: () => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement;
              input?.focus();
            },
          },
        });
      } else if (notification.event === 'notification:new') {
        toast.info(notification.title, {
          description: notification.message,
        });
      }
    },
  });

  if (loading || !currentUserId || !companyId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando chat...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Chat não encontrado</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRetry}>Tentar Novamente</Button>
                <Button asChild variant="outline">
                  <Link href="/chats">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Chats
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 h-screen flex flex-col">
      {/* Header do Chat */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/chats">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">
              Chat {chatId.slice(0, 8)}...
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Criado em {chat && new Date(chat.createdAt).toLocaleDateString('pt-BR')}
              </span>
              <span>•</span>
              <span>{messages.length} mensagens</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-600" />
            <span className="hidden sm:inline">Conectado</span>
          </div>
          
          {chat?.companyId && (
            <Badge>
              Empresa: {chat.companyId.slice(0, 8)}...
            </Badge>
          )}
        </div>
      </div>
      
      {/* Área de Mensagens - Esta é a parte principal que deve crescer e fazer scroll */}
      <div className="flex-1 min-h-0 py-4">
        <ChatMessages 
          messages={messages} 
          currentUserId={currentUserId}
          companyId={companyId}
          chatId={chatId}
          onNewMessage={handleNewMessage}
        />
      </div>
      
      {/* Input de Mensagem - Fica fixo na parte inferior */}
      <div className="p-4 border-t bg-background shrink-0">
        <MessageInput 
          onSendMessage={handleSendMessage}
          disabled={sending}
        />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Use @ para mencionar usuários. Eles receberão notificações via WhatsApp e no painel.
        </p>
      </div>
    </div>
  );
}
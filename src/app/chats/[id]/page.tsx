"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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

// Em uma aplicação real, esses dados viriam de autenticação
const CURRENT_USER_ID = "818fd6fe-07c2-452d-8e45-15a3b2b08873";
const COMPANY_ID = "0bc71c65-b37b-4037-ba6d-df47e51fab71";

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configurar WebSocket para notificações
  useChatSocket({
    chatId,
    currentUserId: CURRENT_USER_ID,
    companyId: COMPANY_ID,
    onNewMessage: (newMessage: ChatMessage) => {
      setMessages(prev => {
        // Evitar duplicatas
        if (!prev.find(msg => msg.id === newMessage.id)) {
          return [...prev, newMessage];
        }
        return prev;
      });
    },
    onUserNotification: (notification) => {
      if (notification.type === 'mention' || notification.title?.includes('mencionado')) {
        toast.info(`Você foi mencionado por ${notification.mentionedBy}`, {
          description: notification.message,
          action: {
            label: "Ver",
            onClick: () => {
              // Focar no input do chat
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

  const loadChatData = useCallback(async () => {
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
  }, [chatId]);

  useEffect(() => {
    if (chatId) {
      loadChatData();
    }
  }, [chatId, loadChatData]);

  const handleNewMessage = useCallback((newMessage: ChatMessage) => {
    setMessages(prev => {
      // Evitar duplicatas
      if (!prev.find(msg => msg.id === newMessage.id)) {
        return [...prev, newMessage];
      }
      return prev;
    });

    // Mostrar toast se a mensagem mencionar o usuário atual
    if (newMessage.mentionedProfessionalId === CURRENT_USER_ID) {
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
  }, []);

  const handleSendMessage = async (messageText: string, mentionedUserId?: string) => {
    if (!messageText.trim()) return;

    setSending(true);
    try {
      await api.createMessage({
        chatId,
        senderId: CURRENT_USER_ID,
        message: messageText,
        mentionedProfessionalId: mentionedUserId,
      });
      
      // A mensagem será adicionada via WebSocket, então não precisamos adicionar manualmente
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

  if (loading) {
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
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col h-[calc(100vh-140px)] max-h-[800px] gap-4">
        {/* Header do Chat */}
        <div className="flex items-center justify-between p-4 border-b">
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
            <div className={`flex items-center gap-2 text-sm ${
              true ? 'text-green-600' : 'text-red-600'
            }`}>
              <div className={`h-2 w-2 rounded-full ${
                true ? 'bg-green-600' : 'bg-red-600'
              }`} />
              <span className="hidden sm:inline">
                {true ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            
            {chat?.companyId && (
              <Badge >
                Empresa: {chat.companyId.slice(0, 8)}...
              </Badge>
            )}
          </div>
        </div>
        
        {/* Área de Mensagens */}
        <div className="flex-1 min-h-0">
          <ChatMessages 
            messages={messages} 
            currentUserId={CURRENT_USER_ID}
            companyId={COMPANY_ID}
            chatId={chatId}
            onNewMessage={handleNewMessage}
          />
        </div>
        
        {/* Input de Mensagem */}
        <div className="p-4 border-t bg-background">
          <MessageInput 
            onSendMessage={handleSendMessage}
            disabled={sending}
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Use @ para mencionar usuários. Eles receberão notificações via WhatsApp e no painel.
          </p>
        </div>
      </div>
    </div>
  );
}
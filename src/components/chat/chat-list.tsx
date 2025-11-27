"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Chat } from "@/types/chat";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ChatListProps {
  currentUserId: string;
  companyId?: string;
}

export function ChatList({ currentUserId, companyId }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Carregar chats quando o componente montar ou quando companyId mudar
  useEffect(() => {
    const loadChats = async () => {
      if (!companyId) {
        console.warn("⚠️ companyId não disponível para carregar chats");
        setError("Company ID não disponível");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        console.log("📥 Tentando carregar chats para companyId:", companyId);

        // Buscar todos os chats da company via API (agora implementada no backend)
        const chatsWithMessages = await api.getChats({ companyId });
        console.log("✅ Chats carregados:", chatsWithMessages);
        console.log("🎯 Total de chats carregados:", chatsWithMessages.length);

        setChats(chatsWithMessages);
      } catch (error) {
        console.error("❌ Erro ao carregar chats:", error);
        setError("Erro ao carregar chats. Tente criar um novo chat.");
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [companyId]);

  const createNewChat = async () => {
    if (!companyId) {
      setError("Company ID é necessário para criar um chat");
      return;
    }

    setCreatingChat(true);
    setError(null);
    try {
      console.log("🆕 Criando novo chat para companyId:", companyId);
      const newChat = await api.createChat({ companyId });
      console.log("✅ Novo chat criado:", newChat);

      // Buscar o chat completo com mensagens (se houver)
      const fullChat = await api.getChat(newChat.id);

      // Adicionar ao estado (em vez de salvar no localStorage, usamos o estado local)
      setChats(prev => [fullChat, ...prev]);

      // Navegar para o chat
      router.push(`/chats/${newChat.id}`);
    } catch (error) {
      console.error("❌ Erro ao criar chat:", error);
      setError(error instanceof Error ? error.message : "Erro ao criar chat");
    } finally {
      setCreatingChat(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.messages || chat.messages.length === 0) {
      return "Nenhuma mensagem ainda";
    }

    const lastMessage = chat.messages[chat.messages.length - 1];
    const preview = lastMessage.message.length > 30
      ? `${lastMessage.message.substring(0, 30)}...`
      : lastMessage.message;

    return `${lastMessage.sender?.name || 'Desconhecido'}: ${preview}`;
  };

  console.log("🔍 ChatList props:", { currentUserId, companyId });
  console.log("💬 Chats state:", chats);

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Chats
          <Button
            onClick={createNewChat}
            disabled={creatingChat || !companyId}
            size="sm"
          >
            {creatingChat ? "Criando..." : "Novo Chat"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <p className="text-muted-foreground">Carregando chats...</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {chats.map(chat => {
              console.log(`🎯 Renderizando chat:`, {
                id: chat.id,
                companyId: chat.companyId,
                messagesCount: chat.messages?.length,
                firstMessage: chat.messages?.[0]
              });

              return (
                <div
                  key={chat.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => {
                    console.log("🎯 Navegando para chat ID:", chat.id);
                    console.log("💬 Mensagens no chat:", chat.messages?.length || 0);
                    router.push(`/chats/${chat.id}`);
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {chat.id}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(chat.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {getLastMessagePreview(chat)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="flex-shrink-0 ml-2"
                    >
                      {chat.messages?.length || 0}
                    </Badge>
                  </div>
                </div>
              );
            })}

            {chats.length === 0 && !loading && (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  {companyId ? "Nenhum chat encontrado" : "Company ID não disponível"}
                </p>
                <Button
                  onClick={createNewChat}
                  disabled={!companyId}
                  size="sm"
                  variant="outline"
                >
                  Criar Primeiro Chat
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
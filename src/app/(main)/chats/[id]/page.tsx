"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Loader2, MessageSquare } from "lucide-react";

// Components
import { ChatMessages } from "@/components/chat/chat-messages";
import { MessageInput } from "@/components/chat/message-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Hooks & Services
import { useAuth } from "@/contexts/AuthContext";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { chatService } from "@/services/chatService";
import { Chat, ChatMessage } from "@/types/chat";

export default function ChatPage() {
  // --- HOOKS & STATE ---
  const params = useParams();
  const chatId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // --- DATA FETCHING ---
  const loadChatData = useCallback(async () => {
    if (!chatId || !user) return;

    try {
      setLoading(true);

      const [chatData, messagesData] = await Promise.all([
        chatService.getChat(chatId),
        chatService.getChatMessages(chatId),
      ]);

      setChat(chatData);
      setMessages(messagesData);
    } catch (error) {
      console.error("Erro silencioso (tratado pelo Global Dialog):", error);
    } finally {
      setLoading(false);
    }
  }, [chatId, user]);

  // Carrega os dados assim que a autenticação resolver e tivermos usuário
  useEffect(() => {
    if (!authLoading && user) {
      loadChatData();
    }
  }, [loadChatData, authLoading, user]);

  // --- SOCKET HANDLERS ---
  const handleNewMessage = useCallback(
    (newMessage: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

      if (user && newMessage.mentionedProfessionalId === user.id) {
        toast.info(`@${newMessage.sender.name || "Alguém"} mencionou você`, {
          description: newMessage.message,
          duration: 5000,
          action: {
            label: "Responder",
            onClick: () =>
              document
                .querySelector<HTMLInputElement>('input[type="text"]')
                ?.focus(),
          },
        });
      }
    },
    [user],
  );

  useChatSocket({
    chatId,
    currentUserId: user?.id || "",
    companyId: user?.company?.id || "",
    onNewMessage: handleNewMessage,
    onUserNotification: (notification) => {
      if (
        notification.type === "mention" ||
        notification.title?.includes("mencionado")
      ) {
        toast.info(notification.title || "Nova menção", {
          description: notification.message,
        });
      }
    },
  });

  // --- ACTIONS ---
  const handleSendMessage = async (
    messageText: string,
    mentionedUserId?: string,
  ) => {
    if (!messageText.trim() || !user) return;

    setSending(true);
    try {
      const newMessage = await chatService.createMessage({
        chatId,
        senderId: user.id,
        message: messageText,
        mentionedProfessionalId: mentionedUserId,
      });

      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error("Falha no envio:", error);
    } finally {
      setSending(false);
    }
  };

  // --- RENDER: LOADING STATE ---
  if (loading || authLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[#F5F6FA]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#2F80ED]" />
          <p className="animate-pulse text-sm font-medium text-[#7A7E83]">
            Sincronizando conversa...
          </p>
        </div>
      </div>
    );
  }

  // --- SAFETY CHECK ---
  if (!chat) return null;

  // --- RENDER: MAIN CHAT UI ---
  return (
    <main className="flex h-[100dvh] w-full flex-col bg-[#F5F6FA]">
      {/* HEADER */}
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-[#7A7E83] hover:bg-[#F5F6FA] hover:text-[#353A40]"
          >
            <Link href="/chats" aria-label="Voltar para lista de chats">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <div className="flex flex-col">
            <h1 className="flex items-center gap-2 text-base font-bold text-[#353A40] md:text-lg">
              <MessageSquare className="h-4 w-4 text-[#2F80ED] md:hidden" />
              Chat #{chatId.slice(0, 4)}
              <span className="hidden md:inline">{chatId.slice(4, 8)}</span>
            </h1>

            <div className="flex items-center gap-2 text-xs text-[#7A7E83]">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(chat.createdAt).toLocaleDateString("pt-BR")}
              </span>
              <span>•</span>
              <span>
                {messages.length} {messages.length === 1 ? "msg" : "msgs"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <span className="hidden sm:inline">Online</span>
          </div>

          {/* Badge Empresa */}
          {user?.company?.name && (
            <Badge
              variant="outline"
              className="hidden border-[#CBD5E1] text-[#353A40] bg-white md:flex"
            >
              {user.company.name}
            </Badge>
          )}
        </div>
      </header>

      {/* CHAT AREA */}
      <section
        className="flex-1 overflow-y-auto p-4 md:p-6"
        id="chat-scroll-area"
      >
        <div className="mx-auto max-w-4xl">
          <ChatMessages messages={messages} currentUserId={user?.id || ""} />
        </div>
      </section>

      {/* INPUT AREA */}
      <footer className="shrink-0 border-t border-[#E2E8F0] bg-white p-4 pb-safe-area">
        <div className="mx-auto max-w-4xl">
          <MessageInput onSendMessage={handleSendMessage} disabled={sending} />
          <p className="mt-2 text-center text-[10px] text-[#7A7E83]">
            Pressione <span className="font-medium text-[#2F80ED]">@</span> para
            mencionar um colaborador.
          </p>
        </div>
      </footer>
    </main>
  );
}

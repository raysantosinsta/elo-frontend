"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Chat } from "@/types/chat";
import { cn } from "@/lib/utils"; // Certifique-se de importar o cn
import { AlertCircle, Calendar, Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ChatListProps {
  currentUserId: string;
  companyId?: string;
  userRole?: string;
}

export function ChatList({ currentUserId, companyId, userRole }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Verificação de permissão
  const canDelete = ["ADM", "MASTER"].includes(userRole?.toUpperCase() || "");

  // --- LOGIC: DATA FETCHING ---
  useEffect(() => {
    const loadChats = async () => {
      if (!companyId) return;

      setLoading(true);
      setError(null);
      try {
        const chatsWithMessages = await api.getChats({ companyId });
        setChats(chatsWithMessages);
      } catch (error) {
        console.error("❌ Erro ao carregar chats:", error);
        setError("Não foi possível carregar o histórico.");
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [companyId]);

  // --- LOGIC: CREATE ACTION ---
  const createNewChat = async () => {
    if (!companyId) return;

    setCreatingChat(true);
    try {
      const newChat = await api.createChat({ companyId });
      const fullChat = await api.getChat(newChat.id);
      setChats((prev) => [fullChat, ...prev]);
      router.push(`/chats/${newChat.id}`);
    } catch (error) {
      setError("Erro ao criar novo atendimento.");
    } finally {
      setCreatingChat(false);
    }
  };

  // --- LOGIC: DELETE ACTION ---
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const confirmDelete = async (chatId: string) => {
    setDeletingId(chatId);
    try {
      console.log(`🗑️ Deletando chat ${chatId}...`);
      await api.deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao deletar o chat.");
    } finally {
      setDeletingId(null);
    }
  };

  // --- HELPERS ---
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.messages?.length) return "Nova conversa iniciada";
    const lastMsg = chat.messages[chat.messages.length - 1];
    const text = lastMsg.message.length > 40 ? lastMsg.message.substring(0, 40) + "..." : lastMsg.message;
    return `${lastMsg.sender?.name || "User"}: ${text}`;
  };

  // --- RENDER ---
  return (
    <Card className="h-full w-full border-0 shadow-none sm:border sm:border-[#95A5A6]/20 sm:shadow-sm">
      {/* HEADER */}
      <CardHeader className="border-b border-[#95A5A6]/10 bg-white pb-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-[#2D3436]">Atendimentos</CardTitle>
            <p className="text-xs text-[#95A5A6]">
              {loading ? "Sincronizando..." : `${chats.length} conversas ativas`}
            </p>
          </div>

          <Button
            onClick={createNewChat}
            disabled={creatingChat || !companyId}
            size="sm"
            className="bg-[#D35400] text-white shadow-md transition-all hover:bg-[#D35400]/90 disabled:opacity-50"
          >
            {creatingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Novo Chat
          </Button>
        </div>
      </CardHeader>

      {/* LIST CONTENT */}
      <CardContent className="p-0">
        {error && (
          <div className="m-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-[#95A5A6]">
            <Loader2 className="h-8 w-8 animate-spin text-[#D35400]" />
            <p className="mt-2 text-sm font-medium">Carregando...</p>
          </div>
        )}

        {!loading && (
          <div className="custom-scrollbar max-h-[calc(100vh-200px)] overflow-y-auto p-2 sm:p-3">
            {chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 rounded-full bg-[#F5F0E6] p-4">
                  <MessageSquare className="h-8 w-8 text-[#95A5A6]" />
                </div>
                <h3 className="text-sm font-semibold text-[#2D3436]">Nenhum chat</h3>
              </div>
            ) : (
              <div className="space-y-2">
                {chats.map((chat) => (
                  <div key={chat.id} className="group relative">
                    <button
                      onClick={() => router.push(`/chats/${chat.id}`)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border border-transparent bg-white p-3 text-left transition-all hover:border-[#D35400]/20 hover:bg-[#F5F0E6] hover:shadow-sm",
                        // 👇 AQUI ESTÁ A CORREÇÃO: Adiciona padding na direita se puder deletar
                        canDelete ? "pr-12" : "pr-3" 
                      )}
                    >
                      {/* Avatar Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2C3E50]/10 text-[#2C3E50] group-hover:bg-white transition-colors">
                        <MessageSquare className="h-5 w-5" />
                      </div>

                      {/* Text Info */}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-sm font-semibold text-[#2D3436]">
                            Chat #{chat.id.slice(-4)}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-[#95A5A6]">
                            <Calendar className="h-3 w-3" />
                            {formatDate(chat.createdAt)}
                          </div>
                        </div>
                        <p className="truncate text-xs text-[#95A5A6] group-hover:text-[#2D3436]/80">
                          {getLastMessagePreview(chat)}
                        </p>
                      </div>

                      {/* Badge Count */}
                      {(chat.messages?.length || 0) > 0 && (
                        <div className="flex h-full items-center">
                            <Badge variant="secondary" className="bg-[#2C3E50] text-white hover:bg-[#2C3E50]/90">
                            {chat.messages?.length}
                            </Badge>
                        </div>
                      )}
                    </button>

                    {/* 🔥 DELETE BUTTON - Posicionado Absolutamente */}
                    {canDelete && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 sm:right-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#95A5A6] hover:bg-red-50 hover:text-red-600"
                              onClick={(e) => handleDeleteChat(chat.id, e)}
                            >
                              {deletingId === chat.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#F5F0E6] border-[#95A5A6]/20">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-[#2D3436]">Excluir atendimento?</AlertDialogTitle>
                              <AlertDialogDescription className="text-[#95A5A6]">
                                Esta ação não pode ser desfeita. Todo o histórico de mensagens deste chat será apagado permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-none text-[#2D3436] hover:bg-[#95A5A6]/10">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => confirmDelete(chat.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Sim, excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
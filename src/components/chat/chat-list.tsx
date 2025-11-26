"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Chat } from "@/types/chat";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ChatListProps {
  currentUserId: string;
  companyId?: string;
}

export function ChatList({ currentUserId, companyId }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createNewChat = async () => {
    setLoading(true);
    try {
      const newChat = await api.createChat({ companyId });
      setChats(prev => [newChat, ...prev]);
      router.push(`/chats/${newChat.id}`);
    } catch (error) {
      console.error("Erro ao criar chat:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Chats
          <Button onClick={createNewChat} disabled={loading}>
            Novo Chat
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
              onClick={() => router.push(`/chats/${chat.id}`)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Chat {chat.id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary">
                  {chat.messages?.length || 0} mensagens
                </Badge>
              </div>
            </div>
          ))}
          {chats.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Nenhum chat encontrado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
"use client";

import { ChatList } from "@/components/chat/chat-list";

// Em uma aplicação real, esses dados viriam de autenticação
const CURRENT_USER_ID = "818fd6fe-07c2-452d-8e45-15a3b2b08873";
const COMPANY_ID = "0bc71c65-b37b-4037-ba6d-df47e51fab71";

export default function ChatsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex gap-6">
        <ChatList 
          currentUserId={CURRENT_USER_ID} 
          companyId={COMPANY_ID} 
        />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Selecione um chat para começar a conversar
        </div>
      </div>
    </div>
  );
}
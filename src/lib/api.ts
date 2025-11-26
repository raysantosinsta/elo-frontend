import { Chat, ChatMessage, CreateChatMessageDto, User } from "@/types/chat";

const API_BASE_URL = 'http://localhost:3000';

export const api = {
  // Chats
  createChat: async (data: { companyId?: string }): Promise<Chat> => {
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  getChat: async (id: string): Promise<Chat> => {
    const response = await fetch(`${API_BASE_URL}/chats/${id}`);
    return response.json();
  },

  // Chat Messages
  createMessage: async (data: CreateChatMessageDto): Promise<ChatMessage> => {
    const response = await fetch(`${API_BASE_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  getChatMessages: async (chatId: string): Promise<ChatMessage[]> => {
    const response = await fetch(`${API_BASE_URL}/chat-messages/chat/${chatId}`);
    return response.json();
  },

  // ⭐ USERS SEARCH — AGORA ADICIONADO
  searchUsers: async (query: string): Promise<User[]> => {
  const response = await fetch(
    `${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`
  );

  const data = await response.json();

  // Garante que SEMPRE retorna array
  if (!Array.isArray(data)) {
    console.error("searchUsers retornou algo inválido:", data);
    return [];
  }

  return data;
},

};

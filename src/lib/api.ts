import { Chat, ChatMessage, CreateChatMessageDto, User, CreateChatDto } from "@/types/chat";

const API_BASE_URL = 'http://localhost:3000';

// Função auxiliar para validar UUID
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const api = {
  // Chats
  createChat: async (data: CreateChatDto): Promise<Chat> => {
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar chat: ${response.statusText}`);
    }

    return response.json();
  },

  getChat: async (id: string): Promise<Chat> => {
    const response = await fetch(`${API_BASE_URL}/chats/${id}`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar chat: ${response.statusText}`);
    }

    return response.json();
  },

  getChats: async (data: { companyId: string }): Promise<Chat[]> => {
    const response = await fetch(`${API_BASE_URL}/chats?companyId=${data.companyId}`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar chats: ${response.statusText}`);
    }

    const chats = await response.json();

    if (!Array.isArray(chats)) {
      console.error("getChats retornou algo inválido:", chats);
      return [];
    }

    return chats;
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

    if (!response.ok) {
      throw new Error(`Erro ao criar mensagem: ${response.statusText}`);
    }

    return response.json();
  },

  getChatMessages: async (chatId: string): Promise<ChatMessage[]> => {
    const response = await fetch(`${API_BASE_URL}/chat-messages/chat/${chatId}`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar mensagens: ${response.statusText}`);
    }

    const messages = await response.json();

    if (!Array.isArray(messages)) {
      console.error("getChatMessages retornou algo inválido:", messages);
      return [];
    }

    return messages;
  },


};
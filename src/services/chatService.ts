import { api } from "@/services/api";
import { Chat, ChatMessage, CreateChatDto, CreateChatMessageDto, User } from "@/types/chat";

export const chatService = {
  createChat: async (dto: CreateChatDto) => {
    const { data } = await api.post<Chat>('/chats', dto);
    return data;
  },

  // --- ADICIONADO AQUI ---
  getChat: async (chatId: string) => {
    const { data } = await api.get<Chat>(`/chats/${chatId}`);
    return data;
  },
  // -----------------------

  getChats: async (companyId: string) => {
    const { data } = await api.get<Chat[]>('/chats', { params: { companyId } });
    return Array.isArray(data) ? data : [];
  },

  // --- ADICIONADO PARA O CHATLIST ---
  deleteChat: async (chatId: string) => {
    await api.delete(`/chats/${chatId}`);
  },
  // ----------------------------------

  getChatMessages: async (chatId: string) => {
    const { data } = await api.get<ChatMessage[]>(`/chat-messages/chat/${chatId}`);
    return Array.isArray(data) ? data : [];
  },
  
  createMessage: async (dto: CreateChatMessageDto) => {
    const { data } = await api.post<ChatMessage>('/chat-messages', dto);
    return data;
  },

  getUsersForMention: async (query: string) => {
    if (!query || query.trim().length < 2) return [];
    try {
      const { data } = await api.get<User[]>('/users/mentions', { params: { query } });
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
};
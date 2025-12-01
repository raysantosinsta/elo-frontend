// src/lib/api.ts
import { Chat, ChatMessage, CreateChatMessageDto, User, CreateChatDto } from "@/types/chat";
import { jwtDecode } from "jwt-decode";

const API_BASE_URL = 'http://localhost:3000';

// Chave única para o token (PADRONIZADA)
const TOKEN_KEY = 'accessToken';

const getToken = () => localStorage.getItem(TOKEN_KEY);

const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
}

export const api = {
  createChat: async (data: CreateChatDto): Promise<Chat> => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`Erro ao criar chat: ${response.statusText}`);
    return response.json();
  },

  getChat: async (id: string): Promise<Chat> => {
    const token = getToken();
    if (!token) throw new Error("Token de autenticação não encontrado.");

    const response = await fetch(`${API_BASE_URL}/chats/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Erro ao buscar chat: ${response.statusText}`);
    return response.json();
  },

  getChats: async (data: { companyId: string }): Promise<Chat[]> => {
    const token = getToken();
    if (!token) throw new Error("Token de autenticação não encontrado.");

    const response = await fetch(`${API_BASE_URL}/chats?companyId=${data.companyId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Erro ao buscar chats: ${response.statusText}`);

    const chats = await response.json();
    return Array.isArray(chats) ? chats : [];
  },

  createMessage: async (data: CreateChatMessageDto): Promise<ChatMessage> => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`Erro ao criar mensagem: ${response.statusText}`);
    return response.json();
  },

  getChatMessages: async (chatId: string): Promise<ChatMessage[]> => {
    const token = getToken();
    if (!token) throw new Error("Token de autenticação não encontrado.");

    const response = await fetch(`${API_BASE_URL}/chat-messages/chat/${chatId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Erro ao buscar mensagens: ${response.statusText}`);

    const messages = await response.json();
    return Array.isArray(messages) ? messages : [];
  },

  getUsersForMention: async (query: string): Promise<User[]> => {
    try {
      if (!query || query.trim().length < 2) return [];

      const token = getToken();
      if (!token) {
        console.warn('Token não encontrado para menção');
        return [];
      }

      let companyId: string | undefined;
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        companyId = decoded.companyId;
      } catch (e) {
        console.error("Erro ao decodificar token:", e);
        return [];
      }

      const params = new URLSearchParams({ query: query.trim() });
      if (companyId && isValidUUID(companyId)) {
        params.append('companyId', companyId);
      }

      const response = await fetch(`${API_BASE_URL}/users/mentions?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Erro ${response.status} em menções`);
        return [];
      }

      const users = await response.json();
      return Array.isArray(users) ? users : [];
    } catch (error) {
      console.error('Erro em getUsersForMention:', error);
      return [];
    }
  },
};
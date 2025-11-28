import { Chat, ChatMessage, CreateChatMessageDto, User, CreateChatDto } from "@/types/chat";
import { jwtDecode } from "jwt-decode";

const API_BASE_URL = 'http://localhost:3000';

// Função auxiliar para validar UUID
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  // Adicione outras propriedades do token se necessário
}

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
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error("Token de autenticação não encontrado.");
    }

    const response = await fetch(`${API_BASE_URL}/chats/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar chat: ${response.statusText}`);
    }

    return response.json();
  },

  getChats: async (data: { companyId: string }): Promise<Chat[]> => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error("Token de autenticação não encontrado.");
    }

    const response = await fetch(`${API_BASE_URL}/chats?companyId=${data.companyId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

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
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error("Token de autenticação não encontrado.");
    }

    const response = await fetch(`${API_BASE_URL}/chat-messages/chat/${chatId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

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

// Atualizar no api.ts
getUsersForMention: async (query: string): Promise<User[]> => {
  try {
    if (!query || query.trim().length < 2) return [];

    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      console.error('Token não encontrado no localStorage');
      return [];
    }

    let companyId: string | undefined;
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      companyId = decoded.companyId;
    } catch (e) {
      console.error("Erro ao decodificar token em getUsersForMention:", e);
      return [];
    }

    const params = new URLSearchParams({ 
      query: query.trim()
    });

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

    console.log(`📊 Status da resposta: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro ${response.status}:`, errorText);
      return [];
    }

    const users = await response.json();
    console.log(`✅ ${users.length} usuários encontrados`);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('🌐 Erro de rede:', error);
    return [];
  }
},
};
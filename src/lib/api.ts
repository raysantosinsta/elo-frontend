// import { Chat, ChatMessage, CreateChatMessageDto, User, CreateChatDto } from "@/types/chat";
// import { api as axiosInstance } from "@/contexts/AuthContext"; // Importe a instância que tem o Interceptor
// import { jwtDecode } from "jwt-decode";

// interface JwtPayload {
//   sub: string;
//   email: string;
//   companyId: string;
// }

// // Helper para pegar token do LocalStorage (apenas para decodificação manual se necessário)
// const getToken = () => typeof window !== "undefined" ? localStorage.getItem('accessToken') : null;

// export const api = {
//   createChat: async (data: CreateChatDto): Promise<Chat> => {
//     // O axiosInstance já injeta o header Authorization automaticamente
//     const response = await axiosInstance.post<Chat>('/chats', data);
//     return response.data;
//   },

//   getChat: async (id: string): Promise<Chat> => {
//     const response = await axiosInstance.get<Chat>(`/chats/${id}`);
//     return response.data;
//   },

//   getChats: async (data: { companyId: string }): Promise<Chat[]> => {
//     const response = await axiosInstance.get<Chat[]>(`/chats`, {
//       params: { companyId: data.companyId }
//     });
//     return Array.isArray(response.data) ? response.data : [];
//   },

//   createMessage: async (data: CreateChatMessageDto): Promise<ChatMessage> => {
//     const response = await axiosInstance.post<ChatMessage>('/chat-messages', data);
//     return response.data;
//   },

//   getChatMessages: async (chatId: string): Promise<ChatMessage[]> => {
//     const response = await axiosInstance.get<ChatMessage[]>(`/chat-messages/chat/${chatId}`);
//     return Array.isArray(response.data) ? response.data : [];
//   },

//   getUsersForMention: async (query: string): Promise<User[]> => {
//     try {
//       if (!query || query.trim().length < 2) return [];

//       const token = getToken();
//       if (!token) return [];

//       let companyId: string | undefined;
//       try {
//         const decoded = jwtDecode<JwtPayload>(token);
//         companyId = decoded.companyId;
//       } catch (e) {
//         console.error("Erro ao decodificar token:", e);
//         return [];
//       }

//       // Axios params trata automaticamente a string query
//       const response = await axiosInstance.get<User[]>('/users/mentions', {
//         params: {
//           query: query.trim(),
//           ...(companyId ? { companyId } : {})
//         }
//       });

//       return Array.isArray(response.data) ? response.data : [];
//     } catch (error) {
//       console.error('Erro em getUsersForMention:', error);
//       return [];
//     }
//   },

//   deleteChat: async (chatId: string): Promise<void> => {
//     await axiosInstance.delete(`/chats/${chatId}`);
//   },
// };
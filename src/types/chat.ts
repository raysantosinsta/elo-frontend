export interface Chat {
  id: string;
  companyId?: string;
  createdAt: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  message: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    role: string;
    isProfessional: boolean;
    professionalRole?: string;
    phone?: string;
  };
  mentionedProfessionalId?: string;
  mentionedProfessional?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    professionalRole?: string;
  };
}

export interface CreateChatDto {
  companyId?: string;
}

export interface CreateChatMessageDto {
  chatId: string;
  senderId: string;
  message: string;
  mentionedProfessionalId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  professionalRole?: string;
  isProfessional: boolean;
}
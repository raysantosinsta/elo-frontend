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
    // isProfessional: boolean;
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



// types/chat.ts - Adicionar tipos faltantes
export interface User {
  professionalRoleId: any;
  companyId: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  professionalRole?: string;
  // isProfessional: boolean;
  role: string;
  company?: {
    id: string;
    name: string;
  };
}

export interface MentionResult {
  users: User[];
  query: string;
  position: number;
}

// hooks/useMentions.ts - Adicionar tipo de retorno
interface UseMentionsReturn {
  mentionQuery: string;
  mentionResults: User[];
  showMentionList: boolean;
  mentionPosition: { top: number; left: number };
  selectedIndex: number;
  handleInputChange: (text: string, cursorPosition: number, inputElement?: HTMLInputElement) => void;
  insertMention: (text: string, user: User, cursorPosition: number) => { newText: string; newCursorPosition: number };
  closeMentionList: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, onSelect: (user: User) => void) => void;
}

export type { UseMentionsReturn };
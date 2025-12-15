import { api } from "@/services/api";
import { User } from "@/types/chat";

export const userService = {
  // Nota: O backend deveria idealmente ter um filtro ?name=
  getUsersByName: async (name: string): Promise<User[]> => {
    try {
      // Como o endpoint retorna tudo, filtramos aqui, mas usando o axios limpo
      const { data } = await api.get<{ data: User[] }>("/users", { params: { limit: 999 } });
      const users = data.data || [];
      return users.filter((u) => u.name?.toLowerCase().includes(name.toLowerCase()));
    } catch {
      return [];
    }
  },

  getUserById: async (id: string) => {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },

  getUsersByCompany: async (companyId: string) => {
    const { data } = await api.get<User[]>(`/users/company/${companyId}`);
    return data;
  },
  
  /**
    * Buscar usuários por role
    * GET /users/role/:role
    */
   getUsersByRole: async (role: string): Promise<User[]> => {
     try {
       const { data} = await api.get<User[]>(`/users/role/${role}`);
       return data;
     } catch {
       return [];
     }
   },
 
   /**
    * Buscar usuário por email
    * GET /users/email/:email
    */
   getUserByEmail: async (email: string): Promise<User | null> => {
     try {
       const { data} = await api.get<User>(`/users/email/${email}`);
       return data;
     } catch {
       return null;
     }
   },
};
// import { User } from "@/types/chat";

// const API_BASE_URL = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

// export const userService = {

//   /**
//    * Buscar usuários por nome (para menções)
//    * Este método usa o endpoint GET /users e filtra pelo campo name no frontend,
//    * porque o backend não possui busca por nome.
//    */
//   getUsersByName: async (name: string): Promise<User[]> => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/users?limit=999`);
//       if (!response.ok) return [];

//       const data = await response.json();

//       // O Nest retorna { data, total, ... }
//       const users = data.data ?? [];

//       // Filtra localmente
//       return users.filter((user: User) =>
//         user.name?.toLowerCase().includes(name.toLowerCase())
//       );
//     } catch {
//       return [];
//     }
//   },

//   /**
//    * Buscar usuário por ID
//    * GET /users/:id
//    */
//   getUserById: async (id: string): Promise<User | null> => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/users/${id}`);
//       if (!response.ok) return null;
//       return response.json();
//     } catch {
//       return null;
//     }
//   },

//   /**
//    * Buscar usuários por companyId
//    * GET /users/company/:companyId
//    */
//   getUsersByCompany: async (companyId: string): Promise<User[]> => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/users/company/${companyId}`);
//       if (!response.ok) return [];
//       return response.json();
//     } catch {
//       return [];
//     }
//   },

//   /**
//    * Buscar usuários por role
//    * GET /users/role/:role
//    */
//   getUsersByRole: async (role: string): Promise<User[]> => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/users/role/${role}`);
//       if (!response.ok) return [];
//       return response.json();
//     } catch {
//       return [];
//     }
//   },

//   /**
//    * Buscar usuário por email
//    * GET /users/email/:email
//    */
//   getUserByEmail: async (email: string): Promise<User | null> => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/users/email/${email}`);
//       if (!response.ok) return null;
//       return response.json();
//     } catch {
//       return null;
//     }
//   },
// };

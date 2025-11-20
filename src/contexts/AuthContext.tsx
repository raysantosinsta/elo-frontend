// contexts/AuthContext.tsx
"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    status: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  adminSignup: (userData: SignupData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  token: string | null;
  refreshAuthToken: () => Promise<boolean>;
  isTokenValid: (token: string) => boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>; // 🔥 ADICIONADO
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  companyId: string;
  contact: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE =
  process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  // 🔧 Função para validar token
  const isTokenValid = (token: string): boolean => {
    if (!token || typeof token !== "string") return false;

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        console.warn("⚠️ Token expirado");
        return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  // 🗑️ Função para limpar dados de autenticação
  const clearAuthData = () => {
    try {
      setToken(null);
      setUser(null);
      
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      console.log('✅ Dados de autenticação limpos');
    } catch (error) {
      console.error('❌ Erro ao limpar dados de autenticação:', error);
    }
  };

  // 🔄 Função para renovar token
  const refreshAuthToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      
      if (!refreshToken || !isTokenValid(refreshToken)) {
        console.error("❌ Refresh token inválido ou não encontrado");
        clearAuthData();
        return false;
      }

      console.log("🔄 Renovando token...");
      
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error("Falha ao renovar token");
      }

      const data = await response.json();
      const newAccessToken = data.accessToken || data.access_token;
      const newRefreshToken = data.refreshToken || data.refresh_token;
      
      if (!newAccessToken) {
        throw new Error("Novo access token não recebido");
      }

      // Salvar os novos tokens
      const success = setAuthToken(newAccessToken, newRefreshToken);
      
      if (success) {
        console.log("✅ Token renovado com sucesso");
        return true;
      } else {
        throw new Error("Falha ao salvar novo token");
      }
      
    } catch (error) {
      console.error("❌ Erro ao renovar token:", error);
      clearAuthData();
      return false;
    }
  };

  // 💾 Função para salvar tokens
  const setAuthToken = (newToken: string, refreshToken?: string): boolean => {
    try {
      if (!isTokenValid(newToken)) {
        console.error("❌ Access token inválido");
        clearAuthData();
        return false;
      }

      // Salvar no estado e localStorage
      setToken(newToken);
      localStorage.setItem("accessToken", newToken);
      
      // Salvar em cookie também (opcional)
      document.cookie = `access_token=${newToken}; path=/; max-age=86400; SameSite=Lax`;

      console.log("✅ Access token salvo com sucesso");

      // Salvar refreshToken se fornecido
      if (refreshToken) {
        if (!isTokenValid(refreshToken)) {
          console.warn("⚠️ Refresh token inválido, ignorando...");
        } else {
          localStorage.setItem("refreshToken", refreshToken);
          document.cookie = `refresh_token=${refreshToken}; path=/; max-age=2592000; SameSite=Lax`;
          console.log("✅ Refresh token salvo com sucesso");
        }
      }

      return true;
    } catch (error) {
      console.error("❌ Erro ao salvar tokens:", error);
      clearAuthData();
      return false;
    }
  };

  // 🔍 Buscar dados do usuário
  const fetchUserData = async (token: string): Promise<User | null> => {
    try {
      console.log("🔍 Buscando dados do usuário...");

      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Resposta do profile:", response.status);

      if (response.status === 401) {
        console.error("❌ Token expirado ou inválido (401)");
        return null;
      }

      if (!response.ok) {
        console.error("❌ Erro ao buscar perfil:", response.status);
        return null;
      }

      const userData = await response.json();
      console.log("✅ Dados do usuário recebidos:", userData);

      return userData;
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      return null;
    }
  };

  // 🔄 Função para requisições autenticadas com fallback
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let accessToken = localStorage.getItem("accessToken");
    
    // Se token não é válido, tenta renovar
    if (!accessToken || !isTokenValid(accessToken)) {
      console.log("🔄 Token inválido, tentando renovar...");
      const refreshed = await refreshAuthToken();
      
      if (!refreshed) {
        throw new Error("Autenticação necessária");
      }
      
      accessToken = localStorage.getItem("accessToken");
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      console.log("🔄 Token expirado no request, tentando renovar...");
      const refreshed = await refreshAuthToken();
      
      if (refreshed) {
        // Tenta a requisição novamente com o novo token
        const newAccessToken = localStorage.getItem("accessToken");
        const newHeaders = {
          ...headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        
        return fetch(url, {
          ...options,
          headers: newHeaders,
        });
      } else {
        logout();
        throw new Error("Sessão expirada");
      }
    }

    return response;
  };

  // 🔐 Inicializar autenticação
  const initializeAuth = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");

      if (accessToken && isTokenValid(accessToken)) {
        console.log("🔄 Inicializando com token salvo...");
        setToken(accessToken);
        
        const userData = await fetchUserData(accessToken);
        if (userData) {
          setUser(userData);
          console.log("✅ Sessão restaurada para:", userData.name);
        } else {
          // Tentar renovar token se não conseguir buscar dados
          console.log("🔄 Tentando renovar token...");
          const refreshed = await refreshAuthToken();
          if (!refreshed) {
            console.log("❌ Não foi possível renovar a sessão");
            clearAuthData();
          }
        }
      } else {
        console.log("ℹ️ Nenhum token válido encontrado");
        clearAuthData();
      }
    } catch (error) {
      console.error("❌ Erro ao inicializar auth:", error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  // 🔑 Login
  const login = async (email: string, password: string) => {
    try {
      console.log("🔐 Tentando login...", { email });

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      console.log("📡 Resposta do login:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erro no login:", response.status, errorText);

        let errorMessage = "Login falhou";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ Login successful:", data);

      const accessToken = data.accessToken || data.access_token || data.token;
      const refreshToken = data.refreshToken || data.refresh_token;

      if (!accessToken) {
        console.error("❌ Nenhum access token encontrado na resposta:", data);
        throw new Error("No access token received");
      }

      // Salvar tokens
      const tokensSaved = setAuthToken(accessToken, refreshToken);
      
      if (!tokensSaved) {
        throw new Error("Falha ao salvar tokens");
      }

      // Buscar dados do usuário
      const userData = await fetchUserData(accessToken);
      if (userData) {
        setUser(userData);
        console.log("✅ Usuário definido no contexto:", userData.name);
        router.push("/Kanban");
      } else {
        throw new Error("Failed to load user data after login");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      throw error;
    }
  };

  // 📝 Cadastro normal
  const signup = async (userData: SignupData) => {
    try {
      console.log("📝 Tentando cadastro...", userData);

      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      console.log("📡 Resposta do signup:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erro no cadastro:", response.status, errorText);

        let errorMessage = "Cadastro falhou";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ Cadastro successful:", data);

      const accessToken = data.accessToken || data.access_token || data.token;
      const refreshToken = data.refreshToken || data.refresh_token;

      if (!accessToken) {
        throw new Error("No access token received");
      }

      // Salvar tokens
      const tokensSaved = setAuthToken(accessToken, refreshToken);
      
      if (!tokensSaved) {
        throw new Error("Falha ao salvar tokens");
      }

      const newUserData = await fetchUserData(accessToken);
      if (newUserData) {
        setUser(newUserData);
        console.log("✅ Usuário definido no contexto após cadastro:", newUserData.name);
        router.push("/Kanban");
      } else {
        throw new Error("Failed to load user data after signup");
      }
    } catch (error) {
      console.error("❌ Signup error:", error);
      throw error;
    }
  };

  // 👨‍💼 Cadastro por Administrador
  const adminSignup = async (userData: SignupData) => {
    try {
      console.log("👨‍💼 Tentando cadastro por admin...", userData);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("Autenticação necessária");
      }

      const response = await fetch(`${API_BASE}/auth/admin/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...userData,
          role: userData.role || "USER",
        }),
      });

      console.log("📡 Resposta do admin signup:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erro no cadastro admin:", response.status, errorText);

        let errorMessage = "Cadastro falhou";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ Cadastro por admin successful:", data);

      alert("Usuário cadastrado com sucesso!");
      return data;
    } catch (error) {
      console.error("❌ Admin signup error:", error);
      throw error;
    }
  };

  // 🚪 Logout
  const logout = () => {
    console.log("🚪 Fazendo logout...");
    clearAuthData();
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        adminSignup,
        logout,
        loading,
        token,
        refreshAuthToken,
        isTokenValid,
        authFetch, // 🔥 AGORA INCLUÍDO NO CONTEXTO
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// 🔧 Hook auxiliar opcional para usar o authFetch
export function useAuthFetch() {
  const { authFetch } = useAuth();
  return authFetch;
}
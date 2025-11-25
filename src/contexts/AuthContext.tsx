/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { createContext, useContext, useEffect, useState, useRef } from "react"; // 🔥 NOVO: useRef para timer
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  companyId: string | null;
  document?: string | null;
  phone: string;
  company?: {
    id: string;
    name: string;
    status: string;
  } | null;
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
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  companyId: string;
  phone: string;
  document?: string;
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
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null); // 🔥 NOVO: Ref para o timer de refresh

  // 🔥 NOVO: Função para limpar o timer anterior
  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
      console.log("⏰ Timer de refresh limpo");
    }
  };

  // 🔥 NOVO: Função para agendar refresh proativo (5 min antes da expiração)
  const scheduleRefreshTimer = (accessToken: string) => {
    clearRefreshTimer(); // Limpa anterior

    try {
      const parts = accessToken.split(".");
      if (parts.length !== 3) return;

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      const expTime = payload.exp ? payload.exp - now : 0; // Tempo em segundos até expiração

      if (expTime <= 0) {
        console.warn("⚠️ Token já expirado, forçando refresh imediato");
        refreshAuthToken(); // Chama agora se já expirou
        return;
      }

      // Agendar 5 min (300s) antes da expiração
      const refreshInSeconds = Math.max(expTime - 300, 60); // Mínimo 1 min para evitar spam
      const refreshInMs = refreshInSeconds * 1000;

      console.log(`⏰ Agendando refresh em ${refreshInSeconds / 60} minutos (exp em ${expTime / 60} min)`);

      refreshTimerRef.current = setTimeout(async () => {
        console.log("🔄 Refresh proativo iniciado pelo timer");
        const refreshed = await refreshAuthToken();
        if (!refreshed) {
          console.error("❌ Refresh proativo falhou, fazendo logout");
          logout();
        }
      }, refreshInMs);
    } catch (error) {
      console.error("❌ Erro ao agendar timer:", error);
    }
  };

  useEffect(() => {
    initializeAuth();
    return () => clearRefreshTimer(); // Limpa timer no unmount
  }, []);

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

  const clearAuthData = () => {
    try {
      clearRefreshTimer(); // 🔥 NOVO: Limpa timer no logout
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

      // 🔥 NOVO: Agendar timer proativo após salvar token
      scheduleRefreshTimer(newToken);

      return true;
    } catch (error) {
      console.error("❌ Erro ao salvar tokens:", error);
      clearAuthData();
      return false;
    }
  };

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

  const initializeAuth = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");

      if (accessToken && isTokenValid(accessToken)) {
        console.log("🔄 Inicializando com token salvo...");
        setToken(accessToken);
        
        // 🔥 NOVO: Agendar timer aqui também (caso token seja válido)
        scheduleRefreshTimer(accessToken);
        
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

  const login = async (email: string, password: string) => {
  try {
    console.log("🔐 Tentando login...", { 
      email, 
      passwordLength: password.length,
      API_BASE 
    });

    const loginPayload = {
      email: email.trim().toLowerCase(),
      password: password
    };

    console.log("📤 Payload enviado:", loginPayload);

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginPayload),
    });

    console.log("📡 Resposta do login:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    const responseText = await response.text();
    console.log("📄 Corpo da resposta:", responseText);

    if (!response.ok) {
      let errorMessage = "Login falhou";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
        console.error("❌ Erro detalhado:", errorData);
      } catch {
        errorMessage = responseText || errorMessage;
        console.error("❌ Erro texto:", responseText);
      }

      // 🔥 DETALHAMENTO DOS ERROS 401
      if (response.status === 401) {
        console.error("🔍 Debug 401 - Possíveis causas:");
        console.error("1. Email não existe no banco");
        console.error("2. Senha incorreta"); 
        console.error("3. Usuário inativo (status ≠ ATIVO)");
        console.error("4. Problema no hash da senha");
      }

      throw new Error(errorMessage);
    }

    // Se chegou aqui, response.ok é true
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("Resposta do servidor não é JSON válido");
    }

    console.log("✅ Login successful - Dados recebidos:", {
      hasAccessToken: !!data.accessToken,
      hasUser: !!data.user,
      userStatus: data.user?.status,
      userRole: data.user?.role
    });

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
      console.log("✅ Usuário definido no contexto:", userData);
      router.push("/Kanban");
    } else {
      throw new Error("Failed to load user data after login");
    }
  } catch (error) {
    console.error("❌ Login error completo:", error);
    throw error;
  }
};

  // 📝 Cadastro normal - ATUALIZADO
const signup = async (userData: SignupData) => {
  try {
    console.log("📝 Tentando cadastro...", userData);

    // 🔥 CORREÇÃO: Mapear 'phone' para 'contact' se necessário
    // Ou ajustar o backend para aceitar 'phone'
    const payload = {
      ...userData,
      phone: userData.phone, // 🔥 Agora usa 'phone' em vez de 'contact'
      document: userData.document || undefined,
    };

    const response = await fetch(`${API_BASE}/auth/admin/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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

 const adminSignup = async (userData: SignupData) => {
  try {
    console.log("Tentando cadastro por admin...", userData);

    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("Autenticação necessária");

    const payload = {
      ...userData,
      phone: userData.phone,
      document: userData.document || null,
      role: userData.role || "EMPLOYER",
    };

    // MUDANÇA AQUI ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
    const response = await fetch(`${API_BASE}/auth/admin/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Cadastro falhou";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    alert("Usuário cadastrado com sucesso!");
    return data;
  } catch (error: any) {
    console.error("Admin signup error:", error);
    throw error;
  }
};

  const logout = () => {
    console.log("🚪 Fazendo logout...");
    clearAuthData(); // Agora limpa o timer também
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
        authFetch,
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

export function useAuthFetch() {
  const { authFetch } = useAuth();
  return authFetch;
}
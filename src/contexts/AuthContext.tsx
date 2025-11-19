// contexts/AuthContext.tsx
'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  logout: () => void;
  loading: boolean;
  token: string | null;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  companyId: string;
  contact: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  // 🔥 FUNÇÃO MELHORADA: Verificar se token é válido
  const isTokenValid = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch {
      return false;
    }
  };

  const setAuthToken = (newToken: string) => {
    if (!isTokenValid(newToken)) {
      console.error('❌ Token inválido');
      clearAuthData();
      return;
    }
    
    localStorage.setItem('accessToken', newToken);
    document.cookie = `access_token=${newToken}; path=/; max-age=86400; SameSite=Lax`;
    setToken(newToken);
  };

  const clearAuthData = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    setUser(null);
    setToken(null);
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (token && isTokenValid(token)) {
        console.log('🔍 Verificando autenticação...');
        const userData = await fetchUserData(token);
        if (userData) {
          setUser(userData);
          setToken(token);
          console.log('✅ Usuário autenticado:', userData.name);
        } else {
          console.warn('❌ Token inválido ou expirado');
          clearAuthData();
        }
      } else {
        console.log('ℹ️  Nenhum token válido encontrado');
        clearAuthData();
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNÇÃO MELHORADA: Buscar dados do usuário com melhor tratamento de erro
  const fetchUserData = async (token: string): Promise<User | null> => {
    try {
      console.log('🔍 Buscando dados do usuário...');
      
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Resposta do profile:', response.status);

      if (response.status === 401) {
        console.error('❌ Token expirado ou inválido (401)');
        return null;
      }

      if (!response.ok) {
        console.error('❌ Erro ao buscar perfil:', response.status);
        return null;
      }

      const userData = await response.json();
      console.log('✅ Dados do usuário recebidos:', userData);
      
      return userData;
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Tentando login...', { email, API_BASE });
      
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Resposta do login:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro no login:', response.status, errorText);
        
        let errorMessage = 'Login failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Login successful:', data);

      // 🔥 CORREÇÃO: Suporta diferentes formatos de resposta
      const accessToken = data.accessToken || data.access_token || data.token;
      if (!accessToken) {
        console.error('❌ Nenhum access token encontrado na resposta:', data);
        throw new Error('No access token received');
      }

      console.log('🔑 Token recebido:', accessToken);
      setAuthToken(accessToken);
      
      if (data.refreshToken || data.refresh_token) {
        localStorage.setItem('refreshToken', data.refreshToken || data.refresh_token);
      }

      // 🔥 BUSCA OS DADOS DO USUÁRIO COM O TOKEN
      const userData = await fetchUserData(accessToken);
      if (userData) {
        setUser(userData);
        console.log('✅ Usuário definido no contexto:', userData);
        
        // ✅ REDIRECIONA PARA KANBAN APÓS LOGIN
        router.push('/Kanban');
      } else {
        throw new Error('Failed to load user data after login');
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const signup = async (userData: SignupData) => {
    try {
      console.log('📝 Tentando cadastro...', userData);
      
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('📡 Resposta do signup:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro no cadastro:', response.status, errorText);
        
        let errorMessage = 'Signup failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Cadastro successful:', data);

      const accessToken = data.accessToken || data.access_token || data.token;
      if (!accessToken) {
        throw new Error('No access token received');
      }

      setAuthToken(accessToken);
      
      if (data.refreshToken || data.refresh_token) {
        localStorage.setItem('refreshToken', data.refreshToken || data.refresh_token);
      }

      const newUserData = await fetchUserData(accessToken);
      if (newUserData) {
        setUser(newUserData);
        console.log('✅ Usuário definido no contexto após cadastro:', newUserData);
        
        router.push('/Kanban');
      } else {
        throw new Error('Failed to load user data after signup');
      }

    } catch (error) {
      console.error('❌ Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 Fazendo logout...');
    clearAuthData();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      loading,
      token 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
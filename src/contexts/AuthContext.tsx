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
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  companyId: string;
  contact: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const setAuthToken = (token: string) => {
    // Salva no localStorage
    localStorage.setItem('accessToken', token);
    
    // 🔥 SALVA NO COOKIE para o middleware
    document.cookie = `access_token=${token}; path=/; max-age=86400; SameSite=Lax`;
  };

  const clearAuthData = () => {
    // Remove do localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // 🔥 REMOVE DO COOKIE também
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    setUser(null);
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Verificar se o token é válido
        const isValid = await verifyToken(token);
        if (isValid) {
          // Buscar dados do usuário
          const userData = await fetchUserData(token);
          setUser(userData);
        } else {
          // Token inválido, limpar storage
          clearAuthData();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_NESTJS_API_URL}/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const fetchUserData = async (token: string): Promise<User> => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_NESTJS_API_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    return response.json();
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();

      // 🔥 USA A FUNÇÃO setAuthToken para salvar em ambos
      setAuthToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      setUser(data.user);

      // ✅ REDIRECIONA PARA KANBAN APÓS LOGIN
      router.push('/Kanban');
    } catch (error) {
      throw error;
    }
  };

  const signup = async (userData: SignupData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }

      const data = await response.json();

      // 🔥 USA A FUNÇÃO setAuthToken para salvar em ambos
      setAuthToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      setUser(data.user);

      // ✅ REMOVIDO O REDIRECIONAMENTO - usuário fica na mesma página
      // NÃO FAZ router.push() aqui - o usuário decide para onde ir

    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    clearAuthData();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
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
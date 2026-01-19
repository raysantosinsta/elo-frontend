/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Loader2, Lock, LogIn, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Hook personalizado de autenticação
  const { login } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Tenta fazer o login
      await login(email, password);

      // Se der certo, o AuthContext ou Middleware redireciona.
      // router.push('/dashboard'); 
    } catch (err: any) {
      // --- A MÁGICA ACONTECE AQUI ---
      // Não precisamos setar setError ou mostrar Alert.
      // O axios interceptor JÁ pegou o erro 401/400 e abriu o Dialog Global.

      // Aqui só fazemos limpeza de UX local, se quiser:
      setPassword(''); // Limpa a senha para o usuário tentar de novo
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. Background: Algodão Cru (#F5F0E6)
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E6] px-4 py-8 font-sans transition-colors duration-300">

      <Card className="w-full max-w-[400px] border-0 shadow-2xl shadow-black/5 bg-white/95 backdrop-blur-sm overflow-hidden">

        {/* Header Visual */}
        <div className="h-2 bg-[#D35400] w-full" /> {/* Faixa decorativa Terracota */}

        <CardHeader className="space-y-4 text-center pt-8 pb-6">
          {/* Ícone da Marca: Azul Petróleo */}
          <div className="mx-auto w-14 h-14 bg-[#2C3E50] rounded-2xl rotate-3 flex items-center justify-center shadow-lg mb-2 group transition-transform hover:rotate-0 duration-300">
            <LogIn className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
          </div>

          <div className="space-y-2">
            {/* Título: Grafite */}
            <CardTitle className="text-2xl font-bold text-[#2D3436] tracking-tight">
              Bem-vindo de volta
            </CardTitle>
            {/* Descrição: Areia Escuro */}
            <CardDescription className="text-[#95A5A6] text-base">
              Insira suas credenciais para acessar o painel
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-8 px-8">

          {/* REMOVIDO: O Alert local. O Dialog Global aparecerá sobrepondo tudo se houver erro. */}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Email */}
            <div className="space-y-2 group">
              <Label
                htmlFor="email"
                className="text-sm font-semibold text-[#2D3436] group-focus-within:text-[#D35400] transition-colors"
              >
                E-mail Corporativo
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#95A5A6] group-focus-within:text-[#2C3E50] transition-colors duration-200" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 h-12 bg-gray-50/50 border-[#95A5A6]/40 focus:border-[#2C3E50] focus:ring-[#2C3E50] rounded-lg transition-all duration-200"
                />
              </div>
            </div>

            {/* Input Senha */}
            <div className="space-y-2 group">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold text-[#2D3436] group-focus-within:text-[#D35400] transition-colors"
                >
                  Senha
                </Label>
                <ForgotPasswordModal>
                  <button
                    type="button"
                    className="text-xs font-medium text-[#D35400] hover:text-[#A04000] hover:underline transition-colors outline-none"
                  >
                    Esqueceu a senha?
                  </button>
                </ForgotPasswordModal>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#95A5A6] group-focus-within:text-[#2C3E50] transition-colors duration-200" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 h-12 bg-gray-50/50 border-[#95A5A6]/40 focus:border-[#2C3E50] focus:ring-[#2C3E50] rounded-lg transition-all duration-200"
                />
              </div>
            </div>

            {/* Botão de Ação */}
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-12 text-base font-bold tracking-wide rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-[0.98]
                bg-[#D35400] hover:bg-[#b54500] text-white disabled:bg-[#95A5A6] disabled:opacity-70 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight className="ml-2 h-5 w-5 opacity-90" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        {/* Footer do Card */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <p className="text-xs text-[#95A5A6]">
            Protegido por reCAPTCHA e sujeito à Política de Privacidade.
          </p>
        </div>
      </Card>
    </div>
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (!email.includes('@')) {
      setError('Por favor, insira um email válido');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      // Redirecionar para dashboard
      router.push('/dashboard');
      
    } catch (error: any) {
      setError(error.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Formulário */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Bem-vindo de volta</h1>
            <p className="mt-2 text-gray-600">Entre na sua conta para continuar</p>
          </div>

          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Campo Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Campo Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Lembrar de mim e Esqueci a senha */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="rememberMe" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="rememberMe" className="text-sm">
                      Lembrar de mim
                    </Label>
                  </div>
                  <a 
                    href="/forgot-password" 
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Esqueceu a senha?
                  </a>
                </div>

                {/* Mensagem de Erro */}
                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}

                {/* Botão de Login */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>

                {/* Link para Cadastro */}
                <div className="text-center text-sm">
                  Não tem uma conta?{' '}
                  <a 
                    href="/signup" 
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Cadastre-se
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lado Direito - Banner (Opcional) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 items-center justify-center p-8">
        <div className="max-w-md text-white text-center">
          <h2 className="text-4xl font-bold mb-4">Sistema Incrível</h2>
          <p className="text-xl opacity-90">
            Gerencie seus projetos de forma eficiente e colaborativa com nossa plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Loader2, Lock, LogIn, Mail, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image'; // Recomendado usar next/image se possível, mas usei img padrão para facilitar

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Novo estado para visibilidade da senha
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 font-sans">
      
      {/* LADO ESQUERDO: Imagem (Escondida em mobile, visível em telas grandes) */}
      <div className="hidden lg:block relative h-full w-full bg-[#2C3E50] overflow-hidden">
        {/* Overlay para escurecer levemente a imagem e destacar o texto/logo se necessário */}
        <div className="absolute inset-0 bg-black/20 z-10" />
        
        {/* Imagem de fundo - Substitua o src pela imagem do seu projeto */}
        <img
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
          alt="Imagem de fundo premium"
          className="absolute inset-0 h-full w-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700"
        />

        {/* Elemento decorativo ou texto sobre a imagem */}
        <div className="absolute bottom-10 left-10 z-20 text-white max-w-md">
          <div className="h-1 w-20 bg-[#D35400] mb-4" />
          <h2 className="text-4xl font-bold tracking-tight mb-2">Elo Produtivo</h2>
          <p className="text-gray-200 text-lg">Gestão inteligente e integrada para sua produção têxtil.</p>
        </div>
      </div>

      {/* LADO DIREITO: Formulário */}
      <div className="flex items-center justify-center bg-[#F5F0E6] p-8">
        <div className="w-full max-w-[420px] space-y-8">
          
          {/* Header do Formulário */}
          <div className="text-center space-y-4">
             {/* Ícone da Marca */}
            <div className="mx-auto w-14 h-14 bg-[#2C3E50] rounded-2xl rotate-3 flex items-center justify-center shadow-lg mb-6 group transition-transform hover:rotate-0 duration-300">
              <LogIn className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-[#2D3436] tracking-tight">
                Bem-vindo de volta
              </h1>
              <p className="text-[#95A5A6] text-base">
                Insira suas credenciais para acessar o painel
              </p>
            </div>
          </div>

          {/* Área do Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
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
                  className="w-full pl-10 h-12 bg-white border-gray-200 focus:border-[#2C3E50] focus:ring-[#2C3E50] rounded-lg transition-all duration-200 shadow-sm"
                />
              </div>
            </div>

            {/* Input Senha com Olho */}
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
                {/* Ícone de Cadeado (Esquerda) */}
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#95A5A6] group-focus-within:text-[#2C3E50] transition-colors duration-200" />
                
                <Input
                  id="password"
                  name="password"
                  // Alterna entre text e password
                  type={showPassword ? "text" : "password"} 
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  // Adicionado pr-10 para o texto não ficar embaixo do ícone do olho
                  className="w-full pl-10 pr-10 h-12 bg-white border-gray-200 focus:border-[#2C3E50] focus:ring-[#2C3E50] rounded-lg transition-all duration-200 shadow-sm"
                />

                {/* Ícone de Olho (Direita) - Botão de Toggle */}
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-3.5 text-[#95A5A6] hover:text-[#2C3E50] transition-colors focus:outline-none"
                  tabIndex={-1} // Evita tab stop extra se desejar
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão de Ação */}
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-12 text-base font-bold tracking-wide rounded-lg shadow-lg hover:shadow-xl transition-all transform active:scale-[0.99]
                bg-[#D35400] hover:bg-[#b54500] text-white disabled:bg-[#95A5A6] disabled:opacity-70 disabled:cursor-not-allowed"
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

          {/* Footer */}
          <div className="pt-6 text-center">
             <p className="text-xs text-[#95A5A6]">
              Protegido por reCAPTCHA e sujeito à Política de Privacidade.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Lock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Componente interno para ler a URL com segurança
function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Pega o token da URL (ex: meusanpp.com/reset-password?token=XYZ...)
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Se não tiver token, manda pro login
  useEffect(() => {
    if (!token) {
      toast.error('Link inválido', { description: 'Faltou o token de segurança.' });
      router.push('/login');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.warning('Senhas não conferem');
      return;
    }
    if (password.length < 6) { // Ajuste conforme sua regra de backend
      toast.warning('Senha muito curta');
      return;
    }

    setLoading(true);
    try {
      // Chama a rota que EFETIVA a troca
      await api.post('/password/reset', {
        token,
        password,
      });

      setSuccess(true);
      toast.success('Senha alterada com sucesso!');
      
      // Manda pro login depois de 3 segundos
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (error: any) {
      console.error(error);
      // O global handler deve pegar, mas garante feedback
      const msg = error.response?.data?.message || 'Erro ao redefinir.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#2D3436]">Tudo certo!</h2>
          <p className="text-[#95A5A6]">Sua senha foi atualizada.</p>
        </div>
        <Button 
          onClick={() => router.push('/login')} 
          className="w-full bg-[#2C3E50] hover:bg-[#1a252f] text-white"
        >
          Ir para Login <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2 group">
        <Label htmlFor="new-pass" className="text-sm font-semibold text-[#2D3436]">Nova Senha</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-3.5 h-5 w-5 text-[#95A5A6] group-focus-within:text-[#2C3E50] transition-colors" />
          <Input
            id="new-pass"
            type="password"
            placeholder="Nova senha segura"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-10 h-12 bg-gray-50 focus:border-[#D35400] focus:ring-[#D35400]"
          />
        </div>
      </div>

      <div className="space-y-2 group">
        <Label htmlFor="confirm-pass" className="text-sm font-semibold text-[#2D3436]">Confirmar Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#95A5A6] group-focus-within:text-[#2C3E50] transition-colors" />
          <Input
            id="confirm-pass"
            type="password"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="pl-10 h-12 bg-gray-50 focus:border-[#D35400] focus:ring-[#D35400]"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !token}
        className="w-full h-12 bg-[#D35400] hover:bg-[#b54500] text-white font-bold tracking-wide shadow-md hover:shadow-lg transition-all"
      >
        {loading ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando...</>
        ) : (
          'Redefinir Senha'
        )}
      </Button>
    </form>
  );
}

// Layout da Página
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E6] px-4 py-8 font-sans">
      <Card className="w-full max-w-[400px] border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
        <div className="h-2 bg-[#2C3E50] w-full" />
        
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="mx-auto w-12 h-12 bg-[#D35400] rounded-xl rotate-3 flex items-center justify-center shadow-md mb-4">
            <KeyRound className="w-6 h-6 text-white -rotate-3" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#2D3436]">Nova Senha</CardTitle>
          <CardDescription className="text-[#95A5A6]">
            Crie uma senha forte para sua conta.
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-8 px-8">
          {/* Suspense é obrigatório aqui para não quebrar o build do Next.js */}
          <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin text-[#D35400]" /></div>}>
            <ResetPasswordContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
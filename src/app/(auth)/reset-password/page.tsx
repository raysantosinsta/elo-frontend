/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Componente interno para ler a URL com segurança
function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [touched, setTouched] = useState({ password: false, confirm: false });

  // Verificar força da senha
  useEffect(() => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(Math.min(strength, 5));
  }, [password]);

  const getStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-gray-200';
    if (passwordStrength === 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-orange-500';
    if (passwordStrength === 3) return 'bg-yellow-500';
    if (passwordStrength === 4) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return 'Muito fraca';
    if (passwordStrength === 1) return 'Fraca';
    if (passwordStrength === 2) return 'Média';
    if (passwordStrength === 3) return 'Boa';
    if (passwordStrength === 4) return 'Forte';
    return 'Muito forte';
  };

  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = password.length >= 6;
  const canSubmit = isPasswordValid && passwordsMatch && !loading && token;

  // Verifica se deve mostrar o indicador de força
  const showStrengthIndicator = touched.password && password.length > 0;

  useEffect(() => {
    if (!token) {
      toast.error('Link inválido');
      router.push('/login');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      toast.warning('Senhas não conferem');
      return;
    }
    if (password.length < 6) {
      toast.warning('Senha muito curta');
      return;
    }

    setLoading(true);
    try {
      await api.post('/password/reset', { token, password });
      setSuccess(true);
      toast.success('Senha alterada com sucesso!');
      setTimeout(() => router.push('/login'), 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-800">Tudo certo!</h2>
          <p className="text-gray-500">Sua senha foi atualizada com sucesso.</p>
          <p className="text-xs text-gray-400">Redirecionando para o login...</p>
        </div>
        <Button onClick={() => router.push('/login')} className="w-full bg-blue-600 hover:bg-blue-700">
          Ir para Login <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Campo Nova Senha */}
      <div className="space-y-2">
        <Label htmlFor="new-pass" className="text-sm font-semibold">Nova Senha</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="new-pass"
            type={showPassword ? "text" : "password"}
            placeholder="Digite sua nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setTouched(prev => ({ ...prev, password: true }))}
            required
            className="pl-10 pr-10 h-12 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        
        {/* Container com altura fixa para evitar gap */}
        <div className="h-12 transition-all duration-200 overflow-hidden">
          {showStrengthIndicator ? (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex gap-1 h-1.5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div 
                    key={level} 
                    className={`flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength >= level ? getStrengthColor() : 'bg-gray-200'
                    }`} 
                  />
                ))}
              </div>
              <p className="text-xs font-medium text-gray-500">
                Força: <span className="font-semibold">{getStrengthText()}</span>
              </p>
            </div>
          ) : (
            <div className="h-full flex items-center">
              <p className="text-xs text-gray-400">• Mínimo de 6 caracteres</p>
            </div>
          )}
        </div>
      </div>

      {/* Campo Confirmar Senha */}
      <div className="space-y-2">
        <Label htmlFor="confirm-pass" className="text-sm font-semibold">Confirmar Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="confirm-pass"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Repita a senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => setTouched(prev => ({ ...prev, confirm: true }))}
            required
            className="pl-10 pr-10 h-12 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        
        {/* Container com altura fixa para o feedback */}
        <div className="h-8 transition-all duration-200 overflow-hidden">
          {touched.confirm && confirmPassword.length > 0 && (
            <p className={`text-xs font-medium flex items-center gap-1 animate-in fade-in duration-200 ${
              passwordsMatch ? 'text-green-600' : 'text-red-500'
            }`}>
              {passwordsMatch ? (
                <><CheckCircle2 className="h-3 w-3" /> Senhas coincidem</>
              ) : (
                <><Lock className="h-3 w-3" /> Senhas não coincidem</>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Dicas de segurança - removido para evitar mais gaps, já incluído no indicador */}

      <Button type="submit" disabled={!canSubmit} className="w-full h-12 bg-blue-600 hover:bg-blue-700">
        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
        {loading ? 'Redefinindo...' : 'Redefinir Senha'}
      </Button>
    </form>
  );
}

// Página principal
export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-[550px] mx-auto">
      <Card className="border-0 shadow-xl">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-blue-600" />
        
        <CardHeader className="text-center pt-8">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Criar nova senha</CardTitle>
          <CardDescription>Digite sua nova senha abaixo</CardDescription>
        </CardHeader>

        <CardContent className="pb-8 px-6">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
            <ResetPasswordContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
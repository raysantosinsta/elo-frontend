/* eslint-disable @typescript-eslint/no-explicit-any */
// app/signup/page.tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    companyId: '',
    contact: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signup(formData);
      // Opcional: mostrar mensagem de sucesso
      alert('Cadastro realizado com sucesso!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Criar Nova Conta</CardTitle>
          <CardDescription className="text-slate-600">
            Preencha os dados abaixo para criar sua conta
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nome Completo
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Digite seu nome completo"
                value={formData.name}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Digite sua senha"
                value={formData.password}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyId" className="text-sm font-medium">
                ID da Empresa
              </Label>
              <Input
                id="companyId"
                name="companyId"
                type="text"
                required
                placeholder="Digite o ID da empresa"
                value={formData.companyId}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact" className="text-sm font-medium">
                Telefone
              </Label>
              <Input
                id="contact"
                name="contact"
                type="text"
                required
                placeholder="(11) 99999-9999"
                value={formData.contact}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-600">
            Já tem uma conta?{' '}
            <a 
              href="/login" 
              className="text-indigo-600 hover:text-indigo-500 font-medium underline-offset-4 hover:underline"
            >
              Fazer login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import { Loader2, Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function ForgotPasswordModal({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); // Garante que não submete form pai se houver
    if (!email) return;

    setLoading(true);
    try {
      // Chama a rota corrigida
      await api.post('/password/forgot', { email });

      setSuccess(true);
      // toast.success('Email enviado!', {
      //   description: 'Verifique sua caixa de entrada.',
      // });
    } catch (error: any) {
      console.error(error);
      // Se for erro 500, o axios vai cair aqui.
      // O backend vai ter logado o motivo real no terminal.
      toast.error('Erro ao enviar', {
        description: 'Tente novamente mais tarde ou contate o suporte.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => {
        setSuccess(false);
        setEmail('');
      }, 300);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#2D3436]">Recuperar Senha</DialogTitle>
          <DialogDescription className="text-[#95A5A6]">
            {success
              ? 'Solicitação realizada com sucesso!'
              : 'Digite seu e-mail corporativo para receber o link.'}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              className="mt-2 w-full border-[#D35400] text-[#D35400] hover:bg-[#D35400]/10"
            >
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2 group">
              <Label htmlFor="reset-email" className="text-sm font-semibold text-[#2D3436]">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-[#95A5A6]" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 bg-gray-50 focus:border-[#D35400] focus:ring-[#D35400]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-[#2C3E50] hover:bg-[#1a252f] text-white"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  Enviar Link <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
// /* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/login/page.tsx
'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, ArrowRight, Loader2, Lock, LogIn, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Hook personalizado de autenticação
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      // Redirecionamento é tratado pelo contexto ou middleware, mas por segurança:
      // router.push('/dashboard'); 
    } catch (err: any) {
      // Tratamento de erro mais amigável
      setError(err.message || 'Credenciais inválidas. Por favor, tente novamente.');
      // Opcional: Limpar senha em caso de erro para UX/Segurança
      if (err.message?.includes('senha')) setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = () => {
    // Feedback imediato: limpa o erro assim que o usuário começa a corrigir
    if (error) setError('');
  };

  return (
    // 1. Background: Algodão Cru (#F5F0E6) para conforto visual e redução de fadiga
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E6] px-4 py-8 font-sans transition-colors duration-300">
      
      <Card className="w-full max-w-[400px] border-0 shadow-2xl shadow-black/5 bg-white/95 backdrop-blur-sm overflow-hidden">
        
        {/* Header Visual */}
        <div className="h-2 bg-[#D35400] w-full" /> {/* Faixa decorativa Terracota */}

        <CardHeader className="space-y-4 text-center pt-8 pb-6">
          {/* Ícone da Marca: Azul Petróleo (#2C3E50) para sobriedade */}
          <div className="mx-auto w-14 h-14 bg-[#2C3E50] rounded-2xl rotate-3 flex items-center justify-center shadow-lg mb-2 group transition-transform hover:rotate-0 duration-300">
            <LogIn className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
          </div>

          <div className="space-y-2">
            {/* Título: Grafite (#2D3436) para leitura nítida */}
            <CardTitle className="text-2xl font-bold text-[#2D3436] tracking-tight">
              Bem-vindo de volta
            </CardTitle>
            {/* Descrição: Areia Escuro (#95A5A6) para texto secundário */}
            <CardDescription className="text-[#95A5A6] text-base">
              Insira suas credenciais para acessar o painel
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-8 px-8">
          
          {/* Alerta de Erro com Animação */}
          {error && (
            <Alert variant="destructive" className="bg-red-50 border-l-4 border-l-red-500 border-t-0 border-r-0 border-b-0 animate-in slide-in-from-top-2 fade-in duration-300">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 font-medium ml-2">
                {error}
              </AlertDescription>
            </Alert>
          )}

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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    handleInputChange();
                  }}
                  // Estilos de Input: Borda suave, Foco em Grafite ou Azul
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
                <a href="#" className="text-xs font-medium text-[#D35400] hover:text-[#A04000] hover:underline transition-colors">
                  Esqueceu a senha?
                </a>
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleInputChange();
                  }}
                  className="w-full pl-10 h-12 bg-gray-50/50 border-[#95A5A6]/40 focus:border-[#2C3E50] focus:ring-[#2C3E50] rounded-lg transition-all duration-200"
                />
              </div>
            </div>

            {/* Botão de Ação: Terracota (#D35400) */}
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
// 'use client';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { useAuth } from '@/contexts/AuthContext';
// import { Loader2, Lock, LogIn, Mail } from 'lucide-react';
// import { useRouter } from 'next/navigation';
// import { useState } from 'react';

// export default function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const { login } = useAuth();
//   const router = useRouter();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     try {
//       await login(email, password);
//       // router.push('/dashboard'); // Corrigido para /Kanban, que é o destino no AuthContext
//     } catch (err: any) {
//       setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleInputChange = () => {
   
//     if (error) setError('');
//   };



//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
//       <Card className="w-full max-w-md shadow-xl border-0">
//         <CardHeader className="space-y-3 text-center pb-6">
//           <div className="mx-auto w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
//             <LogIn className="w-6 h-6 text-white" />
//           </div>
//           <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
//             Entre na sua conta
//           </CardTitle>
//           <CardDescription className="text-slate-600 text-base">
//             Acesse o sistema para gerenciar usuários e empresas
//           </CardDescription>
//         </CardHeader>

//         <CardContent className="space-y-5">
//           {error && (
//             <Alert variant="destructive" className="border-red-200 bg-red-50">
//               <AlertDescription className="text-red-800">{error}</AlertDescription>
//             </Alert>
//           )}

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="space-y-2">
//               <Label htmlFor="email" className="text-sm font-medium text-slate-700">
//                 Email
//               </Label>
//               <div className="relative">
//                 <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
//                 <Input
//                   id="email"
//                   name="email"
//                   type="email"
//                   required
//                   placeholder="seu@email.com"
//                   value={email}
//                   onChange={(e) => {
//                     setEmail(e.target.value);
//                     handleInputChange();
//                   }}
//                   className="w-full pl-10 border-slate-300 focus:border-indigo-500"
//                 />
//               </div>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="password" className="text-sm font-medium text-slate-700">
//                 Senha
//               </Label>
//               <div className="relative">
//                 <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
//                 <Input
//                   id="password"
//                   name="password"
//                   type="password"
//                   required
//                   placeholder="Digite sua senha"
//                   value={password}
//                   onChange={(e) => {
//                     setPassword(e.target.value);
//                     handleInputChange();
//                   }}
//                   className="w-full pl-10 border-slate-300 focus:border-indigo-500"
//                 />
//               </div>
//             </div>

//             <Button
//               type="submit"
//               disabled={loading || !email || !password}
//               className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-2.5 transition-all duration-200"
//               size="lg"
//             >
//               {loading ? (
//                 <>
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                   Entrando...
//                 </>
//               ) : (
//                 <>
//                   <LogIn className="mr-2 h-4 w-4" />
//                   Entrar e Gerenciar Usuários
//                 </>
//               )}
//             </Button>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
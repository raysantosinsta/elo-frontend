/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building, Loader2, LogIn, Shield, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const signupSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido. Use (11) 99999-9999'),
  document: z.string().optional().nullable(),
  companyId: z.string().uuid('Selecione uma empresa válida'),
  role: z.enum(['EMPLOYER', 'ADMIN', 'MASTER']),
});

type SignupFormData = z.infer<typeof signupSchema>;

interface Company {
  id: string;
  name: string;
  email: string;
  cnpj: string;
}

export default function AdminSignupPage() {
  // ATENÇÃO: Removemos 'adminSignup' e pegamos 'authFetch'
  const { user, token, loading: authLoading, authFetch } = useAuth();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'EMPLOYER',
    },
  });

  const selectedCompanyId = watch('companyId');
  const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || 'http://localhost:3000';

  // Buscar empresas se for MASTER
  useEffect(() => {
    if (user?.role === 'MASTER' && token) {
      const loadCompanies = async () => {
        setLoadingCompanies(true);
        try {
          // Usa authFetch para já ir autenticado
          const res = await authFetch(`${API_BASE}/auth/companies/master`);

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Erro ${res.status}: ${errorText}`);
          }

          const data = await res.json();
          setCompanies(data);
        } catch (err) {
          console.error("Falha ao carregar empresas para MASTER:", err);
          setServerError("Não foi possível carregar a lista de empresas.");
        } finally {
          setLoadingCompanies(false);
        }
      };
      loadCompanies();
    }
  }, [user?.role, token, authFetch]);

  // Preenche companyId se for ADMIN
  useEffect(() => {
    if (user?.role === 'ADMIN' && user.companyId) {
      setValue('companyId', user.companyId);
    }
  }, [user, setValue]);

  const onSubmit = async (data: SignupFormData) => {
    setServerError('');
    setSuccess('');
    
    try {
      // AQUISIÇÃO DIRETA AO CONTROLLER DE USUÁRIOS
      const response = await authFetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          // Garante que campos opcionais/defaults vão corretamente
          document: data.document || null,
          isProfessional: false, // Default
          status: 'ACTIVE'       // Default
        }),
      });

      if (!response.ok) {
        // Tenta pegar mensagem de erro do backend
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao criar usuário`);
      }

      setSuccess('Usuário cadastrado com sucesso!');

      // Limpa o formulário mantendo a empresa se for Admin
      reset({
        name: '',
        email: '',
        password: '',
        phone: '',
        document: '',
        companyId: user?.role === 'ADMIN' ? (user.companyId || '') : '',
        role: 'EMPLOYER',
      });

    } catch (err: any) {
      console.error(err);
      setServerError(err.message || 'Erro ao cadastrar usuário');
    }
  };

  // Máscara de telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/(\d{2})(\d)/, '($1) ');
      if (value.length > 10) {
        value = value.replace(/(\d{5})(\d)/, '$1-$1');
      } else {
        value = value.replace(/(\d{4})(\d)/, '$1-$1');
      }
    }
    e.target.value = value;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Apenas administradores podem cadastrar usuários</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login">
              <Button className="gap-2">
                <LogIn className="h-4 w-4" /> Fazer Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center gap-3 items-center mb-4">
            <UserPlus className="h-10 w-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-slate-900">Cadastro de Usuário</h1>
          </div>
          <p className="text-slate-600">
            Criando novo acesso para{' '}
            <span className="font-semibold text-indigo-600">
              {user.role === 'MASTER' ? 'qualquer empresa' : user.company?.name}
            </span>
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6" />
              {user.role === 'MASTER' ? 'Master' : 'Administrador'} • {user.name}
            </CardTitle>
            <CardDescription className="text-indigo-100">
              Preencha os dados do novo usuário abaixo
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8">
            {serverError && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campos do formulário (Nome, Email, Senha, Telefone) mantidos iguais */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input id="name" placeholder="João Silva" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" placeholder="joao@empresa.com.br" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input id="password" type="password" placeholder="Mínimo 6 caracteres" {...register('password')} className={errors.password ? 'border-red-500' : ''} />
                  {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input 
                    id="phone" 
                    placeholder="(11) 99999-9999" 
                    maxLength={15} 
                    {...register('phone', {
                      onChange: (e) => {
                        let valor = e.target.value.replace(/\D/g, '');
                        valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
                        valor = valor.replace(/(\d)(\d{4})$/, '$1-$2');
                        e.target.value = valor;
                      },
                    })}
                    className={errors.phone ? 'border-red-500' : ''} 
                  />
                  {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document">CPF ou CNPJ </Label>
                  <Input id="document" placeholder="000.000.000-00" {...register('document')} />
                </div>

                {/* Perfil */}
                <div className="space-y-2">
                  <Label>Perfil de Acesso</Label>
                  <Select value={watch('role')} onValueChange={(value) => setValue('role', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYER">Funcionário</SelectItem>
                      {user.role === 'MASTER' && (
                        <>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="MASTER">Master</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seleção de Empresa */}
              <div className="space-y-3 pt-4 border-t">
                <Label>Empresa *</Label>
                {user.role === 'MASTER' ? (
                  loadingCompanies ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando empresas...
                    </div>
                  ) : companies.length > 0 ? (
                    <Select value={selectedCompanyId} onValueChange={(value) => setValue('companyId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{company.name}</span>
                              <span className="text-xs text-slate-500">{company.cnpj}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-amber-600 text-sm">Nenhuma empresa ativa encontrada.</p>
                  )
                ) : (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building className="h-8 w-8 text-indigo-600" />
                      <div>
                        <p className="font-medium text-indigo-900">{user.company?.name}</p>
                        <p className="text-sm text-indigo-700">Usuário será vinculado automaticamente</p>
                      </div>
                    </div>
                  </div>
                )}
                {errors.companyId && <p className="text-sm text-red-500">{errors.companyId.message}</p>}
              </div>

              <Button type="submit" disabled={isSubmitting || !selectedCompanyId} className="w-full h-12 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Cadastrando usuário...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Cadastrar Usuário
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
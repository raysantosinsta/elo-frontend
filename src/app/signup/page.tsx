/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/signup/page.tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, LogIn, Building, Search, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Company {
  id: string;
  name: string;
  email: string;
  status: string;
}

export default function AdminSignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    companyId: '',
    contact: '',
    role: 'USER'
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { adminSignup, user, loading: authLoading, token } = useAuth();

  // 🔥 CARREGAR EMPRESAS (APENAS PARA MASTER)
  useEffect(() => {
    const loadCompanies = async () => {
      if (user?.role === 'MASTER') {
        setLoadingCompanies(true);
        try {
          const response = await fetch('http://localhost:3000/auth/companies', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const companiesData = await response.json();
            setCompanies(companiesData);
          } else {
            console.error('Erro ao carregar empresas');
          }
        } catch (error) {
          console.error('Erro ao carregar empresas:', error);
        } finally {
          setLoadingCompanies(false);
        }
      }
    };

    if (user) {
      loadCompanies();
    }
  }, [user, token]);

  // 🔥 DEFINIR companyId AUTOMATICAMENTE PARA ADMIN
  useEffect(() => {
    if (user?.companyId && user.role === 'ADMIN') {
      setFormData(prev => ({
        ...prev,
        companyId: user.companyId
      }));
    }
  }, [user?.companyId, user?.role]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRoleChange = (value: string) => {
    setFormData({
      ...formData,
      role: value
    });
  };

  const handleCompanyChange = (value: string) => {
    setFormData({
      ...formData,
      companyId: value
    });
  };

  // 🔥 FUNÇÃO DE VALIDAÇÃO
  const validateForm = () => {
    if (!formData.name.trim()) {
      return 'Nome completo é obrigatório';
    }
    if (!formData.email.trim()) {
      return 'Email é obrigatório';
    }
    if (!formData.password.trim()) {
      return 'Senha é obrigatória';
    }
    if (formData.password.length < 6) {
      return 'Senha deve ter pelo menos 6 caracteres';
    }
    if (!formData.contact.trim()) {
      return 'Telefone é obrigatório';
    }
    if (!formData.companyId.trim()) {
      return 'Empresa é obrigatória';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      await adminSignup(formData);
      setSuccess('Usuário cadastrado com sucesso!');
      
      // Limpar formulário mantendo a empresa selecionada
      setFormData({
        email: '',
        password: '',
        name: '',
        companyId: user?.role === 'ADMIN' ? user.companyId : formData.companyId,
        contact: '',
        role: 'USER'
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user && !['MASTER', 'ADMIN'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <Alert variant="destructive">
            <AlertDescription>
              Acesso negado. Apenas administradores podem criar usuários.
            </AlertDescription>
          </Alert>
          <Link href="/login" className="block">
            <Button className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              Fazer Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900">Cadastro de Usuários</h1>
        </div>

        {/* 🔥 MENSAGEM INFORMATIVA PARA USUÁRIOS NÃO AUTENTICADOS */}
        {!user && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-800 mb-2">
                  Antes de cadastrar um funcionário
                </h3>
                <p className="text-amber-700 text-sm">
                  É necessário que uma empresa já esteja cadastrada no sistema.
                  <br />
                  Caso você já tenha uma empresa criada, por favor{' '}
                  <Link href="/login" className="font-medium underline hover:text-amber-900">
                    faça login primeiro
                  </Link>{' '}
                  para então registrar novos usuários vinculados a ela.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 INFO DO USUÁRIO LOGADO */}
        {user && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Shield className="h-4 w-4" />
              <span>
                Logado como: <strong>{user.name}</strong> ({user.role})
                {user.role === 'ADMIN' && (
                  <span className="ml-2 text-blue-600">
                    • Usuários serão cadastrados na sua empresa
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Novo Usuário</CardTitle>
            <CardDescription className="text-slate-600">
              {!user 
                ? 'Cadastre um novo usuário no sistema' 
                : user?.role === 'MASTER' 
                  ? 'Selecione a empresa e cadastre o usuário' 
                  : 'Cadastre um novo usuário na sua empresa'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nome Completo *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Digite o nome completo"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!user} // 🔥 Desabilitar se não estiver logado
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="usuario@empresa.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!user} // 🔥 Desabilitar se não estiver logado
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha *
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Digite a senha (mínimo 6 caracteres)"
                    value={formData.password}
                    onChange={handleChange}
                    minLength={6}
                    disabled={!user} // 🔥 Desabilitar se não estiver logado
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact" className="text-sm font-medium">
                    Telefone *
                  </Label>
                  <Input
                    id="contact"
                    name="contact"
                    type="text"
                    required
                    placeholder="(11) 99999-9999"
                    value={formData.contact}
                    onChange={handleChange}
                    disabled={!user} // 🔥 Desabilitar se não estiver logado
                  />
                </div>
              </div>

              {/* 🔥 SELEÇÃO DE EMPRESA - COMPORTAMENTO DIFERENCIADO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium">
                    Empresa *
                  </Label>
                  
                  {!user ? (
                    // 🔥 USUÁRIO NÃO LOGADO: Mostrar mensagem
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 border border-amber-200 rounded-md bg-amber-50">
                        <Info className="h-4 w-4 text-amber-500" />
                        <div>
                          <div className="font-medium text-sm text-amber-700">
                            Faça login para selecionar uma empresa
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-amber-600">
                        ⓘ É necessário estar logado como ADMIN ou MASTER para cadastrar usuários
                      </p>
                    </div>
                  ) : user?.role === 'MASTER' ? (
                    // 🔥 MASTER: Pode selecionar qualquer empresa
                    <Select value={formData.companyId} onValueChange={handleCompanyChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingCompanies 
                            ? "Carregando empresas..." 
                            : "Selecione uma empresa"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{company.name}</div>
                                <div className="text-xs text-slate-500">{company.email}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    // 🔥 ADMIN: Empresa fixa (somente leitura)
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-md bg-slate-50">
                        <Building className="h-4 w-4 text-slate-500" />
                        <div>
                          <div className="font-medium text-sm">
                            {user?.company?.name || 'Sua empresa'}
                          </div>
                          <div className="text-xs text-slate-500">
                            ID: {formData.companyId}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        ⓘ Usuário será cadastrado automaticamente na sua empresa
                      </p>
                    </div>
                  )}
                  
                  {user?.role === 'MASTER' && companies.length === 0 && !loadingCompanies && (
                    <p className="text-xs text-amber-600">
                      Nenhuma empresa encontrada. Verifique se há empresas ativas no sistema.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Perfil do Usuário
                  </Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={handleRoleChange}
                    disabled={!user} // 🔥 Desabilitar se não estiver logado
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Usuário</SelectItem>
                      {user?.role === 'MASTER' && (
                        <>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="MASTER">Master</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    {!user 
                      ? 'Faça login para selecionar o perfil' 
                      : user?.role === 'ADMIN' 
                        ? 'ADMIN só pode criar usuários com perfil USER' 
                        : 'MASTER pode criar qualquer perfil'
                    }
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading || !formData.companyId || !user} // 🔥 Desabilitar se não estiver logado
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {!user ? (
                  'Faça login para cadastrar usuários'
                ) : loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar Usuário'
                )}
              </Button>
            </form>

            <div className="pt-4 border-t">
              {!user ? (
                // 🔥 BOTÃO PRINCIPAL PARA LOGIN QUANDO NÃO ESTIVER LOGADO
                <Link href="/login" className="w-full">
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                    <LogIn className="h-4 w-4" />
                    Fazer Login para Continuar
                  </Button>
                </Link>
              ) : (
                // 🔥 BOTÃO SECUNDÁRIO QUANDO ESTIVER LOGADO
                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full gap-2">
                    <LogIn className="h-4 w-4" />
                    Ir para Login
                  </Button>
                </Link>
              )}
            </div>

            {/* 🔥 LINK PARA CRIAR CONTA SE NÃO TIVER UMA */}
            {!user && (
              <div className="text-center">
                <p className="text-sm text-slate-600">
                  Não tem uma conta?{' '}
                  <Link 
                    href="/signup" 
                    className="text-indigo-600 hover:text-indigo-500 font-medium underline"
                  >
                    Criar nova empresa
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
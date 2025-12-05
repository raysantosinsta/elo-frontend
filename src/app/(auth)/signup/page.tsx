// /* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building,
  CheckCircle2,
  Loader2,
  LogIn,
  Shield,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// --- VALIDATION SCHEMA (Manteve-se a lógica robusta) ---
const signupSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  phone: z
    .string()
    .regex(
      /^\(\d{2}\) \s?(9?\d{4}-\d{4})$/,
      "Formato esperado: (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX"
    ),
  document: z.string().optional().nullable(),
  companyId: z.string().uuid("Selecione uma empresa válida"),
  role: z.enum(["EMPLOYER", "ADMIN", "MASTER"]),
});

type SignupFormData = z.infer<typeof signupSchema>;

interface Company {
  id: string;
  name: string;
  email: string;
  cnpj: string;
}

export default function AdminSignupPage() {
  const { user, token, loading: authLoading, authFetch } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");

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
      role: "EMPLOYER",
    },
  });

  const selectedCompanyId = watch("companyId");
  const API_BASE =
    process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

  // --- EFEITOS (Lógica de Negócio) ---

  // Buscar empresas se for MASTER
  useEffect(() => {
    if (user?.role === "MASTER" && token) {
      const loadCompanies = async () => {
        setLoadingCompanies(true);
        try {
          const res = await authFetch(`${API_BASE}/companies`);
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Erro ${res.status}: ${errorText}`);
          }
          const data = await res.json();
          setCompanies(data);
        } catch (err) {
          console.error("Falha ao carregar empresas:", err);
          setServerError("Não foi possível carregar a lista de empresas.");
        } finally {
          setLoadingCompanies(false);
        }
      };
      loadCompanies();
    }
  }, [user?.role, token, authFetch]);

  // Auto-preencher companyId se for ADMIN
  useEffect(() => {
    if (user?.role === "ADMIN" && user.companyId) {
      setValue("companyId", user.companyId);
    }
  }, [user, setValue]);

  // --- HANDLERS ---

  const onSubmit = async (data: SignupFormData) => {
    setServerError("");
    setSuccess("");

    try {
      const response = await authFetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          document: data.document || null,
          isProfessional: false,
          status: "ACTIVE",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Falha ao criar usuário");
      }

      setSuccess("Usuário cadastrado com sucesso!");
      reset({
        name: "",
        email: "",
        password: "",
        phone: "",
        document: "",
        companyId: user?.role === "ADMIN" ? user.companyId || "" : "",
        role: "EMPLOYER",
      });
      // Scroll suave para o topo para ver a mensagem de sucesso
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error(err);
      setServerError(err.message || "Erro ao cadastrar usuário");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const maskPhone = (value: string) => {
    if (!value) return "";
    let clean = value.replace(/\D/g, "").substring(0, 11);
    clean = clean.replace(/^(\d{2})(\d)/g, "($1) $2");
    if (clean.length > 10 && clean.startsWith("(")) {
      clean = clean.replace(/(\d{5})(\d{4})$/, "$1-$2");
    } else {
      clean = clean.replace(/(\d{4})(\d{4})$/, "$1-$2");
    }
    return clean;
  };

  const maskDocument = (value: string) => {
    if (!value) return "";
    let v = value.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      return v.substring(0, 14);
    } else {
      v = v.replace(/^(\d{2})(\d)/, "$1.$2");
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
      v = v.replace(/(\d{4})(\d)/, "$1-$2");
      return v.substring(0, 18);
    }
  };

  // --- RENDER STYLES & LAYOUT ---

  // 1. Loading State Global
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E6]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#D35400]" />
          <p className="text-[#2D3436] font-medium animate-pulse">
            Carregando sistema...
          </p>
        </div>
      </div>
    );
  }

  // 2. Access Denied State
  if (!user || !["MASTER", "ADMIN"].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F0E6]">
        <Card className="w-full max-w-md border-t-4 border-t-[#D35400] shadow-lg">
          <CardHeader className="text-center pb-2">
            <ShieldAlert className="h-16 w-16 mx-auto text-[#D35400] mb-4" />
            <CardTitle className="text-2xl text-[#2D3436]">
              Acesso Restrito
            </CardTitle>
            <CardDescription className="text-[#95A5A6] text-base">
              Você não tem permissão para acessar esta área.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-6">
            <Link href="/login">
              <Button className="w-full bg-[#2C3E50] hover:bg-[#1a252f] text-white transition-all duration-300">
                <LogIn className="h-4 w-4 mr-2" /> Ir para Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Main Form
  return (
    // Fundo Algodão Cru (#F5F0E6)
    <div className="min-h-screen bg-[#F5F0E6] px-4 py-8 md:py-12 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header da Página */}
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-full shadow-sm mb-4">
            <UserPlus className="h-8 w-8 text-[#D35400]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#2D3436] tracking-tight">
            Gestão de Usuários
          </h1>
          <p className="text-[#95A5A6] text-lg max-w-xl mx-auto">
            Cadastre novos colaboradores para{" "}
            <span className="font-semibold text-[#2C3E50]">
              {user.role === "MASTER" ? "o sistema" : user.company?.name}
            </span>
          </p>
        </div>

        {/* Card Principal */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur overflow-hidden">
          
          {/* Header do Card - Azul Petróleo (#2C3E50) */}
          <div className="bg-[#2C3E50] p-6 md:p-8 text-white">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-[#D35400]" />
              <div>
                <h2 className="text-xl font-semibold">Novo Cadastro</h2>
                <p className="text-indigo-100/80 text-sm mt-1">
                  Operador: {user.name} ({user.role})
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-6 md:p-8">
            
            {/* Feedback Messages */}
            {serverError && (
              <Alert variant="destructive" className="mb-8 border-l-4 border-l-red-600 bg-red-50">
                <ShieldAlert className="h-5 w-5" />
                <AlertDescription className="text-base ml-2">
                  {serverError}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-8 border-l-4 border-l-green-600 bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-700" />
                <AlertDescription className="text-base ml-2 text-green-800 font-medium">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Seção 1: Dados Pessoais */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-[#95A5A6]/30">
                  <h3 className="text-lg font-semibold text-[#2D3436]">
                    Dados Pessoais
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#2D3436] font-medium">
                      Nome Completo <span className="text-[#D35400]">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Ex: Ana Souza"
                      {...register("name")}
                      // Foco em Azul Petróleo para contraste profissional
                      className={`h-11 border-[#95A5A6] focus:border-[#2C3E50] focus:ring-[#2C3E50] transition-all ${
                        errors.name ? "border-red-500 focus:ring-red-200" : ""
                      }`}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 font-medium animate-in slide-in-from-top-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[#2D3436] font-medium">
                      Email Corporativo <span className="text-[#D35400]">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nome@empresa.com"
                      {...register("email")}
                      className={`h-11 border-[#95A5A6] focus:border-[#2C3E50] focus:ring-[#2C3E50] transition-all ${
                        errors.email ? "border-red-500 focus:ring-red-200" : ""
                      }`}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 font-medium">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[#2D3436] font-medium">
                      Telefone / Celular <span className="text-[#D35400]">*</span>
                    </Label>
                    <Input
                      id="phone"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      {...register("phone", {
                        onChange: (e) => {
                          const val = maskPhone(e.target.value);
                          e.target.value = val;
                          setValue("phone", val, { shouldValidate: true });
                        },
                      })}
                      className={`h-11 border-[#95A5A6] focus:border-[#2C3E50] focus:ring-[#2C3E50] transition-all ${
                        errors.phone ? "border-red-500 focus:ring-red-200" : ""
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600 font-medium">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document" className="text-[#2D3436] font-medium">
                      CPF ou CNPJ
                    </Label>
                    <Input
                      id="document"
                      placeholder="Apenas números"
                      maxLength={18}
                      {...register("document", {
                        onChange: (e) => {
                          const val = maskDocument(e.target.value);
                          e.target.value = val;
                          setValue("document", val);
                        },
                      })}
                      className={`h-11 border-[#95A5A6] focus:border-[#2C3E50] focus:ring-[#2C3E50] transition-all ${
                        errors.document ? "border-red-500 focus:ring-red-200" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Credenciais e Vínculos */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-[#95A5A6]/30">
                  <h3 className="text-lg font-semibold text-[#2D3436]">
                    Acesso e Permissões
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[#2D3436] font-medium">
                      Senha Inicial <span className="text-[#D35400]">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      {...register("password")}
                      className={`h-11 border-[#95A5A6] focus:border-[#2C3E50] focus:ring-[#2C3E50] transition-all ${
                        errors.password ? "border-red-500 focus:ring-red-200" : ""
                      }`}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-600 font-medium">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#2D3436] font-medium">
                      Perfil de Acesso
                    </Label>
                    <Select
                      value={watch("role")}
                      onValueChange={(val) => setValue("role", val as any)}
                    >
                      <SelectTrigger className="h-11 border-[#95A5A6] focus:ring-[#2C3E50]">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMPLOYER">Funcionário Padrão</SelectItem>
                        {user.role === "MASTER" && (
                          <>
                            <SelectItem value="ADMIN">Administrador Local</SelectItem>
                            <SelectItem value="MASTER">Master (Sistema)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Seção da Empresa */}
                <div className="pt-2">
                  <Label className="text-[#2D3436] font-medium mb-2 block">
                    Vínculo Empresarial <span className="text-[#D35400]">*</span>
                  </Label>
                  
                  {user.role === "MASTER" ? (
                    loadingCompanies ? (
                      <div className="flex items-center gap-2 text-[#95A5A6] h-11 px-3 border border-[#95A5A6]/30 rounded-md bg-[#F5F0E6]/50">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando lista de empresas...
                      </div>
                    ) : companies.length > 0 ? (
                      <div className="relative">
                        <Select
                          value={selectedCompanyId}
                          onValueChange={(val) => setValue("companyId", val)}
                        >
                          <SelectTrigger className="h-12 border-[#95A5A6] focus:ring-[#2C3E50] bg-white">
                            <SelectValue placeholder="Selecione a empresa contratante" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((comp) => (
                              <SelectItem key={comp.id} value={comp.id}>
                                <span className="font-medium text-[#2D3436]">{comp.name}</span>
                                <span className="ml-2 text-[#95A5A6] text-xs">
                                  ({comp.cnpj})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.companyId && (
                          <p className="text-sm text-red-600 font-medium mt-1">
                            {errors.companyId.message}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-amber-600 text-sm bg-amber-50 p-3 rounded-md border border-amber-200">
                        Nenhuma empresa ativa encontrada no banco de dados.
                      </p>
                    )
                  ) : (
                    <div className="p-4 bg-[#F5F0E6] border border-[#95A5A6]/30 rounded-lg flex items-start gap-4">
                      <div className="bg-white p-2 rounded-full shadow-sm">
                        <Building className="h-6 w-6 text-[#2C3E50]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#2C3E50] text-lg">
                          {user.company?.name}
                        </p>
                        <p className="text-sm text-[#95A5A6]">
                          O novo usuário será vinculado automaticamente a esta organização.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Ação Principal - TERRACOTA */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedCompanyId}
                  className="w-full h-14 text-lg font-bold tracking-wide rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-[0.99]
                    bg-[#D35400] hover:bg-[#A04000] text-white disabled:bg-[#95A5A6] disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Processando Cadastro...
                    <Loader2/>
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-6 w-6" />
                      Confirmar Cadastro
                    </>
                  )}
                </Button>
                <p className="text-center text-[#95A5A6] text-sm mt-4">
                  Todas as ações são monitoradas e registradas por segurança.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// "use client";

// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useAuth } from "@/contexts/AuthContext";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Building, Loader2, LogIn, Shield, UserPlus } from "lucide-react";
// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import * as z from "zod";

// const signupSchema = z.object({
//   name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
//   email: z.string().email("Email inválido"),
//   password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
//   phone: z
//     .string()
//     // Novo regex mais robusto: aceita (DD) 9XXXX-XXXX OU (DD) XXXX-XXXX
//     .regex(
//       /^\(\d{2}\) \s?(9?\d{4}-\d{4})$/,
//       "Telefone inválido. O formato deve ser (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX"
//     ),
//   document: z.string().optional().nullable(),
//   companyId: z.string().uuid("Selecione uma empresa válida"),
//   role: z.enum(["EMPLOYER", "ADMIN", "MASTER"]),
// });

// type SignupFormData = z.infer<typeof signupSchema>;

// interface Company {
//   id: string;
//   name: string;
//   email: string;
//   cnpj: string;
// }

// export default function AdminSignupPage() {
//   // ATENÇÃO: Removemos 'adminSignup' e pegamos 'authFetch'
//   const { user, token, loading: authLoading, authFetch } = useAuth();

//   const [companies, setCompanies] = useState<Company[]>([]);
//   const [loadingCompanies, setLoadingCompanies] = useState(false);
//   const [serverError, setServerError] = useState("");
//   const [success, setSuccess] = useState("");

//   const {
//     register,
//     handleSubmit,
//     formState: { errors, isSubmitting },
//     reset,
//     setValue,
//     watch,
//   } = useForm<SignupFormData>({
//     resolver: zodResolver(signupSchema),
//     defaultValues: {
//       role: "EMPLOYER",
//     },
//   });

//   const selectedCompanyId = watch("companyId");
//   const API_BASE =
//     process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

//   // Buscar empresas se for MASTER
//   useEffect(() => {
//     if (user?.role === "MASTER" && token) {
//       const loadCompanies = async () => {
//         setLoadingCompanies(true);
//         try {
//           const res = await authFetch(`${API_BASE}/companies`);

//           if (!res.ok) {
//             const errorText = await res.text();
//             throw new Error(`Erro ${res.status}: ${errorText}`);
//           }

//           const data = await res.json();
//           console.log("Loaded companies:", data);
//           setCompanies(data);
//         } catch (err) {
//           console.error("Falha ao carregar empresas para MASTER:", err);
//           setServerError("Não foi possível carregar a lista de empresas.");
//         } finally {
//           setLoadingCompanies(false);
//         }
//       };
//       loadCompanies();
//     }
//   }, [user?.role, token, authFetch]);

//   // Preenche companyId se for ADMIN
//   useEffect(() => {
//     if (user?.role === "ADMIN" && user.companyId) {
//       setValue("companyId", user.companyId);
//     }
//   }, [user, setValue]);

//   const onSubmit = async (data: SignupFormData) => {
//     setServerError("");
//     setSuccess("");

//     try {
//       // AQUISIÇÃO DIRETA AO CONTROLLER DE USUÁRIOS
//       const response = await authFetch(`${API_BASE}/users`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           ...data,
//           // Garante que campos opcionais/defaults vão corretamente
//           document: data.document || null,
//           isProfessional: false, // Default
//           status: "ACTIVE", // Default
//         }),
//       });

//       if (!response.ok) {
//         // Tenta pegar mensagem de erro do backend
//         const errorData = await response.json().catch(() => ({}));
//         throw new Error(
//           errorData.message || `Erro ${response.status}: Falha ao criar usuário`
//         );
//       }

//       setSuccess("Usuário cadastrado com sucesso!");

//       // Limpa o formulário mantendo a empresa se for Admin
//       reset({
//         name: "",
//         email: "",
//         password: "",
//         phone: "",
//         document: "",
//         companyId: user?.role === "ADMIN" ? user.companyId || "" : "",
//         role: "EMPLOYER",
//       });
//     } catch (err: any) {
//       console.error(err);
//       setServerError(err.message || "Erro ao cadastrar usuário");
//     }
//   };

//   // Dentro de AdminSignupPage() { ... }

//   // Máscara de Telefone (padrão Brasil, 8 ou 9 dígitos + DDD)
//   const maskPhone = (value: string) => {
//     if (!value) return "";

//     // 1. Limpa: Remove tudo que não for dígito
//     let cleanValue = value.replace(/\D/g, "");

//     // 2. Limita o tamanho para o máximo de 11 dígitos (DDD + 9 dígitos)
//     cleanValue = cleanValue.substring(0, 11);

//     // 3. Aplica o DDD: (XX) XXXX-XXXX
//     cleanValue = cleanValue.replace(/^(\d{2})(\d)/g, "($1) $2");

//     // 4. Aplica o hífen
//     if (cleanValue.length > 10 && cleanValue.startsWith("(")) {
//       // Celular (11 dígitos): (XX) 9XXXX-XXXX
//       cleanValue = cleanValue.replace(/(\d{5})(\d{4})$/, "$1-$2");
//     } else {
//       // Fixo (10 dígitos): (XX) XXXX-XXXX
//       cleanValue = cleanValue.replace(/(\d{4})(\d{4})$/, "$1-$2");
//     }

//     return cleanValue;
//   };

//   // Máscara de Documento (CPF ou CNPJ)
//   const maskDocument = (value: string) => {
//     if (!value) return "";
//     value = value.replace(/\D/g, ""); // Remove tudo que não for dígito

//     if (value.length <= 11) {
//       // CPF: 000.000.000-00
//       value = value.replace(/(\d{3})(\d)/, "$1.$2");
//       value = value.replace(/(\d{3})(\d)/, "$1.$2");
//       value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
//       return value.substring(0, 14); // Limite para CPF
//     } else {
//       // CNPJ: 00.000.000/0000-00
//       value = value.replace(/^(\d{2})(\d)/, "$1.$2");
//       value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
//       value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
//       value = value.replace(/(\d{4})(\d)/, "$1-$2");
//       return value.substring(0, 18); // Limite para CNPJ
//     }
//   };

//   if (authLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
//       </div>
//     );
//   }

//   if (!user || !["MASTER", "ADMIN"].includes(user.role)) {
//     return (
//       <div className="min-h-screen flex items-center justify-center p-4">
//         <Card className="w-full max-w-md">
//           <CardHeader className="text-center">
//             <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
//             <CardTitle>Acesso Restrito</CardTitle>
//             <CardDescription>
//               Apenas administradores podem cadastrar usuários
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="text-center">
//             <Link href="/login">
//               <Button className="gap-2">
//                 <LogIn className="h-4 w-4" /> Fazer Login
//               </Button>
//             </Link>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 px-4 py-12">
//       <div className="max-w-3xl mx-auto">
//         <div className="text-center mb-8">
//           <div className="flex justify-center gap-3 items-center mb-4">
//             <UserPlus className="h-10 w-10 text-indigo-600" />
//             <h1 className="text-4xl font-bold text-slate-900">
//               Cadastro de Usuário
//             </h1>
//           </div>
//           <p className="text-slate-600">
//             Criando novo acesso para{" "}
//             <span className="font-semibold text-indigo-600">
//               {user.role === "MASTER" ? "qualquer empresa" : user.company?.name}
//             </span>
//           </p>
//         </div>

//         <Card className="shadow-xl border-0">
//           <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
//             <CardTitle className="text-2xl flex items-center gap-2">
//               <Shield className="h-6 w-6" />
//               {user.role === "MASTER" ? "Master" : "Administrador"} •{" "}
//               {user.name}
//             </CardTitle>
//             <CardDescription className="text-indigo-100">
//               Preencha os dados do novo usuário abaixo
//             </CardDescription>
//           </CardHeader>

//           <CardContent className="pt-8">
//             {serverError && (
//               <Alert variant="destructive" className="mb-6">
//                 <AlertDescription>{serverError}</AlertDescription>
//               </Alert>
//             )}

//             {success && (
//               <Alert className="mb-6 bg-green-50 border-green-200">
//                 <AlertDescription className="text-green-800 font-medium">
//                   {success}
//                 </AlertDescription>
//               </Alert>
//             )}

//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 {/* Campos do formulário (Nome, Email, Senha, Telefone) mantidos iguais */}
//                 <div className="space-y-2">
//                   <Label htmlFor="name">Nome Completo *</Label>
//                   <Input
//                     id="name"
//                     placeholder="João Silva"
//                     {...register("name")}
//                     className={errors.name ? "border-red-500" : ""}
//                   />
//                   {errors.name && (
//                     <p className="text-sm text-red-500">
//                       {errors.name.message}
//                     </p>
//                   )}
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="email">Email *</Label>
//                   <Input
//                     id="email"
//                     type="email"
//                     placeholder="joao@empresa.com.br"
//                     {...register("email")}
//                     className={errors.email ? "border-red-500" : ""}
//                   />
//                   {errors.email && (
//                     <p className="text-sm text-red-500">
//                       {errors.email.message}
//                     </p>
//                   )}
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="password">Senha *</Label>
//                   <Input
//                     id="password"
//                     type="password"
//                     placeholder="Mínimo 6 caracteres"
//                     {...register("password")}
//                     className={errors.password ? "border-red-500" : ""}
//                   />
//                   {errors.password && (
//                     <p className="text-sm text-red-500">
//                       {errors.password.message}
//                     </p>
//                   )}
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="phone">Telefone *</Label>
//                   <Input
//                     id="phone"
//                     placeholder="(11) 99999-9999"
//                     maxLength={15}
//                     {...register("phone", {
//                       onChange: (e) => {
//                         const maskedValue = maskPhone(e.target.value);
//                         e.target.value = maskedValue; // Atualiza o visual do input
//                         setValue("phone", maskedValue, {
//                           shouldValidate: true,
//                         }); // Atualiza o valor no RHF
//                       },
//                     })}
//                     className={errors.phone ? "border-red-500" : ""}
//                   />
//                   {errors.phone && (
//                     <p className="text-sm text-red-500">
//                       {errors.phone.message}
//                     </p>
//                   )}
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="document">CPF ou CNPJ </Label>
//                   <Input
//                     id="document"
//                     placeholder="000.000.000-00 ou 00.000.000/0000-00"
//                     maxLength={18} // O CNPJ é o mais longo (18)
//                     {...register("document", {
//                       onChange: (e) => {
//                         const maskedValue = maskDocument(e.target.value);
//                         e.target.value = maskedValue; // Atualiza o visual do input
//                         setValue("document", maskedValue); // Atualiza o valor no RHF
//                       },
//                     })}
//                     className={errors.document ? "border-red-500" : ""}
//                   />
//                 </div>

//                 {/* Perfil */}
//                 <div className="space-y-2">
//                   <Label>Perfil de Acesso</Label>
//                   <Select
//                     value={watch("role")}
//                     onValueChange={(value) => setValue("role", value as any)}
//                   >
//                     <SelectTrigger>
//                       <SelectValue placeholder="Selecione o perfil" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="EMPLOYER">Funcionário</SelectItem>
//                       {user.role === "MASTER" && (
//                         <>
//                           <SelectItem value="ADMIN">Administrador</SelectItem>
//                           <SelectItem value="MASTER">Master</SelectItem>
//                         </>
//                       )}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </div>

//               {/* Seleção de Empresa */}
//               <div className="space-y-3 pt-4 border-t">
//                 <Label>Empresa *</Label>
//                 {user.role === "MASTER" ? (
//                   loadingCompanies ? (
//                     <div className="flex items-center gap-2 text-slate-500">
//                       <Loader2 className="h-4 w-4 animate-spin" />
//                       Carregando empresas...
//                     </div>
//                   ) : companies.length > 0 ? (
//                     <Select
//                       value={selectedCompanyId}
//                       onValueChange={(value) => setValue("companyId", value)}
//                     >
//                       <SelectTrigger>
//                         <SelectValue placeholder="Selecione a empresa" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {companies.map((company) => (
//                           <SelectItem key={company.id} value={company.id}>
//                             <div className="flex flex-col">
//                               <span className="font-medium">
//                                 {company.name}
//                               </span>
//                               <span className="text-xs text-slate-500">
//                                 {company.cnpj}
//                               </span>
//                             </div>
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   ) : (
//                     <p className="text-amber-600 text-sm">
//                       Nenhuma empresa ativa encontrada.
//                     </p>
//                   )
//                 ) : (
//                   <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
//                     <div className="flex items-center gap-3">
//                       <Building className="h-8 w-8 text-indigo-600" />
//                       <div>
//                         <p className="font-medium text-indigo-900">
//                           {user.company?.name}
//                         </p>
//                         <p className="text-sm text-indigo-700">
//                           Usuário será vinculado automaticamente
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 )}
//                 {errors.companyId && (
//                   <p className="text-sm text-red-500">
//                     {errors.companyId.message}
//                   </p>
//                 )}
//               </div>

//               <Button
//                 type="submit"
//                 disabled={isSubmitting || !selectedCompanyId}
//                 className="w-full h-12 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700"
//               >
//                 {isSubmitting ? (
//                   <>
//                     <Loader2 className="mr-2 h-5 w-5 animate-spin" />
//                     Cadastrando usuário...
//                   </>
//                 ) : (
//                   <>
//                     <UserPlus className="mr-2 h-5 w-5" />
//                     Cadastrar Usuário
//                   </>
//                 )}
//               </Button>
//             </form>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

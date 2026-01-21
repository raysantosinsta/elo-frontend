// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import * as z from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useRouter } from "next/navigation";

// // Services & Context
// import { useAuth } from "@/contexts/AuthContext";
// import { api } from "@/services/api"; // <--- IMPORTANTE: Usar o Axios configurado

// // UI Components
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Separator } from "@/components/ui/separator";

// // Icons
// import {
//   Building,
//   CheckCircle2,
//   Loader2,
//   ShieldAlert,
//   UserPlus,
//   ArrowLeft,
//   Mail,
//   Phone,
//   User,
//   FileText,
//   Lock
// } from "lucide-react";
// import { toast } from "sonner";

// // --- VALIDATION SCHEMA ---
// const signupSchema = z.object({
//   name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
//   email: z.string().email("Email inválido"),
//   password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
//   contact: z
//     .string()
//     .regex(
//       /^\d{2} \d{4,5}-\d{4}$/,
//       "Formato esperado: 85 99999-9999"
//     ),
//   document: z.string().optional().nullable(),
//   companyId: z.string().uuid("Empresa não identificada"),
//   role: z.enum(["EMPLOYER", "ADMIN", "MASTER"]),
//   professionalRole: z.string().optional(),
// });

// type SignupFormData = z.infer<typeof signupSchema>;

// export default function AdminSignupPage() {
//   const { user, loading: authLoading } = useAuth();
//   const router = useRouter();

//   const [isLoading, setIsLoading] = useState(false);
//   const [serverError, setServerError] = useState("");

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//     reset,
//     setValue,
//     watch,
//   } = useForm<SignupFormData>({
//     resolver: zodResolver(signupSchema),
//     defaultValues: {
//       role: "EMPLOYER",
//       professionalRole: "",
//     },
//   });

//   const selectedRole = watch("role");

//   // --- EFEITOS ---

//   // 1. Verificar Permissão
//   useEffect(() => {
//     if (!authLoading && user) {
//       if (!["MASTER", "ADMIN"].includes(user.role)) {
//         toast.error("Acesso negado.");
//         router.push("/");
//       }
      
//       // Auto-preencher a empresa do usuário logado
//       if (user.company?.id) {
//         setValue("companyId", user.company.id);
//       }
//     }
//   }, [user, authLoading, router, setValue]);

//   // --- HANDLERS ---

//   const onSubmit = async (data: SignupFormData) => {
//     setServerError("");
//     setIsLoading(true);

//     try {
//       // O Axios (api) injeta o Header Authorization automaticamente
//       await api.post("/users", {
//         ...data,
//         // Limpa documento se vier vazio para não dar erro de Unique no banco
//         document: data.document || null, 
//         status: "ACTIVE",
//       });

//       toast.success("Usuário cadastrado com sucesso!", {
//         description: `O acesso para ${data.email} foi criado.`
//       });
      
//       reset({
//         name: "",
//         email: "",
//         password: "",
//         contact: "",
//         document: "",
//         companyId: user?.company?.id || "",
//         role: "EMPLOYER",
//         professionalRole: "",
//       });
      
//       // Rola para o topo
//       window.scrollTo({ top: 0, behavior: "smooth" });

//     } catch (err: any) {
//       console.error(err);
      
//       // Tratamento de erro 401 específico
//       if (err.response?.status === 401) {
//         toast.error("Sessão expirada. Faça login novamente.");
//         // O interceptor do axios deve redirecionar, mas forçamos aqui caso falhe
//         router.push("/login");
//         return;
//       }

//       const msg = err.response?.data?.message || "Erro ao cadastrar usuário";
//       setServerError(Array.isArray(msg) ? msg.join(", ") : msg);
//       toast.error("Falha no cadastro");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // --- MÁSCARAS ---
//   const maskcontact = (value: string) => {
//     if (!value) return "";
//     let clean = value.replace(/\D/g, "").substring(0, 11);
//     if (clean.length > 10) {
//       clean = clean.replace(/^(\d{2})(\d{5})(\d{4})/, "$1 $2-$3");
//     } else if (clean.length > 5) {
//       clean = clean.replace(/^(\d{2})(\d{4})(\d{0,4})/, "$1 $2-$3");
//     } else if (clean.length > 2) {
//       clean = clean.replace(/^(\d{2})(\d+)/, "$1 $2");
//     }
//     return clean;
//   };

//   const maskDocument = (value: string) => {
//     if (!value) return "";
//     let v = value.replace(/\D/g, "");
//     if (v.length <= 11) { // CPF
//       v = v.replace(/(\d{3})(\d)/, "$1.$2");
//       v = v.replace(/(\d{3})(\d)/, "$1.$2");
//       v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
//       return v.substring(0, 14);
//     } else { // CNPJ (caso necessário, embora seja cadastro de pessoa)
//       v = v.replace(/^(\d{2})(\d)/, "$1.$2");
//       v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
//       v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
//       v = v.replace(/(\d{4})(\d)/, "$1-$2");
//       return v.substring(0, 18);
//     }
//   };

//   if (authLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-[#F5F0E6]">
//         <Loader2 className="h-12 w-12 animate-spin text-[#D35400]" />
//       </div>
//     );
//   }

//   // Proteção visual extra
//   if (!user || !["MASTER", "ADMIN"].includes(user.role)) {
//     return null; // O useEffect já redireciona
//   }

//   return (
//     <div className="min-h-screen bg-[#F5F0E6] p-4 md:p-8 font-sans flex justify-center">
//       <div className="w-full max-w-5xl">
        
//         {/* Header */}
//         <div className="mb-6 flex items-center gap-4">
//           <Button variant="ghost" onClick={() => router.back()} className="text-[#2C3E50]">
//             <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
//           </Button>
//           <div>
//             <h1 className="text-2xl font-bold text-[#2D3436]">Novo Colaborador</h1>
//             <p className="text-sm text-[#95A5A6]">Adicione um novo membro à equipe da {user.company?.name}</p>
//           </div>
//         </div>

//         <Card className="shadow-lg border-0 bg-white/95 backdrop-blur overflow-hidden">
//           <CardHeader className="border-b border-gray-100 bg-gray-50/50">
//              <div className="flex items-center gap-2 text-[#D35400]">
//                 <UserPlus className="h-5 w-5" />
//                 <CardTitle className="text-lg">Formulário de Cadastro</CardTitle>
//              </div>
//              <CardDescription>Preencha os dados abaixo para criar o acesso.</CardDescription>
//           </CardHeader>

//           <CardContent className="p-6 md:p-8">
//             {serverError && (
//               <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200 text-red-800">
//                 <ShieldAlert className="h-4 w-4" />
//                 <AlertDescription>{serverError}</AlertDescription>
//               </Alert>
//             )}

//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              
//               {/* --- DADOS PESSOAIS --- */}
//               <div className="space-y-4">
//                 <h3 className="text-sm font-semibold text-[#95A5A6] uppercase tracking-wider flex items-center gap-2">
//                   <User className="h-4 w-4" /> Dados Pessoais
//                 </h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
//                   <div className="space-y-2">
//                     <Label htmlFor="name">Nome Completo <span className="text-red-500">*</span></Label>
//                     <div className="relative">
//                       <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//                       <Input
//                         id="name"
//                         placeholder="Ex: Ana Souza"
//                         {...register("name")}
//                         className={`pl-9 ${errors.name ? "border-red-500" : ""}`}
//                       />
//                     </div>
//                     {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
//                   </div>

//                   <div className="space-y-2">
//                     <Label htmlFor="document">CPF</Label>
//                     <div className="relative">
//                       <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//                       <Input
//                         id="document"
//                         placeholder="000.000.000-00"
//                         maxLength={14}
//                         {...register("document", {
//                           onChange: (e) => {
//                              e.target.value = maskDocument(e.target.value);
//                              setValue("document", e.target.value);
//                           }
//                         })}
//                         className="pl-9"
//                       />
//                     </div>
//                   </div>

//                   <div className="space-y-2">
//                     <Label htmlFor="contact">Celular / WhatsApp <span className="text-red-500">*</span></Label>
//                     <div className="relative">
//                       <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//                       <Input
//                         id="contact"
//                         placeholder="85 99999-9999"
//                         maxLength={15}
//                         {...register("contact", {
//                           onChange: (e) => {
//                              e.target.value = maskcontact(e.target.value);
//                              setValue("contact", e.target.value, { shouldValidate: true });
//                           }
//                         })}
//                         className={`pl-9 ${errors.contact ? "border-red-500" : ""}`}
//                       />
//                     </div>
//                     {errors.contact && <p className="text-xs text-red-500">{errors.contact.message}</p>}
//                   </div>
                  
//                   <div className="space-y-2">
//                      <Label htmlFor="profRole">Cargo / Função</Label>
//                      <Input 
//                        id="profRole" 
//                        placeholder="Ex: Costureira, Gerente..." 
//                        {...register("professionalRole")}
//                      />
//                   </div>

//                 </div>
//               </div>

//               <Separator />

//               {/* --- DADOS DE ACESSO --- */}
//               <div className="space-y-4">
//                 <h3 className="text-sm font-semibold text-[#95A5A6] uppercase tracking-wider flex items-center gap-2">
//                   <Lock className="h-4 w-4" /> Credenciais de Acesso
//                 </h3>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
//                   <div className="space-y-2">
//                     <Label htmlFor="email">E-mail de Login <span className="text-red-500">*</span></Label>
//                     <div className="relative">
//                       <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//                       <Input
//                         id="email"
//                         type="email"
//                         placeholder="nome@empresa.com"
//                         {...register("email")}
//                         className={`pl-9 ${errors.email ? "border-red-500" : ""}`}
//                       />
//                     </div>
//                     {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
//                   </div>

//                   <div className="space-y-2">
//                     <Label htmlFor="password">Senha Inicial <span className="text-red-500">*</span></Label>
//                     <Input
//                       id="password"
//                       type="password"
//                       placeholder="Mínimo 6 caracteres"
//                       {...register("password")}
//                       className={errors.password ? "border-red-500" : ""}
//                     />
//                     {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
//                   </div>

//                   <div className="space-y-2">
//                     <Label>Nível de Permissão</Label>
//                     <Select
//                       value={selectedRole}
//                       onValueChange={(val: any) => setValue("role", val)}
//                     >
//                       <SelectTrigger className="h-10">
//                         <SelectValue placeholder="Selecione o perfil" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="EMPLOYER">Funcionário (Acesso Padrão)</SelectItem>
//                         <SelectItem value="ADMIN">Administrador (Gerência)</SelectItem>
//                         {user.role === "MASTER" && (
//                            <SelectItem value="MASTER">Master (Acesso Total)</SelectItem>
//                         )}
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   {/* VINCULO EMPRESARIAL FIXO */}
//                   <div className="space-y-2">
//                      <Label>Vínculo Empresarial</Label>
//                      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-[#2C3E50]">
//                         <div className="p-2 bg-white rounded-full shadow-sm">
//                            <Building className="h-4 w-4 text-[#D35400]" />
//                         </div>
//                         <div>
//                            <p className="font-semibold">{user.company?.name || "Empresa..."}</p>
//                            <p className="text-xs text-[#95A5A6]">O usuário será vinculado a esta empresa.</p>
//                         </div>
//                      </div>
//                   </div>

//                 </div>
//               </div>

//               <div className="pt-6 flex justify-end gap-3">
//                 <Button 
//                   type="button" 
//                   variant="outline" 
//                   onClick={() => reset()}
//                   disabled={isLoading}
//                 >
//                   Limpar
//                 </Button>
//                 <Button
//                   type="submit"
//                   disabled={isLoading}
//                   className="bg-[#D35400] hover:bg-[#A04000] text-white min-w-[150px]"
//                 >
//                   {isLoading ? (
//                     <>
//                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                       Salvando...
//                     </>
//                   ) : (
//                     <>
//                       <CheckCircle2 className="mr-2 h-4 w-4" />
//                       Cadastrar Usuário
//                     </>
//                   )}
//                 </Button>
//               </div>

//             </form>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }
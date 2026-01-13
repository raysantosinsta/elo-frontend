/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  MoreHorizontal,
  Building2,
  MapPin,
  Phone,
  Edit,
  Trash2,
  Power,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Search as SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Serviços e Contextos
import { api } from "@/services/api";
import { useError } from "@/contexts/error-context";
import { useAuth } from "@/contexts/AuthContext";

// Componentes UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GenericTable, type Column } from "@/components/generic-table";

// --- Types ---
interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
  complemento?: string;
  ramoAtividade?: string;
  status: "ACTIVE" | "INACTIVE";
}

// --- 🔥 Helpers de Formatação e Limpeza ---

const cleanMask = (value: string | undefined) => {
  if (!value) return "";
  return value.replace(/\D/g, "");
};

// Formatação (XX) XXXXX-XXXX
const formatPhone = (v: string | undefined) => {
  if (!v) return "";
  let r = v.replace(/\D/g, "");
  if (r.length > 11) r = r.substring(0, 11);

  if (r.length > 10) { // (11) 98888-8888
    return r.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (r.length > 5) { // (11) 8888-8888
    return r.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else if (r.length > 2) {
    return r.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  }
  return r.replace(/^(\d*)/, "($1");
};

const formatCNPJ = (v: string | undefined) => {
  if (!v) return "";
  return v.replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").substring(0, 18);
};

const formatCEP = (v: string | undefined) => {
  if (!v) return "";
  return v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);
};

// --- Form Schema ---
const companyFormSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  cnpj: z
    .string()
    .min(14, "CNPJ inválido")
    .transform((v) => cleanMask(v)),
  email: z.string().email("E-mail inválido"),
  telefone: z
    .string()
    .min(10, "Telefone inválido")
    .transform((v) => cleanMask(v)),
  cep: z
    .string()
    .min(8, "CEP inválido")
    .transform((v) => cleanMask(v)),
  endereco: z.string().min(1, "Endereço obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro obrigatório"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  estado: z.string().length(2, "UF inválida"),
  ramoAtividade: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export default function CompanyManagementPage() {
  const router = useRouter();
  const { showError } = useError();
  const { user, loading: authLoading } = useAuth();

  // --- States ---
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Control States (Unificados para Criação e Edição)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 🔥 Novo estado
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isMaster = user?.role === "MASTER";
  const isAdmin = user?.role === "ADMIN";

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      cnpj: "",
      email: "",
      telefone: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      ramoAtividade: "",
    },
  });

  // --- API Actions ---
  const fetchCompanies = useCallback(async () => {
    if (!isMaster && !isAdmin) return; 

    try {
      setLoading(true);
      const response = await api.get<{ data: Company[] }>("/companies?limit=100");
      setCompanies(response.data.data || []);
    } catch (error: any) {
      console.error("Erro fetch:", error);
    } finally {
      setLoading(false);
    }
  }, [isMaster, isAdmin]);

  useEffect(() => {
    if (user) {
        fetchCompanies();
    }
  }, [fetchCompanies, user]);

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, "");
    if (rawCep.length !== 8) return;
    setIsCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        showError("CEP Inválido", "O CEP informado não foi encontrado.");
        return;
      }
      form.setValue("endereco", data.logradouro);
      form.setValue("bairro", data.bairro);
      form.setValue("cidade", data.localidade);
      form.setValue("estado", data.uf);
      form.setFocus("numero");
    } catch (err) {
      showError("Erro na Busca", "Verifique sua conexão.");
    } finally {
      setIsCepLoading(false);
    }
  };

  // --- Modal Controllers ---

  // 🔥 Abre o Modal para CRIAÇÃO
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingCompany(null);
    form.reset({
      name: "",
      cnpj: "",
      email: "",
      telefone: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      ramoAtividade: "",
    });
    setIsModalOpen(true);
  };

  // 🔥 Abre o Modal para EDIÇÃO
  const handleOpenEdit = (company: Company) => {
    setIsEditing(true);
    setEditingCompany(company);
    form.reset({
      name: company.name,
      cnpj: formatCNPJ(company.cnpj),
      email: company.email,
      telefone: formatPhone(company.telefone), 
      cep: formatCEP(company.cep),
      endereco: company.endereco,
      numero: company.numero,
      complemento: company.complemento || "",
      bairro: company.bairro,
      cidade: company.cidade,
      estado: company.estado,
      ramoAtividade: company.ramoAtividade || "",
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.reset();
  };

  // --- Submit (Create OR Update) ---
  const onSubmit = async (values: CompanyFormValues) => {
    setIsFormLoading(true);

    // Limpeza de máscaras antes do envio
    const payload = {
        ...values,
        cnpj: cleanMask(values.cnpj),
        telefone: cleanMask(values.telefone),
        cep: cleanMask(values.cep),
    };

    try {
      if (isEditing && editingCompany) {
        // --- MODO EDIÇÃO (PATCH) ---
        await api.patch(`/companies/${editingCompany.id}`, payload);
        toast.success("Empresa atualizada com sucesso!");
        
        setCompanies((prev) => 
          prev.map((c) => (c.id === editingCompany.id ? { ...c, ...payload } as Company : c))
        );
      } else {
        // --- MODO CRIAÇÃO (POST) ---
        const { data: newCompany } = await api.post<Company>("/companies", payload);
        toast.success("Empresa criada com sucesso!");
        
        // Adiciona à lista
        setCompanies((prev) => [newCompany, ...prev]);
      }
      
      handleCloseModal();
    } catch (error) {
      // O interceptor já trata erros visuais
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!isMaster) {
        toast.error("Apenas Master pode alterar o status.");
        return;
    }
    const newApiStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/companies/${id}`, { status: newApiStatus });
      toast.success("Status atualizado");
      setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, status: newApiStatus } : c));
    } catch (error) { }
  };

  const handleDelete = async () => {
    if (!deleteId || !isMaster) return;
    setIsDeleting(true);
    try {
      await api.delete(`/companies/${deleteId}`);
      setCompanies((prev) => prev.filter((c) => c.id !== deleteId));
      toast.success("Empresa removida.");
      setIsDeleteOpen(false);
      setDeleteId(null);
    } catch (error) { 
        setIsDeleteOpen(false); 
    } finally { 
        setIsDeleting(false); 
    }
  };

  const filteredCompanies = useMemo(() => companies.filter(
    (c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.cnpj.includes(searchTerm)
  ), [companies, searchTerm]);

  const tableColumns: Column<Company>[] = useMemo(() => {
    const cols: Column<Company>[] = [
        {
        header: "Empresa",
        className: "w-[280px]",
        cell: (company) => (
            <div className="flex flex-col">
            <span className="font-medium text-[#2D3436]">{company.name}</span>
            <span className="text-xs text-[#95A5A6] flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" /> {formatCNPJ(company.cnpj)}
            </span>
            </div>
        ),
        },
        {
        header: "Contato",
        cell: (company) => (
            <div className="text-sm text-[#2C3E50] flex flex-col gap-1">
            <span className="flex items-center gap-1">✉️ {company.email}</span>
            <span className="flex items-center gap-1 text-[#95A5A6]">
                <Phone className="h-3 w-3" /> {formatPhone(company.telefone)}
            </span>
            </div>
        ),
        },
        {
        header: "Localização",
        cell: (company) => (
            <span className="text-sm text-[#2C3E50] flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[#D35400]" /> {company.cidade}/{company.estado}
            </span>
        ),
        },
        {
        header: "Status",
        cell: (company) => (
            <Badge
            variant="outline"
            className={
                company.status === "ACTIVE"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-500 border-gray-200"
            }
            >
            {company.status === "ACTIVE" ? "Ativo" : "Inativo"}
            </Badge>
        ),
        },
    ];

    if (isMaster || isAdmin) {
        cols.push({
            header: "Ações",
            className: "text-right",
            cell: (company) => (
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-[#2C3E50] hover:text-[#D35400] hover:bg-transparent">
                    <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Opções</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleOpenEdit(company)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    {isMaster && (
                        <DropdownMenuItem onClick={() => handleToggleStatus(company.id, company.status)}>
                            <Power className="mr-2 h-4 w-4" /> {company.status === "ACTIVE" ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                    )}
                    {isMaster && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { setDeleteId(company.id); setIsDeleteOpen(true); }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
                </DropdownMenu>
            ),
        });
    }

    return cols;
  }, [isMaster, isAdmin]);

  if (authLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#F5F0E6]">
            <Loader2 className="h-8 w-8 animate-spin text-[#D35400]" />
        </div>
    );
  }

  if (!user || (user.role !== "MASTER" && user.role !== "ADMIN")) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F0E6] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2D3436]">Empresas</h1>
            <p className="text-[#95A5A6]">Gerencie seus parceiros comerciais.</p>
          </div>
          
          {isMaster && (
            <Button
                // 🔥 AQUI: Mudamos de router.push para handleOpenCreate
                onClick={handleOpenCreate} 
                className="bg-[#D35400] hover:bg-[#D35400]/90 text-white shadow-md transition-transform hover:scale-105"
            >
                <Plus className="mr-2 h-4 w-4" /> Nova Empresa
            </Button>
          )}
        </div>

        {/* TABELA GENÉRICA */}
        <GenericTable 
          title="Listagem"
          data={filteredCompanies}
          columns={tableColumns}
          isLoading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          emptyMessage="Nenhuma empresa encontrada com os filtros atuais."
        />

        {/* --- Modal Unificado (Create & Edit) --- */}
        <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-white border-[#F5F0E6]">
            <DialogHeader className="px-6 py-4 border-b border-[#F5F0E6] bg-[#F5F0E6]/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#F5F0E6] rounded text-[#D35400]">
                    {/* Ícone muda conforme ação */}
                    {isEditing ? <Edit size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <DialogTitle className="text-[#2D3436] text-xl">
                    {/* Título muda conforme ação */}
                    {isEditing ? "Editar Empresa" : "Nova Empresa"}
                  </DialogTitle>
                  <DialogDescription className="text-[#95A5A6]">
                    {isEditing ? "Atualize os dados cadastrais." : "Preencha os dados para registrar uma nova empresa."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-6 py-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
                    
                    {/* Dados Básicos */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-[#D35400] rounded-full" /> Identificação
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel className="text-[#2D3436]">Razão Social</FormLabel><FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl><FormMessage className="text-[#D35400]" /></FormItem>
                        )} />
                        <FormField control={form.control} name="cnpj" render={({ field }) => (
                          <FormItem><FormLabel className="text-[#2D3436]">CNPJ</FormLabel><FormControl><Input {...field} maxLength={18} onChange={e => field.onChange(formatCNPJ(e.target.value))} className="focus-visible:ring-[#2C3E50]" /></FormControl><FormMessage className="text-[#D35400]" /></FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel className="text-[#2D3436]">E-mail</FormLabel><FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl><FormMessage className="text-[#D35400]" /></FormItem>
                        )} />
                        
                        {/* Campo Telefone com Máscara e MaxLength Corretos */}
                        <FormField control={form.control} name="telefone" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#2D3436]">Telefone</FormLabel>
                            <FormControl>
                                <Input 
                                    {...field} 
                                    maxLength={15} // (XX) XXXXX-XXXX
                                    onChange={e => field.onChange(formatPhone(e.target.value))} 
                                    className="focus-visible:ring-[#2C3E50]" 
                                    placeholder="(00) 00000-0000"
                                />
                            </FormControl>
                            <FormMessage className="text-[#D35400]" />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="ramoAtividade" render={({ field }) => (
                          <FormItem className="md:col-span-2"><FormLabel className="text-[#2D3436]">Ramo de Atividade</FormLabel><FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl><FormMessage className="text-[#D35400]" /></FormItem>
                        )} />
                      </div>
                    </div>

                    <Separator className="bg-[#95A5A6]/20" />

                    {/* Endereço */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-[#D35400] rounded-full" /> Endereço
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <FormField control={form.control} name="cep" render={({ field }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel className="text-[#2D3436]">CEP</FormLabel>
                            <div className="relative">
                              <FormControl><Input {...field} maxLength={9} onChange={e => field.onChange(formatCEP(e.target.value))} onBlur={handleCepBlur} className="pr-8 focus-visible:ring-[#2C3E50]" /></FormControl>
                              {isCepLoading ? <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-[#D35400]" /> : <SearchIcon className="absolute right-2 top-2.5 h-4 w-4 text-[#95A5A6]" />}
                            </div>
                            <FormMessage className="text-[#D35400]" />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="endereco" render={({ field }) => (<FormItem className="md:col-span-7"><FormLabel className="text-[#2D3436]">Logradouro</FormLabel><FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl><FormMessage className="text-[#D35400]" /></FormItem>)} />
                        <FormField control={form.control} name="numero" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="text-[#2D3436]">Número</FormLabel><FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl><FormMessage className="text-[#D35400]" /></FormItem>)} />
                        <FormField control={form.control} name="bairro" render={({ field }) => (<FormItem className="md:col-span-4"><FormLabel className="text-[#2D3436]">Bairro</FormLabel><FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl><FormMessage className="text-[#D35400]" /></FormItem>)} />
                        <FormField control={form.control} name="cidade" render={({ field }) => (<FormItem className="md:col-span-4"><FormLabel className="text-[#2D3436]">Cidade</FormLabel><FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl><FormMessage className="text-[#D35400]" /></FormItem>)} />
                        <FormField control={form.control} name="estado" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="text-[#2D3436]">UF</FormLabel><FormControl><Input {...field} maxLength={2} className="uppercase focus-visible:ring-[#2C3E50]" /></FormControl><FormMessage className="text-[#D35400]" /></FormItem>)} />
                        <FormField control={form.control} name="complemento" render={({ field }) => (<FormItem className="md:col-span-12"><FormLabel className="text-[#2D3436]">Complemento</FormLabel><FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl></FormItem>)} />
                      </div>
                    </div>
                  </form>
                </Form>
              </ScrollArea>
            </div>
            <div className="px-6 py-4 border-t border-[#F5F0E6] bg-[#F5F0E6]/30 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={handleCloseModal} className="border-[#95A5A6] text-[#2D3436]">Cancelar</Button>
              <Button onClick={() => form.handleSubmit(onSubmit)()} disabled={isFormLoading} className="bg-[#D35400] hover:bg-[#D35400]/90 text-white min-w-[120px]">
                {isFormLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} 
                {isEditing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#D35400]"><AlertTriangle className="h-5 w-5" /> Atenção</AlertDialogTitle>
              <AlertDialogDescription className="text-[#2D3436]">Tem certeza que deseja excluir esta empresa? Ação irreversível.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="text-[#2D3436]">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={isDeleting} className="bg-[#D35400] hover:bg-[#D35400]/90 text-white">
                {isDeleting ? "Excluindo..." : "Sim, excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
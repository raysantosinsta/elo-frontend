/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  Plus, MoreHorizontal, Search, Building2, MapPin, Phone, 
  Edit, Trash2, Power, Loader2, AlertTriangle, CheckCircle2, Search as SearchIcon
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation" // For redirection

import { useAuth } from "@/contexts/AuthContext"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

// --- Types ---
interface Company {
  id: string
  name: string
  cnpj: string
  email: string
  telefone: string
  cidade: string
  estado: string
  endereco: string
  numero: string
  bairro: string
  cep: string
  complemento?: string
  ramoAtividade?: string
  status: "ATIVO" | "INATIVO"
}

// --- Form Schema (Edit Only) ---
const companyFormSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  cnpj: z.string().min(14, "CNPJ inválido").transform((v) => v.replace(/\D/g, "")),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  cep: z.string().min(8, "CEP inválido").transform((v) => v.replace(/\D/g, "")),
  endereco: z.string().min(1, "Endereço obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro obrigatório"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  estado: z.string().length(2, "UF inválida"),
  ramoAtividade: z.string().optional(),
})

type CompanyFormValues = z.infer<typeof companyFormSchema>

export default function CompanyManagementPage() {
  const { api } = useAuth()
  const router = useRouter()

  // --- States ---
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [isFormLoading, setIsFormLoading] = useState(false)
  const [isCepLoading, setIsCepLoading] = useState(false)

  // Delete Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // --- Hook Form ---
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "", cnpj: "", email: "", telefone: "", cep: "",
      endereco: "", numero: "", complemento: "", bairro: "",
      cidade: "", estado: "", ramoAtividade: "",
    },
  })

  // --- Helpers (Safe against undefined) ---
  const formatCNPJ = (v: string | null | undefined) => {
    if (!v) return ""
    return v.replace(/\D/g,"").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").substring(0, 18)
  }
  const formatPhone = (v: string | null | undefined) => {
    if (!v) return ""
    return v.replace(/\D/g,"").replace(/^(\d{2})(\d)(\d{4})(\d{4})/, "($1) $2 $3-$4").substring(0, 15)
  }
  const formatCEP = (v: string | null | undefined) => {
    if (!v) return ""
    return v.replace(/\D/g,"").replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9)
  }

  // --- API: Fetch Companies ---
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get<{ data: Company[] }>("/companies?limit=100")
      setCompanies(response.data.data || [])
    } catch (error) {
      toast.error("Erro ao carregar lista de empresas")
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  // --- API: Fetch CEP ---
  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, "")
    if (rawCep.length !== 8) return
    setIsCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        form.setValue("endereco", data.logradouro)
        form.setValue("bairro", data.bairro)
        form.setValue("cidade", data.localidade)
        form.setValue("estado", data.uf)
        form.setFocus("numero")
      }
    } catch {} finally { setIsCepLoading(false) }
  }

  // --- Modal Actions ---
  const openEditModal = (company: Company) => {
    setEditingCompany(company)
    // Populate form with company data
    form.reset({
      name: company.name || "",
      cnpj: formatCNPJ(company.cnpj),
      email: company.email || "",
      telefone: formatPhone(company.telefone),
      cep: formatCEP(company.cep),
      endereco: company.endereco || "",
      numero: company.numero || "",
      complemento: company.complemento || "",
      bairro: company.bairro || "",
      cidade: company.cidade || "",
      estado: company.estado || "",
      ramoAtividade: company.ramoAtividade || "",
    })
    setIsEditModalOpen(true)
  }

  const onSubmitEdit = async (values: CompanyFormValues) => {
    if (!editingCompany) return

    setIsFormLoading(true)
    try {
      // UPDATE (PATCH)
      await api.patch(`/companies/${editingCompany.id}`, values)
      toast.success("Empresa atualizada com sucesso!")
      
      // Update local list to avoid refetch
      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...values } : c))
      
      setIsEditModalOpen(false)
    } catch (error: any) {
      console.error(error)
      // Specific error handling for permission
      if (error.response?.status === 400 || error.response?.status === 403) {
        toast.error("Erro de Permissão", { description: "Verifique se seu usuário é ADMIN ou MASTER." })
      } else {
        const msg = error.response?.data?.message
        toast.error("Falha ao salvar", { description: Array.isArray(msg) ? msg[0] : msg })
      }
    } finally {
      setIsFormLoading(false)
    }
  }

  // --- Action: Toggle Status (Activate/Deactivate) ---
  const handleToggleStatus = async (id: string, currentStatus: "ATIVO" | "INATIVO") => {
    const newStatus = currentStatus === "ATIVO" ? "INATIVO" : "ATIVO"
    
    // Optimistic Update
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))

    try {
      await api.patch(`/companies/${id}`, { status: newStatus })
      toast.success(`Status alterado para ${newStatus}`)
    } catch (error: any) {
      // Revert on error
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: currentStatus } : c))
      
      if (error.response?.status === 400) {
         toast.error("Não foi possível alterar o status", { 
             description: "Provável erro de permissão no backend (Role mismatch)." 
         })
      } else {
         toast.error("Erro ao alterar status")
      }
    }
  }

  // --- Action: Delete ---
  const confirmDelete = (id: string) => { setDeleteId(id); setIsDeleteOpen(true) }
  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await api.delete(`/companies/${deleteId}`)
      setCompanies(prev => prev.filter(c => c.id !== deleteId))
      toast.success("Empresa removida.")
    } catch (error) {
      toast.error("Erro ao excluir", { description: "Verifique vínculos existentes." })
    } finally {
      setIsDeleting(false); setIsDeleteOpen(false); setDeleteId(null)
    }
  }

  // --- Filter ---
  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.cnpj.includes(searchTerm)
  )

  return (
    <div className="min-h-screen w-full bg-[#F5F0E6] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2D3436]">Empresas</h1>
            <p className="text-[#95A5A6]">Gerencie seus parceiros comerciais.</p>
          </div>
          <Button 
            onClick={() => router.push('/registrar-empresa')} // Redirect to existing page
            className="bg-[#D35400] hover:bg-[#D35400]/90 text-white shadow-md transition-transform hover:scale-105"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Empresa
          </Button>
        </div>

        {/* Table and Filters */}
        <Card className="border-[#95A5A6]/20 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-[#2D3436]">Listagem</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#95A5A6]" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 bg-[#F5F0E6]/30 border-[#95A5A6]/30 focus-visible:ring-[#2C3E50]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-[#95A5A6]/20">
              <Table>
                <TableHeader className="bg-[#F5F0E6]/50">
                  <TableRow>
                    <TableHead className="text-[#2D3436] font-semibold w-[280px]">Empresa</TableHead>
                    <TableHead className="text-[#2D3436] font-semibold">Contato</TableHead>
                    <TableHead className="text-[#2D3436] font-semibold">Localização</TableHead>
                    <TableHead className="text-[#2D3436] font-semibold">Status</TableHead>
                    <TableHead className="text-right text-[#2D3436] font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({length: 5}).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={5} className="h-12"><div className="h-4 bg-gray-100 rounded w-full animate-pulse" /></TableCell></TableRow>
                    ))
                  ) : filteredCompanies.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#95A5A6]">Nenhuma empresa encontrada.</TableCell></TableRow>
                  ) : (
                    filteredCompanies.map((company) => (
                      <TableRow key={company.id} className="group hover:bg-[#F5F0E6]/30 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-[#2D3436]">{company.name}</span>
                            <span className="text-xs text-[#95A5A6] flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3 w-3" /> {formatCNPJ(company.cnpj)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-[#2C3E50] flex flex-col gap-1">
                            <span className="flex items-center gap-1">✉️ {company.email}</span>
                            <span className="flex items-center gap-1 text-[#95A5A6]"><Phone className="h-3 w-3" /> {formatPhone(company.telefone)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[#2C3E50] flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[#D35400]" /> {company.cidade}/{company.estado}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={company.status === "ATIVO" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}>
                            {company.status === "ATIVO" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 text-[#2C3E50] hover:text-[#D35400] hover:bg-transparent">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Opções</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditModal(company)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(company.id, company.status)}>
                                <Power className="mr-2 h-4 w-4" /> {company.status === "ATIVO" ? "Desativar" : "Ativar"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => confirmDelete(company.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- MODAL UNIFICADO (CRIAR / EDITAR) --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        {/* ALTERAÇÃO 1: h-[80vh] para subir o modal inteiro.
           flex flex-col para organizar cabeçalho, corpo e rodapé.
        */}
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-white border-[#F5F0E6]">
          
          {/* CABEÇALHO (Fixo no topo) */}
          <DialogHeader className="px-6 py-4 border-b border-[#F5F0E6] bg-[#F5F0E6]/30 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#F5F0E6] rounded text-[#D35400]">
                <Edit size={20} />
              </div>
              <div>
                <DialogTitle className="text-[#2D3436] text-xl">
                  Editar Empresa
                </DialogTitle>
                <DialogDescription className="text-[#95A5A6]">
                  Atualize os dados cadastrais da empresa selecionada.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {/* CORPO (Rolagem automática no meio) */}
          <div className="flex-1 overflow-hidden"> 
            <ScrollArea className="h-full px-6 py-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-6 pb-4">
                  
                  {/* Grupo 1: Dados Principais */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1 h-4 bg-[#D35400] rounded-full" /> Identificação
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#2D3436]">Razão Social / Nome</FormLabel>
                          <FormControl><Input placeholder="Empresa Modelo Ltda" {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="cnpj" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#2D3436]">CNPJ</FormLabel>
                          <FormControl><Input placeholder="00.000.000/0000-00" maxLength={18} {...field} onChange={e => field.onChange(formatCNPJ(e.target.value))} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#2D3436]">E-mail</FormLabel>
                          <FormControl><Input placeholder="contato@empresa.com" {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="telefone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#2D3436]">Telefone</FormLabel>
                          <FormControl><Input placeholder="(00) 00000-0000" maxLength={15} {...field} onChange={e => field.onChange(formatPhone(e.target.value))} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="ramoAtividade" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-[#2D3436]">Ramo de Atividade</FormLabel>
                          <FormControl><Input placeholder="Ex: Confecção Têxtil" {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <Separator className="bg-[#95A5A6]/20" />

                  {/* Grupo 2: Endereço */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1 h-4 bg-[#D35400] rounded-full" /> Endereço
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <FormField control={form.control} name="cep" render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel className="text-[#2D3436]">CEP</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input placeholder="00000-000" maxLength={9} {...field} onChange={e => field.onChange(formatCEP(e.target.value))} onBlur={handleCepBlur} className="pr-8 focus-visible:ring-[#2C3E50]" />
                            </FormControl>
                            {isCepLoading ? <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-[#D35400]" /> : <SearchIcon className="absolute right-2 top-2.5 h-4 w-4 text-[#95A5A6]" />}
                          </div>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="endereco" render={({ field }) => (
                        <FormItem className="md:col-span-7">
                          <FormLabel className="text-[#2D3436]">Logradouro</FormLabel>
                          <FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="numero" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-[#2D3436]">Número</FormLabel>
                          <FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="bairro" render={({ field }) => (
                        <FormItem className="md:col-span-4">
                          <FormLabel className="text-[#2D3436]">Bairro</FormLabel>
                          <FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="cidade" render={({ field }) => (
                        <FormItem className="md:col-span-4">
                          <FormLabel className="text-[#2D3436]">Cidade</FormLabel>
                          <FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="estado" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-[#2D3436]">UF</FormLabel>
                          <FormControl><Input {...field} maxLength={2} className="uppercase focus-visible:ring-[#2C3E50]" /></FormControl>
                          <FormMessage className="text-[#D35400]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="complemento" render={({ field }) => (
                        <FormItem className="md:col-span-12">
                          <FormLabel className="text-[#2D3436]">Complemento (Opcional)</FormLabel>
                          <FormControl><Input {...field} className="focus-visible:ring-[#2C3E50]" /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <button type="submit" className="hidden" id="submit-edit-form" />
                </form>
              </Form>
            </ScrollArea>
          </div>

          {/* RODAPÉ (Fixo no fundo, com shrink-0 para não sumir) */}
          <div className="px-6 py-4 border-t border-[#F5F0E6] bg-[#F5F0E6]/30 flex justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="border-[#95A5A6] text-[#2D3436]">Cancelar</Button>
            <Button 
              onClick={() => form.handleSubmit(onSubmitEdit)()} 
              disabled={isFormLoading}
              className="bg-[#D35400] hover:bg-[#D35400]/90 text-white min-w-[120px]"
            >
              {isFormLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#D35400]">
              <AlertTriangle className="h-5 w-5" /> Atenção
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#2D3436]">
              Tem certeza que deseja excluir esta empresa? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-[#2D3436]">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete() }} disabled={isDeleting} className="bg-[#D35400] hover:bg-[#D35400]/90 text-white">
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
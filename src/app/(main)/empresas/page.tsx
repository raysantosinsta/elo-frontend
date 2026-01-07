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
import { toast } from "sonner" // Usaremos toast apenas para Sucesso agora
import { useRouter } from "next/navigation"

// Serviços e Contextos
import { api } from "@/services/api"
// 🔥 1. Importação do Hook de Erro
import { useError } from "@/contexts/error-context" // Ajuste o caminho se necessário (ex: ErrorProvider)

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
  status: "ACTIVE" | "INACTIVE"
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
  const router = useRouter()
  // 🔥 2. Instanciando o hook de erro
  const { showError } = useError()

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

  // --- Helpers ---
  const formatCNPJ = (v: string | null | undefined) => {
    if (!v) return ""
    return v.replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").substring(0, 18)
  }
  const formatPhone = (v: string | null | undefined) => {
    if (!v) return ""

    // 1. Limpa tudo que não é número
    const r = v.replace(/\D/g, "")

    // 2. Garante que só pegamos os primeiros 11 dígitos (DDD + 9 números)
    const numbers = r.substring(0, 11)

    // 3. Aplica a máscara

    // Se tiver 11 dígitos (Celular): (85) 9 8437-2869
    if (numbers.length === 11) {
      return numbers.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2 $3-$4")
    }

    // Se tiver 10 dígitos (Fixo): (85) 3333-4444
    if (numbers.length === 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
    }

    // Máscara parcial enquanto digita (para não ficar feio antes de terminar)
    if (numbers.length > 5) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
    }
    if (numbers.length > 2) {
      return numbers.replace(/^(\d{2})/, "($1) ")
    }

    return numbers
  }
  const formatCEP = (v: string | null | undefined) => {
    if (!v) return ""
    return v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9)
  }

  // --- API: Fetch Companies ---
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get<{ data: Company[] }>("/companies?limit=100")
      setCompanies(response.data.data || [])
    } catch (error) {
      // 🔥 3. Erro silencioso aqui pois o Interceptor do Axios já vai abrir o Dialog
      // Se quiser garantir que abra algo mesmo se não for erro de HTTP (ex: erro de rede), o axios também pega.
      // Apenas limpamos o loading.
      console.error("Erro no fetch:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  // --- API: Fetch CEP ---
  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, "")
    if (rawCep.length !== 8) return

    setIsCepLoading(true)
    try {
      // Como usamos fetch nativo, o Interceptor do Axios NÃO funciona aqui.
      // Precisamos chamar o showError manualmente se der erro.
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`)
      const data = await res.json()

      if (data.erro) {
        // 🔥 4. Uso manual do Dialog para erros de negócio (CEP não existe)
        showError("CEP Inválido", "O CEP informado não foi encontrado na base de dados.")
        return
      }

      form.setValue("endereco", data.logradouro)
      form.setValue("bairro", data.bairro)
      form.setValue("cidade", data.localidade)
      form.setValue("estado", data.uf)
      form.setFocus("numero")

    } catch (err) {
      // 🔥 5. Uso manual para erros de rede no fetch
      showError("Erro na Busca", "Não foi possível consultar o CEP. Verifique sua conexão.")
    } finally {
      setIsCepLoading(false)
    }
  }

  // --- Modal Actions ---
  const openEditModal = (company: Company) => {
    setEditingCompany(company)
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
      // Se der erro (400, 403, 500), o Interceptor do Axios abre o Dialog automaticamente.
      await api.patch(`/companies/${editingCompany.id}`, values)

      toast.success("Empresa atualizada com sucesso!")

      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...values } : c))
      setIsEditModalOpen(false)
    } catch (error: any) {
      // 🔥 6. Removemos os toasts de erro manuais.
      // O catch serve apenas para garantir que o loading pare.
      console.error("Erro ao editar", error)
    } finally {
      setIsFormLoading(false)
    }
  }

  // --- Action: Toggle Status ---
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const apiStatus = currentStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE";
    const newApiStatus = apiStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const newStatus = newApiStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE";

    try {
      await api.patch(`/companies/${id}`, { status: newApiStatus });
      toast.success("Status atualizado com sucesso");

      setCompanies((prevCompanies) =>
        prevCompanies.map((company) =>
          company.id === id ? { ...company, status: newStatus } : company
        )
      );
    } catch (error) {
      // 🔥 7. Sem toast de erro, o Dialog Global assume.
      console.error("Erro ao atualizar status", error);
    }
  };

  // --- Action: Delete ---
  const confirmDelete = (id: string) => { setDeleteId(id); setIsDeleteOpen(true) }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await api.delete(`/companies/${deleteId}`)
      setCompanies(prev => prev.filter(c => c.id !== deleteId))
      toast.success("Empresa removida.")
      setIsDeleteOpen(false)
      setDeleteId(null)
    } catch (error) {
      // 🔥 8. Sem toast de erro. Se houver vínculo, o backend retorna 400/409 e o Dialog mostra a msg do backend.
      console.error("Erro ao excluir", error)
      // Opcional: fechar o modal de confirmação mesmo com erro, ou deixar aberto
      setIsDeleteOpen(false)
    } finally {
      setIsDeleting(false)
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
            onClick={() => router.push('/registrar-empresa')}
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
                    Array.from({ length: 5 }).map((_, i) => (
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
                          <Badge variant="outline" className={company.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}>
                            {company.status === "ACTIVE" ? "Ativo" : "Inativo"}
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
                                <Power className="mr-2 h-4 w-4" /> {company.status === "ACTIVE" ? "Desativar" : "Ativar"}
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

      {/* --- MODAL UNIFICADO (EDITAR) --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-white border-[#F5F0E6]">

          {/* CABEÇALHO */}
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

          {/* CORPO */}
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
                          <FormControl>
                            <Input
                              placeholder="(00) 9 0000-0000"
                              maxLength={16} // Isso está correto (16 caracteres contando espaços e traços)
                              {...field}
                              onChange={e => field.onChange(formatPhone(e.target.value))}
                              className="focus-visible:ring-[#2C3E50]"
                            />
                          </FormControl>
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

          {/* RODAPÉ */}
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
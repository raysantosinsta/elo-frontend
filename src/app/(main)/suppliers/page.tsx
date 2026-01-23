/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useCallback, useEffect, useState } from "react";

// Componentes UI (Shadcn/ui & Lucide)
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Building2,
  Edit2,
  Globe,
  Layers,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Package,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

// --- TEMA (Gold Standard) ---
const THEME = {
  colors: {
    background: "#F5F0E6",
    textMain: "#2D3436",
    textSecondary: "#95A5A6",
    primary: "#D35400",
    navigation: "#2C3E50",
    white: "#FFFFFF",
    danger: "#E74C3C",
    success: "#27AE60",
  },
};

// --- TYPES ---
enum SupplierCategory {
  MATERIAL_ONLY = "MATERIAL_ONLY",
  SERVICE_ONLY = "SERVICE_ONLY",
  HYBRID = "HYBRID",
}

interface Supplier {
  id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  category: SupplierCategory;
  // Novos campos do Schema
  address?: string;
  numero?: string;
  bairro?: string;
  complement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  status: "ACTIVE" | "INACTIVE";
}

// --- UTILS ---
const categoryConfig = {
  [SupplierCategory.MATERIAL_ONLY]: { label: "Materiais", icon: Package, color: "bg-blue-100 text-blue-700 border-blue-200" },
  [SupplierCategory.SERVICE_ONLY]: { label: "Serviços", icon: Wrench, color: "bg-purple-100 text-purple-700 border-purple-200" },
  [SupplierCategory.HYBRID]: { label: "Híbrido", icon: Layers, color: "bg-orange-100 text-orange-700 border-orange-200" },
};

const formatDocument = (doc: string) => {
  if (!doc) return "";
  const v = doc.replace(/\D/g, "");
  if (v.length <= 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

const formatPhone = (phone: string) => {
  if (!phone) return "";
  const v = phone.replace(/\D/g, "");
  if (v.length === 11) return v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  return v.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
};

export default function SuppliersPage() {
  const { user } = useAuth();
  
  // Estados
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    category: SupplierCategory.MATERIAL_ONLY as SupplierCategory,
    // Endereço Completo
    address: "",
    numero: "",
    bairro: "",
    complement: "",
    city: "",
    state: "",
    zipCode: "",
    // Coordenadas (String no form, number no envio)
    latitude: "",
    longitude: "",
  });

  // --- API CALLS ---

  const fetchSuppliers = useCallback(async () => {
    if (!user?.company?.id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/suppliers?companyId=${user.company.id}`);
      // Ajuste caso venha paginado ou direto array
      const list = Array.isArray(data) ? data : data.data || [];
      setSuppliers(list);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar fornecedores.");
    } finally {
      setLoading(false);
    }
  }, [user?.company?.id]);

  useEffect(() => {
    if (user) fetchSuppliers();
  }, [user, fetchSuppliers]);

  // --- ADDRESS HANDLERS ---

  const handleCepSearch = async () => {
    const cep = formData.zipCode.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          address: data.logradouro,
          bairro: data.bairro,
          city: data.localidade,
          state: data.uf,
        }));
        document.getElementById("numero")?.focus();
        toast.success("Endereço encontrado!");
      } else {
        toast.error("CEP não encontrado.");
      }
    } catch {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleGeocode = async () => {
    const { address, numero, city, state } = formData;
    if (!address || !city || !state) {
      toast.error("Preencha Rua, Cidade e Estado para buscar coordenadas.");
      return;
    }

    setIsGeocoding(true);
    try {
      const query = `${address}, ${numero ? numero + "," : ""} ${city}, ${state}, Brasil`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: { "User-Agent": "EloProdutivo/1.0" }
      });
      const data = await res.json();

      if (data && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          latitude: data[0].lat,
          longitude: data[0].lon
        }));
        toast.success("Coordenadas atualizadas!");
      } else {
        toast.error("Endereço não localizado no mapa.");
      }
    } catch {
      toast.error("Erro na geolocalização.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // --- CRUD HANDLERS ---

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        document: supplier.document || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        category: supplier.category,
        address: supplier.address || "",
        numero: supplier.numero || "",
        bairro: supplier.bairro || "",
        complement: supplier.complement || "",
        city: supplier.city || "",
        state: supplier.state || "",
        zipCode: supplier.zipCode || "",
        latitude: supplier.latitude ? String(supplier.latitude) : "",
        longitude: supplier.longitude ? String(supplier.longitude) : "",
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: "", document: "", email: "", phone: "",
        category: SupplierCategory.MATERIAL_ONLY,
        address: "", numero: "", bairro: "", complement: "", city: "", state: "", zipCode: "",
        latitude: "", longitude: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.company?.id || !user?.id) return;

    if (!formData.name.trim()) {
      return toast.error("O nome do fornecedor é obrigatório.");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        document: formData.document.replace(/\D/g, ""),
        phone: formData.phone.replace(/\D/g, ""),
        zipCode: formData.zipCode.replace(/\D/g, ""),
        // Converte coordenadas para Float ou null
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        
        companyId: user.company.id,
        userCreateId: user.id,
        userUpdateId: user.id,
      };

      if (editingSupplier) {
        await api.patch(`/suppliers/${editingSupplier.id}`, payload);
        toast.success("Fornecedor atualizado com sucesso!");
      } else {
        await api.post("/suppliers", payload);
        toast.success("Fornecedor cadastrado com sucesso!");
      }

      await fetchSuppliers();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Erro ao salvar fornecedor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/suppliers/${supplierToDelete.id}`);
      toast.success("Fornecedor removido.");
      setSuppliers((prev) => prev.filter((s) => s.id !== supplierToDelete.id));
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error("Erro ao excluir. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER ---
  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.document?.includes(searchTerm) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: THEME.colors.background }}>
      {/* HEADER */}
      <header className="px-6 py-4 shadow-md sticky top-0 z-40" style={{ backgroundColor: THEME.colors.navigation }}>
        <div className="max-w-[1920px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/10 rounded-lg"><Truck className="w-6 h-6 text-orange-400" /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Fornecedores</h1>
              <p className="text-xs text-blue-200">Gerencie seus parceiros de negócio</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} className="font-semibold shadow-lg hover:brightness-110 transition-all" style={{ backgroundColor: THEME.colors.primary }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
          </Button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="flex-1 p-6 max-w-[1920px] mx-auto w-full space-y-6">
        {/* BARRA DE FERRAMENTAS */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar por nome, documento ou email..." className="pl-10 border-gray-200 focus:border-orange-400 focus:ring-orange-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="text-sm text-gray-500 font-medium">Total: <span className="text-gray-900">{filteredSuppliers.length}</span> parceiros</div>
        </div>

        {/* LISTAGEM */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-2 text-orange-500" /><p>Carregando fornecedores...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white/50 rounded-xl border-2 border-dashed border-gray-200">
            <Building2 className="w-12 h-12 mb-2 opacity-50" /><p>Nenhum fornecedor encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSuppliers.map((supplier) => {
              const CategoryIcon = categoryConfig[supplier.category].icon;
              return (
                <Card key={supplier.id} className="group hover:shadow-lg transition-all duration-300 border-l-4" style={{ borderLeftColor: supplier.status === 'ACTIVE' ? THEME.colors.primary : '#95a5a6' }}>
                  <CardHeader className="pb-3 relative">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold text-gray-800 line-clamp-1" title={supplier.name}>{supplier.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${categoryConfig[supplier.category].color}`}>
                            <CategoryIcon className="w-3 h-3 mr-1" />{categoryConfig[supplier.category].label}
                          </Badge>
                          {supplier.status === 'INACTIVE' && <Badge variant="outline" className="text-xs text-gray-400">Inativo</Badge>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenModal(supplier)}><Edit2 className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { setSupplierToDelete(supplier); setIsDeleteModalOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gray-100 rounded-full"><Building2 className="w-3 h-3 text-gray-500"/></div>
                      <span className="truncate" title={supplier.document || "N/A"}>{formatDocument(supplier.document || "") || "Sem documento"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gray-100 rounded-full"><Phone className="w-3 h-3 text-gray-500"/></div>
                      <span className="truncate">{formatPhone(supplier.phone || "") || "Sem telefone"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gray-100 rounded-full"><Mail className="w-3 h-3 text-gray-500"/></div>
                      <span className="truncate" title={supplier.email || ""}>{supplier.email || "Sem e-mail"}</span>
                    </div>
                    <div className="flex items-start gap-2 pt-2 border-t border-gray-100 mt-2">
                      <div className="p-1.5 bg-gray-100 rounded-full mt-0.5"><MapPin className="w-3 h-3 text-gray-500"/></div>
                      <span className="text-xs leading-tight line-clamp-2">
                        {supplier.address ? (
                          `${supplier.address}, ${supplier.numero || "S/N"}${supplier.bairro ? ` - ${supplier.bairro}` : ""} - ${supplier.city || ""}/${supplier.state || ""}`
                        ) : "Endereço não cadastrado"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* --- MODAL DE CRIAÇÃO/EDIÇÃO --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-800 flex items-center gap-2">
              {editingSupplier ? <Edit2 className="w-5 h-5 text-orange-500"/> : <Plus className="w-5 h-5 text-orange-500"/>}
              {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>Preencha os dados completos do parceiro. Endereço correto facilita a logística.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Dados Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Nome / Razão Social *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Têxtil São Jorge Ltda" className="focus:ring-orange-400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document">CPF / CNPJ</Label>
                <Input id="document" value={formData.document} onChange={(e) => setFormData({ ...formData, document: e.target.value })} placeholder="Apenas números" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <select id="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-orange-400" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as SupplierCategory })}>
                  <option value={SupplierCategory.MATERIAL_ONLY}>Apenas Materiais</option>
                  <option value={SupplierCategory.SERVICE_ONLY}>Apenas Serviços (Oficina)</option>
                  <option value={SupplierCategory.HYBRID}>Híbrido (Ambos)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contato@fornecedor.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
            </div>

            {/* Endereço */}
            <div className="border-t pt-4 bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-500" /> Endereço e Logística</h3>
                 <Button type="button" size="sm" variant="outline" onClick={handleGeocode} disabled={isGeocoding} className="text-xs h-8">
                    {isGeocoding ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Globe className="w-3 h-3 mr-1 text-blue-600"/>} Buscar Coordenadas (GPS)
                 </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP</Label>
                  <div className="relative">
                    <Input id="zipCode" value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} onBlur={handleCepSearch} maxLength={9} placeholder="00000-000" />
                    {isSearchingCep && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-orange-500" />}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="address">Rua / Logradouro</Label>
                  <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} placeholder="123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input id="complement" value={formData.complement} onChange={(e) => setFormData({ ...formData, complement: e.target.value })} placeholder="Galpão 3, Sala 10..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="state">Estado (UF)</Label>
                  <Input id="state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })} maxLength={2} placeholder="CE" />
                </div>
                
                {/* Lat/Long Readonly */}
                <div className="space-y-2 md:col-span-2">
                   <Label className="text-xs text-gray-400">Latitude</Label>
                   <Input value={formData.latitude} readOnly className="bg-gray-100 text-xs font-mono" placeholder="Clique em Buscar Coordenadas" />
                </div>
                <div className="space-y-2 md:col-span-2">
                   <Label className="text-xs text-gray-400">Longitude</Label>
                   <Input value={formData.longitude} readOnly className="bg-gray-100 text-xs font-mono" placeholder="Clique em Buscar Coordenadas" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: THEME.colors.primary }}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingSupplier ? "Salvar Alterações" : "Cadastrar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DE EXCLUSÃO --- */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Excluir Fornecedor</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir <strong>{supplierToDelete?.name}</strong>?<br />Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
              {isSubmitting ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
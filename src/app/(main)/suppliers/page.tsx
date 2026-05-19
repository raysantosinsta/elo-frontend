/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useCallback, useEffect, useState } from "react";

// Componentes UI (Shadcn/ui & Lucide)
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// --- PALETA ELO PRODUTIVO ---
const THEME = {
  colors: {
    background: "#F5F6FA",
    textMain: "#353A40",
    textSecondary: "#7A7E83",
    primary: "#2F80ED",
    primaryDark: "#1E5CB8",
    navigation: "#FFFFFF",
    white: "#FFFFFF",
    danger: "#EF4444",
    success: "#10B981",
    border: "#E2E8F0",
    inputBorder: "#CBD5E1",
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
  [SupplierCategory.MATERIAL_ONLY]: {
    label: "Materiais",
    icon: Package,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [SupplierCategory.SERVICE_ONLY]: {
    label: "Serviços",
    icon: Wrench,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  [SupplierCategory.HYBRID]: {
    label: "Híbrido",
    icon: Layers,
    color: "bg-[#2F80ED]/10 text-[#2F80ED] border-[#2F80ED]/20",
  },
};

const formatDocument = (doc: string) => {
  if (!doc) return "";
  const v = doc.replace(/\D/g, "");
  if (v.length <= 11)
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
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
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null,
  );

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    category: SupplierCategory.MATERIAL_ONLY as SupplierCategory,
    address: "",
    numero: "",
    bairro: "",
    complement: "",
    city: "",
    state: "",
    zipCode: "",
    latitude: "",
    longitude: "",
  });

  // --- API CALLS ---

  const fetchSuppliers = useCallback(async () => {
    if (!user?.company?.id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/suppliers?companyId=${user.company.id}`);
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
        setFormData((prev) => ({
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
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: { "User-Agent": "EloProdutivo/1.0" },
        },
      );
      const data = await res.json();

      if (data && data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          latitude: data[0].lat,
          longitude: data[0].lon,
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
        name: "",
        document: "",
        email: "",
        phone: "",
        category: SupplierCategory.MATERIAL_ONLY,
        address: "",
        numero: "",
        bairro: "",
        complement: "",
        city: "",
        state: "",
        zipCode: "",
        latitude: "",
        longitude: "",
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
      toast.error(
        error.response?.data?.message || "Erro ao salvar fornecedor.",
      );
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
  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.document?.includes(searchTerm) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!user) return null;

  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{ backgroundColor: THEME.colors.background }}
    >
      {/* HEADER MOBILE-FIRST */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4 mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3 text-[#353A40]">
              <div className="p-2 bg-[#F5F6FA] rounded-lg shrink-0">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-[#2F80ED]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#353A40]">
                  Fornecedores
                </h1>
                <p className="text-xs text-[#7A7E83] hidden sm:block">
                  Gerencie seus parceiros de negócio
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="w-full sm:w-auto font-semibold shadow-sm transition-all bg-[#2F80ED] hover:bg-[#1E5CB8] text-white active:scale-95"
              size="default"
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
            </Button>
          </div>
          <p className="text-xs text-[#7A7E83] mt-2 sm:hidden">
            Gerencie seus parceiros de negócio
          </p>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 mx-auto w-full max-w-[1920px] space-y-4 sm:space-y-6">
        {/* BARRA DE FERRAMENTAS RESPONSIVA */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0]">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7E83] w-4 h-4 pointer-events-none" />
            <Input
              placeholder="Buscar por nome, documento ou email..."
              className="pl-10 border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-[#7A7E83] font-medium text-center sm:text-right shrink-0">
            Total:{" "}
            <span className="text-[#353A40] font-semibold">
              {filteredSuppliers.length}
            </span>{" "}
            parceiros
          </div>
        </div>

        {/* LISTAGEM EM GRID RESPONSIVO */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#7A7E83]">
            <Loader2 className="w-10 h-10 animate-spin mb-2 text-[#2F80ED]" />
            <p>Carregando fornecedores...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#7A7E83] bg-white/50 rounded-xl border-2 border-dashed border-[#E2E8F0] p-8 text-center">
            <Building2 className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm sm:text-base">Nenhum fornecedor encontrado.</p>
            <p className="text-xs mt-1">Clique em &quot;Novo Fornecedor&quot; para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredSuppliers.map((supplier) => {
              const CategoryIcon = categoryConfig[supplier.category].icon;
              return (
                <Card
                  key={supplier.id}
                  className="group hover:shadow-lg transition-all duration-300 border-l-4 rounded-xl bg-white border border-[#E2E8F0] hover:-translate-y-1 active:scale-[0.99]"
                  style={{
                    borderLeftColor:
                      supplier.status === "ACTIVE"
                        ? THEME.colors.primary
                        : "#7A7E83",
                  }}
                >
                  <CardHeader className="pb-2 sm:pb-3 relative">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <CardTitle
                          className="text-base sm:text-lg font-bold text-[#353A40] line-clamp-2 break-words"
                          title={supplier.name}
                        >
                          {supplier.name}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] sm:text-xs px-2 py-0.5 ${categoryConfig[supplier.category].color}`}
                          >
                            <CategoryIcon className="w-3 h-3 mr-1 shrink-0" />
                            <span className="truncate">
                              {categoryConfig[supplier.category].label}
                            </span>
                          </Badge>
                          {supplier.status === "INACTIVE" && (
                            <Badge
                              variant="outline"
                              className="text-xs text-[#7A7E83] border-[#CBD5E1]"
                            >
                              Inativo
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 -mr-2 text-[#7A7E83] hover:text-[#2F80ED] active:bg-[#F5F6FA]"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-white border border-[#E2E8F0] rounded-xl shadow-lg min-w-[140px]"
                        >
                          <DropdownMenuItem
                            onClick={() => handleOpenModal(supplier)}
                            className="cursor-pointer text-[#353A40] hover:bg-[#F5F6FA] py-2.5"
                          >
                            <Edit2 className="w-4 h-4 mr-2 text-[#2F80ED]" />{" "}
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 cursor-pointer hover:bg-red-50 py-2.5"
                            onClick={() => {
                              setSupplierToDelete(supplier);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 sm:space-y-3 text-sm text-[#353A40] pt-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-[#F5F6FA] rounded-full shrink-0">
                        <Building2 className="w-3 h-3 text-[#7A7E83]" />
                      </div>
                      <span className="truncate text-xs sm:text-sm" title={supplier.document || "N/A"}>
                        {formatDocument(supplier.document || "") || "Sem documento"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-[#F5F6FA] rounded-full shrink-0">
                        <Phone className="w-3 h-3 text-[#7A7E83]" />
                      </div>
                      <span className="truncate text-xs sm:text-sm">
                        {formatPhone(supplier.phone || "") || "Sem telefone"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-[#F5F6FA] rounded-full shrink-0">
                        <Mail className="w-3 h-3 text-[#7A7E83]" />
                      </div>
                      <span className="truncate text-xs sm:text-sm" title={supplier.email || ""}>
                        {supplier.email || "Sem e-mail"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 pt-2 border-t border-[#E2E8F0] mt-2">
                      <div className="p-1.5 bg-[#F5F6FA] rounded-full shrink-0 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#7A7E83]" />
                      </div>
                      <span className="text-xs leading-relaxed line-clamp-2 text-[#7A7E83] break-words">
                        {supplier.address
                          ? `${supplier.address}, ${supplier.numero || "S/N"}${supplier.bairro ? ` - ${supplier.bairro}` : ""} - ${supplier.city || ""}/${supplier.state || ""}`
                          : "Endereço não cadastrado"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* --- MODAL DE CRIAÇÃO/EDIÇÃO RESPONSIVO COM Acessibilidade Corrigida --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl text-[#353A40] flex items-center gap-2">
              {editingSupplier ? (
                <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#2F80ED]" />
              ) : (
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-[#2F80ED]" />
              )}
              {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-[#7A7E83]">
              Preencha os dados completos do parceiro. Endereço correto facilita a logística.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 py-3 sm:py-4">
            {/* Dados Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-1 sm:col-span-2">
                <Label htmlFor="name" className="text-[#353A40] font-medium text-sm">
                  Nome / Razão Social *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Têxtil São Jorge Ltda"
                  className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document" className="text-[#353A40] font-medium text-sm">
                  CPF / CNPJ
                </Label>
                <Input
                  id="document"
                  value={formData.document}
                  onChange={(e) =>
                    setFormData({ ...formData, document: e.target.value })
                  }
                  placeholder="Apenas números"
                  className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-[#353A40] font-medium text-sm">
                  Categoria
                </Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F80ED] focus:border-[#2F80ED] text-[#353A40]"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as SupplierCategory,
                    })
                  }
                >
                  <option value={SupplierCategory.MATERIAL_ONLY}>
                    Apenas Materiais
                  </option>
                  <option value={SupplierCategory.SERVICE_ONLY}>
                    Apenas Serviços (Oficina)
                  </option>
                  <option value={SupplierCategory.HYBRID}>
                    Híbrido (Ambos)
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#353A40] font-medium text-sm">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="contato@fornecedor.com"
                  className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#353A40] font-medium text-sm">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                  className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                />
              </div>
            </div>

            {/* Endereço com layout responsivo */}
            <div className="border-t border-[#E2E8F0] pt-4 bg-[#F5F6FA] p-3 sm:p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-[#353A40] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#2F80ED]" /> Endereço e Logística
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGeocode}
                  disabled={isGeocoding}
                  className="text-xs h-8 border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA] w-full sm:w-auto"
                >
                  {isGeocoding ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1 text-[#2F80ED]" />
                  ) : (
                    <Globe className="w-3 h-3 mr-1 text-[#2F80ED]" />
                  )}
                  Buscar Coordenadas (GPS)
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="text-[#353A40] font-medium text-sm">
                    CEP
                  </Label>
                  <div className="relative">
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zipCode: e.target.value })
                      }
                      onBlur={handleCepSearch}
                      maxLength={9}
                      placeholder="00000-000"
                      className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                    />
                    {isSearchingCep && (
                      <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-[#2F80ED]" />
                    )}
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="address" className="text-[#353A40] font-medium text-sm">
                    Rua / Logradouro
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero" className="text-[#353A40] font-medium text-sm">
                    Número
                  </Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) =>
                      setFormData({ ...formData, numero: e.target.value })
                    }
                    placeholder="123"
                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro" className="text-[#353A40] font-medium text-sm">
                    Bairro
                  </Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) =>
                      setFormData({ ...formData, bairro: e.target.value })
                    }
                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="complement" className="text-[#353A40] font-medium text-sm">
                    Complemento
                  </Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) =>
                      setFormData({ ...formData, complement: e.target.value })
                    }
                    placeholder="Galpão 3, Sala 10..."
                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="city" className="text-[#353A40] font-medium text-sm">
                    Cidade
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="state" className="text-[#353A40] font-medium text-sm">
                    Estado (UF)
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        state: e.target.value.toUpperCase(),
                      })
                    }
                    maxLength={2}
                    placeholder="CE"
                    className="border-[#CBD5E1] focus:border-[#2F80ED] focus:ring-[#2F80ED] h-10 text-sm"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs text-[#7A7E83]">Latitude</Label>
                  <Input
                    value={formData.latitude}
                    readOnly
                    className="bg-[#F5F6FA] text-xs font-mono text-[#7A7E83] border-[#CBD5E1] h-10"
                    placeholder="Clique em Buscar Coordenadas"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs text-[#7A7E83]">Longitude</Label>
                  <Input
                    value={formData.longitude}
                    readOnly
                    className="bg-[#F5F6FA] text-xs font-mono text-[#7A7E83] border-[#CBD5E1] h-10"
                    placeholder="Clique em Buscar Coordenadas"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA] w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#2F80ED] hover:bg-[#1E5CB8] text-white w-full sm:w-auto active:scale-95"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingSupplier ? "Salvar Alterações" : "Cadastrar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DE EXCLUSÃO RESPONSIVO COM Acessibilidade Corrigida --- */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-white border border-[#E2E8F0] rounded-xl max-w-[90vw] sm:max-w-md p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-red-600 flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Excluir Fornecedor
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-[#7A7E83]">
              Tem certeza que deseja excluir{" "}
              <strong className="text-[#353A40] block sm:inline break-words">
                {supplierToDelete?.name}
              </strong>
              ?<br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="border-[#CBD5E1] text-[#353A40] hover:bg-[#F5F6FA] w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto active:scale-95"
            >
              {isSubmitting ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
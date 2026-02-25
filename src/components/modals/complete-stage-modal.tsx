/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, User, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { toast } from "sonner";

interface CompleteStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (responsibleId: string, type: 'user' | 'supplier') => Promise<void>;
  itemTitle: string;
  currentStage: string;
  nextStage: {
    id: string;
    name: string;
    allowedRole?: string | null;
  } | null;
  isLoading?: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  professionalRole?: string;
  email?: string;
}

interface Supplier {
  id: string;
  name: string;
  category?: string;
  city?: string;
  state?: string;
}

export function CompleteStageModal({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  currentStage,
  nextStage,
  isLoading = false,
}: CompleteStageModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // 🔥 Verifica se a coluna destino é OFICINA (case insensitive)
  const isOficina = nextStage?.name?.trim().toLowerCase() === 'oficina';

  // Reset estado quando o modal abre
  useEffect(() => {
    if (isOpen && nextStage) {
      setSelectedUserId("");
      setSelectedSupplierId("");
      
      if (isOficina) {
        fetchSuppliers();
      } else {
        fetchUsersByRole();
      }
    }
  }, [isOpen, nextStage, isOficina]);

  const fetchUsersByRole = async () => {
    // Se não tem cargo específico ou é "all", busca todos os usuários ativos da empresa
    if (!nextStage?.allowedRole || 
        nextStage.allowedRole === "all" || 
        nextStage.allowedRole === "null" ||
        nextStage.allowedRole.trim() === "") {
      
      setLoadingUsers(true);
      try {
        const response = await api.get("/users/company");
        setAvailableUsers(response.data.filter((u: any) => u.status === "ACTIVE"));
      } catch (error) {
        toast.error("Erro ao carregar usuários");
        console.error(error);
      } finally {
        setLoadingUsers(false);
      }
      return;
    }

    // Tem cargo específico
    setLoadingUsers(true);
    try {
      const response = await api.get(`/users/by-role?role=${encodeURIComponent(nextStage.allowedRole)}`);
      setAvailableUsers(response.data);
      
      if (response.data.length === 0) {
        toast.warning(`Nenhum usuário encontrado com o cargo "${nextStage.allowedRole}"`);
      }
    } catch (error) {
      toast.error("Erro ao carregar usuários disponíveis");
      console.error(error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 🔥 NOVO: Buscar fornecedores/oficinas
  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const response = await api.get("/suppliers");
      // Filtra apenas fornecedores ativos, se houver campo status
      const suppliers = response.data.data || response.data;
      setAvailableSuppliers(suppliers);
    } catch (error) {
      toast.error("Erro ao carregar oficinas");
      console.error(error);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleConfirm = async () => {
    if (isOficina) {
      if (!selectedSupplierId) {
        toast.error("Selecione uma oficina responsável");
        return;
      }
    } else {
      if (!selectedUserId) {
        toast.error("Selecione um responsável para a próxima etapa");
        return;
      }
    }

    setConfirming(true);
    try {
      if (isOficina) {
        await onConfirm(selectedSupplierId, 'supplier');
      } else {
        await onConfirm(selectedUserId, 'user');
      }
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setConfirming(false);
    }
  };

  if (!nextStage) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Concluir Etapa</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-center text-slate-600">
              Este item já está na última etapa do fluxo.
              <br />
              <span className="text-sm text-slate-400 mt-2 block">
                Não é possível avançar para a próxima etapa.
              </span>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={onClose} className="w-full">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOficina ? (
              <Building2 size={18} className="text-orange-500" />
            ) : (
              <User size={18} className="text-orange-500" />
            )}
            Concluir Etapa
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Informações do item */}
          <div className="bg-slate-50 p-3 rounded-lg space-y-1">
            <p className="text-xs font-medium text-slate-400">ITEM</p>
            <p className="font-medium text-sm">{itemTitle}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full">
                {currentStage}
              </span>
              <span className="text-slate-300">→</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                {nextStage.name}
              </span>
            </div>
          </div>

          {/* Campo dinâmico baseado no destino */}
          {isOficina ? (
            // 🏭 CAMPO DE OFICINA
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building2 size={16} className="text-slate-400" />
                Oficina Responsável
              </Label>

              {loadingSuppliers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="animate-spin text-orange-500" size={20} />
                </div>
              ) : (
                <Select
                  value={selectedSupplierId}
                  onValueChange={setSelectedSupplierId}
                  disabled={confirming || isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma oficina..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSuppliers.length === 0 ? (
                      <SelectItem value="no-suppliers" disabled>
                        Nenhuma oficina disponível
                      </SelectItem>
                    ) : (
                      availableSuppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div className="flex items-center gap-2">
                            <span>{supplier.name}</span>
                            {supplier.city && supplier.state && (
                              <span className="text-xs text-slate-400">
                                ({supplier.city}/{supplier.state})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}

              {availableSuppliers.length === 0 && !loadingSuppliers && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span>
                  Nenhuma oficina cadastrada. Cadastre uma oficina primeiro.
                </p>
              )}
            </div>
          ) : (
            // 👤 CAMPO DE FUNCIONÁRIO
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User size={16} className="text-slate-400" />
                Responsável da Próxima Etapa
                {nextStage.allowedRole && 
                 nextStage.allowedRole !== "all" && 
                 nextStage.allowedRole !== "null" && 
                 nextStage.allowedRole.trim() !== "" && (
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    (Cargo necessário: {nextStage.allowedRole})
                  </span>
                )}
              </Label>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="animate-spin text-orange-500" size={20} />
                </div>
              ) : (
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  disabled={confirming || isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length === 0 ? (
                      <SelectItem value="no-users" disabled>
                        Nenhum usuário disponível
                      </SelectItem>
                    ) : (
                      availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.name}</span>
                            {user.professionalRole && (
                              <span className="text-xs text-slate-400">
                                ({user.professionalRole})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}

              {availableUsers.length === 0 && !loadingUsers && nextStage.allowedRole && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span>
                  Nenhum usuário encontrado com o cargo &quot;{nextStage.allowedRole}&quot;
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={confirming}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              (isOficina ? !selectedSupplierId : !selectedUserId) || 
              loadingUsers || 
              loadingSuppliers || 
              confirming || 
              isLoading
            }
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Concluindo...
              </>
            ) : (
              "Concluir Etapa"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
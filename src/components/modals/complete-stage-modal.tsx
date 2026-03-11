/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, User, Building2, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { toast } from "sonner";

interface CompleteStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (responsibleId: string, type: 'user' | 'supplier', quantity?: number) => Promise<void>;
  itemTitle: string;
  currentStage: string;
  nextStage: {
    id: string;
    name: string;
    allowedRole?: string | null;
  } | null;
  isLoading?: boolean;
  currentQuantity?: number;
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
  currentQuantity = 1,
}: CompleteStageModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // ===========================================================================
  // 🔥 ESTADO DA QUANTIDADE
  // ===========================================================================
  const [quantity, setQuantity] = useState<number>(currentQuantity);
  const [quantityError, setQuantityError] = useState<string>("");

  // 🔥 ÚNICA VERIFICAÇÃO: a coluna ATUAL é CORTE?
  const isCorteColumn = currentStage?.trim().toLowerCase() === 'corte';

  // Reset estado quando o modal abre
  useEffect(() => {
    if (isOpen && nextStage) {
      setSelectedUserId("");
      setSelectedSupplierId("");
      setQuantity(currentQuantity);
      setQuantityError("");
      
      // 🔥 Verifica APENAS para decidir se busca usuários ou fornecedores
      const isOficina = nextStage?.name?.trim().toLowerCase() === 'oficina';
      
      if (isOficina) {
        fetchSuppliers();
      } else {
        fetchUsersByRole();
      }
    }
  }, [isOpen, nextStage, currentQuantity]);

  // ===========================================================================
  // 🔥 VALIDAÇÃO DA QUANTIDADE - AGORA PERMITE 0 PARA TESTES
  // ===========================================================================
  const validateQuantity = (value: number): boolean => {
    // 🔥 REMOVIDA a validação de > 0 para permitir 0 em testes
    if (value < 0) {
      setQuantityError("A quantidade não pode ser negativa");
      return false;
    }
    if (value > 999999) {
      setQuantityError("Quantidade muito alta (máximo: 999.999)");
      return false;
    }
    setQuantityError("");
    return true;
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value === "") {
      setQuantity(0);
      setQuantityError("");
      return;
    }

    const numValue = Number(value);
    
    if (!isNaN(numValue)) {
      setQuantity(numValue);
      validateQuantity(numValue);
    }
  };

  const fetchUsersByRole = async () => {
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

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const response = await api.get("/suppliers");
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
    // ===========================================================================
    // 🔥 VALIDAÇÃO DA QUANTIDADE - AGORA PERMITE 0 PARA TESTES
    // ===========================================================================
    if (isCorteColumn) {
      if (!validateQuantity(quantity)) {
        toast.error(quantityError);
        return;
      }
      // 🔥 REMOVIDA a verificação de quantity < 1
    }

    const isOficina = nextStage?.name?.trim().toLowerCase() === 'oficina';

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
      // 🔥 Só passa a quantidade se estiver saindo do Corte
      if (isCorteColumn) {
        await onConfirm(
          isOficina ? selectedSupplierId : selectedUserId,
          isOficina ? 'supplier' : 'user',
          quantity
        );
      } else {
        await onConfirm(
          isOficina ? selectedSupplierId : selectedUserId,
          isOficina ? 'supplier' : 'user'
        );
      }
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setConfirming(false);
    }
  };

  const isOficina = nextStage?.name?.trim().toLowerCase() === 'oficina';

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

          {/* =========================================================================== */}
          {/* 🔥 CAMPO DE QUANTIDADE - Aparece SOMENTE quando a COLUNA ATUAL é CORTE */}
          {/* NÃO depende da coluna destino - pode ser QUALQUER UMA! */}
          {/* AGORA PERMITE 0 PARA TESTES */}
          {/* =========================================================================== */}
          {isCorteColumn && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Package size={16} className="text-slate-400" />
                Quantidade do Item 
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0" // 🔥 AGORA PERMITE 0
                  step="1"
                  value={quantity === 0 ? "0" : quantity} // 🔥 Mostra 0 explicitamente
                  onChange={handleQuantityChange}
                  placeholder="Digite a quantidade..."
                  className={`pr-12 ${quantityError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  disabled={confirming || isLoading}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-xs text-slate-400">un.</span>
                </div>
              </div>
              {quantityError && (
                <p className="text-xs text-red-500 mt-1">{quantityError}</p>
              )}
              
            </div>
          )}

          {/* Campo do responsável baseado no destino */}
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
                {/* {nextStage.allowedRole && 
                 nextStage.allowedRole !== "all" && 
                 nextStage.allowedRole !== "null" && 
                 nextStage.allowedRole.trim() !== "" && (
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    (Cargo necessário: {nextStage.allowedRole})
                  </span>
                )} */}
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
              isLoading ||
              // 🔥 AGORA SÓ BLOQUEIA SE FOR NEGATIVO, NÃO MAIS POR SER 0
              (isCorteColumn && quantity < 0)
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
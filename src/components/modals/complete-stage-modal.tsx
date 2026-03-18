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

// ===========================================================================
// 🔥 INTERFACE
// ===========================================================================
interface CompleteStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    responsibleId: string,
    type: "user" | "supplier",
    quantity?: number,
  ) => Promise<void>;
  itemTitle: string;
  currentStage: string;
  nextStage: {
    id: string;
    name: string;
    allowedRole?: string | null;
    isAfterCorte?: boolean; // 🔥 Volta a ser isAfterCorte
    isDistribuicao?: boolean;
  } | null;
  isLoading: boolean;
  currentQuantity?: number;
  hasQuantity?: boolean;
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
  hasQuantity = false,
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

  // ===========================================================================
  // 🔥 REGRA: Mostrar quantidade se:
  // 1. Está após o CORTE (isAfterCorte = true)
  // 2. E a quantidade está zerada (hasQuantity = false)
  // ===========================================================================
  const shouldShowQuantity = (() => {
    if (!nextStage) return false;

    const isAfterCorte = nextStage.isAfterCorte || false;
    const quantidadeZerada = !hasQuantity || currentQuantity <= 0;

    console.log("📦 [CompleteStageModal] Calculando shouldShowQuantity:", {
      stageName: nextStage.name,
      isAfterCorte,
      hasQuantity,
      currentQuantity,
      quantidadeZerada,
      result: isAfterCorte && quantidadeZerada,
    });

    // ✅ REGRA CORRETA:
    // - Se está após o CORTE E quantidade está zerada → MOSTRA
    // - Se está após o CORTE MAS já tem quantidade (>0) → NÃO MOSTRA
    // - Se está antes do CORTE → NUNCA MOSTRA
    return isAfterCorte && quantidadeZerada;
  })();

  // ===========================================================================
  // 🔥 LOG PARA DEBUG
  // ===========================================================================
  useEffect(() => {
    if (nextStage) {
      console.log("📦 CompleteStageModal - nextStage:", {
        name: nextStage.name,
        isAfterCorte: nextStage.isAfterCorte,
        isDistribuicao: nextStage.isDistribuicao,
        hasQuantity,
        currentQuantity,
        shouldShowQuantity,
      });
    }
  }, [nextStage, hasQuantity, currentQuantity, shouldShowQuantity]);

  // Reset estado quando o modal abre
  useEffect(() => {
    if (isOpen && nextStage) {
      setSelectedUserId("");
      setSelectedSupplierId("");
      setQuantity(currentQuantity);
      setQuantityError("");

      const isOficina = nextStage?.name?.trim().toLowerCase() === "oficina";

      if (isOficina) {
        fetchSuppliers();
      } else {
        fetchUsersByRole();
      }
    }
  }, [isOpen, nextStage, currentQuantity]);

  // ===========================================================================
  // 🔥 VALIDAÇÃO DA QUANTIDADE
  // ===========================================================================
  const validateQuantity = (value: number): boolean => {
    if (value < 0) {
      setQuantityError("A quantidade não pode ser negativa");
      return false;
    }
    if (value > 999999) {
      setQuantityError("Quantidade muito alta (máximo: 999.999)");
      return false;
    }
    if (value === 0 && shouldShowQuantity) {
      setQuantityError("A quantidade deve ser maior que zero");
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
    if (
      !nextStage?.allowedRole ||
      nextStage.allowedRole === "all" ||
      nextStage.allowedRole === "null" ||
      nextStage.allowedRole.trim() === ""
    ) {
      setLoadingUsers(true);
      try {
        const response = await api.get("/users/company");
        setAvailableUsers(
          response.data.filter((u: any) => u.status === "ACTIVE"),
        );
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
      const response = await api.get(
        `/users/by-role?role=${encodeURIComponent(nextStage.allowedRole)}`,
      );
      setAvailableUsers(response.data);

      if (response.data.length === 0) {
        toast.warning(
          `Nenhum usuário encontrado com o cargo "${nextStage.allowedRole}"`,
        );
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
    const isOficina = nextStage?.name?.trim().toLowerCase() === "oficina";

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

    // 🔥 VALIDAÇÃO DA QUANTIDADE SE NECESSÁRIA
    if (shouldShowQuantity) {
      if (!quantity || quantity <= 0) {
        toast.error("A quantidade deve ser maior que zero");
        return;
      }
      if (!validateQuantity(quantity)) {
        return;
      }
    }

    setConfirming(true);
    try {
      // 🔥 Só passa a quantidade se o campo for mostrado
      if (shouldShowQuantity) {
        await onConfirm(
          isOficina ? selectedSupplierId : selectedUserId,
          isOficina ? "supplier" : "user",
          quantity,
        );
      } else {
        await onConfirm(
          isOficina ? selectedSupplierId : selectedUserId,
          isOficina ? "supplier" : "user",
        );
      }
      onClose();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || "Erro ao concluir etapa";
      toast.error(errorMsg);
      console.error(error);
    } finally {
      setConfirming(false);
    }
  };

  const isOficina = nextStage?.name?.trim().toLowerCase() === "oficina";

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
            {hasQuantity && (
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <Package size={12} className="text-orange-500" />
                Quantidade atual: {currentQuantity} un
              </div>
            )}
          </div>

          {/* =========================================================================== */}
          {/* 🔥 CAMPO DE QUANTIDADE - SÓ APARECE SE: */}
          {/* 1. Está após o CORTE */}
          {/* 2. E a quantidade está zerada */}
          {/* =========================================================================== */}
          {shouldShowQuantity && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Package size={16} className="text-slate-400" />
                Quantidade do Item <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity === 0 ? "" : quantity}
                  onChange={handleQuantityChange}
                  placeholder="Digite a quantidade..."
                  className={`pr-12 ${quantityError ? "border-amber-500 focus-visible:ring-amber-500" : ""}`}
                  disabled={confirming || isLoading}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-xs text-slate-400">un.</span>
                </div>
              </div>
              {quantityError && (
                <p className="text-xs text-red-500 mt-1">{quantityError}</p>
              )}
              <p className="text-xs text-slate-400">
                * Este item está após o Corte e precisa ter uma quantidade definida
              </p>
            </div>
          )}

          {/* Mensagem informativa quando já tem quantidade após o Corte */}
          {nextStage.isAfterCorte && hasQuantity && currentQuantity > 0 && (
            <div className="text-xs text-slate-500 bg-blue-50 p-2 rounded border border-blue-100">
              <Package size={12} className="inline mr-1 text-blue-500" />
              Quantidade já definida: {currentQuantity} unidades
            </div>
          )}

          {/* Campo do responsável baseado no destino */}
          {isOficina ? (
            // 🏭 CAMPO DE OFICINA
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building2 size={16} className="text-slate-400" />
                Oficina Responsável <span className="text-red-500">*</span>
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
                Responsável da Próxima Etapa <span className="text-red-500">*</span>
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

              {availableUsers.length === 0 &&
                !loadingUsers &&
                nextStage.allowedRole && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <span>⚠️</span>
                    Nenhum usuário encontrado com o cargo &quot;
                    {nextStage.allowedRole}&quot;
                  </p>
                )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={confirming}>
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
              (shouldShowQuantity && (!quantity || quantity <= 0))
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
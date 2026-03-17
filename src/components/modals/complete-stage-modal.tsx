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
import { useState, useEffect, useMemo } from "react";
import { api } from "@/services/api";
import { toast } from "sonner";

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
    isAfterCorte?: boolean;
    isDistribuicao?: boolean; // 🔥 NOVA PROP
  } | null;
  isLoading?: boolean;
  currentQuantity?: number;
  // 🔥 PROP: indica se o item JÁ TEM quantidade definida
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
  // 🔥 CONSTANTES PARA IDENTIFICAR ETAPAS
  // ===========================================================================
  const CORTE_KEYWORDS = ["corte", "cortador", "cortar", "cut"];
  const MODELAGEM_KEYWORDS = ["modelagem", "modelista", "modelo", "pilotagem"];
  const DISTRIBUICAO_KEYWORDS = [
    "distribuição",
    "distribuicao",
    // "expedição",
    // "expedicao",
  ];

  // ===========================================================================
  // 🔥 ESTADO DA QUANTIDADE
  // ===========================================================================
  const [quantity, setQuantity] = useState<number>(currentQuantity);
  const [quantityError, setQuantityError] = useState<string>("");

  // ===========================================================================
  // 🔥 DETERMINA SE A PRÓXIMA ETAPA É DEPOIS DO CORTE
  // ===========================================================================
  const isNextStageAfterCorte = useMemo(() => {
    if (!nextStage) return false;

    if (nextStage.isAfterCorte !== undefined) {
      return nextStage.isAfterCorte;
    }

    const stageName = nextStage.name?.toLowerCase().trim() || "";

    // Se for etapa de modelagem, está antes do corte
    if (MODELAGEM_KEYWORDS.some((keyword) => stageName.includes(keyword))) {
      return false;
    }

    // Se for etapa de corte, está no corte (não depois)
    if (CORTE_KEYWORDS.some((keyword) => stageName.includes(keyword))) {
      return false;
    }

    // Se for etapa de distribuição, está depois do corte (mas não deve mostrar quantidade)
    if (DISTRIBUICAO_KEYWORDS.some((keyword) => stageName.includes(keyword))) {
      return true; // Está depois do corte, mas trataremos separadamente
    }

    // Qualquer outra etapa depois do corte
    return true;
  }, [nextStage]);

  // ===========================================================================
  // 🔥 DETERMINA SE A PRÓXIMA ETAPA É DISTRIBUIÇÃO
  // ===========================================================================
  const isNextStageDistribuicao = useMemo(() => {
    if (!nextStage) return false;

    const stageName = nextStage.name?.toLowerCase().trim() || "";
    return DISTRIBUICAO_KEYWORDS.some((keyword) => stageName.includes(keyword));
  }, [nextStage]);

  // No CompleteStageModal
  const shouldShowQuantity = useMemo(() => {
    if (!nextStage) return false;

    // 🔥 PALAVRAS-CHAVE PARA ETAPAS DEPOIS DA DISTRIBUIÇÃO
    const DEPOIS_DISTRIBUICAO_KEYWORDS = [
      "oficina",
      "revisão",
      "revisao",
      "acabamento",
      "dpa",
      "expedição",
      "expedicao",
    ];

    const stageName = nextStage.name.toLowerCase();

    // 🔥 Verifica se é uma etapa que vem DEPOIS da Distribuição
    const isDepoisDistribuicao = DEPOIS_DISTRIBUICAO_KEYWORDS.some((keyword) =>
      stageName.includes(keyword.toLowerCase()),
    );

    // 🔥 Verifica se é a própria DISTRIBUIÇÃO (deve mostrar)
    const DISTRIBUICAO_KEYWORDS = ["distribuição", "distribuicao"];

    const isDistribuicao = DISTRIBUICAO_KEYWORDS.some((keyword) =>
      stageName.includes(keyword.toLowerCase()),
    );

    console.log("📦 [shouldShowQuantity] Analisando:", {
      stageName: nextStage.name,
      isAfterCorte: nextStage.isAfterCorte,
      isDistribuicao,
      isDepoisDistribuicao,
      hasQuantity,
      // ✅ REGRA: Mostra se:
      // 1. Está após o corte
      // 2. É a própria Distribuição OU (está após o corte E não é depois da Distribuição)
      // 3. Não tem quantidade
      shouldShow:
        nextStage.isAfterCorte === true &&
        (isDistribuicao || !isDepoisDistribuicao) &&
        !hasQuantity,
    });

    // ✅ REGRA DE NEGÓCIO IMPLEMENTADA:
    // - Se é DISTRIBUIÇÃO → MOSTRA quantidade
    // - Se é depois da DISTRIBUIÇÃO (Oficina, Revisão, etc.) → NÃO MOSTRA
    // - Se está após o corte mas não é Distribuição nem depois → MOSTRA (caso genérico)

    if (!nextStage.isAfterCorte) return false; // Antes do corte nunca mostra

    if (isDistribuicao) return !hasQuantity; // Distribuição mostra se não tem quantidade

    if (isDepoisDistribuicao) return false; // Depois da distribuição nunca mostra

    return !hasQuantity; // Qualquer outra etapa após o corte mostra
  }, [nextStage, hasQuantity]);

  // Log adicional para debug
  useEffect(() => {
    if (nextStage) {
      console.log("📦 CompleteStageModal - nextStage:", {
        name: nextStage.name,
        isAfterCorteFromProps: nextStage.isAfterCorte,
        isAfterCorteCalculated: isNextStageAfterCorte,
        isDistribuicao: isNextStageDistribuicao,
        hasQuantity,
        shouldShowQuantity,
      });
    }
  }, [
    nextStage,
    isNextStageAfterCorte,
    isNextStageDistribuicao,
    hasQuantity,
    shouldShowQuantity,
  ]);

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
                Quantidade já definida: {currentQuantity} un
              </div>
            )}
          </div>

          {/* =========================================================================== */}
          {/* 🔥 CAMPO DE QUANTIDADE - SÓ APARECE NAS ETAPAS ENTRE CORTE E DISTRIBUIÇÃO */}
          {/* =========================================================================== */}
          {shouldShowQuantity && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Package size={16} className="text-slate-400" />
                Quantidade do Item
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={quantity === 0 ? "0" : quantity}
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
                * Quantidade obrigatória para itens que entram em etapas após o
                Corte
              </p>
            </div>
          )}

          {/* Mensagem explicativa para quando não mostra quantidade */}
          {!shouldShowQuantity && hasQuantity && (
            <div className="text-xs text-slate-500 bg-blue-50 p-2 rounded border border-blue-100">
              <Package size={12} className="inline mr-1 text-blue-500" />
              Quantidade já definida anteriormente: {currentQuantity} unidades
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
                (shouldShowQuantity && quantity === undefined) // 🔥 SÓ BLOQUEIA SE QUANTIDADE FOR undefined

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

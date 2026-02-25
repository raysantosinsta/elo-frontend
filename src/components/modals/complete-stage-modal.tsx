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
import { Loader2, User } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { toast } from "sonner";

interface CompleteStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (responsibleId: string) => Promise<void>;
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
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Reset estado quando o modal abre
  useEffect(() => {
    if (isOpen && nextStage) {
      setSelectedUserId("");
      fetchUsersByRole();
    }
  }, [isOpen, nextStage]);

  const fetchUsersByRole = async () => {
    // Se não tem cargo específico ou é "all", busca todos os usuários ativos da empresa
    if (!nextStage?.allowedRole || 
        nextStage.allowedRole === "all" || 
        nextStage.allowedRole === "null" ||
        nextStage.allowedRole.trim() === "") {
      
      setLoadingUsers(true);
      try {
        // Usa o endpoint company para buscar todos da empresa atual
        const response = await api.get("/users/company");
        // Filtra apenas ativos (já vem do backend, mas garantimos)
        setAvailableUsers(response.data.filter((u: any) => u.status === "ACTIVE"));
      } catch (error) {
        toast.error("Erro ao carregar usuários");
        console.error(error);
      } finally {
        setLoadingUsers(false);
      }
      return;
    }

    // Tem cargo específico - usa o novo endpoint by-role
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

  const handleConfirm = async () => {
    if (!selectedUserId) {
      toast.error("Selecione um responsável para a próxima etapa");
      return;
    }

    setConfirming(true);
    try {
      await onConfirm(selectedUserId);
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
            <User size={18} className="text-orange-500" />
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

          {/* Seletor de responsável */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
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
                Nenhum usuário encontrado com o cargo {nextStage.allowedRole}
              </p>
            )}
          </div>

          {/* Aviso se não houver usuários */}
          {availableUsers.length === 0 && !loadingUsers && (
            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
              Não há usuários disponíveis para esta etapa. 
              {nextStage.allowedRole && nextStage.allowedRole !== "all" && (
                <span> Verifique se existem usuários cadastrados com o cargo <strong>{nextStage.allowedRole}</strong>.</span>
              )}
            </p>
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
            disabled={!selectedUserId || loadingUsers || confirming || isLoading}
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
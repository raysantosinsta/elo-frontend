/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Schema de Validação ---
const materialSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  type: z.string().min(1, "Tipo é obrigatório"),
  description: z.string().optional(),
  color: z.string().optional(),
  unitOfMeasure: z.string().min(1, "Unidade é obrigatória"),
  yieldPerKg: z.coerce.number().min(0.1, "Rendimento deve ser maior que 0"),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MaterialFormData) => Promise<void>;
  initialData?: any; // Dados para edição
  isLoading?: boolean;
}

export function MaterialFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: MaterialFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      color: "",
      unitOfMeasure: "",
      yieldPerKg: 0,
    },
  });

  // Popula o formulário quando abre para edição
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          type: initialData.type,
          description: initialData.description || "",
          color: initialData.color || "",
          unitOfMeasure: initialData.unitOfMeasure,
          yieldPerKg: initialData.yieldPerKg,
        });
      } else {
        reset({
          name: "",
          type: "",
          description: "",
          color: "",
          unitOfMeasure: "",
          yieldPerKg: 0,
        });
      }
    }
  }, [isOpen, initialData, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Material" : "Novo Material"}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do material abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-1">
            <Label>Nome do Material</Label>
            <Input
              {...register("name")}
              placeholder="Ex: Tecido Algodão Premium"
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tipo */}
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Input {...register("type")} placeholder="Ex: Tecido" />
              {errors.type && <span className="text-xs text-red-500">{errors.type.message}</span>}
            </div>

            {/* Unidade (Select Customizado do Shadcn precisa de tratamento manual no React Hook Form) */}
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Select 
                onValueChange={(val) => setValue("unitOfMeasure", val)} 
                defaultValue={initialData?.unitOfMeasure}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KG">Quilograma (KG)</SelectItem>
                  <SelectItem value="MT">Metro (MT)</SelectItem>
                  <SelectItem value="UN">Unidade (UN)</SelectItem>
                </SelectContent>
              </Select>
              {/* Fallback hidden input para registro simples se o Select acima der trabalho, 
                  mas idealmente use Controller ou setValue como feito acima */}
              <input type="hidden" {...register("unitOfMeasure")} />
              {errors.unitOfMeasure && <span className="text-xs text-red-500">{errors.unitOfMeasure.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Cor */}
            <div className="space-y-1">
              <Label>Cor</Label>
              <Input {...register("color")} placeholder="Ex: Azul Marinho" />
            </div>

            {/* Rendimento */}
            <div className="space-y-1">
              <Label>Rendimento (p/ Kg)</Label>
              <Input
                type="number"
                step="0.01"
                {...register("yieldPerKg")}
              />
              {errors.yieldPerKg && <span className="text-xs text-red-500">{errors.yieldPerKg.message}</span>}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea
              {...register("description")}
              placeholder="Detalhes adicionais..."
              className="resize-none h-20"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#D35400] hover:bg-[#A04000]">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Salvar Alterações" : "Criar Material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
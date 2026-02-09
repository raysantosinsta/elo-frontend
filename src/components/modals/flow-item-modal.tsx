/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Edit,
  Plus,
  Loader2,
  CheckCircle2,
  ImageIcon,
  Video,
  Music,
  Mic,
  Square,
  Maximize2,
  Trash2,
  UploadCloud,
  User,
  Factory,
  X,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Interfaces
interface FlowMedia {
  id: string;
  url: string;
  filename: string;
}

export interface FlowItem {
  id: string;
  title: string;
  description?: string;
  orderNumber: string;
  productRef: string;
  quantity: number;
  priority: number;
  status: string;
  
  // 🔥 Campos cruciais para compatibilidade
  stageId?: string;
  flowId: string; // Adicionado para resolver o erro TS2322
  flowColor?: string; // Opcional, vindo do Kanban
  flowName?: string;  // Opcional, vindo do Kanban
  
  supplierId?: string;
  assignedTo?: { id: string; name: string };
  
  dueDate?: string;
  productionStartedAt?: string;
  deliveryAt?: string;
  
  images: FlowMedia[];
  audios: FlowMedia[];
  videos: FlowMedia[];
}

interface FlowItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: FlowItem | null;
  initialStageId?: string;
  onSubmit: (
    values: any,
    files: { images: File[]; audios: File[]; videos: File[] },
    removedMedia: { images: string[]; audios: string[]; videos: string[] },
  ) => Promise<void>;
  isLoading: boolean;
  users: { id: string; name: string }[];
  suppliers: { id: string; name: string; category?: string }[];
  stages: { id: string; name: string; order: number }[];
  // 🔥 NOVAS PROPS NECESSÁRIAS 🔥
  onDelete?: (id: string) => void;
  onAdvance?: (item: FlowItem) => Promise<void>;
}

const itemSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  orderNumber: z.string().optional(),
  productRef: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantidade mínima é 1").default(1),
  priority: z.coerce.number().min(1).max(5).default(3),
  status: z.string().default("PENDENTE"),
  stageId: z.string().optional(),
  assignedToId: z.string().optional(),
  supplierId: z.string().optional(),
  dueDate: z.string().optional(),
  productionStartedAt: z.string().optional(),
  deliveryAt: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export function FlowItemModal({
  isOpen,
  onClose,
  initialData,
  initialStageId,
  onSubmit,
  isLoading,
  users,
  suppliers,
  stages,
  // 🔥 Recebendo as novas funções aqui
  onDelete,
  onAdvance,
}: FlowItemModalProps) {
  const isEditing = !!initialData;

  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [audios, setAudios] = useState<File[]>([]);

  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [removedVideoIds, setRemovedVideoIds] = useState<string[]>([]);
  const [removedAudioIds, setRemovedAudioIds] = useState<string[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const form = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: "",
      description: "",
      orderNumber: "",
      productRef: "",
      quantity: 1,
      priority: 3,
      status: "PENDENTE",
      stageId: "",
      assignedToId: "",
      supplierId: "",
      dueDate: "",
      productionStartedAt: "",
      deliveryAt: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      setImages([]);
      setVideos([]);
      setAudios([]);

      setRemovedImageIds([]);
      setRemovedVideoIds([]);
      setRemovedAudioIds([]);
      setIsRecording(false);

      if (initialData) {
        form.reset({
          title: initialData.title,
          description: initialData.description || "",
          orderNumber: initialData.orderNumber || "",
          productRef: initialData.productRef || "",
          quantity: initialData.quantity,
          priority: initialData.priority,
          status: initialData.status,
          stageId: initialData.stageId || "",
          assignedToId: initialData.assignedTo?.id || "unassigned",
          supplierId: initialData.supplierId || "internal",
          dueDate: initialData.dueDate
            ? initialData.dueDate.substring(0, 10)
            : "",
          productionStartedAt: initialData.productionStartedAt
            ? initialData.productionStartedAt.substring(0, 10)
            : "",
          deliveryAt: initialData.deliveryAt
            ? initialData.deliveryAt.substring(0, 10)
            : "",
        });
      } else {
        form.reset({
          title: "",
          description: "",
          orderNumber: "",
          productRef: "",
          quantity: 1,
          priority: 3,
          status: "PENDENTE",
          stageId: initialStageId || (stages.length > 0 ? stages[0].id : ""),
          assignedToId: "unassigned",
          supplierId: "internal",
          dueDate: "",
          productionStartedAt: "",
          deliveryAt: "",
        });
      }
    }
  }, [isOpen, initialData, stages, form, initialStageId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `gravacao-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setAudios((prev) => [...prev, file]);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao acessar microfone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleRemoveNewFile = (
    index: number,
    type: "image" | "video" | "audio",
  ) => {
    if (type === "image")
      setImages((prev) => prev.filter((_, i) => i !== index));
    if (type === "video")
      setVideos((prev) => prev.filter((_, i) => i !== index));
    if (type === "audio")
      setAudios((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (values: ItemFormValues) => {
    const payload = {
      ...values,
      supplierId:
        values.supplierId === "internal" || !values.supplierId
          ? null
          : values.supplierId,
      assignedToId:
        values.assignedToId === "unassigned" || !values.assignedToId
          ? null
          : values.assignedToId,
      dueDate: values.dueDate || null,
      productionStartedAt: values.productionStartedAt || null,
      deliveryAt: values.deliveryAt || null,
    };

    await onSubmit(
      payload,
      { images, audios, videos },
      {
        images: removedImageIds,
        audios: removedAudioIds,
        videos: removedVideoIds,
      },
    );
  };

  // Helper para truncar nome do arquivo no meio (ex: video_apres...final.mp4)
  const truncateFileName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    const extIndex = name.lastIndexOf(".");
    const ext = extIndex !== -1 ? name.substring(extIndex) : "";
    const nameWithoutExt = extIndex !== -1 ? name.substring(0, extIndex) : name;

    const keepChars = Math.floor((maxLength - ext.length - 3) / 2);
    return `${nameWithoutExt.substring(0, keepChars)}...${nameWithoutExt.substring(nameWithoutExt.length - keepChars)}${ext}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[95vh] md:h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded text-orange-600">
              {isEditing ? <Edit size={20} /> : <Plus size={20} />}
            </div>
            <DialogTitle className="text-xl text-[#2D3436]">
              {isEditing ? "Editar Item de Produção" : "Novo Item de Produção"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 py-6">
              <Form {...form}>
                <form
                  id="flow-item-form"
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
                >
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1">
                      <TabsTrigger value="details">
                        Detalhes & Datas
                      </TabsTrigger>
                      <TabsTrigger value="media">Mídias & Anexos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4">
                      {/* Campos de Detalhes (Mantidos iguais) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Título do Produto *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: Camisa Linho M"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="productRef"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Referência</FormLabel>
                              <FormControl>
                                <Input placeholder="REF-001" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="orderNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nº Pedido</FormLabel>
                              <FormControl>
                                <Input placeholder="PED-123" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Descrição / Observações</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Detalhes técnicos..."
                                  className="resize-none h-20"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantidade</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  value={field.value?.toString() ?? ""}
                                  onChange={(e) =>
                                    field.onChange(e.target.value)
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prioridade</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1">
                                    Alta (Urgente)
                                  </SelectItem>
                                  <SelectItem value="2">Média</SelectItem>
                                  <SelectItem value="3">Baixa</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        {/* <FormField control={form.control} name="stageId" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Etapa Atual</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} /> */}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dashed">
                        <FormField
                          control={form.control}
                          name="assignedToId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <User size={14} /> Responsável Interno
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unassigned">
                                    Nenhum
                                  </SelectItem>
                                  {users.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="supplierId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Factory size={14} /> Oficina / Terceirizado
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Produção Interna" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="internal">
                                    Produção Interna
                                  </SelectItem>
                                  {suppliers.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dashed">
                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase">
                                Prazo
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="productionStartedAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase">
                                Início
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="deliveryAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase">
                                Entrega
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="media" className="space-y-6">
                      {/* 1. MÍDIAS JÁ SALVAS */}
                      {isEditing &&
                      (initialData?.images?.length ||
                        initialData?.videos?.length ||
                        initialData?.audios?.length) ? (
                        <div className="space-y-4 p-4 bg-slate-50 border rounded-lg">
                          <Label className="text-xs text-slate-500 font-bold uppercase flex items-center gap-2">
                            <CheckCircle2 size={12} /> Mídias Salvas
                          </Label>

                          {/* Imagens */}
                          {initialData.images?.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                              {initialData.images.map(
                                (img) =>
                                  !removedImageIds.includes(img.id) && (
                                    <div
                                      key={img.id}
                                      className="relative aspect-square border rounded overflow-hidden group bg-white shadow-sm"
                                    >
                                      <img
                                        src={img.url}
                                        className="w-full h-full object-cover"
                                        alt="saved"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            window.open(img.url, "_blank")
                                          }
                                          className="text-white hover:scale-110"
                                        >
                                          <Maximize2 size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setRemovedImageIds((p) => [
                                              ...p,
                                              img.id,
                                            ])
                                          }
                                          className="text-red-400 hover:text-red-500 hover:scale-110"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ),
                              )}
                            </div>
                          )}

                          {/* Vídeos */}
                          {initialData.videos?.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {initialData.videos.map(
                                (video) =>
                                  !removedVideoIds.includes(video.id) && (
                                    <div
                                      key={video.id}
                                      className="relative rounded-lg overflow-hidden border bg-slate-100 aspect-video group shadow-sm flex flex-col"
                                    >
                                      <div className="relative flex-1 bg-black overflow-hidden">
                                        <video className="w-full h-full object-cover opacity-80">
                                          <source
                                            src={video.url}
                                            type="video/mp4"
                                          />
                                        </video>
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                          <PlayCircle
                                            size={32}
                                            className="text-white/70"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between p-2 bg-white h-8">
                                        <span
                                          className="text-[10px] text-slate-600 truncate max-w-[120px]"
                                          title={video.filename}
                                        >
                                          {truncateFileName(video.filename, 20)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setRemovedVideoIds((p) => [
                                              ...p,
                                              video.id,
                                            ])
                                          }
                                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ),
                              )}
                            </div>
                          )}

                          {/* Áudios */}
                          {initialData.audios?.length > 0 && (
                            <div className="space-y-2">
                              {initialData.audios.map(
                                (aud) =>
                                  !removedAudioIds.includes(aud.id) && (
                                    <div
                                      key={aud.id}
                                      className="flex items-center gap-2 bg-white p-2 rounded border shadow-sm"
                                    >
                                      <Music
                                        size={14}
                                        className="text-orange-500"
                                      />
                                      <audio
                                        src={aud.url}
                                        controls
                                        className="h-7 flex-1 w-full min-w-0"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setRemovedAudioIds((p) => [
                                            ...p,
                                            aud.id,
                                          ])
                                        }
                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  ),
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}

                      <Separator />

                      {/* 2. ÁREA DE UPLOAD */}
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <UploadCloud size={16} /> Adicionar Novas Mídias
                      </Label>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-blue-50 cursor-pointer relative h-32 transition-colors">
                          <Input
                            type="file"
                            multiple
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) =>
                              e.target.files &&
                              setImages((p) => [
                                ...p,
                                ...Array.from(e.target.files!),
                              ])
                            }
                          />
                          <ImageIcon className="text-blue-400 mb-2" size={24} />
                          <span className="text-xs text-blue-700 font-bold">
                            Imagens
                          </span>
                          <span className="text-[10px] text-blue-400 mt-1">
                            + Adicionar
                          </span>
                        </div>

                        <div className="border-2 border-dashed border-purple-200 bg-purple-50/30 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-purple-50 cursor-pointer relative h-32 transition-colors">
                          <Input
                            type="file"
                            multiple
                            accept="video/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) =>
                              e.target.files &&
                              setVideos((p) => [
                                ...p,
                                ...Array.from(e.target.files!),
                              ])
                            }
                          />
                          <Video className="text-purple-400 mb-2" size={24} />
                          <span className="text-xs text-purple-700 font-bold">
                            Vídeos
                          </span>
                          <span className="text-[10px] text-purple-400 mt-1">
                            + Adicionar
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 h-32">
                          <div className="border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 cursor-pointer relative flex-1">
                            <Input
                              type="file"
                              multiple
                              accept="audio/*"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) =>
                                e.target.files &&
                                setAudios((p) => [
                                  ...p,
                                  ...Array.from(e.target.files!),
                                ])
                              }
                            />
                            <Music className="text-gray-400 mb-1" size={20} />
                            <span className="text-[10px] text-gray-600 font-medium">
                              Upload Áudio
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={isRecording ? "destructive" : "outline"}
                            onClick={
                              isRecording ? stopRecording : startRecording
                            }
                            className="w-full text-xs h-8"
                          >
                            {isRecording ? (
                              <Square
                                size={12}
                                className="mr-2 animate-pulse"
                              />
                            ) : (
                              <Mic size={12} className="mr-2" />
                            )}
                            {isRecording ? "Parar" : "Gravar Voz"}
                          </Button>
                        </div>
                      </div>

                      {/* 3. PREVIEW DOS NOVOS ARQUIVOS */}
                      {(images.length > 0 ||
                        videos.length > 0 ||
                        audios.length > 0) && (
                        <div className="space-y-2 pt-2 border-t">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">
                            Arquivos para Upload (Novos)
                          </Label>

                          {/* Imagens */}
                          {images.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-2">
                              {images.map((img, i) => (
                                <div
                                  key={i}
                                  className="relative aspect-square rounded overflow-hidden group border bg-white shadow-sm"
                                >
                                  <img
                                    src={URL.createObjectURL(img)}
                                    className="w-full h-full object-cover"
                                    alt="preview"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveNewFile(i, "image")
                                    }
                                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-700"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Vídeos */}
                          {videos.map((v, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 bg-purple-50 p-2 rounded border border-purple-100"
                            >
                              <PlayCircle
                                size={14}
                                className="text-purple-500"
                              />
                              {/* 🔥 AQUI APLICA O SLICE/TRUNCATE NO NOME DO VÍDEO NOVO 🔥 */}
                              <span
                                className="text-[10px] flex-1 truncate"
                                title={v.name}
                              >
                                {truncateFileName(v.name, 25)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveNewFile(i, "video")}
                                className="text-red-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}

                          {/* Áudios */}
                          {audios.map((a, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-100"
                            >
                              <Music
                                size={14}
                                className="text-blue-500 shrink-0"
                              />
                              <audio
                                src={URL.createObjectURL(a)}
                                controls
                                className="h-8 flex-1 w-full min-w-0"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveNewFile(i, "audio")}
                                className="text-red-500 hover:bg-red-100 p-1.5 rounded transition-colors shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 shrink-0 flex items-center justify-between sm:justify-between">
          {/* ESQUERDA: Botão de Excluir (Só aparece na edição) */}
          <div>
            {isEditing && onDelete && initialData && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => onDelete(initialData.id)}
                disabled={isLoading}
              >
                <Trash2 size={16} className="mr-2" /> Excluir
              </Button>
            )}
          </div>

          {/* DIREITA: Cancelar, Salvar e Automação */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>

            {/* Botão de Salvar (Submit do Formulário) */}
            <Button
              form="flow-item-form"
              type="submit"
              className="bg-slate-800 hover:bg-slate-900 text-white" // Mudei para escuro para destacar o verde
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar Edição"
              )}
            </Button>

            {/* 🔥 BOTÃO DE AUTOMAÇÃO (Apenas na edição) 🔥 */}
            {isEditing && onAdvance && initialData && (
              <Button
                type="button" // IMPORTANTE: type="button" para não submeter o form
                onClick={() => onAdvance(initialData)}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all border-emerald-600"
              >
                <CheckCircle2 size={18} className="mr-2" />
                Concluir Etapa
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

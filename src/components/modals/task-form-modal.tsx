/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Edit,
  ImageIcon,
  Loader2,
  MapPin,
  Mic,
  Music,
  PlayCircle,
  Plus,
  Search,
  Square,
  Trash2,
  Video,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// --- Interfaces ---
interface TaskAddress {
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
  latitude?: number;
  longitude?: number;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  finalComment?: string;
  scheduledDate?: string;
  dueDate?: string;
  priority: number;
  status: string;
  columnId?: string | null;
  userAssigned?: { id: string; name: string };
  taskAddress?: TaskAddress | null;
  taskImages: any[];
  taskAudios: any[];
  taskVideos: any[];
}

export interface Supplier {
  id: string;
  name: string;
  zipCode?: string;
  address?: string;
  city?: string;
  state?: string;
  complement?: string;
  numero?: string;
  bairro?: string;
  latitude?: number;
  longitude?: number;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: TaskData | null;
  initialColumnId?: string;

  onSubmit: (
    values: any,
    files: { images: File[]; audios: File[]; videos: File[] },
    removedMedia: { images: string[]; audios: string[]; videos: string[] }
  ) => Promise<void>;
  isLoading: boolean;
  users: { id: string; name: string }[];
  columns: { id: string; title: string }[];
  suppliers?: Supplier[];
}

const taskSchema = z.object({
  id: z.string().optional(), // <--- ADICIONE ESTA LINHA
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  priority: z.string().min(1),
  columnId: z.string().min(1, "Seleção de coluna obrigatória"),
  status: z.string().min(1),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
  scheduledAt: z.string().optional(),
  finalComment: z.string().optional(),
  // Campos do formulário (Inglês)
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  complement: z.string().optional(),
  latitude: z.any().optional(),
  longitude: z.any().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export function TaskFormModal({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isLoading,
  users,
  columns,
  suppliers = [],
  initialColumnId,
}: TaskFormModalProps) {
  const isEditing = !!initialData;
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isProcessingLocation, setIsProcessingLocation] = useState(false);

  // Estados de Mídia
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [audios, setAudios] = useState<File[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [removedVideoIds, setRemovedVideoIds] = useState<string[]>([]);
  const [removedAudioIds, setRemovedAudioIds] = useState<string[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "", description: "", priority: "1", columnId: "", assignedToId: "unassigned",
      status: "PENDING", dueDate: "", scheduledAt: "", finalComment: "",
      cep: "", street: "", number: "", neighborhood: "", city: "", state: "", complement: "", latitude: "", longitude: ""
    },
  });

  // --- POPULA O FORMULÁRIO QUANDO ABRE ---
  useEffect(() => {
    if (isOpen) {
      setImages([]); setVideos([]); setAudios([]);
      setRemovedImageIds([]); setRemovedVideoIds([]); setRemovedAudioIds([]);
      setIsRecording(false);
      setIsProcessingLocation(false);

      if (initialData) {
        form.reset({
          id: initialData.id, // <--- ADICIONE ESTA LINHA PARA SALVAR O ID NO FORM
          title: initialData.title,
          description: initialData.description || "",
          priority: initialData.priority.toString(),
          columnId: initialData.columnId || "",
          assignedToId: initialData.userAssigned?.id || "unassigned",
          status: initialData.status,
          dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().slice(0, 16) : "",
          scheduledAt: initialData.scheduledDate ? new Date(initialData.scheduledDate).toISOString().slice(0, 16) : "",
          finalComment: initialData.finalComment || "",

          // Mapeamento correto dos dados do Banco (PT) para o Form (EN)
          cep: initialData.taskAddress?.cep || "",
          street: initialData.taskAddress?.endereco || "",
          number: initialData.taskAddress?.numero || "",
          neighborhood: initialData.taskAddress?.bairro || "",
          city: initialData.taskAddress?.cidade || "",
          state: initialData.taskAddress?.estado || "",
          complement: initialData.taskAddress?.complemento || "",
          latitude: initialData.taskAddress?.latitude?.toString() || "",
          longitude: initialData.taskAddress?.longitude?.toString() || "",
        });
      } else {
        const defaultCol = initialColumnId || (columns.length > 0 ? columns[0].id : "");
        form.reset({
          id: undefined, // <--- GARANTA QUE LIMPA O ID NO MODO CRIAÇÃO
          title: "", description: "", priority: "1",
          columnId: defaultCol,
          assignedToId: "unassigned",
          status: "PENDING",
          dueDate: "", scheduledAt: "", finalComment: "",
          cep: "", street: "", number: "", neighborhood: "", city: "", state: "", complement: "", latitude: "", longitude: ""
        });
      }
    }
  }, [isOpen, initialData, form, columns, initialColumnId]);

  const handleCepSearch = async () => {
    const cep = form.getValues("cep")?.replace(/\D/g, "");
    if (!cep || cep.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        form.setValue("street", data.logradouro);
        form.setValue("neighborhood", data.bairro);
        form.setValue("city", data.localidade);
        form.setValue("state", data.uf);
        document.getElementById("address-number")?.focus();
        toast.success("Endereço encontrado!");
      }
    } catch {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    form.setValue("cep", supplier.zipCode || "");
    form.setValue("street", supplier.address || "");
    form.setValue("number", supplier.numero || "");
    form.setValue("neighborhood", supplier.bairro || "");
    form.setValue("city", supplier.city || "");
    form.setValue("state", supplier.state || "");
    form.setValue("complement", supplier.complement || "");
    if (supplier.latitude && supplier.longitude) {
      form.setValue("latitude", supplier.latitude.toString());
      form.setValue("longitude", supplier.longitude.toString());
    }
    toast.success("Dados do fornecedor carregados.");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `gravacao-${Date.now()}.webm`, { type: "audio/webm" });
        setAudios((prev) => [...prev, file]);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Erro ao acessar microfone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleRemoveNewFile = (index: number, type: 'image' | 'video' | 'audio') => {
    if (type === 'image') setImages(prev => prev.filter((_, i) => i !== index));
    if (type === 'video') setVideos(prev => prev.filter((_, i) => i !== index));
    if (type === 'audio') setAudios(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (values: TaskFormValues) => {
    setIsProcessingLocation(true);
    let finalLat = values.latitude ? parseFloat(values.latitude.toString()) : null;
    let finalLon = values.longitude ? parseFloat(values.longitude.toString()) : null;

    if ((values.street && values.city) && (!finalLat || !finalLon)) {
      try {
        const query = `${values.street}, ${values.number ? values.number + "," : ""} ${values.city}, ${values.state}, Brasil`;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
          headers: { "User-Agent": "TaskKanbanApp/1.0" }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          finalLat = parseFloat(data[0].lat);
          finalLon = parseFloat(data[0].lon);
        }
      } catch (error) {
        console.warn("Falha na geolocalização:", error);
      }
    }

    const { cep, street, number, neighborhood, city, state, complement, id, ...taskFields } = values;
    const hasAddress = street || city || (finalLat && finalLon);

    const taskAddressData = hasAddress ? {
      cep,
      endereco: street,
      numero: number,
      bairro: neighborhood,
      cidade: city,
      estado: state,
      complemento: complement,
      latitude: finalLat,
      longitude: finalLon,
    } : null;

    // --- CORREÇÃO PRINCIPAL: ENVIA O ID SE EXISTIR ---
    const payload = {
      id: id || initialData?.id, // Usa o do form, com fallback para o inicial
      ...taskFields,
      assignedToId: values.assignedToId === "unassigned" ? null : values.assignedToId,
      priority: parseInt(values.priority) || 1,
      address: taskAddressData
    };

    await onSubmit(
      payload,
      { images, audios, videos },
      { images: removedImageIds, audios: removedAudioIds, videos: removedVideoIds }
    );
    setIsProcessingLocation(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded text-indigo-600">
              {isEditing ? <Edit size={20} /> : <Plus size={20} />}
            </div>
            <DialogTitle className="text-xl text-[#2D3436]">
              {isEditing ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100 p-1">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="address">Localização</TabsTrigger>
                  <TabsTrigger value="media">Mídias</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-5">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Título *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea className="resize-none h-20" {...field} /></FormControl></FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem><FormLabel>Prioridade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="1">Alta</SelectItem><SelectItem value="2">Média</SelectItem><SelectItem value="3">Baixa</SelectItem></SelectContent></Select></FormItem>
                    )} />
                    
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                      <FormItem><FormLabel>Próximo a atrasar</FormLabel><FormControl><Input type="date"
                        {...field}
                        value={field.value ? field.value.slice(0, 10) : ""} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="dueDate" render={({ field }) => (
                      <FormItem><FormLabel>Prazo Final</FormLabel><FormControl><Input type="date"
                        {...field}
                        value={field.value ? field.value.slice(0, 10) : ""} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="assignedToId" render={({ field }) => (
                    <FormItem><FormLabel>Responsável</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="unassigned">Nenhum</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="address" className="space-y-5">
                  <div className="p-4 bg-slate-50 border rounded-lg space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Search size={12} /> Preenchimento Rápido</Label>
                    <Select onValueChange={handleSupplierSelect}>
                      <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Selecione um fornecedor..." /></SelectTrigger></FormControl>
                      <SelectContent>{suppliers.map((sup) => (<SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-4">
                    <FormField control={form.control} name="cep" render={({ field }) => (
                      <FormItem><FormLabel>CEP</FormLabel><Input maxLength={9} {...field} onBlur={handleCepSearch} /></FormItem>
                    )} />
                    <FormField control={form.control} name="street" render={({ field }) => (
                      <FormItem><FormLabel>Rua</FormLabel><Input {...field} /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-[100px_1fr] gap-4">
                    <FormField control={form.control} name="number" render={({ field }) => (<FormItem><FormLabel>Nº</FormLabel><Input id="address-number" {...field} /></FormItem>)} />
                    <FormField control={form.control} name="neighborhood" render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><Input {...field} /></FormItem>)} />
                  </div>
                  <FormField control={form.control} name="complement" render={({ field }) => (
                    <FormItem><FormLabel>Complemento</FormLabel><Input {...field} placeholder="Ex: Apto 101" /></FormItem>
                  )} />
                  <div className="grid grid-cols-[1fr_80px] gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><Input {...field} /></FormItem>)} />
                    <FormField control={form.control} name="state" render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><Input maxLength={2} {...field} /></FormItem>)} />
                  </div>
                </TabsContent>

                <TabsContent value="media" className="space-y-6">
                  {isEditing && (initialData?.taskImages.length || initialData?.taskVideos.length || initialData?.taskAudios.length) ? (
                    <div className="space-y-6 p-4 bg-slate-50 border rounded-lg">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Mídias Atuais</Label>
                      {initialData.taskImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {initialData.taskImages.map(img => !removedImageIds.includes(img.id) && (
                            <div key={img.id} className="relative aspect-square rounded overflow-hidden group border bg-white shadow-sm">
                              <img src={img.url} className="w-full h-full object-cover" alt="Task img" />
                              <button type="button" onClick={() => setRemovedImageIds(p => [...p, img.id])} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      {initialData.taskVideos.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {initialData.taskVideos.map(video => !removedVideoIds.includes(video.id) && (
                            <div key={video.id} className="relative rounded-lg overflow-hidden border bg-black aspect-video group shadow-sm">
                              <video className="w-full h-full object-cover opacity-80">
                                <source src={video.url} type="video/mp4" />
                              </video>
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:scale-110 transition-transform">
                                <PlayCircle size={32} className="text-white/70" />
                              </div>
                              <button type="button" onClick={() => setRemovedVideoIds(p => [...p, video.id])} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {initialData.taskAudios.length > 0 && (
                        <div className="space-y-2">
                          {initialData.taskAudios.map(aud => !removedAudioIds.includes(aud.id) && (
                            <div key={aud.id} className="flex items-center gap-2 bg-white p-2 rounded border shadow-sm">
                              <Music size={14} className="text-orange-500" />
                              <audio src={aud.url} controls className="h-7 flex-1" />
                              <button type="button" onClick={() => setRemovedAudioIds(p => [...p, aud.id])} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-blue-50 cursor-pointer relative transition-colors">
                      <Input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                        if (e.target.files) setImages(prev => [...prev, ...Array.from(e.target.files!)]);
                      }} />
                      <ImageIcon className="text-blue-400 mb-2" size={24} />
                      <span className="text-xs text-blue-700 font-bold">Nova Imagem</span>
                      {images.length > 0 && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full mt-1">+{images.length}</span>}
                    </div>

                    <div className="border-2 border-dashed border-purple-200 bg-purple-50/30 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-purple-50 cursor-pointer relative transition-colors">
                      <Input type="file" multiple accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                        if (e.target.files) setVideos(prev => [...prev, ...Array.from(e.target.files!)]);
                      }} />
                      <Video className="text-purple-400 mb-2" size={24} />
                      <span className="text-xs text-purple-700 font-bold">Novo Vídeo</span>
                      {videos.length > 0 && <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full mt-1">+{videos.length}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-2 flex flex-col items-center justify-center hover:bg-gray-50 cursor-pointer relative flex-1">
                        <Input type="file" multiple accept="audio/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                          if (e.target.files) setAudios(prev => [...prev, ...Array.from(e.target.files!)]);
                        }} />
                        <Music className="text-gray-400 mb-1" size={20} />
                        <span className="text-[10px] text-gray-600 font-medium">Upload Áudio</span>
                        {audios.length > 0 && <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full mt-1">+{audios.length}</span>}

                      </div>
                      <Button type="button" size="sm" variant={isRecording ? "destructive" : "outline"} onClick={isRecording ? stopRecording : startRecording} className="w-full text-xs h-8">
                        {isRecording ? <Square size={12} className="mr-2 animate-pulse" /> : <Mic size={12} className="mr-2" />}
                        {isRecording ? "Gravando..." : "Gravar"}
                      </Button>
                    </div>
                  </div>

                  {(images.length > 0 || videos.length > 0 || audios.length > 0) && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Arquivos para Upload</Label>
                      {images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {images.map((img, i) => (
                            <div key={i} className="relative aspect-square rounded overflow-hidden group border bg-white shadow-sm">
                              {/* Preview da Imagem Local */}
                              <img
                                src={URL.createObjectURL(img)}
                                className="w-full h-full object-cover"
                                alt={`Nova imagem ${i}`}
                              />

                              {/* Botão de Excluir */}
                              <button
                                type="button"
                                onClick={() => handleRemoveNewFile(i, 'image')}
                                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-700"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {videos.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 bg-purple-50 p-2 rounded border border-purple-100">
                          <PlayCircle size={14} className="text-purple-500" />
                          <span className="text-[10px] flex-1 truncate">{v.name}</span>
                          <button type="button" onClick={() => handleRemoveNewFile(i, 'video')} className="text-red-500"><X size={14} /></button>
                        </div>
                      ))}
                      {audios.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-100">
                          <Music size={14} className="text-blue-500 shrink-0" />

                          {/* --- CORREÇÃO AQUI: Adicionado player de áudio com URL temporária --- */}
                          <audio
                            src={URL.createObjectURL(a)}
                            controls
                            className="h-8 flex-1 w-full min-w-0" // w-full e min-w-0 ajudam no layout flex
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveNewFile(i, 'audio')}
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

              <DialogFooter className="px-6 py-4 border-t bg-slate-50 shrink-0">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isProcessingLocation}>Cancelar</Button>
                <Button onClick={() => form.handleSubmit(handleSubmit)()} disabled={isLoading || isProcessingLocation} className="bg-[#D35400] hover:bg-[#A04000] text-white min-w-[140px]">
                  {(isLoading || isProcessingLocation) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {isEditing ? "Salvar Alterações" : "Criar Tarefa"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
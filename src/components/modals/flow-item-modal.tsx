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
    PlayCircle,
    X,
    Trash2,
    UploadCloud,
    Maximize2,
    User,
    Factory,
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
    stageId?: string;
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
    onSubmit: (
        values: any,
        files: { images: File[]; audios: File[]; videos: File[] },
        removedMedia: { images: string[]; audios: string[]; videos: string[] }
    ) => Promise<void>;
    isLoading: boolean;
    users: { id: string; name: string }[];
    suppliers: { id: string; name: string; category?: string }[];
    stages: { id: string; name: string; order: number }[];
}

// Schema com coerce para lidar com inputs HTML que retornam string
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
    onSubmit,
    isLoading,
    users,
    suppliers,
    stages,
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

    // 🔥 CORREÇÃO AQUI: Dependências ajustadas para evitar loop de renderização
    useEffect(() => {
        if (!isOpen) return;

        // Reset de mídias locais
        setImages([]);
        setVideos([]);
        setAudios([]);
        setRemovedImageIds([]);
        setRemovedVideoIds([]);
        setRemovedAudioIds([]);
        setIsRecording(false);

        if (initialData) {
            // Modo edição
            form.reset({
                title: initialData.title,
                description: initialData.description || "",
                orderNumber: initialData.orderNumber || "",
                productRef: initialData.productRef || "",
                quantity: initialData.quantity,
                priority: initialData.priority,
                status: initialData.status,
                stageId: initialData.stageId || "",
                assignedToId: initialData.assignedTo?.id || "",
                supplierId: initialData.supplierId || "",
                dueDate: initialData.dueDate
                    ? new Date(initialData.dueDate).toISOString().split("T")[0]
                    : "",
                productionStartedAt: initialData.productionStartedAt
                    ? new Date(initialData.productionStartedAt).toISOString().split("T")[0]
                    : "",
                deliveryAt: initialData.deliveryAt
                    ? new Date(initialData.deliveryAt).toISOString().split("T")[0]
                    : "",
            });
        } else {
            // Modo criação
            form.reset({
                title: "",
                description: "",
                orderNumber: "",
                productRef: "",
                quantity: 1,
                priority: 3,
                status: "PENDENTE",
                stageId: stages.length > 0 ? stages[0].id : "",
                assignedToId: "",
                supplierId: "",
                dueDate: "",
                productionStartedAt: "",
                deliveryAt: "",
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData]); // Removido 'stages' e 'form' para evitar loops

    // ── Gravador de áudio ────────────────────────────────────────────────
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
                const file = new File([blob], `gravacao-${Date.now()}.webm`, { type: "audio/webm" });
                setAudios((prev) => [...prev, file]);
                stream.getTracks().forEach((t) => t.stop());
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao acessar microfone. Verifique as permissões.");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const handleRemoveNewFile = (index: number, type: "image" | "video" | "audio") => {
        if (type === "image") setImages((prev) => prev.filter((_, i) => i !== index));
        if (type === "video") setVideos((prev) => prev.filter((_, i) => i !== index));
        if (type === "audio") setAudios((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (values: ItemFormValues) => {
        // Limpeza de campos vazios para null
        const payload = {
            ...values,
            supplierId: values.supplierId || null,
            assignedToId: values.assignedToId || null,
            dueDate: values.dueDate || null,
            productionStartedAt: values.productionStartedAt || null,
            deliveryAt: values.deliveryAt || null,
        };

        await onSubmit(
            payload,
            { images, audios, videos },
            { images: removedImageIds, audios: removedAudioIds, videos: removedVideoIds }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col p-0">
                {/* HEADER */}
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

                {/* BODY */}
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full px-6 py-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                <Tabs defaultValue="details" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1">
                                        <TabsTrigger value="details">Detalhes & Datas</TabsTrigger>
                                        <TabsTrigger value="media">Mídias & Anexos</TabsTrigger>
                                    </TabsList>

                                    {/* TAB DETALHES */}
                                    <TabsContent value="details" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                        {/* Linha 1 */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="title" render={({ field }) => (
                                                <FormItem className="col-span-2">
                                                    <FormLabel>Título do Produto *</FormLabel>
                                                    <FormControl><Input placeholder="Ex: Camisa Linho M" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />

                                            <FormField control={form.control} name="productRef" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Referência</FormLabel>
                                                    <FormControl><Input placeholder="REF-001" {...field} /></FormControl>
                                                </FormItem>
                                            )} />

                                            <FormField control={form.control} name="orderNumber" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nº Pedido</FormLabel>
                                                    <FormControl><Input placeholder="PED-123" {...field} /></FormControl>
                                                </FormItem>
                                            )} />

                                            <FormField control={form.control} name="description" render={({ field }) => (
                                                <FormItem className="col-span-2">
                                                    <FormLabel>Descrição / Observações</FormLabel>
                                                    <FormControl><Textarea placeholder="Detalhes técnicos..." className="resize-none h-20" {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>

                                        {/* Linha 2 */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <FormField control={form.control} name="quantity" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Quantidade</FormLabel>
                                                    <FormControl><Input
                                                        type="number"
                                                        min="1"
                                                        {...field}
                                                        value={field.value?.toString() ?? ""}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                    /></FormControl>
                                                </FormItem>
                                            )} />

                                            <FormField control={form.control} name="priority" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Prioridade</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="1">Alta (Urgente)</SelectItem>
                                                            <SelectItem value="2">Média</SelectItem>
                                                            <SelectItem value="3">Baixa</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />

                                            <FormField control={form.control} name="stageId" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Etapa Atual</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        </div>

                                        {/* Linha 3: Responsáveis */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dashed">
                                            <FormField control={form.control} name="assignedToId" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="flex items-center gap-2"><User size={14} /> Responsável Interno</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="">Nenhum</SelectItem>
                                                            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />

                                            <FormField control={form.control} name="supplierId" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="flex items-center gap-2"><Factory size={14} /> Oficina / Terceirizado</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Produção Interna" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="">Produção Interna</SelectItem>
                                                            {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} {s.category === 'HYBRID' ? '(Híbrido)' : ''}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        </div>

                                        {/* Linha 4: Datas */}
                                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dashed">
                                            <FormField control={form.control} name="dueDate" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-slate-500 uppercase">Prazo (Meta)</FormLabel>
                                                    <FormControl><Input type="date" {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="productionStartedAt" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-slate-500 uppercase">Início Prod.</FormLabel>
                                                    <FormControl><Input type="date" {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="deliveryAt" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-slate-500 uppercase">Entrega</FormLabel>
                                                    <FormControl><Input type="date" {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                    </TabsContent>

                                    {/* TAB MÍDIAS */}
                                    <TabsContent value="media" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">

                                        {isEditing && (initialData?.images.length || initialData?.videos.length || initialData?.audios.length) ? (
                                            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
                                                <Label className="text-xs text-slate-500 font-bold uppercase flex items-center gap-2">
                                                    <CheckCircle2 size={12} /> Mídias Salvas
                                                </Label>

                                                {/* Grade de Imagens */}
                                                {initialData.images.length > 0 && (
                                                    <div className="grid grid-cols-5 gap-2 mt-2">
                                                        {initialData.images.map((img) => !removedImageIds.includes(img.id) && (
                                                            <div key={img.id} className="relative aspect-square border rounded overflow-hidden group bg-white shadow-sm">
                                                                <img src={img.url} className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                                    <button type="button" onClick={() => window.open(img.url, '_blank')} className="text-white hover:scale-110"><Maximize2 size={14} /></button>
                                                                    <button type="button" onClick={() => setRemovedImageIds(p => [...p, img.id])} className="text-red-400 hover:text-red-500 hover:scale-110"><Trash2 size={14} /></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Lista de Áudios */}
                                                {initialData.audios.length > 0 && (
                                                    <div className="flex flex-col gap-2 mt-2">
                                                        {initialData.audios.map(aud => !removedAudioIds.includes(aud.id) && (
                                                            <div key={aud.id} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                                                                <Music size={14} className="text-slate-400" />
                                                                <span className="text-xs truncate flex-1">{aud.filename}</span>
                                                                <audio src={aud.url} controls className="h-6 w-32" />
                                                                <button type="button" onClick={() => setRemovedAudioIds(p => [...p, aud.id])} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        <Separator />
                                        <Label className="text-sm font-bold flex items-center gap-2"><UploadCloud size={16} /> Adicionar Novas Mídias</Label>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {/* Botão Imagens */}
                                            <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-blue-50 cursor-pointer relative transition-colors h-32">
                                                <Input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && setImages(p => [...p, ...Array.from(e.target.files!)])} />
                                                <ImageIcon className="text-blue-400 mb-2" size={24} />
                                                <span className="text-xs text-blue-700 font-bold">Add Imagens</span>
                                                {images.length > 0 && <span className="text-[10px] text-green-600 mt-1 font-medium bg-green-100 px-2 py-0.5 rounded-full">{images.length} novas</span>}
                                            </div>

                                            {/* Botão Vídeos */}
                                            <div className="border-2 border-dashed border-purple-200 bg-purple-50/30 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-purple-50 cursor-pointer relative transition-colors h-32">
                                                <Input type="file" multiple accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && setVideos(p => [...p, ...Array.from(e.target.files!)])} />
                                                <Video className="text-purple-400 mb-2" size={24} />
                                                <span className="text-xs text-purple-700 font-bold">Add Vídeos</span>
                                                {videos.length > 0 && <span className="text-[10px] text-green-600 mt-1 font-medium bg-green-100 px-2 py-0.5 rounded-full">{videos.length} novas</span>}
                                            </div>

                                            {/* Botão Áudio */}
                                            <div className="flex flex-col gap-2 h-32">
                                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-2 flex flex-col items-center justify-center hover:bg-gray-50 cursor-pointer relative flex-1">
                                                    <Input type="file" multiple accept="audio/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && setAudios(p => [...p, ...Array.from(e.target.files!)])} />
                                                    <Music className="text-gray-400 mb-1" size={20} />
                                                    <span className="text-[10px] text-gray-600 font-medium">Upload Arquivo</span>
                                                </div>
                                                <Button type="button" size="sm" variant={isRecording ? "destructive" : "outline"} onClick={isRecording ? stopRecording : startRecording} className="w-full text-xs h-8">
                                                    {isRecording ? <Square size={12} className="mr-2 animate-pulse" /> : <Mic size={12} className="mr-2" />}
                                                    {isRecording ? "Parar" : "Gravar Voz"}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Previews */}
                                        {(images.length > 0 || videos.length > 0 || audios.length > 0) && (
                                            <div className="space-y-4 pt-2">
                                                {images.length > 0 && (
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {images.map((file, i) => (
                                                            <div key={i} className="relative aspect-square rounded overflow-hidden border">
                                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-90" />
                                                                <button type="button" onClick={() => handleRemoveNewFile(i, 'image')} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><X size={12} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {audios.length > 0 && (
                                                    <div className="flex flex-col gap-2">
                                                        {audios.map((a, i) => (
                                                            <div key={i} className="flex items-center gap-3 bg-blue-50 p-2 rounded border border-blue-100">
                                                                <PlayCircle size={16} className="text-blue-600" />
                                                                <span className="text-xs truncate flex-1">{a.name}</span>
                                                                <audio src={URL.createObjectURL(a)} controls className="h-6 w-32" />
                                                                <button type="button" onClick={() => handleRemoveNewFile(i, 'audio')} className="text-blue-400 hover:text-red-500"><X size={14} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </form>
                        </Form>
                    </ScrollArea>
                </div>

                {/* FOOTER */}
                <DialogFooter className="px-6 py-4 border-t bg-slate-50 shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button onClick={() => form.handleSubmit(handleSubmit)()} disabled={isLoading} className="bg-[#D35400] hover:bg-[#D35400]/90 text-white min-w-[120px]">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        {isEditing ? "Salvar Alterações" : "Criar Item"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
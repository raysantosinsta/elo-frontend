/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    CheckCircle2,
    Edit,
    Globe,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: TaskData | null;
    onSubmit: (
        values: any,
        files: { images: File[]; audios: File[]; videos: File[] },
        removedMedia: { images: string[]; audios: string[]; videos: string[] }
    ) => Promise<void>;
    isLoading: boolean;
    users: { id: string; name: string }[];
    columns: { id: string; title: string }[];
}

// --- Schema de Validação (Zod) ---
// 🔥 CORREÇÃO: O Schema valida Strings (input do form), a conversão ocorre no submit
const taskSchema = z.object({
    title: z.string().min(1, "Título obrigatório"),
    description: z.string().optional(),

    // Esses campos são obrigatórios no seu fluxo de negócio
    priority: z.string().min(1),
    columnId: z.string().min(1, "Selecção de coluna obrigatória"),
    status: z.string().min(1),

    assignedToId: z.string().optional(),
    dueDate: z.string().optional(),
    scheduledAt: z.string().optional(),
    finalComment: z.string().optional(),

    // Endereço continua todo opcional
    cep: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    complement: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
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
}: TaskFormModalProps) {
    const isEditing = !!initialData;
    const [isSearchingCep, setIsSearchingCep] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

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
            title: "",
            description: "",
            priority: "1", // String padrão
            columnId: "",
            assignedToId: "unassigned", // 🔥 Valor padrão seguro
            status: "PENDING",
            dueDate: "",
            scheduledAt: "",
            finalComment: "",
            cep: "", street: "", number: "", neighborhood: "", city: "", state: "", complement: "", latitude: "", longitude: ""
        },
    });

    // Reset do Formulário
    useEffect(() => {
        if (isOpen) {
            setImages([]); setVideos([]); setAudios([]);
            setRemovedImageIds([]); setRemovedVideoIds([]); setRemovedAudioIds([]);
            setIsRecording(false);

            if (initialData) {
                form.reset({
                    title: initialData.title,
                    description: initialData.description || "",
                    priority: initialData.priority.toString(), // Converte number -> string para o Select
                    columnId: initialData.columnId || "",
                    assignedToId: initialData.userAssigned?.id || "unassigned",
                    status: initialData.status,
                    dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().slice(0, 16) : "",
                    scheduledAt: initialData.scheduledDate ? new Date(initialData.scheduledDate).toISOString().slice(0, 16) : "",
                    finalComment: initialData.finalComment || "",

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
                form.reset({
                    title: "",
                    description: "",
                    priority: "1",
                    columnId: columns.length > 0 ? columns[0].id : "",
                    assignedToId: "unassigned", // 🔥 Default seguro
                    status: "PENDING",
                    dueDate: "",
                    scheduledAt: "",
                    finalComment: "",
                    cep: "", street: "", number: "", neighborhood: "", city: "", state: "", complement: "", latitude: "", longitude: ""
                });
            }
        }
    }, [isOpen, initialData, form, columns]);

    // --- Handlers de Endereço ---
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
                const numberInput = document.getElementById("address-number");
                if (numberInput) numberInput.focus();
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
        const { street, number, city, state } = form.getValues();
        if (!street || !city || !state) {
            toast.error("Preencha Rua, Cidade e Estado para buscar coordenadas.");
            return;
        }

        setIsGeocoding(true);
        try {
            const query = `${street}, ${number ? number + "," : ""} ${city}, ${state}, Brasil`;
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                headers: { "User-Agent": "TaskKanbanApp/1.0" }
            });
            const data = await res.json();

            if (data && data.length > 0) {
                form.setValue("latitude", data[0].lat);
                form.setValue("longitude", data[0].lon);
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

    // --- Handlers de Mídia ---
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
            console.error(err);
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

    // --- Submit ---
    const handleSubmit = async (values: TaskFormValues) => {
        // 🔥 Conversão de Tipos antes de enviar
        const payload = {
            ...values,
            assignedToId: values.assignedToId === "unassigned" ? null : values.assignedToId,
            priority: parseInt(values.priority) || 1,
            latitude: values.latitude ? parseFloat(values.latitude) : undefined,
            longitude: values.longitude ? parseFloat(values.longitude) : undefined,
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

                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full px-6 py-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

                                <Tabs defaultValue="info" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1">
                                        <TabsTrigger value="info">Informações & Local</TabsTrigger>
                                        <TabsTrigger value="media">Mídias & Anexos</TabsTrigger>
                                    </TabsList>

                                    {/* --- TAB: INFORMAÇÕES E ENDEREÇO --- */}
                                    <TabsContent value="info" className="space-y-5 animate-in fade-in">

                                        {/* Dados Básicos */}
                                        <div className="space-y-4">
                                            <div className="grid gap-2">
                                                <FormField control={form.control} name="title" render={({ field }) => (
                                                    <FormItem><FormLabel>Título *</FormLabel><FormControl><Input placeholder="Ex: Manutenção Preventiva" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </div>
                                            <div className="grid gap-2">
                                                <FormField control={form.control} name="description" render={({ field }) => (
                                                    <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Detalhes..." className="resize-none h-20" {...field} /></FormControl></FormItem>
                                                )} />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="priority" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Prioridade</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent><SelectItem value="1">Alta</SelectItem><SelectItem value="2">Média</SelectItem><SelectItem value="3">Baixa</SelectItem></SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />

                                                <FormField control={form.control} name="columnId" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Coluna *</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                            <SelectContent>{columns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                                                    <FormItem><FormLabel>Agendado Para</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl></FormItem>
                                                )} />
                                                <FormField control={form.control} name="dueDate" render={({ field }) => (
                                                    <FormItem><FormLabel>Prazo Final</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl></FormItem>
                                                )} />
                                            </div>

                                            <div className="grid gap-2">
                                                <FormField control={form.control} name="assignedToId" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Responsável</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                {/* 🔥 CORREÇÃO: Usar valor diferente de string vazia */}
                                                                <SelectItem value="unassigned">Nenhum</SelectItem>
                                                                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                            </div>

                                            {isEditing && (
                                                <div className="grid gap-2">
                                                    <FormField control={form.control} name="status" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Status</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent><SelectItem value="PENDING">Pendente</SelectItem><SelectItem value="IN_PROGRESS">Em Progresso</SelectItem><SelectItem value="COMPLETED">Concluído</SelectItem><SelectItem value="FAILED">Falhou</SelectItem></SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                            )}
                                        </div>

                                        <Separator />

                                        {/* Endereço */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-orange-500" /> Localização</h3>

                                            <div className="grid grid-cols-[140px_1fr] gap-4">
                                                <FormField control={form.control} name="cep" render={({ field }) => (
                                                    <FormItem>
                                                        <div className="relative">
                                                            <FormControl><Input placeholder="CEP" maxLength={9} {...field} onBlur={handleCepSearch} /></FormControl>
                                                            {isSearchingCep && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
                                                        </div>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="street" render={({ field }) => (
                                                    <FormItem><FormControl><Input placeholder="Rua" {...field} /></FormControl></FormItem>
                                                )} />
                                            </div>

                                            <div className="grid grid-cols-[100px_1fr] gap-4">
                                                <FormField control={form.control} name="number" render={({ field }) => (
                                                    <FormItem><FormControl><Input id="address-number" placeholder="Nº" {...field} /></FormControl></FormItem>
                                                )} />
                                                <FormField control={form.control} name="neighborhood" render={({ field }) => (
                                                    <FormItem><FormControl><Input placeholder="Bairro" {...field} /></FormControl></FormItem>
                                                )} />
                                            </div>

                                            <div className="grid grid-cols-[1fr_80px] gap-4">
                                                <FormField control={form.control} name="city" render={({ field }) => (
                                                    <FormItem><FormControl><Input placeholder="Cidade" {...field} /></FormControl></FormItem>
                                                )} />
                                                <FormField control={form.control} name="state" render={({ field }) => (
                                                    <FormItem><FormControl><Input placeholder="UF" maxLength={2} {...field} /></FormControl></FormItem>
                                                )} />
                                            </div>

                                            <div className="pt-2 border-t border-slate-100">
                                                <div className="flex justify-between items-center mb-2">
                                                    <Label className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Globe className="h-3 w-3" /> Coordenadas</Label>
                                                    <Button type="button" size="sm" variant="outline" onClick={handleGeocode} disabled={isGeocoding} className="h-7 text-xs">
                                                        {isGeocoding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />} Buscar Coordenadas
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="latitude" render={({ field }) => (
                                                        <FormItem><FormControl><Input placeholder="Latitude" {...field} /></FormControl></FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="longitude" render={({ field }) => (
                                                        <FormItem><FormControl><Input placeholder="Longitude" {...field} /></FormControl></FormItem>
                                                    )} />
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* --- TAB: MÍDIAS --- */}
                                    <TabsContent value="media" className="space-y-6 animate-in fade-in">

                                        {/* Exibir Mídias Existentes (Apenas Edição) */}
                                        {isEditing && (initialData?.taskImages.length || initialData?.taskVideos.length || initialData?.taskAudios.length) ? (
                                            <div className="space-y-4 p-4 bg-slate-50 border rounded-lg">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Mídias Salvas</Label>

                                                {/* Imagens */}
                                                {initialData.taskImages.length > 0 && (
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {initialData.taskImages.map(img => !removedImageIds.includes(img.id) && (
                                                            <div key={img.id} className="relative aspect-square rounded overflow-hidden group border bg-white">
                                                                <img src={img.url} className="w-full h-full object-cover" />
                                                                <button type="button" onClick={() => setRemovedImageIds(p => [...p, img.id])} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Áudios */}
                                                {initialData.taskAudios.length > 0 && (
                                                    <div className="space-y-2">
                                                        {initialData.taskAudios.map(aud => !removedAudioIds.includes(aud.id) && (
                                                            <div key={aud.id} className="flex items-center gap-2 bg-white p-2 rounded border">
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

                                        {/* Área de Uploads */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {/* Imagens */}
                                            <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-blue-50 cursor-pointer relative transition-colors">
                                                <Input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                                    const selectedFiles = e.target.files;
                                                    if (selectedFiles && selectedFiles.length > 0) {
                                                        const newFiles = Array.from(selectedFiles); // FileList → File[]
                                                        setImages((prev) => [...prev, ...newFiles]);
                                                    }
                                                }} />
                                                <ImageIcon className="text-blue-400 mb-2" size={24} />
                                                <span className="text-xs text-blue-700 font-bold">Add Imagens</span>
                                                {images.length > 0 && <span className="text-[10px] text-green-600 mt-1 font-medium bg-green-100 px-2 py-0.5 rounded-full">{images.length} novas</span>}
                                            </div>

                                            {/* Vídeos */}
                                            <div className="border-2 border-dashed border-purple-200 bg-purple-50/30 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-purple-50 cursor-pointer relative transition-colors">
                                                <Input
                                                    type="file"
                                                    multiple
                                                    accept="video/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => {
                                                        // Proteção contra null + conversão segura
                                                        if (e.target.files && e.target.files.length > 0) {
                                                            const novosVideos = Array.from(e.target.files); // FileList → File[]
                                                            setVideos((prev) => [...prev, ...novosVideos]);
                                                        }

                                                        // Limpa o input para permitir selecionar o mesmo arquivo novamente
                                                        e.target.value = "";
                                                    }} />
                                                <Video className="text-purple-400 mb-2" size={24} />
                                                <span className="text-xs text-purple-700 font-bold">Add Vídeos</span>
                                                {videos.length > 0 && <span className="text-[10px] text-green-600 mt-1 font-medium bg-green-100 px-2 py-0.5 rounded-full">{videos.length} novos</span>}
                                            </div>

                                            {/* Áudio (Arquivo + Mic) */}
                                            <div className="flex flex-col gap-2 h-full">
                                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-2 flex flex-col items-center justify-center hover:bg-gray-50 cursor-pointer relative flex-1">
                                                    <Input type="file" multiple accept="audio/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                                        const arquivos = Array.from(e.target.files ?? []);
                                                        setAudios((prev) => [...prev, ...arquivos]);
                                                        e.target.value = ""; // permite selecionar o mesmo arquivo novamente
                                                    }} />
                                                    <Music className="text-gray-400 mb-1" size={20} />
                                                    <span className="text-[10px] text-gray-600 font-medium">Upload Áudio</span>
                                                </div>
                                                <Button type="button" size="sm" variant={isRecording ? "destructive" : "outline"} onClick={isRecording ? stopRecording : startRecording} className="w-full text-xs h-8">
                                                    {isRecording ? <Square size={12} className="mr-2 animate-pulse" /> : <Mic size={12} className="mr-2" />}
                                                    {isRecording ? "Parar" : "Gravar"}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Preview de Novos Áudios */}
                                        {audios.length > 0 && (
                                            <div className="space-y-2">
                                                <Label className="text-xs text-gray-500 uppercase font-bold">Novos Áudios ({audios.length})</Label>
                                                {audios.map((a, i) => (
                                                    <div key={i} className="flex items-center gap-3 bg-slate-50 p-2 rounded border border-slate-200">
                                                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                                            <PlayCircle size={16} className="text-blue-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-medium text-slate-700 truncate">{a.name}</p>
                                                            <audio src={URL.createObjectURL(a)} controls className="w-full h-6 mt-1" />
                                                        </div>
                                                        <button type="button" onClick={() => handleRemoveNewFile(i, 'audio')} className="text-slate-400 hover:text-red-500 p-1"><X size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                    </TabsContent>
                                </Tabs>

                            </form>
                        </Form>
                    </ScrollArea>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-slate-50 shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button onClick={() => form.handleSubmit(handleSubmit)()} disabled={isLoading} className="bg-[#D35400] hover:bg-[#D35400]/90 text-white min-w-[120px]">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        {isEditing ? "Salvar Alterações" : "Criar Tarefa"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/use-create-flow-item.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";

export const useCreateFlowItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ flowId, stageId, data, files, removedMedia }: any) => {
      const formData = new FormData();
      
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      });
      
      files.images?.forEach((file: File) => formData.append("images", file));
      files.videos?.forEach((file: File) => formData.append("videos", file));
      files.audios?.forEach((file: File) => formData.append("audios", file));
      
      if (removedMedia.images?.length) {
        removedMedia.images.forEach((id: string) => formData.append("removedImageIds", id));
      }
      if (removedMedia.videos?.length) {
        removedMedia.videos.forEach((id: string) => formData.append("removedVideoIds", id));
      }
      if (removedMedia.audios?.length) {
        removedMedia.audios.forEach((id: string) => formData.append("removedAudioIds", id));
      }
      
      const url = data.id 
        ? `/flow/items/${data.id}` 
        : `/flow/${flowId}/stage/${stageId}/item`;
      
      const method = data.id ? "put" : "post";
      
      const response = await api[method](url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      console.log("✅ Item criado/atualizado com sucesso:", data);
      
      // Invalida todas as queries
      if (variables.flowId) {
        queryClient.invalidateQueries({ queryKey: ["flow-board", variables.flowId] });
      }
      queryClient.invalidateQueries({ queryKey: ["kanban-boards"] });
      queryClient.invalidateQueries({ queryKey: ["all-items"] });
      queryClient.invalidateQueries({ queryKey: ["all-flows"] });
      queryClient.invalidateQueries({ queryKey: ["flow"], exact: false });
      
      if (variables.flowId) {
        queryClient.invalidateQueries({ queryKey: ["selected-flow", variables.flowId] });
      }
      
      toast.success(variables.data.id ? "Item atualizado!" : "Item criado com sucesso!");
    },
    
    onError: (error: any) => {
      console.error("❌ Erro ao salvar item:", error);
      toast.error(error.response?.data?.message || "Erro ao salvar item");
    },
  });
};
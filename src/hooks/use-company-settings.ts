/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/use-company-settings.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useEffect } from 'react';

interface CompanySettings {
  notificationDays: number;
}

export const useCompanySettings = (companyId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-settings', companyId],
    queryFn: async () => {
      console.log(`🔍 [useCompanySettings] Buscando dados para empresa ${companyId}`);
      
      // O endpoint deve bater exatamente com o que está no seu Backend Controller
      const { data } = await api.get<CompanySettings>(
        `/companies/${companyId}/notification-settings`
      );
      
      console.log(`📦 [useCompanySettings] Dados recebidos da API:`, data);
      return data;
    },
    // Configurações para garantir dados sempre frescos
    staleTime: 0, 
    gcTime: 0, 
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!companyId, // Só executa se tiver um ID
  });

  // 🔥 ESCUTAR EVENTO DE ATUALIZAÇÃO DA EMPRESA
  useEffect(() => {
    const handleCompanyUpdated = async (event: any) => {
      // Verifica se o ID da empresa atualizada é o mesmo deste hook
      if (event.detail?.companyId === companyId) {
        console.log(`🔄 [useCompanySettings] Evento 'companyUpdated' detectado para ${companyId}`);
        
        // 1. Invalida o cache primeiro
        await queryClient.invalidateQueries({ 
          queryKey: ['company-settings', companyId] 
        });

        // 2. Força a busca dos novos dados
        query.refetch();
      }
    };

    // Adiciona o listener no window
    window.addEventListener('companyUpdated', handleCompanyUpdated as EventListener);
    
    return () => {
      // Limpa o listener ao desmontar para evitar memory leak
      window.removeEventListener('companyUpdated', handleCompanyUpdated as EventListener);
    };
  }, [companyId, query, queryClient]);

  // Retorna o estado completo da query
  return { 
    ...query, 
    settings: query.data, // Atalho para os dados
    refetch: query.refetch 
  };
};
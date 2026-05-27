/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useUsers.ts - Com optimistic update funcionando
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  contact: string;
  professionalRole?: string;
  document?: string;
  companyId: string;
  company?: { name: string };
  companyRole?: { id: string; name: string; level: number };
}

export function useUsers(filters?: { companyId?: string; isMaster?: boolean }) {
  const queryClient = useQueryClient();
  const queryKey = ['users', filters?.companyId, filters?.isMaster];

  // 🔥 QUERY: Buscar usuários
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '100');
      params.append('page', '1');
      
      if (filters?.isMaster && filters?.companyId) {
        params.append('companyId', filters.companyId);
      }
      
      const response = await api.get(`/users?${params}`);
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : data.data || [];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // 🔥 MUTATION: Criar usuário
  const createUser = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        contact: values.contact?.replace(/\D/g, ''),
        document: values.document?.replace(/\D/g, ''),
      };
      const response = await api.post('/users', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('✅ Usuário criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.message || 'Erro ao criar usuário'}`);
    },
  });

  // 🔥 MUTATION: Atualizar usuário
  const updateUser = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      const payload = {
        ...values,
        contact: values.contact?.replace(/\D/g, ''),
        document: values.document?.replace(/\D/g, ''),
      };
      const response = await api.patch(`/users/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('✅ Usuário atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.message || 'Erro ao atualizar'}`);
    },
  });

  // 🔥 MUTATION: Alterar status com OPTIMISTIC UPDATE
  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/users/${id}/status/${newStatus}`);
      return { id, newStatus };
    },
    onMutate: async ({ id, currentStatus }) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey });
      
      // Salva estado anterior
      const previousUsers = queryClient.getQueryData<User[]>(queryKey);
      
      // 🔥 OPTIMISTIC UPDATE: Atualiza UI instantaneamente
      queryClient.setQueryData<User[]>(queryKey, (old) => {
        if (!old) return [];
        return old.map(user => 
          user.id === id 
            ? { ...user, status: currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
            : user
        );
      });
      
      return { previousUsers };
    },
    onError: (err, variables, context) => {
      // Rollback em caso de erro
      if (context?.previousUsers) {
        queryClient.setQueryData(queryKey, context.previousUsers);
      }
      toast.error('❌ Erro ao alterar status');
    },
    onSuccess: (result) => {
      toast.success(`✅ Status alterado para ${result.newStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}!`);
    },
    onSettled: () => {
      // 🔥 CRÍTICO: Refetch após a mutation para garantir consistência
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 🔥 MUTATION: Deletar usuário com OPTIMISTIC UPDATE
  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousUsers = queryClient.getQueryData<User[]>(queryKey);
      
      // 🔥 OPTIMISTIC UPDATE: Remove da lista instantaneamente
      queryClient.setQueryData<User[]>(queryKey, (old) => {
        if (!old) return [];
        return old.filter(user => user.id !== id);
      });
      
      return { previousUsers };
    },
    onError: (err, id, context) => {
      // Rollback em caso de erro
      if (context?.previousUsers) {
        queryClient.setQueryData(queryKey, context.previousUsers);
      }
      toast.error('❌ Erro ao excluir usuário');
    },
    onSuccess: () => {
      toast.success('✅ Usuário excluído com sucesso!');
    },
    onSettled: () => {
      // 🔥 CRÍTICO: Refetch após a mutation para garantir consistência
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    users,
    isLoading,
    refetch,
    createUser,
    updateUser,
    toggleStatus,
    deleteUser,
  };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/routes/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRoutes } from '@/hooks/useRoutes';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MapPinIcon, MoreHorizontalIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ─── Paleta alinhada com a Sidebar ────────────────────────────────────────────
// Fundo: #2C3E50   |  Destaque/Ativo: #D35400
// Texto primário: #FFFFFF   |  Texto secundário: #D1D5DB (gray-300)
// Ícones/hints: #9CA3AF (gray-400)   |  Meta: #6B7280 (gray-500)
// Hover: rgba(255,255,255,0.10)   |  Bordas: rgba(255,255,255,0.10)
// ─────────────────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  SCHEDULED:   'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  IN_PROGRESS: 'bg-[#D35400]/20 text-[#D35400] border border-[#D35400]/30',
  FINISHED:    'bg-green-500/20 text-green-300 border border-green-500/30',
  CANCELED:    'bg-white/10 text-gray-400 border border-white/10',
};

const statusText: Record<string, string> = {
  SCHEDULED:   'Agendada',
  IN_PROGRESS: 'Em Andamento',
  FINISHED:    'Finalizada',
  CANCELED:    'Cancelada',
};

export default function RoutesPage() {
  const router = useRouter();
  const { useGetAllRoutes, useDeleteRoute, useDuplicateRoute } = useRoutes();

  const { data: routes, isLoading, refetch } = useGetAllRoutes();
  const deleteRoute = useDeleteRoute();
  const duplicateRoute = useDuplicateRoute();

  const [searchTerm, setSearchTerm]     = useState('');
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteRoute.mutateAsync(deleteId);
        setDeleteId(null);
        toast.success('Rota excluída com sucesso');
        refetch();
      } catch {
        toast.error('Erro ao excluir rota.');
      }
    }
  };

  const handleDuplicate = async (route: any) => {
    try {
      // Criar título para a nova rota
      const newTitle = `${route.title} (Cópia)`;
      
      // Duplicar a rota
      const result = await duplicateRoute.mutateAsync({
        id: route.id,
        data: { title: newTitle }
      });
      
      toast.success('Rota duplicada com sucesso!', {
        description: `Nova rota: ${newTitle}`,
      });
      
      // Redirecionar para a página de edição da nova rota
      if (result?.data?.newRoute?.id) {
        router.push(`/routes/${result.data.newRoute.id}/edit`);
      } else {
        // Fallback: buscar a rota duplicada pela lista
        await refetch();
        toast.info('Redirecionando para edição...');
        setTimeout(() => {
          router.push('/routes');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Erro ao duplicar rota:', error);
      toast.error('Erro ao duplicar rota', {
        description: error?.message || 'Tente novamente mais tarde',
      });
    }
  };

  const filteredRoutes = routes?.filter((route) => {
    const matchesSearch = route.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || route.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2C3E50]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D35400]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2C3E50] text-white">
      <div className="container mx-auto py-10 px-4 max-w-7xl">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Rotas
            </h1>
            <p className="text-[#9CA3AF] mt-2 text-lg">
              Listagem e controle de fluxos logísticos.
            </p>
          </div>
          <Link href="/routes/create">
            <Button
              size="lg"
              className="bg-[#D35400] hover:bg-[#b84700] text-white border-none shadow-md transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Nova Rota
            </Button>
          </Link>
        </div>

        {/* ── Busca + Filtro de status ────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8 items-center">
          {/* Search */}
          <div className="relative w-full lg:max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input
              placeholder="Pesquisar rotas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                pl-10 h-12
                bg-white/5 border border-white/10
                text-white placeholder:text-[#6B7280]
                focus-visible:ring-[#D35400] focus-visible:border-[#D35400]
              "
            />
          </div>

          {/* Tabs */}
          <Tabs
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-full lg:w-auto"
          >
            <TabsList className="h-12 p-1 bg-white/5 border border-white/10 rounded-lg gap-0.5">
              {(['all', 'SCHEDULED', 'IN_PROGRESS', 'FINISHED'] as const).map((val) => (
                <TabsTrigger
                  key={val}
                  value={val}
                  className="
                    px-5 h-10 text-[#D1D5DB]
                    data-[state=active]:bg-[#D35400]
                    data-[state=active]:text-white
                    data-[state=active]:shadow-none
                    hover:text-white hover:bg-white/10
                    transition-colors rounded-md
                  "
                >
                  {{ all: 'Todas', SCHEDULED: 'Agendadas', IN_PROGRESS: 'Em Andamento', FINISHED: 'Finalizadas' }[val]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* ── Tabela ─────────────────────────────────────────────────────────── */}
        <Card className="border border-white/10 bg-white/5 shadow-none rounded-xl overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className="py-4 px-6 text-[#9CA3AF] font-medium">Título</TableHead>
                  <TableHead className="text-[#9CA3AF] font-medium">Status</TableHead>
                  <TableHead className="text-[#9CA3AF] font-medium">Data da Rota</TableHead>
                  <TableHead className="text-center text-[#9CA3AF] font-medium">Paradas</TableHead>
                  <TableHead className="text-[#9CA3AF] font-medium">Distância</TableHead>
                  <TableHead className="text-[#9CA3AF] font-medium">Duração</TableHead>
                  <TableHead className="text-[#9CA3AF] font-medium">Motorista</TableHead>
                  <TableHead className="text-[#9CA3AF] font-medium min-w-[200px]">Descrição</TableHead>
                  <TableHead className="text-[#9CA3AF] font-medium">Criado em</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredRoutes?.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-none">
                    <TableCell colSpan={10} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 text-[#6B7280]">
                        <MapPinIcon className="h-16 w-16 opacity-30" />
                        <p className="text-xl font-medium">Nenhuma rota encontrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoutes?.map((route) => (
                    <TableRow
                      key={route.id}
                      className="group border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      {/* Título */}
                      <TableCell className="font-semibold py-4 px-6 text-white">
                        <Link
                          href={`/routes/${route.id}`}
                          className="hover:text-[#D35400] transition-colors"
                        >
                          {route.title}
                        </Link>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          className={`${statusColors[route.status as keyof typeof statusColors]} text-xs font-medium shadow-none`}
                        >
                          {statusText[route.status as keyof typeof statusText]}
                        </Badge>
                      </TableCell>

                      {/* Data da Rota */}
                      <TableCell className="text-[#9CA3AF]">
                        {route.routeDate
                          ? format(new Date(route.routeDate), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </TableCell>

                      {/* Paradas */}
                      <TableCell className="text-center font-medium text-white">
                        {route.stops?.length || 0}
                      </TableCell>

                      {/* Distância */}
                      <TableCell className="text-[#D1D5DB]">
                        {route.formattedDistance || '-'}
                      </TableCell>

                      {/* Duração */}
                      <TableCell className="text-[#D1D5DB]">
                        {route.formattedDuration || '-'}
                      </TableCell>

                      {/* Motorista */}
                      <TableCell className="text-[#9CA3AF]">
                        {route.userAssigned?.name || 'Não atribuído'}
                      </TableCell>

                      {/* Descrição */}
                      <TableCell className="text-[#D1D5DB] max-w-[200px]">
                        {route.description ? (
                          <div className="truncate" title={route.description}>
                            {route.description.length > 50 
                              ? `${route.description.substring(0, 50)}...` 
                              : route.description}
                          </div>
                        ) : (
                          <span className="text-[#6B7280] text-sm">-</span>
                        )}
                      </TableCell>

                      {/* Data de Criação */}
                      <TableCell className="text-[#9CA3AF] whitespace-nowrap">
                        {route.createdAt 
                          ? format(new Date(route.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '-'}
                      </TableCell>

                      {/* Ações */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="
                                h-8 w-8 p-0
                                opacity-0 group-hover:opacity-100 transition-opacity
                                text-[#9CA3AF] hover:text-white hover:bg-white/10
                              "
                            >
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 bg-[#2C3E50] border border-white/10 text-white"
                          >
                            <DropdownMenuLabel className="text-[#9CA3AF] text-xs">
                              Ações
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                              onClick={() => router.push(`/routes/${route.id}`)}
                            >
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                              onClick={() => router.push(`/routes/${route.id}/edit`)}
                            >
                              Editar rota
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                              onClick={() => router.push(`/driver?routeId=${route.id}`)}
                            >
                              Iniciar Rota
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                              onClick={() => handleDuplicate(route)}
                              disabled={duplicateRoute.isPending}
                            >
                              {duplicateRoute.isPending ? 'Duplicando...' : 'Duplicar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              className="text-red-400 focus:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer"
                              onClick={() => setDeleteId(route.id)}
                            >
                              Excluir permanentemente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Dialog de exclusão ─────────────────────────────────────────────── */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="bg-[#2C3E50] border border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Excluir Rota</AlertDialogTitle>
              <AlertDialogDescription className="text-[#9CA3AF]">
                Esta ação removerá todos os dados da rota do sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border border-white/10 text-[#D1D5DB] hover:bg-white/10 hover:text-white">
                Voltar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white border-none"
              >
                {deleteRoute.isPending ? 'Removendo...' : 'Confirmar Exclusão'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
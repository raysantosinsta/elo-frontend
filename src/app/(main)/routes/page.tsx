/* eslint-disable @typescript-eslint/no-explicit-any */
// app/routes/page.tsx
'use client';

import { useState, useMemo, useCallback, memo } from 'react';
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
import { debounce } from 'lodash';

// ─── Paleta alinhada com a Sidebar ────────────────────────────────────────────
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

// 🎯 Componente memoizado da linha da tabela (evita re-render desnecessário)
const RouteTableRow = memo(({ route, onDuplicate, onDelete, onStart, onView, onEdit }: any) => {
  const [isActionOpen, setIsActionOpen] = useState(false);

  return (
    <TableRow className="group border-b border-white/5 hover:bg-white/5 transition-colors">
      <TableCell className="font-semibold py-4 px-6 text-white">
        <Link
          href={`/routes/${route.id}`}
          className="hover:text-[#D35400] transition-colors"
          prefetch={true} // 🔥 Prefetch ao hover
        >
          {route.title}
        </Link>
      </TableCell>
      <TableCell>
        <Badge className={`${statusColors[route.status]} text-xs font-medium shadow-none`}>
          {statusText[route.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-[#9CA3AF]">
        {route.routeDate ? format(new Date(route.routeDate), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
      </TableCell>
      <TableCell className="text-center font-medium text-white">
        {route.stops?.length || 0}
      </TableCell>
      <TableCell className="text-[#D1D5DB]">{route.formattedDistance || '-'}</TableCell>
      <TableCell className="text-[#D1D5DB]">{route.formattedDuration || '-'}</TableCell>
      <TableCell className="text-[#9CA3AF]">{route.userAssigned?.name || 'Não atribuído'}</TableCell>
      <TableCell className="text-[#D1D5DB] max-w-[200px]">
        {route.description ? (
          <div className="truncate" title={route.description}>
            {route.description.length > 50 ? `${route.description.substring(0, 50)}...` : route.description}
          </div>
        ) : (
          <span className="text-[#6B7280] text-sm">-</span>
        )}
      </TableCell>
      <TableCell className="text-[#9CA3AF] whitespace-nowrap">
        {route.createdAt ? format(new Date(route.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
      </TableCell>
      <TableCell>
        <DropdownMenu open={isActionOpen} onOpenChange={setIsActionOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#9CA3AF] hover:text-white hover:bg-white/10"
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#2C3E50] border border-white/10 text-white">
            <DropdownMenuLabel className="text-[#9CA3AF] text-xs">Ações</DropdownMenuLabel>
            <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 cursor-pointer" onClick={onView}>
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 cursor-pointer" onClick={onEdit}>
              Editar rota
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 cursor-pointer" onClick={onStart}>
              Iniciar Rota
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 cursor-pointer" onClick={onDuplicate}>
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-red-400 focus:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer" onClick={onDelete}>
              Excluir permanentemente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

RouteTableRow.displayName = 'RouteTableRow';

// 🎯 Skeleton loading component
const TableSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl animate-pulse">
        <div className="h-5 w-32 bg-white/10 rounded" />
        <div className="h-6 w-24 bg-white/10 rounded" />
        <div className="h-5 w-28 bg-white/10 rounded" />
        <div className="h-5 w-12 bg-white/10 rounded" />
        <div className="h-5 w-20 bg-white/10 rounded" />
        <div className="h-5 w-20 bg-white/10 rounded" />
        <div className="h-5 w-28 bg-white/10 rounded" />
        <div className="h-5 w-40 bg-white/10 rounded" />
        <div className="h-5 w-32 bg-white/10 rounded" />
        <div className="h-8 w-8 bg-white/10 rounded" />
      </div>
    ))}
  </div>
);

export default function RoutesPage() {
  const router = useRouter();
  const { useGetAllRoutes, useDeleteRoute, useDuplicateRoute } = useRoutes();

  const { data: routes, isLoading, refetch } = useGetAllRoutes();
  const deleteRoute = useDeleteRoute();
  const duplicateRoute = useDuplicateRoute();

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState(false);

  // 🔥 Debounce da busca (evita re-render a cada tecla)
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // 🔥 Filtros otimizados com useMemo
  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    
    return routes.filter((route) => {
      const matchesSearch = route.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || route.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [routes, searchTerm, statusFilter]);

  // 🔥 Estatísticas rápidas (cacheadas)
  const stats = useMemo(() => {
    if (!routes) return { total: 0, scheduled: 0, inProgress: 0, finished: 0 };
    return {
      total: routes.length,
      scheduled: routes.filter(r => r.status === 'SCHEDULED').length,
      inProgress: routes.filter(r => r.status === 'IN_PROGRESS').length,
      finished: routes.filter(r => r.status === 'FINISHED').length,
    };
  }, [routes]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      await deleteRoute.mutateAsync(deleteId);
      setDeleteId(null);
      toast.success('Rota excluída com sucesso');
      refetch();
    } catch {
      toast.error('Erro ao excluir rota.');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteId, deleteRoute, refetch]);

  const handleDuplicate = useCallback(async (route: any) => {
    const newTitle = `${route.title} (Cópia)`;
    const loadingToast = toast.loading('Duplicando rota...');
    
    try {
      const result = await duplicateRoute.mutateAsync({
        id: route.id,
        data: { title: newTitle }
      });
      
      toast.dismiss(loadingToast);
      toast.success('Rota duplicada com sucesso!', {
        description: `Nova rota: ${newTitle}`,
      });
      
      if (result?.data?.newRoute?.id) {
        router.push(`/routes/${result.data.newRoute.id}/edit`);
      } else {
        await refetch();
        setTimeout(() => router.push('/routes'), 1500);
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Erro ao duplicar rota', {
        description: error?.message || 'Tente novamente mais tarde',
      });
    }
  }, [duplicateRoute, refetch, router]);

  // 🔥 Prefetch das rotas mais comuns (hover no link)
  const prefetchRoute = useCallback((routeId: string) => {
    router.prefetch(`/routes/${routeId}`);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2C3E50]">
        <div className="container mx-auto py-10 px-4 max-w-7xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <div>
              <div className="h-10 w-32 bg-white/10 rounded-lg animate-pulse" />
              <div className="h-5 w-64 bg-white/10 rounded mt-2 animate-pulse" />
            </div>
            <div className="h-12 w-36 bg-[#D35400]/50 rounded-lg animate-pulse" />
          </div>
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="h-12 w-full lg:w-96 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-12 w-80 bg-white/10 rounded-lg animate-pulse" />
          </div>
          <TableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2C3E50] text-white">
      <div className="container mx-auto py-10 px-4 max-w-7xl">
        {/* ── Header com estatísticas ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Rotas
            </h1>
            <p className="text-[#9CA3AF] mt-2 text-lg">
              Listagem e controle de fluxos logísticos
            </p>
            {/* 🔥 Mini stats para contexto rápido */}
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-[#6B7280]">Total: <span className="text-white font-semibold">{stats.total}</span></span>
              <span className="text-blue-300">Agendadas: {stats.scheduled}</span>
              <span className="text-[#D35400]">Em andamento: {stats.inProgress}</span>
              <span className="text-green-300">Finalizadas: {stats.finished}</span>
            </div>
          </div>
          <Link href="/routes/create" prefetch={true}>
            <Button
              size="lg"
              className="bg-[#D35400] hover:bg-[#b84700] text-white border-none shadow-md transition-all active:scale-95"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Nova Rota
            </Button>
          </Link>
        </div>

        {/* ── Busca + Filtro de status ────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8 items-center">
          <div className="relative w-full lg:max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input
              placeholder="Pesquisar rotas..."
              onChange={(e) => debouncedSetSearch(e.target.value)}
              className="pl-10 h-12 bg-white/5 border border-white/10 text-white placeholder:text-[#6B7280] focus-visible:ring-[#D35400] focus-visible:border-[#D35400]"
            />
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full lg:w-auto">
            <TabsList className="h-12 p-1 bg-white/5 border border-white/10 rounded-lg gap-0.5">
              {(['all', 'SCHEDULED', 'IN_PROGRESS', 'FINISHED'] as const).map((val) => (
                <TabsTrigger
                  key={val}
                  value={val}
                  className="px-5 h-10 text-[#D1D5DB] data-[state=active]:bg-[#D35400] data-[state=active]:text-white hover:text-white hover:bg-white/10 transition-colors rounded-md"
                >
                  {{ all: 'Todas', SCHEDULED: 'Agendadas', IN_PROGRESS: 'Em Andamento', FINISHED: 'Finalizadas' }[val]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* ── Tabela com scroll suave ─────────────────────────────────────────── */}
        <Card className="border border-white/10 bg-white/5 shadow-none rounded-xl overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent sticky top-0 bg-[#2C3E50]">
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
                {filteredRoutes.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-none">
                    <TableCell colSpan={10} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 text-[#6B7280]">
                        <MapPinIcon className="h-16 w-16 opacity-30" />
                        <p className="text-xl font-medium">Nenhuma rota encontrada</p>
                        <p className="text-sm">Tente ajustar os filtros ou crie uma nova rota</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoutes.map((route) => (
                    <RouteTableRow
                      key={route.id}
                      route={route}
                      onDuplicate={() => handleDuplicate(route)}
                      onDelete={() => setDeleteId(route.id)}
                      onStart={() => router.push(`/driver?routeId=${route.id}`)}
                      onView={() => router.push(`/routes/${route.id}`)}
                      onEdit={() => router.push(`/routes/${route.id}/edit`)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 🔥 Resultado da busca */}
        {searchTerm && filteredRoutes.length > 0 && (
          <div className="mt-4 text-right text-xs text-[#6B7280]">
            {filteredRoutes.length} resultado{filteredRoutes.length !== 1 ? 's' : ''} encontrado{filteredRoutes.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* ── Dialog de exclusão com loading inline ─────────────────────────────── */}
        <AlertDialog open={!!deleteId} onOpenChange={() => !isDeleting && setDeleteId(null)}>
          <AlertDialogContent className="bg-[#2C3E50] border border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Excluir Rota</AlertDialogTitle>
              <AlertDialogDescription className="text-[#9CA3AF]">
                Esta ação removerá todos os dados da rota do sistema. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border border-white/10 text-[#D1D5DB] hover:bg-white/10 hover:text-white">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white border-none disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
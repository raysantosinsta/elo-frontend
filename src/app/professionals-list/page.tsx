"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  Search,
  Plus,
  Users,
  Edit,
  Trash2,
  Phone,
  Mail,
  Shield,
  AlertCircle,
  Lock,
  UserCog,
  UserCheck,
  UserX,
  Loader2
} from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone: string;
  document?: string;
  professionalRole?: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
  };
};

type UsersResponse = {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type EditUserForm = {
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  document?: string;
  professionalRole?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

export default function UsersManagementPage() {
  const { user: currentUser, loading: authLoading, authFetch } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userToAction, setUserToAction] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'activate' | 'deactivate'>('delete');
  const [editLoading, setEditLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const editForm = useForm<EditUserForm>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "EMPLOYER",
      status: "ATIVO",
      document: "",
      professionalRole: "",
    },
  });

  // Buscar usuários apenas se usuário tem permissão
  useEffect(() => {
    if (currentUser && ['MASTER', 'ADMIN'].includes(currentUser.role)) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [currentUser, pagination.page, pagination.limit]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      let url = `${API_BASE}/users?page=${pagination.page}&limit=${pagination.limit}`;

      // Se não for MASTER, filtrar apenas usuários da mesma empresa
      if (currentUser?.role === 'ADMIN' && currentUser?.companyId) {
        url += `&companyId=${currentUser.companyId}`;
      }

      const response = await authFetch(url);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data: UsersResponse = await response.json();
      setUsers(data.data);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages
      }));
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await authFetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Falha ao deletar usuário');
      }

      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteDialogOpen(false);
      setUserToAction(null);
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao deletar usuário.");
    }
  };

  const handleStatusChange = async (id: string, action: 'activate' | 'deactivate') => {
    try {
      const endpoint = action === 'activate' ? 'activate' : 'deactivate';
      const response = await authFetch(`${API_BASE}/users/${id}/${endpoint}`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error(`Falha ao ${action === 'activate' ? 'ativar' : 'desativar'} usuário`);
      }

      const updatedUser: User = await response.json();

      // Atualizar usuário na lista
      setUsers(prev => prev.map(u =>
        u.id === id ? { ...u, status: updatedUser.status } : u
      ));

      setStatusDialogOpen(false);
      setUserToAction(null);
    } catch (err) {
      console.error(err);
      alert(`❌ Erro ao ${action === 'activate' ? 'ativar' : 'desativar'} usuário.`);
    }
  };

  const handleEdit = async (data: EditUserForm) => {
  if (!userToAction) return;

  setEditLoading(true);
  try {
    const response = await authFetch(`${API_BASE}/users/${userToAction.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Falha ao atualizar usuário');
    }

    const updatedUser: User = await response.json();
    
    // 🔥 AGORA SIMPLES: A API já retorna com company
    setUsers(prev => prev.map(u => 
      u.id === updatedUser.id ? updatedUser : u
    ));

    setEditDialogOpen(false);
    setUserToAction(null);
    editForm.reset();
    
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    alert('❌ Erro ao atualizar usuário');
  } finally {
    setEditLoading(false);
  }
};

  const openActionDialog = (user: User, type: 'delete' | 'activate' | 'deactivate') => {
    setUserToAction(user);
    setActionType(type);

    if (type === 'delete') {
      setDeleteDialogOpen(true);
    } else {
      setStatusDialogOpen(true);
    }
  };

  const openEditDialog = (user: User) => {
    setUserToAction(user);
    editForm.reset({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      document: user.document || "",
      professionalRole: user.professionalRole || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    if (!open) {
      editForm.reset();
      setUserToAction(null);
    }
    setEditDialogOpen(open);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    const variants = {
      MASTER: { variant: 'default' as const, class: 'bg-purple-600 hover:bg-purple-700' },
      ADMIN: { variant: 'default' as const, class: 'bg-blue-600 hover:bg-blue-700' },
      EMPLOYER: { variant: 'secondary' as const, class: '' }
    };

    const roleConfig = variants[role as keyof typeof variants] || variants.EMPLOYER;

    return (
      <Badge variant={roleConfig.variant} className={roleConfig.class}>
        <Shield className="h-3 w-3 mr-1" />
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'ATIVO' ? 'default' : 'secondary'}>
        {status === 'ATIVO' ? (
          <UserCheck className="h-3 w-3 mr-1" />
        ) : (
          <UserX className="h-3 w-3 mr-1" />
        )}
        {status}
      </Badge>
    );
  };

  const canEditUser = (targetUser: User) => {
    if (!currentUser) return false;

    // MASTER pode editar qualquer um
    if (currentUser.role === 'MASTER') return true;

    // ADMIN só pode editar usuários da mesma empresa
    if (currentUser.role === 'ADMIN') {
      return targetUser.companyId === currentUser.companyId;
    }

    return false;
  };

  const canDeleteUser = (targetUser: User) => {
    if (!currentUser) return false;

    // Não pode deletar a si mesmo
    if (targetUser.id === currentUser.id) return false;

    // MASTER pode deletar qualquer um (exceto a si mesmo)
    if (currentUser.role === 'MASTER') return true;

    // ADMIN só pode deletar usuários da mesma empresa (exceto a si mesmo)
    if (currentUser.role === 'ADMIN') {
      return targetUser.companyId === currentUser.companyId && targetUser.id !== currentUser.id;
    }

    return false;
  };

  // Se ainda está verificando autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-dashed rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se usuário não está autenticado
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar autenticado para acessar esta página.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <a href="/login">Fazer Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se usuário não tem permissão (não é MASTER ou ADMIN)
  if (!['MASTER', 'ADMIN'].includes(currentUser.role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Apenas administradores e usuários master podem visualizar esta página.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center">
              {getRoleBadgeVariant(currentUser.role)}
            </div>
            <p className="text-sm text-muted-foreground">
              Sua role atual: <strong>{currentUser.role}</strong>
            </p>
            <Button variant="outline" asChild>
              <a href="/dashboard">Voltar ao Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header com info do usuário */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <UserCog className="h-8 w-8 text-primary" />
                Gerenciar Usuários
              </h1>
              {getRoleBadgeVariant(currentUser.role)}
            </div>
            <p className="text-muted-foreground">
              Gerencie todos os usuários do sistema • {currentUser.name}
              {currentUser.company && ` • ${currentUser.company.name}`}
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários por nome, email, cargo ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Filtros
                </Button>
                {currentUser.role === 'MASTER' && (
                  <Button variant="outline" size="sm" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Master
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              {filteredUsers.length} usuário(s) encontrado(s) de {pagination.total} •
              Acesso: {currentUser.role}
              {currentUser.company && ` • ${currentUser.company.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Users className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">
                    {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Tente ajustar os termos da busca" : "Comece adicionando um novo usuário"}
                  </p>
                </div>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Usuário
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Cargo/Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                              {user.professionalRole && (
                                <div className="text-xs text-muted-foreground">
                                  {user.professionalRole}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRoleBadgeVariant(user.role)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {user.company?.name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(user.createdAt).toLocaleTimeString('pt-BR')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={!canEditUser(user)}>
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Abrir menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>

                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => openEditDialog(user)}
                                disabled={!canEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>

                              {user.status === 'ATIVO' ? (
                                <DropdownMenuItem
                                  className="gap-2 text-amber-600 focus:text-amber-600"
                                  onClick={() => openActionDialog(user, 'deactivate')}
                                  disabled={!canEditUser(user) || user.id === currentUser.id}
                                >
                                  <UserX className="h-4 w-4" />
                                  Desativar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="gap-2 text-green-600 focus:text-green-600"
                                  onClick={() => openActionDialog(user, 'activate')}
                                  disabled={!canEditUser(user)}
                                >
                                  <UserCheck className="h-4 w-4" />
                                  Ativar
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive"
                                onClick={() => openActionDialog(user, 'delete')}
                                disabled={!canDeleteUser(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages} •
                  Total: {pagination.total} usuários
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o usuário{" "}
              <span className="font-semibold text-foreground">
                {userToAction?.name}
              </span>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToAction && handleDelete(userToAction.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'activate' ? 'Ativar Usuário' : 'Desativar Usuário'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'activate'
                ? `Tem certeza que deseja ativar o usuário ${userToAction?.name}?`
                : `Tem certeza que deseja desativar o usuário ${userToAction?.name}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToAction && (actionType === 'activate' || actionType === 'deactivate')) {
                  handleStatusChange(userToAction.id, actionType);
                }
              }}
              className={actionType === 'activate'
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-amber-600 text-white hover:bg-amber-700"
              }
            >
              {actionType === 'activate' ? 'Ativar' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Faça alterações no perfil do usuário. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o email" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perfil</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o perfil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EMPLOYER">Employer</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MASTER">Master</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ATIVO">Ativo</SelectItem>
                          <SelectItem value="INATIVO">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="professionalRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo Profissional (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Gerente, Desenvolvedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleEditDialogOpenChange(false)}
                  disabled={editLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editLoading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}



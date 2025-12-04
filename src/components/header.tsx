"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useLogout } from "@/hooks/use-logout"; // Certifique-se de ter criado este hook
import {
    Bell,
    Search,
    Menu,
    LogOut,
    User as UserIcon,
    Settings,
    CreditCard,
    LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

interface HeaderProps {
    onMenuClick?: () => void; // Prop para abrir o sidebar no mobile
}

export function Header({ onMenuClick }: HeaderProps) {
    const { user } = useAuth();
    const logout = useLogout();

    // Função para gerar iniciais (ex: "João Silva" -> "JS")
    const getInitials = (name: string | undefined) => {
        if (!name) return "US";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all">

            {/* --- ESQUERDA: Menu Mobile & Logo/Breadcrumb --- */}
            <div className="flex items-center gap-4">
                {/* Botão Hamburger (Apenas Mobile) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                </Button>

                {/* Breadcrumb Simples ou Título da Página */}
                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">

                    <span className="text-foreground font-medium">Visão Geral</span>
                </div>
            </div>

            {/* --- CENTRO: Barra de Busca Global --- */}
            <div className="ml-auto flex-1 md:grow-0">
                <div className="relative w-full md:w-64 lg:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar..."
                        className="w-full h-9 rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px] focus-visible:ring-1"
                    />
                </div>
            </div>

            {/* --- DIREITA: Ações de Usuário --- */}
            <div className="flex items-center gap-4">

                {/* Botão de Notificações */}
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {/* Badge de notificação (Ponto Vermelho) */}
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-background animate-pulse" />
                    <span className="sr-only">Notificações</span>
                </Button>

                {/* Separador Visual Pequeno */}
                <div className="h-6 w-px bg-border hidden sm:block" />

                {/* Menu Dropdown do Usuário */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
                            <Avatar className="h-9 w-9 border cursor-pointer hover:opacity-80 transition-opacity">
                                {/* Se tiver URL de foto no user, use aqui. Caso contrário, fallback. */}
                                <AvatarImage src="" alt={user?.name} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                    {getInitials(user?.name)}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none truncate">
                                    {user?.name}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground truncate">
                                    {user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                            <DropdownMenuItem className="cursor-pointer">
                                <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>Perfil</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                                <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>Cobrança</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>Configurações</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            onClick={logout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair do Sistema</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
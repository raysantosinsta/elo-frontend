/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, UserIcon, ChevronDown, Menu } from "lucide-react"; // Importe Menu
import { useSidebar } from "@/hooks/SidebarContext";

export function Header() {
    const { user, logout, isAuthenticated } = useAuth();
    const { toggle } = useSidebar(); // Hook para abrir a sidebar
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const roleLabels: Record<string, string> = {
        MASTER: "Master",
        ADMIN: "Administrador",
        EMPLOYER: "Colaborador",
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const formatName = (fullName: string) => {
        if (!fullName) return "Visitante";
        const names = fullName.split(" ");
        return names.length > 1 ? `${names[0]} ${names[names.length - 1]}` : names[0];
    };

    return (
        <header className="w-full h-20 bg-[#2C3E50] text-white flex items-center justify-between px-4 md:px-6 shadow-md relative z-50 border-b border-[#2C3E50]">
            
            {/* --- LADO ESQUERDO --- */}
            <div className="flex items-center gap-4">
                
                {/* BOTÃO HAMBURGUER (Apenas Mobile) */}
                <button 
                    onClick={toggle}
                    className="md:hidden p-2 text-white hover:bg-white/10 rounded-md transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>

                {/* Logo Area */}
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="h-9 w-9 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10 transition-all group-hover:bg-white/20">
                        <div className="w-5 h-5 bg-[#D35400] rounded-full shadow-inner" /> 
                    </div>
                    {/* No mobile, oculta o texto se a tela for muito pequena */}
                    <span className="font-bold text-lg tracking-wider text-white group-hover:text-[#F5F0E6] transition-colors hidden sm:block">
                        ELO PRODUTIVO
                    </span>
                </div>
            </div>

            {/* --- CENTRO: CARGO --- */}
            {user && (
                <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2D3436]/50 border border-white/5 shadow-inner">
                    <span className="text-xs text-[#95A5A6] font-medium uppercase tracking-wider">Perfil</span>
                    <span className="w-1 h-1 bg-[#95A5A6] rounded-full" />
                    <span className="text-sm font-semibold text-white tracking-wide">
                        {roleLabels[user.role] || user.role}
                    </span>
                </div>
            )}

            {/* --- LADO DIREITO: PERFIL --- */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 transition-all focus:outline-none group"
                >
                    <div className="flex flex-col items-end mr-1">
                        <span className="font-semibold text-sm leading-none text-white group-hover:text-[#D35400] transition-colors">
                            {isAuthenticated ? formatName(user?.name || "") : "Acesse"}
                        </span>
                        {isAuthenticated && (
                           <span className="text-[10px] text-[#95A5A6] mt-0.5">Online</span> 
                        )}
                    </div>

                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D35400] to-[#A04000] flex items-center justify-center shadow-lg border-2 border-[#2C3E50] group-hover:scale-105 transition-transform">
                        <span className="text-white text-sm font-bold">
                            {isAuthenticated ? (user?.name?.charAt(0).toUpperCase() || "U") : "?"}
                        </span>
                    </div>

                    <ChevronDown size={14} className={`text-[#95A5A6] transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl py-2 text-[#2D3436] animate-in fade-in slide-in-from-top-2 duration-200 border border-[#95A5A6]/20 ring-1 ring-black/5 origin-top-right z-50">
                        <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white rotate-45 border-t border-l border-[#95A5A6]/20"></div>
                        
                        {isAuthenticated ? (
                            <>
                                <div className="px-5 py-3 border-b border-[#F5F0E6]">
                                    <p className="text-[10px] uppercase font-bold text-[#95A5A6] mb-1">Conta Atual</p>
                                    <p className="text-sm font-semibold truncate text-[#2C3E50]">{user?.email}</p>
                                </div>
                                <div className="p-2 space-y-1">
                                    <Link href="/" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#2D3436] rounded-lg hover:bg-[#F5F0E6] hover:text-[#D35400] transition-colors">
                                        <UserIcon size={16} />
                                        <span>Meu Perfil</span>
                                    </Link>
                                </div>
                                <div className="border-t border-[#F5F0E6] my-1 mx-2"></div>
                                <div className="p-2">
                                    <button onClick={() => { logout(); setIsDropdownOpen(false); }} className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                                        <LogOut size={16} />
                                        <span>Encerrar Sessão</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="p-2 space-y-1">
                                <Link href="/login" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#2C3E50] rounded-lg hover:bg-[#F5F0E6]" onClick={() => setIsDropdownOpen(false)}>Fazer Login</Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
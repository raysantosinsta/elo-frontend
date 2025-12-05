/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, UserIcon, ChevronDown, Menu } from "lucide-react";

export function Header() {
    const { user, logout, isAuthenticated } = useAuth();
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
        // Header com Azul Petróleo (#2C3E50) conforme definido para Navegação
        <header className="w-full h-16 bg-[#2C3E50] text-white flex items-center justify-between px-6 shadow-md relative z-50 border-b border-[#2C3E50]">

            {/* --- LADO ESQUERDO: LOGO --- */}
            <div className="flex items-center gap-4">
                {/* Logo Area */}
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="h-9 w-9 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10 transition-all group-hover:bg-white/20">
                        {/* Placeholder para logo, usando um ícone ou imagem */}
                        <div className="w-5 h-5 bg-[#D35400] rounded-full shadow-inner" /> 
                        {/* Se tiver imagem real: 
                        <img src="/logo.png" className="h-6 w-auto object-contain" alt="Logo" /> 
                        */}
                    </div>
                    <span className="font-bold text-lg tracking-wider text-white group-hover:text-[#F5F0E6] transition-colors">
                        ELO PRODUTIVO
                    </span>
                </div>
            </div>

            {/* --- CENTRO: CARGO (Indicador Visual) --- */}
            {user && (
                <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2D3436]/50 border border-white/5 shadow-inner">
                    <span className="text-xs text-[#95A5A6] font-medium uppercase tracking-wider">Perfil</span>
                    <span className="w-1 h-1 bg-[#95A5A6] rounded-full" />
                    <span className="text-sm font-semibold text-white tracking-wide">
                        {roleLabels[user.role] || user.role}
                    </span>
                </div>
            )}

            {/* --- LADO DIREITO: PERFIL & DROPDOWN --- */}
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

                    <ChevronDown 
                        size={14} 
                        className={`text-[#95A5A6] transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} 
                    />
                </button>

                {/* --- MENU DROPDOWN --- */}
                {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl py-2 text-[#2D3436] animate-in fade-in slide-in-from-top-2 duration-200 border border-[#95A5A6]/20 ring-1 ring-black/5 origin-top-right">
                        
                        {/* Seta decorativa */}
                        <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white rotate-45 border-t border-l border-[#95A5A6]/20"></div>

                        {isAuthenticated ? (
                            <>
                                <div className="px-5 py-3 border-b border-[#F5F0E6]">
                                    <p className="text-[10px] uppercase font-bold text-[#95A5A6] mb-1">Conta Atual</p>
                                    <p className="text-sm font-semibold truncate text-[#2C3E50]">{user?.email}</p>
                                </div>

                                <div className="p-2 space-y-1">
                                    <Link
                                        href="/profile"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#2D3436] rounded-lg hover:bg-[#F5F0E6] hover:text-[#D35400] transition-colors"
                                    >
                                        <UserIcon size={16} />
                                        <span>Meu Perfil</span>
                                    </Link>
                                    
                                    {/* Link adicional exemplo para configurações */}
                                    {/* <Link href="/settings" ... /> */}
                                </div>

                                <div className="border-t border-[#F5F0E6] my-1 mx-2"></div>

                                <div className="p-2">
                                    <button
                                        onClick={() => {
                                            logout();
                                            setIsDropdownOpen(false);
                                        }}
                                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        <span>Encerrar Sessão</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="p-2 space-y-1">
                                <Link
                                    href="/login"
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#2C3E50] rounded-lg hover:bg-[#F5F0E6]"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    Fazer Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#D35400] rounded-lg hover:bg-[#F5F0E6]"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    Criar Nova Conta
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
// "use client";

// import React, { useState, useRef, useEffect } from "react";
// import Link from "next/link";
// import { useAuth } from "@/contexts/AuthContext"; // Ajuste o caminho se necessário
// import { LogOut, UserIcon } from "lucide-react";

// export function Header() {
//     const { user, logout, isAuthenticated } = useAuth();
//     const [isDropdownOpen, setIsDropdownOpen] = useState(false);
//     const dropdownRef = useRef<HTMLDivElement>(null);

//     // Dicionário para traduzir os Enums
//     const roleLabels: Record<string, string> = {
//         MASTER: "Master",
//         ADMIN: "Administrador",
//         EMPLOYER: "Colaborador",
//     };

//     // Fecha o dropdown se clicar fora dele
//     useEffect(() => {
//         function handleClickOutside(event: MouseEvent) {
//             if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//                 setIsDropdownOpen(false);
//             }
//         }
//         document.addEventListener("mousedown", handleClickOutside);
//         return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, []);

//     const formatName = (fullName: string) => {
//         if (!fullName) return "Visitante";
//         const names = fullName.split(" ");
//         return names.length > 1 ? `${names[0]} ${names[names.length - 1]}` : names[0];
//     };

//     return (
//         <header className="w-full h-16 bg-[#004d40] text-white flex items-center justify-between px-6 shadow-md relative z-50">

//             {/* --- LADO ESQUERDO: LOGO --- */}
//             <div className="flex items-center gap-3">
//                 {/* Substitua '/logo.png' pelo caminho real da sua imagem na pasta public */}
//                 <div className="h-10 w-10 relative flex items-center justify-center">
//                     {/* Exemplo de Logo usando tag img padrão */}
//                     <img
//                         src="/logo.png"
//                         className="h-full w-auto object-contain"

//                     />
//                 </div>
//                 <span className="font-bold text-xl tracking-wide">ELO PRODUTIVO</span>
//             </div>

//             {/* --- CENTRO: CARGO (Só aparece se logado) --- */}
//             {user && (
//                 <div className="hidden md:flex items-center bg-[#00695c] px-4 py-1 rounded-md border border-white/20 shadow-sm">
//                     <span className="text-sm font-light text-gray-200 mr-2">Operando:</span>
//                     <span className="font-medium text-white tracking-wide">
//                         {roleLabels[user.role] || user.role}
//                     </span>
//                 </div>
//             )}

//             {/* --- LADO DIREITO: PERFIL & DROPDOWN --- */}
//             <div className="relative" ref={dropdownRef}>

//                 {/* Botão Gatilho do Menu */}
//                 <button
//                     onClick={() => setIsDropdownOpen(!isDropdownOpen)}
//                     className="flex items-center gap-3 hover:bg-white/10 p-2 rounded transition-colors focus:outline-none"
//                 >
//                     <div className="flex flex-col items-end">
//                         <span className="font-semibold text-sm leading-tight">
//                             {isAuthenticated ? formatName(user?.name || "") : "Acesse sua conta"}
//                         </span>
//                     </div>

//                     <div className="w-8 h-8 rounded-full bg-[#00796b] flex items-center justify-center border border-white/30 text-sm font-bold shadow-sm">
//                         {isAuthenticated ? (user?.name?.charAt(0).toUpperCase() || "U") : "?"}
//                     </div>

//                     {/* Ícone da Seta (Gira quando aberto) */}
//                     <span className={`text-xs transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}>
//                         ▼
//                     </span>
//                 </button>

//                 {/* --- MENU DROPDOWN --- */}
//                 {isDropdownOpen && (
//                     <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 text-gray-700 animate-in fade-in zoom-in-95 duration-100 border border-gray-100">

//                         {/* Seta decorativa no topo do dropdown (opcional) */}
//                         <div className="absolute -top-1 right-4 w-2 h-2 bg-white rotate-45 border-t border-l border-gray-100"></div>

//                         {isAuthenticated ? (
//                             // -- Opções para Usuário LOGADO --
//                             <>
//                                 <div className="px-4 py-3 border-b border-gray-100 mb-1">
//                                     <p className="text-xs text-gray-500">Logado como</p>
//                                     <p className="text-sm font-semibold truncate">{user?.email}</p>
//                                 </div>

//                                 <Link
//                                     href="/"
//                                     onClick={() => setIsDropdownOpen(false)}
//                                     className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#004d40] transition-colors w-full"
//                                 >
//                                     <UserIcon size={16} /> {/* Ajuste o tamanho se necessário */}
//                                     <span>Perfil</span>
//                                 </Link>



//                                 <div className="border-t border-gray-100 my-1"></div>

//                                 <div className="flex align-items-center ">
//                                     <button
//                                         onClick={() => {
//                                             logout();
//                                             setIsDropdownOpen(false);
//                                         }}
//                                         className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
//                                     >
//                                         <LogOut size={16} />
//                                         <span>Sair</span>
//                                     </button>
//                                 </div>
//                             </>
//                         ) : (
//                             // -- Opções para Usuário DESLOGADO --
//                             <>
//                                 <Link
//                                     href="/login"
//                                     className="block px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
//                                     onClick={() => setIsDropdownOpen(false)}
//                                 >
//                                     Fazer Login
//                                 </Link>
//                                 <Link
//                                     href="/register"
//                                     className="block px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
//                                     onClick={() => setIsDropdownOpen(false)}
//                                 >
//                                     Criar Conta
//                                 </Link>
//                             </>
//                         )}
//                     </div>
//                 )}
//             </div>
//         </header>
//     );
// }
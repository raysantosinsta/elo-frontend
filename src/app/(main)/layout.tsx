"use client";

import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { socketService } from "@/hooks/socket";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Conecta o socket globalmente assim que o usuário existir
  useEffect(() => {
    if (user) {
      socketService.connect();
      socketService.joinUserRoom(user.id);
      if (user.companyId) {
        socketService.joinCompanyRoom(user.companyId);
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen w-full bg-background">
      <div className="hidden md:block h-full border-r">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden ml-[-1px]">
        <Header />
        <main className={cn(
          "flex-1 overflow-y-auto bg-muted/10",
          // Mobile (até 768px): sem padding
          "p-0",
          // Tablet e desktop: com padding
          "md:p-4 lg:p-6"
        )}>
          <div className={cn(
            "animate-in fade-in duration-500 w-full",
            // Mobile: sem max-width e sem margin
            "max-w-none mx-0",
            // Desktop: max-width e margin centralizada
            "md:max-w-7xl md:mx-auto"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
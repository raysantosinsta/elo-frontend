// app/layout.tsx
import { AuthProvider } from "@/contexts/AuthContext";
import "leaflet/dist/leaflet.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { SidebarProvider } from "@/hooks/SidebarContext";
import { ErrorProvider } from "@/contexts/error-context";
import QueryProvider from "@/providers/query-provider"; // <-- Importado aqui

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ELO PRODUTIVO",
  description: "ELO Produtivo",
  icons: {
    icon: "/icone.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <QueryProvider> {/* 1. Coloque o QueryProvider aqui */}
            <SidebarProvider>
              <ErrorProvider>
                {children} {/* 2. Agora o MainLayout e as páginas estão protegidos */}
              </ErrorProvider>
              <Toaster position="top-right" richColors closeButton />
            </SidebarProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
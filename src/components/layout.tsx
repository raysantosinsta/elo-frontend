// app/(main)/layout.tsx
"use client";

import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { Sidebar } from "@/components/sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WebSocketProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </WebSocketProvider>
  );
}

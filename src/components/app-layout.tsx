// components/layout/app-layout.tsx
"use client";

import { Sidebar } from "./sidebar";
import { useState } from "react";

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
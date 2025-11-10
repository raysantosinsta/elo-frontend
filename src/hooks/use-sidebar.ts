// // hooks/use-sidebar.ts
// "use client";

// import { createContext, useContext, useState, ReactNode } from "react";

// // Interface do contexto
// interface SidebarContextType {
//   isCollapsed: boolean;
//   toggleSidebar: () => void;
// }

// // Criar o contexto com valor padrão
// const SidebarContext = createContext<SidebarContextType>({
//   isCollapsed: false,
//   toggleSidebar: () => {},
// });

// // Provider component
// interface SidebarProviderProps {
//   children: ReactNode;
// }

// export function SidebarProvider({ children }: SidebarProviderProps) {
//   const [isCollapsed, setIsCollapsed] = useState(false);

//   const toggleSidebar = () => {
//     setIsCollapsed(!isCollapsed);
//   };

//   return (
//     <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
//       {children}
//     </SidebarContext.Provider>
//   );
// }

// // Hook para usar o contexto
// export function useSidebar() {
//   const context = useContext(SidebarContext);
  
//   if (context === undefined) {
//     throw new Error("useSidebar must be used within a SidebarProvider");
//   }
  
//   return context;
// }
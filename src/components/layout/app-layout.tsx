import * as React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { ShoppingBag } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          {/* Mobile Header: Visible solo en móviles */}
          <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex items-center gap-2 font-bold text-lg">
              <ShoppingBag className="h-6 w-6 text-accent" />
              <span>VENDIX<span className="text-accent">PRO</span></span>
            </div>
          </header>
          
          <main className="flex-1 p-4 md:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  Wallet,
  Receipt,
  Users,
  LogOut,
  ShoppingBag,
  UserCircle
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: ShoppingCart, label: "Punto de Venta", href: "/pos" },
  { icon: Package, label: "Inventario", href: "/inventory" },
  { icon: History, label: "Historial de Ventas", href: "/sales" },
  { icon: Wallet, label: "Control de Caja", href: "/cash" },
  { icon: Receipt, label: "Gastos", href: "/expenses" },
  { icon: Users, label: "Clientes / Cuentas", href: "/clients" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Sesión cerrada",
        description: "Has salido del sistema correctamente.",
      });
      router.push("/auth");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cerrar sesión",
        description: "No se pudo cerrar la sesión. Intenta de nuevo.",
      });
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl group-data-[collapsible=icon]:justify-center">
          <ShoppingBag className="h-8 w-8 text-accent shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">VENDIX<span className="text-accent">PRO</span></span>
        </Link>
      </SidebarHeader>
      <SidebarSeparator className="opacity-10" />
      <SidebarContent className="py-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
                className="hover:bg-sidebar-accent transition-colors py-6"
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        {user && !user.isAnonymous && (
          <div className="px-2 py-2 mb-2 bg-accent/10 rounded-lg group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
              <UserCircle className="h-8 w-8 text-accent" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold truncate">{user.displayName || "Usuario"}</span>
                <span className="text-[10px] opacity-70 truncate">{user.email}</span>
              </div>
            </div>
          </div>
        )}
        
        <SidebarMenu>
          <SidebarMenuItem>
            {user && !user.isAnonymous ? (
              <SidebarMenuButton 
                onClick={handleLogout}
                className="text-red-300 hover:text-red-100 hover:bg-red-900/20 py-6"
                tooltip="Cerrar Sesión"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton 
                asChild
                className="text-accent hover:bg-accent/10 py-6"
                tooltip="Iniciar Sesión"
              >
                <Link href="/auth">
                  <UserCircle className="h-5 w-5" />
                  <span>Iniciar Sesión</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

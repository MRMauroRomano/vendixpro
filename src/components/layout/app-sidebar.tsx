"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  Wallet,
  Receipt,
  Users,
  LogOut,
  ShoppingBag
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
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-red-300 hover:text-red-100 hover:bg-red-900/20">
              <LogOut className="h-5 w-5" />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

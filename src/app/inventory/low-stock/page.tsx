
"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button"; 
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { AlertTriangle, Loader2, PackageOpen, ArrowRight } from "lucide-react";
import { useFirestore, useUser, useMemoFirebase, useCollection } from "@/firebase";
import { collection } from "firebase/firestore";
import Link from "next/link";

export default function LowStockPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const productsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "products");
  }, [firestore, user?.uid]);

  const { data: products = [], isLoading } = useCollection(productsRef);

  // Filtramos productos con stock <= 5
  const lowStockProducts = products.filter(p => (p.stockQuantity || 0) <= 5);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              Alertas de Stock Bajo
            </h1>
            <p className="text-muted-foreground">Productos que necesitan reposición urgente (menor o igual a 5 unidades).</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/inventory" className="gap-2">
              Ver Todo el Inventario
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-sm text-orange-800 font-semibold mb-1">Productos en Alerta</div>
            <div className="text-3xl font-bold text-orange-950">{lowStockProducts.length}</div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Stock Actual</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Proveedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded overflow-hidden bg-muted border flex-shrink-0">
                          <img 
                            src={product.imageUrl || `https://picsum.photos/seed/${product.id}/40/40`} 
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        {product.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground uppercase">
                        {product.category || "General"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700`}>
                        {product.stockQuantity || 0} unidades
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">${product.price?.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{product.provider || "-"}</TableCell>
                  </TableRow>
                ))}
                {lowStockProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <PackageOpen className="h-10 w-10 opacity-20" />
                        <p className="text-lg font-medium">¡Todo al día!</p>
                        <p className="text-sm">No hay productos con stock crítico actualmente.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

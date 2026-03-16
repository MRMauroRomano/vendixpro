"use client";

import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Save, 
  Loader2, 
  Package,
  ImageIcon,
  DollarSign,
  CheckCircle2
} from "lucide-react";
import { 
  useFirestore, 
  useUser, 
  useMemoFirebase, 
  useCollection, 
  updateDocumentNonBlocking 
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function BulkEditPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [localChanges, setLocalChanges] = useState<Record<string, any>>({});
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  const productsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "products");
  }, [firestore, user?.uid]);

  const { data: productsData, isLoading } = useCollection(productsRef);
  const products = productsData || [];

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      String(p.name || "").toLowerCase().includes(term) ||
      String(p.sku || "").toLowerCase().includes(term) ||
      String(p.category || "").toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleLocalChange = (productId: string, field: string, value: any) => {
    setLocalChanges(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [field]: value
      }
    }));
  };

  const handleUpdateProduct = (product: any) => {
    if (!user || !firestore) return;
    
    const changes = localChanges[product.id];
    if (!changes) {
      toast({ title: "Sin cambios", description: "No has modificado este producto." });
      return;
    }

    setIsUpdatingId(product.id);
    const docRef = doc(firestore, "users", user.uid, "products", product.id);
    
    const updates: any = {
      ...changes,
      updatedAt: new Date().toISOString()
    };

    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.stockQuantity !== undefined) updates.stockQuantity = Number(updates.stockQuantity);

    updateDocumentNonBlocking(docRef, updates);
    
    setTimeout(() => {
      setIsUpdatingId(null);
      const newLocalChanges = { ...localChanges };
      delete newLocalChanges[product.id];
      setLocalChanges(newLocalChanges);
      
      toast({ 
        title: "Producto Actualizado", 
        description: `${product.name} ha sido guardado con éxito.` 
      });
    }, 500);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Editor Rápido de Inventario</h1>
            <p className="text-muted-foreground">Modifica precios, stock e imágenes directamente en la lista.</p>
          </div>
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, SKU o categoría..." 
              className="pl-12 h-12 shadow-sm border-primary/20 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="border-2 shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" />
              Lista de Productos ({filteredProducts.length})
            </CardTitle>
            <Badge variant="outline" className="bg-white font-bold text-primary">
              Cambios pendientes: {Object.keys(localChanges).length}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[80px]">Imagen</TableHead>
                    <TableHead className="min-w-[200px]">Producto / SKU</TableHead>
                    <TableHead className="w-[180px]">Precio ($)</TableHead>
                    <TableHead className="w-[150px]">Stock (u.)</TableHead>
                    <TableHead className="min-w-[350px]">URL Imagen</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                        <p className="mt-2 text-muted-foreground">Cargando productos...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.map((p) => {
                    const changes = localChanges[p.id] || {};
                    const isDirty = Object.keys(changes).length > 0;
                    
                    return (
                      <TableRow key={p.id} className={isDirty ? "bg-accent/5" : ""}>
                        <TableCell>
                          <div className="h-10 w-10 rounded-md border bg-muted overflow-hidden">
                            <img 
                              src={changes.imageUrl ?? p.imageUrl ?? `https://picsum.photos/seed/${p.id}/100/100`} 
                              alt="" 
                              className="h-full w-full object-cover" 
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm leading-tight">{p.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{p.sku || 'SIN SKU'}</span>
                            <Badge variant="secondary" className="w-fit text-[8px] mt-1 h-4 px-1">{p.category || 'General'}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              type="number"
                              className={`pl-6 h-9 font-bold ${isDirty && changes.price !== undefined ? 'border-accent ring-1 ring-accent' : ''}`}
                              value={changes.price ?? p.price ?? ""}
                              onChange={(e) => handleLocalChange(p.id, 'price', e.target.value)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number"
                            className={`h-9 font-bold text-center ${isDirty && changes.stockQuantity !== undefined ? 'border-accent ring-1 ring-accent' : ''}`}
                            value={changes.stockQuantity ?? p.stockQuantity ?? ""}
                            onChange={(e) => handleLocalChange(p.id, 'stockQuantity', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <ImageIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              className={`pl-7 h-9 text-xs font-mono truncate ${isDirty && changes.imageUrl !== undefined ? 'border-accent ring-1 ring-accent' : ''}`}
                              placeholder="https://..."
                              value={changes.imageUrl ?? p.imageUrl ?? ""}
                              onChange={(e) => handleLocalChange(p.id, 'imageUrl', e.target.value)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm"
                            className={`gap-2 font-bold transition-all ${isDirty ? 'bg-accent text-accent-foreground hover:bg-accent/90' : 'opacity-30'}`}
                            onClick={() => handleUpdateProduct(p)}
                            disabled={!isDirty || isUpdatingId === p.id}
                          >
                            {isUpdatingId === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            Guardar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProducts.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center opacity-40">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-12 w-12" />
                          <p className="font-bold text-lg">No se encontraron productos</p>
                          <p className="text-sm">Prueba ajustando los términos de búsqueda.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {Object.keys(localChanges).length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
            <Card className="bg-primary text-primary-foreground shadow-2xl border-none p-4 px-8 flex items-center gap-6 rounded-full">
               <div className="flex items-center gap-2">
                 <CheckCircle2 className="h-5 w-5 text-accent" />
                 <span className="font-bold whitespace-nowrap">
                   Tienes {Object.keys(localChanges).length} productos modificados
                 </span>
               </div>
               <Button 
                variant="secondary" 
                size="sm" 
                className="font-black text-xs"
                onClick={() => setLocalChanges({})}
               >
                 DESCARTAR TODO
               </Button>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

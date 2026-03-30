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
  CheckCircle2,
  XCircle,
  Hash,
  Barcode
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
  const [isSavingAll, setIsSavingAll] = useState(false);

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
    if (!changes) return;

    setIsUpdatingId(product.id);
    const docRef = doc(firestore, "users", user.uid, "products", product.id);
    
    const updates: any = {
      ...changes,
      updatedAt: new Date().toISOString()
    };

    if (updates.price !== undefined) updates.price = Number(updates.price) || 0;
    if (updates.stockQuantity !== undefined) updates.stockQuantity = Number(updates.stockQuantity) || 0;

    updateDocumentNonBlocking(docRef, updates);
    
    // Simular un pequeño feedback visual
    setTimeout(() => {
      setIsUpdatingId(null);
      setLocalChanges(prev => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      
      toast({ 
        title: "Producto Actualizado", 
        description: `${product.name} ha sido guardado correctamente.` 
      });
    }, 500);
  };

  const handleSaveAll = () => {
    if (!user || !firestore || Object.keys(localChanges).length === 0) return;

    setIsSavingAll(true);
    const entries = Object.entries(localChanges);

    entries.forEach(([productId, changes]) => {
      const docRef = doc(firestore, "users", user.uid, "products", productId);
      const updates: any = {
        ...changes,
        updatedAt: new Date().toISOString()
      };

      if (updates.price !== undefined) updates.price = Number(updates.price) || 0;
      if (updates.stockQuantity !== undefined) updates.stockQuantity = Number(updates.stockQuantity) || 0;

      updateDocumentNonBlocking(docRef, updates);
    });

    setTimeout(() => {
      setLocalChanges({});
      setIsSavingAll(false);
      toast({
        title: "Cambios Guardados",
        description: `Se han actualizado ${entries.length} productos exitosamente.`,
      });
    }, 1200);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary uppercase tracking-tight">Edición Rápida</h1>
            <p className="text-muted-foreground italic">Modifica SKU, Precios y Stock directamente en la lista.</p>
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
          <CardHeader className="bg-muted/30 border-b py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" />
              Catálogo de Productos ({filteredProducts.length})
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-white font-bold text-primary px-3 py-1">
                Cambios pendientes: {Object.keys(localChanges).length}
              </Badge>
              {Object.keys(localChanges).length > 0 && (
                <Button 
                  size="sm" 
                  onClick={handleSaveAll} 
                  disabled={isSavingAll}
                  className="bg-accent text-accent-foreground font-black hover:bg-accent/90 gap-2 shadow-md"
                >
                  {isSavingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  GUARDAR TODO
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[80px]">Imagen</TableHead>
                    <TableHead className="min-w-[150px]">Nombre</TableHead>
                    <TableHead className="w-[160px]">SKU / Código</TableHead>
                    <TableHead className="w-[140px]">Precio ($)</TableHead>
                    <TableHead className="w-[120px]">Stock (u.)</TableHead>
                    <TableHead className="min-w-[250px]">URL Imagen</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                        <p className="mt-2 text-muted-foreground font-medium">Cargando catálogo...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.map((p) => {
                    const changes = localChanges[p.id] || {};
                    const isDirty = Object.keys(changes).length > 0;
                    
                    return (
                      <TableRow key={p.id} className={`${isDirty ? "bg-accent/5" : ""} hover:bg-muted/10 transition-colors`}>
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
                            <span className="font-bold text-sm leading-tight truncate max-w-[140px]">{p.name}</span>
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">{p.category || 'General'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <Barcode className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              className={`pl-7 h-9 text-xs font-mono uppercase w-full ${isDirty && changes.sku !== undefined ? 'border-accent ring-1 ring-accent bg-accent/5' : ''}`}
                              value={changes.sku ?? p.sku ?? ""}
                              placeholder="Sin Código"
                              onChange={(e) => handleLocalChange(p.id, 'sku', e.target.value)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              type="number"
                              className={`pl-6 h-9 font-bold w-full ${isDirty && changes.price !== undefined ? 'border-accent ring-1 ring-accent bg-accent/5' : ''}`}
                              value={changes.price ?? p.price ?? 0}
                              onChange={(e) => handleLocalChange(p.id, 'price', e.target.value)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number"
                            className={`h-9 font-bold text-center w-full ${isDirty && changes.stockQuantity !== undefined ? 'border-accent ring-1 ring-accent bg-accent/5' : ''}`}
                            value={changes.stockQuantity ?? p.stockQuantity ?? 0}
                            onChange={(e) => handleLocalChange(p.id, 'stockQuantity', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <ImageIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              className={`pl-7 h-9 text-[11px] font-mono w-full ${isDirty && changes.imageUrl !== undefined ? 'border-accent ring-1 ring-accent bg-accent/5' : ''}`}
                              placeholder="https://..."
                              value={changes.imageUrl ?? p.imageUrl ?? ""}
                              onChange={(e) => handleLocalChange(p.id, 'imageUrl', e.target.value)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm"
                            className={`gap-2 font-bold h-9 transition-all ${isDirty ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'opacity-20 pointer-events-none'}`}
                            onClick={() => handleUpdateProduct(p)}
                            disabled={!isDirty || isUpdatingId === p.id || isSavingAll}
                          >
                            {isUpdatingId === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            <span className="hidden sm:inline">Guardar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoading && filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center opacity-40">
                        <div className="flex flex-col items-center gap-3">
                          <Search className="h-12 w-12" />
                          <p className="font-bold text-lg">No se encontraron productos</p>
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
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <Card className="bg-primary text-primary-foreground shadow-2xl border-none p-5 px-8 flex flex-col sm:flex-row items-center gap-6 rounded-2xl">
               <div className="flex items-center gap-3">
                 <CheckCircle2 className="h-6 w-6 text-accent" />
                 <div className="flex flex-col">
                   <span className="font-black text-sm uppercase tracking-wider">
                     {Object.keys(localChanges).length} cambios pendientes
                   </span>
                   <span className="text-[10px] opacity-70">Haz clic en Guardar para aplicar a la base de datos.</span>
                 </div>
               </div>
               <div className="flex gap-3 w-full sm:w-auto">
                 <Button 
                  variant="secondary" 
                  className="flex-1 sm:flex-none font-black text-xs h-10 px-6 bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                  onClick={handleSaveAll}
                  disabled={isSavingAll}
                 >
                   {isSavingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                   GUARDAR TODO
                 </Button>
                 <Button 
                  variant="ghost" 
                  className="flex-1 sm:flex-none font-bold text-xs h-10 px-6 text-white hover:bg-white/10 gap-2 border border-white/20"
                  onClick={() => setLocalChanges({})}
                  disabled={isSavingAll}
                 >
                   <XCircle className="h-3 w-3" />
                   DESCARTAR
                 </Button>
               </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

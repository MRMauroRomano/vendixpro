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
  Percent, 
  Save, 
  Loader2, 
  Package,
  ImageIcon,
  Tags,
  AlertCircle
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BulkEditPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [bulkStock, setBulkStock] = useState<string>("");
  const [bulkImageUrl, setBulkImageUrl] = useState<string>("");
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const productsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "products");
  }, [firestore, user?.uid]);

  const categoriesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "categories");
  }, [firestore, user?.uid]);

  const { data: productsData, isLoading } = useCollection(productsRef);
  const { data: categoriesData } = useCollection(categoriesRef);
  
  const products = productsData || [];
  const categories = categoriesData || [];

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      String(p.name || "").toLowerCase().includes(term) ||
      String(p.sku || "").toLowerCase().includes(term) ||
      String(p.category || "").toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleApplyChanges = async () => {
    if (!user || !firestore || filteredProducts.length === 0) return;
    
    // Validar que al menos algo haya cambiado
    if (percentageChange === 0 && bulkStock === "" && bulkImageUrl === "" && bulkCategory === "") {
      toast({
        variant: "destructive",
        title: "Sin cambios",
        description: "Debe completar al menos un campo para aplicar modificaciones.",
      });
      return;
    }

    setIsUpdating(true);
    let updatedCount = 0;

    try {
      const multiplier = 1 + (percentageChange / 100);
      
      for (const product of filteredProducts) {
        const docRef = doc(firestore, "users", user.uid, "products", product.id);
        const updates: any = {
          updatedAt: new Date().toISOString()
        };

        // Aplicar precio si hay cambio porcentual y no es variable
        if (percentageChange !== 0 && !product.isVariablePrice) {
          updates.price = Math.round((product.price || 0) * multiplier);
        }

        // Aplicar stock si se definió
        if (bulkStock !== "") {
          updates.stockQuantity = Number(bulkStock);
        }

        // Aplicar imagen si se definió
        if (bulkImageUrl !== "") {
          updates.imageUrl = bulkImageUrl;
        }

        // Aplicar categoría si se seleccionó
        if (bulkCategory !== "") {
          updates.category = bulkCategory;
        }
        
        updateDocumentNonBlocking(docRef, updates);
        updatedCount++;
      }

      toast({
        title: "Modificación Exitosa",
        description: `Se actualizaron ${updatedCount} productos con los nuevos valores.`,
      });

      // Limpiar campos
      setPercentageChange(0);
      setBulkStock("");
      setBulkImageUrl("");
      setBulkCategory("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error en el proceso",
        description: "Hubo un problema actualizando los productos.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-headline">Modificación Masiva Pro</h1>
          <p className="text-muted-foreground">Actualice múltiples campos de sus productos simultáneamente.</p>
        </div>

        <Card className="border-2 border-primary/10 shadow-lg overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-accent" />
              1. Filtrar productos a modificar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Busque por nombre, categoría o SKU para seleccionar el lote..." 
                className="pl-12 h-12 text-lg shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Los cambios se aplicarán <strong>únicamente</strong> a los {filteredProducts.length} productos visibles en la tabla inferior.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-accent/20 shadow-xl">
          <CardHeader className="bg-accent/5 border-b py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Save className="h-5 w-5 text-accent" />
              2. Definir nuevos valores para el lote
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Percent className="h-3 w-3" /> Ajuste Precio (%)
                </label>
                <Input 
                  type="number" 
                  placeholder="Ej: 10 o -5" 
                  value={percentageChange || ""}
                  onChange={(e) => setPercentageChange(Number(e.target.value))}
                  className="h-11 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Package className="h-3 w-3" /> Nuevo Stock (Fijo)
                </label>
                <Input 
                  type="number" 
                  placeholder="Cantidad para todos..." 
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  className="h-11 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="h-3 w-3" /> Nueva URL Imagen
                </label>
                <Input 
                  placeholder="https://..." 
                  value={bulkImageUrl}
                  onChange={(e) => setBulkImageUrl(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Tags className="h-3 w-3" /> Nueva Categoría
                </label>
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger className="h-11 font-medium">
                    <SelectValue placeholder="Cambiar a..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button 
                size="lg"
                className="px-10 h-14 text-lg font-black gap-3 shadow-lg hover:scale-105 transition-transform"
                onClick={handleApplyChanges}
                disabled={isUpdating || filteredProducts.length === 0}
              >
                {isUpdating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                APLICAR CAMBIOS A {filteredProducts.length} PRODUCTOS
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="bg-muted/50 p-4 border-b flex justify-between items-center">
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
              Previsualización de Cambios
            </span>
            <Badge variant="outline" className="bg-white">
              {filteredProducts.length} productos en lista
            </Badge>
          </div>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Producto / SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Imagen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.map((p) => {
                const simulatedPrice = percentageChange !== 0 && !p.isVariablePrice
                  ? Math.round((p.price || 0) * (1 + percentageChange / 100))
                  : null;
                
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="text-[9px] w-fit">{p.category || "General"}</Badge>
                        {bulkCategory && bulkCategory !== p.category && (
                          <span className="text-[10px] font-bold text-accent">➔ {bulkCategory}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">${(p.price || 0).toLocaleString()}</span>
                        {simulatedPrice && (
                          <span className="text-xs font-black text-accent">${simulatedPrice.toLocaleString()}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{p.stockQuantity || 0} u.</span>
                        {bulkStock !== "" && (
                          <span className="text-xs font-black text-accent">{bulkStock} u.</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <div className="h-8 w-8 rounded border overflow-hidden bg-muted">
                          <img 
                            src={bulkImageUrl || p.imageUrl || `https://picsum.photos/seed/${p.id}/50/50`} 
                            alt="" 
                            className={`h-full w-full object-cover ${bulkImageUrl ? 'border-2 border-accent' : ''}`} 
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProducts.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search className="h-12 w-12" />
                      <p className="font-bold text-lg">No hay productos seleccionados</p>
                      <p className="text-sm">Use la lupa de búsqueda para filtrar los productos que desea editar.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}

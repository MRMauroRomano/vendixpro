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
  DollarSign, 
  Save, 
  Loader2, 
  CheckCircle2, 
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

export default function BulkEditPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleApplyPercentage = async () => {
    if (!user || !firestore || percentageChange === 0) return;
    
    setIsUpdating(true);
    let updatedCount = 0;

    try {
      const multiplier = 1 + (percentageChange / 100);
      
      for (const product of filteredProducts) {
        if (product.isVariablePrice) continue; // No aplicamos a precios variables manuales

        const docRef = doc(firestore, "users", user.uid, "products", product.id);
        const newPrice = Math.round((product.price || 0) * multiplier);
        
        updateDocumentNonBlocking(docRef, {
          price: newPrice,
          updatedAt: new Date().toISOString()
        });
        updatedCount++;
      }

      toast({
        title: "Actualización Masiva Completa",
        description: `Se actualizaron los precios de ${updatedCount} productos correctamente.`,
      });
      setPercentageChange(0);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: "Hubo un problema procesando los cambios.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-headline">Modificación Masiva</h1>
          <p className="text-muted-foreground">Actualice precios de múltiples productos simultáneamente.</p>
        </div>

        <Card className="border-2 border-primary/10 shadow-lg">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5 text-accent" />
              Acciones por Lote
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 space-y-2 w-full">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  1. Filtrar productos (Lupa)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Busque por nombre, categoría o SKU para filtrar..." 
                    className="pl-10 h-12"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Los cambios se aplicarán SOLO a los productos visibles en la tabla de abajo.
                </p>
              </div>

              <div className="w-full md:w-[250px] space-y-2">
                <label className="text-sm font-bold">2. Ajuste de Precio (%)</label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    placeholder="Ej: 10 o -5" 
                    className="h-12 text-center font-bold"
                    value={percentageChange || ""}
                    onChange={(e) => setPercentageChange(Number(e.target.value))}
                  />
                  <Button 
                    className="h-12 px-6 font-black gap-2"
                    onClick={handleApplyPercentage}
                    disabled={isUpdating || percentageChange === 0 || filteredProducts.length === 0}
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    APLICAR
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="bg-muted/50 p-3 px-6 border-b flex justify-between items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Productos seleccionados por el filtro: {filteredProducts.length}
            </span>
            {filteredProducts.length > 0 && (
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                LISTOS PARA MODIFICAR
              </Badge>
            )}
          </div>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio Actual</TableHead>
                <TableHead className="text-right">Precio Nuevo (Simulado)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{p.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[9px] uppercase">{p.category || "General"}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${(p.price || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-black text-accent">
                    {percentageChange !== 0 ? (
                      `$${Math.round((p.price || 0) * (1 + percentageChange / 100)).toLocaleString()}`
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search className="h-12 w-12" />
                      <p className="font-bold">Use la lupa de arriba para filtrar productos</p>
                      <p className="text-xs">No hay productos que coincidan con la búsqueda.</p>
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

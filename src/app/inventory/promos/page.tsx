
"use client";

import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  Edit3, 
  Star,
  Layers,
  ImageIcon,
  Package,
  X,
  Minus as MinusIcon
} from "lucide-react";
import { 
  useFirestore, 
  useUser, 
  useMemoFirebase, 
  useCollection, 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function PromosManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const [bundleItems, setBundleItems] = useState<any[]>([]);

  const productsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "products");
  }, [firestore, user?.uid]);

  const { data: allProducts, isLoading } = useCollection(productsRef);

  const promos = useMemo(() => {
    return (allProducts || []).filter(p => p.category === "Promos");
  }, [allProducts]);

  const filteredPromos = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return promos.filter(p => 
      String(p.name || "").toLowerCase().includes(term) ||
      String(p.sku || "").toLowerCase().includes(term)
    );
  }, [promos, searchTerm]);

  const handleSavePromo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.uid || !productsRef || !firestore) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const price = Number(formData.get("price") || 0);
    const stock = Number(formData.get("stock") || 0);
    const imageUrl = (formData.get("imageUrl") as string) || `https://picsum.photos/seed/${name}/400/300`;

    const promoData = {
      name,
      price,
      stockQuantity: stock,
      category: "Promos",
      imageUrl,
      bundleItems: bundleItems,
      sku: (formData.get("sku") as string) || (editingPromo ? editingPromo.sku : `PRM-${Date.now()}`),
      updatedAt: new Date().toISOString()
    };

    if (editingPromo) {
      const docRef = doc(firestore, "users", user.uid, "products", editingPromo.id);
      updateDocumentNonBlocking(docRef, promoData);
      toast({ title: "Promo Actualizada" });
      setEditingPromo(null);
    } else {
      addDocumentNonBlocking(productsRef, { 
        ...promoData, 
        createdAt: new Date().toISOString() 
      });
      toast({ title: "Promo Creada" });
      setIsAddOpen(false);
    }
    setBundleItems([]);
  };

  const handleEdit = (promo: any) => {
    setEditingPromo(promo);
    setBundleItems(promo.bundleItems || []);
  };

  const handleDelete = (promoId: string) => {
    if (!user?.uid || !firestore) return;
    const docRef = doc(firestore, "users", user.uid, "products", promoId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Promo Eliminada" });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2 text-primary">
              <Star className="h-8 w-8 text-accent fill-accent" />
              Gestión de Promos Bebidas
            </h1>
            <p className="text-muted-foreground">Configura combos y define qué productos descuentan del inventario.</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) setBundleItems([]); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md h-12">
                <Plus className="h-5 w-5" />
                Nueva Promo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col p-0">
              <form onSubmit={handleSavePromo} className="flex flex-col h-full">
                <DialogHeader className="p-6 border-b">
                  <DialogTitle>Crear Nueva Promoción</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 p-6">
                  <PromoFields 
                    allProducts={allProducts || []} 
                    bundleItems={bundleItems} 
                    setBundleItems={setBundleItems} 
                  />
                </ScrollArea>
                <DialogFooter className="p-6 border-t bg-muted/20">
                  <Button type="submit" className="w-full h-12 font-bold text-lg">Guardar Promo</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre de combo..." 
            className="pl-12 h-12 text-base shadow-sm bg-white border-primary/20" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="p-24 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : (
          <div className="border-2 rounded-xl overflow-hidden bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[80px]">Imagen</TableHead>
                  <TableHead>Nombre del Combo</TableHead>
                  <TableHead>Componentes (Receta)</TableHead>
                  <TableHead className="text-right">Precio Combo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPromos.map((promo) => (
                  <TableRow key={promo.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell>
                      <div className="h-12 w-12 rounded-lg overflow-hidden border bg-muted">
                        <img 
                          src={promo.imageUrl || `https://picsum.photos/seed/${promo.id}/100/100`} 
                          alt="" 
                          className="h-full w-full object-cover" 
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{promo.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{promo.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(promo.bundleItems || []).map((item: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-[9px] font-black border-primary/20 bg-primary/5">
                            {item.quantity}x {item.productName}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary text-base">
                      ${(promo.price || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Dialog open={!!editingPromo && editingPromo.id === promo.id} onOpenChange={(open) => !open && setEditingPromo(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(promo)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col p-0">
                            <form onSubmit={handleSavePromo} className="flex flex-col h-full">
                              <DialogHeader className="p-6 border-b">
                                <DialogTitle>Editar Promo: {promo.name}</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="flex-1 p-6">
                                <PromoFields 
                                  promo={editingPromo}
                                  allProducts={allProducts || []} 
                                  bundleItems={bundleItems} 
                                  setBundleItems={setBundleItems} 
                                />
                              </ScrollArea>
                              <DialogFooter className="p-6 border-t bg-muted/20">
                                <Button type="submit" className="w-full h-12 font-bold text-lg">Actualizar Promo</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(promo.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPromos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24 text-muted-foreground">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <Star className="h-12 w-12" />
                        <p className="text-lg font-black uppercase tracking-widest">No hay promos cargadas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function PromoFields({ promo, allProducts, bundleItems, setBundleItems }: any) {
  const [prodSearch, setProdSearch] = useState("");

  const filteredBaseProducts = useMemo(() => {
    const term = prodSearch.toLowerCase().trim();
    if (!term) return [];
    return (allProducts || []).filter((p: any) => 
      p.category !== 'Promos' && 
      (String(p.name || "").toLowerCase().includes(term) || 
       String(p.sku || "").toLowerCase().includes(term) ||
       String(p.variant || "").toLowerCase().includes(term))
    ).slice(0, 5); // Limitamos a 5 resultados para no saturar
  }, [allProducts, prodSearch]);

  const addComponent = (product: any) => {
    const existingIdx = bundleItems.findIndex((bi: any) => bi.productId === product.id);
    if (existingIdx > -1) {
      const newItems = [...bundleItems];
      newItems[existingIdx].quantity += 1;
      setBundleItems(newItems);
    } else {
      setBundleItems([...bundleItems, { productId: product.id, productName: product.name, quantity: 1 }]);
    }
    setProdSearch("");
  };

  const removeComponent = (idx: number) => {
    setBundleItems(bundleItems.filter((_: any, i: number) => i !== idx));
  };

  const updateQuantity = (idx: number, delta: number) => {
    const newItems = [...bundleItems];
    newItems[idx].quantity = Math.max(1, newItems[idx].quantity + delta);
    setBundleItems(newItems);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-bold">Nombre de la Promo (Combo) *</label>
          <Input name="name" defaultValue={promo?.name} placeholder="Ej: Combo Fernet + 2 Cocas" required />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            URL de Imagen
          </label>
          <Input name="imageUrl" defaultValue={promo?.imageUrl} placeholder="https://..." />
        </div>
      </div>

      <div className="bg-primary/5 p-4 rounded-xl border-2 border-dashed border-primary/20 space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <Layers className="h-3 w-3" /> Configuración de Receta
        </h4>
        
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
            <Search className="h-3 w-3" /> Buscar Producto Base para añadir
          </label>
          <div className="relative">
            <Input
              placeholder="Escribe el nombre del producto..."
              className="h-11 bg-white border-accent/40 focus:ring-accent"
              value={prodSearch}
              onChange={(e) => setProdSearch(e.target.value)}
            />
            {filteredBaseProducts.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white border shadow-xl rounded-lg mt-1 z-50 overflow-hidden divide-y">
                {filteredBaseProducts.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/5 transition-colors text-left"
                    onClick={() => addComponent(p)}
                  >
                    <div className="h-8 w-8 rounded border bg-muted overflow-hidden shrink-0">
                      <img src={p.imageUrl || `https://picsum.photos/seed/${p.id}/50/50`} className="h-full w-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-primary truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.variant || 'u.'} | {p.category}</p>
                    </div>
                    <Plus className="h-4 w-4 text-accent" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-muted-foreground">Productos incluidos en esta Promo:</label>
          {bundleItems.map((bi: any, index: number) => (
            <div key={index} className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-1.5 rounded-md">
                   <Package className="h-3.5 w-3.5 text-accent" />
                </div>
                <span className="font-bold text-xs">{bi.productName}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md border">
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(index, -1)}>
                    <MinusIcon className="h-3 w-3" />
                  </Button>
                  <span className="w-4 text-center text-xs font-bold">{bi.quantity}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(index, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeComponent(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {bundleItems.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-[10px] italic border-2 border-dashed rounded-lg">
              Busca productos arriba para empezar a armar la promo.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-bold">Precio del Combo ($) *</label>
          <Input name="price" type="number" step="0.01" defaultValue={promo?.price} placeholder="0.00" className="h-12 text-lg font-bold" required />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold">SKU / Código</label>
          <Input name="sku" defaultValue={promo?.sku} placeholder="Opcional..." className="h-12" />
        </div>
      </div>
    </div>
  );
}

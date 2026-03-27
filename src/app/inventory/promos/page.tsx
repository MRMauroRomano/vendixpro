
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
  GlassWater,
  Cigarette,
  ImageIcon
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PromosManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  
  // State for bundle items
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
            <DialogContent className="sm:max-w-[550px]">
              <form onSubmit={handleSavePromo}>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Promoción</DialogTitle>
                </DialogHeader>
                <PromoFields 
                  allProducts={allProducts || []} 
                  bundleItems={bundleItems} 
                  setBundleItems={setBundleItems} 
                />
                <DialogFooter className="mt-6">
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
                        {(!promo.bundleItems || promo.bundleItems.length === 0) && (
                          <span className="text-[10px] text-muted-foreground italic">Sin componentes</span>
                        )}
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
                          <DialogContent className="sm:max-w-[550px]">
                            <form onSubmit={handleSavePromo}>
                              <DialogHeader>
                                <DialogTitle>Editar Promo: {promo.name}</DialogTitle>
                              </DialogHeader>
                              <PromoFields 
                                promo={promo}
                                allProducts={allProducts || []} 
                                bundleItems={bundleItems} 
                                setBundleItems={setBundleItems} 
                              />
                              <DialogFooter className="mt-6">
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
  const [selectedProd, setSelectedProd] = useState("");
  const [qty, setQty] = useState(1);

  const addComponent = () => {
    if (!selectedProd) return;
    const prod = allProducts.find((p: any) => p.id === selectedProd);
    if (!prod) return;

    const existingIdx = bundleItems.findIndex((bi: any) => bi.productId === prod.id);
    if (existingIdx > -1) {
      const newItems = [...bundleItems];
      newItems[existingIdx].quantity += qty;
      setBundleItems(newItems);
    } else {
      setBundleItems([...bundleItems, { productId: prod.id, productName: prod.name, quantity: qty }]);
    }
    setSelectedProd("");
    setQty(1);
  };

  const removeComponent = (idx: number) => {
    setBundleItems(bundleItems.filter((_: any, i: number) => i !== idx));
  };

  return (
    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
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

      <div className="bg-primary/5 p-4 rounded-xl border-2 border-dashed border-primary/20 space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <Layers className="h-3 w-3" /> Configuración de Receta
        </h4>
        <p className="text-[10px] text-muted-foreground italic">
          Seleccione los productos individuales que se descontarán del stock al vender este combo.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Select value={selectedProd} onValueChange={setSelectedProd}>
              <SelectTrigger className="pl-9">
                <SelectValue placeholder="Buscar y elegir producto base..." />
              </SelectTrigger>
              <SelectContent>
                {allProducts.filter((p: any) => p.category !== 'Promos').map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.variant ? `(${p.variant})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input 
            type="number" 
            className="w-20 font-bold" 
            value={qty} 
            onChange={(e) => setQty(Number(e.target.value))}
            min="1"
          />
          <Button type="button" size="icon" onClick={addComponent} className="bg-primary hover:bg-primary/90 shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {bundleItems.map((bi: any, index: number) => (
            <div key={index} className="flex justify-between items-center text-xs bg-white p-3 rounded-lg border shadow-sm">
              <div className="flex items-center gap-3">
                <span className="font-black text-accent bg-accent/10 px-2 py-0.5 rounded">x{bi.quantity}</span>
                <span className="font-bold">{bi.productName}</span>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => removeComponent(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {bundleItems.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-[11px] italic">
              Aún no has añadido componentes a esta promo.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-bold">Precio del Combo ($) *</label>
          <Input name="price" type="number" step="0.01" defaultValue={promo?.price} placeholder="0.00" required />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold">SKU / Código</label>
          <Input name="sku" defaultValue={promo?.sku} placeholder="Opcional..." />
        </div>
      </div>
    </div>
  );
}

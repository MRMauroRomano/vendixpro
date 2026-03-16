"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  Edit3, 
  TableProperties,
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function InventoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isVariablePrice, setIsVariablePrice] = useState(false);

  const productsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "products");
  }, [firestore, user?.uid]);

  const categoriesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "categories");
  }, [firestore, user?.uid]);

  const { data: productsData, isLoading: isProductsLoading } = useCollection(productsRef);
  const { data: categoriesData } = useCollection(categoriesRef);

  const products = useMemo(() => productsData || [], [productsData]);
  const categories = useMemo(() => categoriesData || [], [categoriesData]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      String(p.name || "").toLowerCase().includes(term) ||
      String(p.sku || "").toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.uid || !productsRef || !firestore) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const price = Number(formData.get("price") || 0);
    const stock = Number(formData.get("stock") || 0);
    const imageUrlInput = formData.get("imageUrl") as string;
    const imageUrl = imageUrlInput || `https://picsum.photos/seed/${name}/400/300`;

    const productData = {
      name,
      price,
      stockQuantity: stock,
      category: selectedCategory || "Sin Categoría",
      provider: formData.get("provider") as string || "",
      sku: formData.get("sku") as string || (editingProduct ? editingProduct.sku : `SKU-${Date.now()}`),
      imageUrl,
      isVariablePrice: isVariablePrice,
      updatedAt: new Date().toISOString()
    };

    if (editingProduct) {
      const docRef = doc(firestore, "users", user.uid, "products", editingProduct.id);
      updateDocumentNonBlocking(docRef, productData);
      toast({ title: "Producto Actualizado", description: `${name} guardado.` });
      setEditingProduct(null);
    } else {
      addDocumentNonBlocking(productsRef, { ...productData, createdAt: new Date().toISOString() });
      toast({ title: "Producto Agregado", description: `${name} guardado.` });
      setIsAddOpen(false);
    }
    
    setSelectedCategory("");
    setIsVariablePrice(false);
  };

  const handleDelete = (productId: string) => {
    if (!user?.uid || !firestore) return;
    const docRef = doc(firestore, "users", user.uid, "products", productId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Producto Eliminado" });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Inventario</h1>
            <p className="text-muted-foreground">Gestione sus productos y precios.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSaveProduct}>
                  <DialogHeader>
                    <DialogTitle>Agregar Nuevo Producto</DialogTitle>
                  </DialogHeader>
                  <ProductFormFields 
                    categories={categories} 
                    selectedCategory={selectedCategory} 
                    setSelectedCategory={setSelectedCategory} 
                    isVariablePrice={isVariablePrice}
                    setIsVariablePrice={setIsVariablePrice}
                  />
                  <DialogFooter>
                    <Button type="submit" className="w-full">Guardar Producto</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
              <DialogContent className="sm:max-w-[425px]">
                {editingProduct && (
                  <form onSubmit={handleSaveProduct}>
                    <DialogHeader>
                      <DialogTitle>Editar Producto</DialogTitle>
                    </DialogHeader>
                    <ProductFormFields 
                      product={editingProduct}
                      categories={categories} 
                      selectedCategory={selectedCategory || editingProduct.category} 
                      setSelectedCategory={setSelectedCategory} 
                      isVariablePrice={isVariablePrice}
                      setIsVariablePrice={setIsVariablePrice}
                    />
                    <DialogFooter>
                      <Button type="submit" className="w-full">Actualizar Producto</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o SKU..." 
            className="pl-10 h-11 text-base shadow-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isProductsLoading ? (
          <div className="p-24 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[80px]">Imagen</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded-md overflow-hidden bg-muted">
                        <img 
                          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/100/100`} 
                          alt="" 
                          className="h-full w-full object-cover" 
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{product.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{product.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">{product.category || "General"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {product.isVariablePrice ? <span className="text-accent text-xs">VARIABLE</span> : `$${(product.price || 0).toLocaleString()}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (product.stockQuantity || 0) <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {product.stockQuantity || 0} u.
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(product); setSelectedCategory(product.category); setIsVariablePrice(!!product.isVariablePrice); }}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ProductFormFields({ product, categories, selectedCategory, setSelectedCategory, isVariablePrice, setIsVariablePrice }: any) {
  return (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Nombre del Producto *</label>
        <Input name="name" defaultValue={product?.name} placeholder="Ej: Coca Cola 1.5L" required />
      </div>
      
      <div className="grid gap-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          URL de la Imagen (Opcional)
        </label>
        <Input name="imageUrl" defaultValue={product?.imageUrl} placeholder="https://ejemplo.com/imagen.jpg" />
        <p className="text-[10px] text-muted-foreground">Si se deja vacío, se generará una imagen automática.</p>
      </div>

      <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border border-dashed">
        <Switch id="variable-price" checked={isVariablePrice} onCheckedChange={setIsVariablePrice} />
        <Label htmlFor="variable-price" className="text-sm font-bold">Precio Variable (Verdura/Peso)</Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">{isVariablePrice ? "Precio Ref." : "Precio Venta *"}</label>
          <Input name="price" type="number" step="0.01" defaultValue={product?.price} placeholder="0.00" required />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Stock Inicial *</label>
          <Input name="stock" type="number" defaultValue={product?.stockQuantity} placeholder="0" required />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Categoría</label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
          <SelectContent>
            {categories.map((cat: any) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">SKU / Código de Barras</label>
        <Input name="sku" defaultValue={product?.sku} placeholder="Escanear o escribir..." />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Proveedor</label>
        <Input name="provider" defaultValue={product?.provider} placeholder="Nombre del proveedor" />
      </div>
    </div>
  );
}

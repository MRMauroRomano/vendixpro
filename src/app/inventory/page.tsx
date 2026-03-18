
"use client";

import { useState, useRef, useMemo } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  FileUp,
  ImageIcon,
  AlertTriangle,
  Cigarette
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
import * as XLSX from "xlsx";

export default function InventoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [isVariablePrice, setIsVariablePrice] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

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
    const unit = formData.get("unit") as string || "unidad";
    const imageUrlInput = formData.get("imageUrl") as string;
    const imageUrl = imageUrlInput || `https://picsum.photos/seed/${name}/400/300`;

    const productData = {
      name,
      price,
      stockQuantity: stock,
      unit,
      category: selectedCategory || "Sin Categoría",
      variant: selectedCategory === "Cigarrillos" ? selectedVariant : "",
      provider: formData.get("provider") as string || "",
      sku: formData.get("sku") as string || (editingProduct ? editingProduct.sku : `SKU-${Date.now()}`),
      imageUrl,
      isVariablePrice: isVariablePrice,
      updatedAt: new Date().toISOString()
    };

    if (editingProduct) {
      const docRef = doc(firestore, "users", user.uid, "products", editingProduct.id);
      updateDocumentNonBlocking(docRef, productData);
      toast({ title: "Producto Actualizado", description: `${name} guardado con éxito.` });
      setEditingProduct(null);
    } else {
      addDocumentNonBlocking(productsRef, { 
        ...productData, 
        createdAt: new Date().toISOString() 
      });
      toast({ title: "Producto Agregado", description: `${name} guardado con éxito.` });
      setIsAddOpen(false);
    }
    
    setSelectedCategory("");
    setSelectedVariant("");
    setIsVariablePrice(false);
  };

  const handleDelete = (productId: string) => {
    if (!user?.uid || !firestore) return;
    const docRef = doc(firestore, "users", user.uid, "products", productId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Producto Eliminado" });
  };

  const handleDeleteAll = () => {
    if (!user?.uid || !firestore || products.length === 0) return;
    
    setIsDeletingAll(true);
    products.forEach(p => {
      const docRef = doc(firestore, "users", user.uid, "products", p.id);
      deleteDocumentNonBlocking(docRef);
    });

    toast({ 
      title: "Limpieza en curso", 
      description: `Se están eliminando ${products.length} productos.` 
    });
    setIsDeletingAll(false);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid || !productsRef) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) throw new Error("Archivo vacío");
        
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        if (!ws) throw new Error("Hoja no encontrada");

        const data = XLSX.utils.sheet_to_json(ws) as any[];
        let count = 0;

        data.forEach((rawRow, index) => {
          const row: any = {};
          Object.keys(rawRow).forEach(key => {
            row[key.toLowerCase().trim()] = rawRow[key];
          });

          const name = row["nombre del producto"] || row["nombre"] || row["producto"] || row["product name"];
          const sku = row["sku"] || row["codigo"] || row["code"] || `SKU-IMP-${Date.now()}-${index}`;
          
          let priceStr = String(row["precio"] || row["price"] || "0");
          const price = parseFloat(priceStr.replace(/[^0-9.-]+/g, "")) || 0;
          
          let stockStr = String(row["stock"] || "0");
          const stock = parseFloat(stockStr.replace(/[^0-9.-]+/g, "")) || 0;
          
          const unit = row["unidad"] || row["unit"] || "unidad";

          if (name) {
            addDocumentNonBlocking(productsRef, {
              name,
              sku: String(sku),
              price,
              stockQuantity: stock,
              unit,
              category: "Importado",
              imageUrl: `https://picsum.photos/seed/${name}/400/300`,
              isVariablePrice: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            count++;
          }
        });

        toast({
          title: "Importación Finalizada",
          description: `Se han procesado ${count} productos correctamente.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error al importar",
          description: "Asegúrate de que el formato sea .xlsx y tenga las columnas correctas.",
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Inventario</h1>
            <p className="text-muted-foreground">Gestione sus productos, precios y stock en tiempo real.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls" 
              onChange={handleImportExcel}
            />
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50" disabled={products.length === 0 || isDeletingAll}>
                  <Trash2 className="h-4 w-4" />
                  Eliminar Todo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    ¿Está seguro de eliminar TODO?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción borrará permanentemente todos los productos de su inventario. 
                    No podrá deshacer este cambio.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700">
                    Sí, eliminar todo el inventario
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              variant="outline" 
              className="gap-2 border-primary/20" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              Importar Excel
            </Button>

            <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) { setSelectedCategory(""); setSelectedVariant(""); setIsVariablePrice(false); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md">
                  <Plus className="h-4 w-4" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <form onSubmit={handleSaveProduct}>
                  <DialogHeader>
                    <DialogTitle>Registrar Producto</DialogTitle>
                  </DialogHeader>
                  <ProductFormFields 
                    categories={categories} 
                    selectedCategory={selectedCategory} 
                    setSelectedCategory={setSelectedCategory} 
                    selectedVariant={selectedVariant}
                    setSelectedVariant={setSelectedVariant}
                    isVariablePrice={isVariablePrice}
                    setIsVariablePrice={setIsVariablePrice}
                  />
                  <DialogFooter className="mt-4">
                    <Button type="submit" className="w-full h-11 font-bold">Guardar Producto</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={!!editingProduct} onOpenChange={(open) => { if(!open) { setEditingProduct(null); setSelectedCategory(""); setSelectedVariant(""); setIsVariablePrice(false); } }}>
              <DialogContent className="sm:max-w-[450px]">
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
                      selectedVariant={selectedVariant || editingProduct.variant}
                      setSelectedVariant={setSelectedVariant}
                      isVariablePrice={isVariablePrice}
                      setIsVariablePrice={setIsVariablePrice}
                    />
                    <DialogFooter className="mt-4">
                      <Button type="submit" className="w-full h-11 font-bold">Actualizar Cambios</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Filtrar por nombre o SKU..." 
            className="pl-12 h-12 text-base shadow-sm bg-white" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isProductsLoading ? (
          <div className="p-24 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : (
          <div className="border-2 rounded-xl overflow-hidden bg-card shadow-sm">
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
                  <TableRow key={product.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell>
                      <div className="h-10 w-10 rounded-md overflow-hidden bg-muted border">
                        <img 
                          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/100/100`} 
                          alt="" 
                          className="h-full w-full object-cover" 
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{product.name}</span>
                          {product.variant && (
                            <Badge variant="secondary" className="text-[9px] font-black h-4 px-1">{product.variant}</Badge>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] text-muted-foreground font-mono">{product.sku}</span>
                          <span className="text-[10px] bg-muted px-1.5 rounded-full font-bold uppercase">{product.unit || 'u.'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">{product.category || "General"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary">
                      {product.isVariablePrice ? <span className="text-accent text-[10px] font-black uppercase">Variable</span> : `$${(product.price || 0).toLocaleString()}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        (product.stockQuantity || 0) <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {product.stockQuantity || 0} {product.unit || 'u.'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingProduct(product); setSelectedCategory(product.category); setSelectedVariant(product.variant || ""); setIsVariablePrice(!!product.isVariablePrice); }}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isProductsLoading && filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-24 text-muted-foreground italic">
                      No se encontraron productos en la base de datos.
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

function ProductFormFields({ product, categories, selectedCategory, setSelectedCategory, selectedVariant, setSelectedVariant, isVariablePrice, setIsVariablePrice }: any) {
  return (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="grid gap-2">
        <label className="text-sm font-bold">Nombre del Producto *</label>
        <Input name="name" defaultValue={product?.name} placeholder="Ej: Marlboro" required />
      </div>
      
      <div className="grid gap-2">
        <label className="text-sm font-bold flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          URL de la Imagen (Opcional)
        </label>
        <Input name="imageUrl" defaultValue={product?.imageUrl} placeholder="https://..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-bold">Categoría</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger><SelectValue placeholder="Rubro..." /></SelectTrigger>
            <SelectContent>
              {categories.map((cat: any) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedCategory === "Cigarrillos" && (
          <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
            <label className="text-sm font-bold flex items-center gap-1">
              <Cigarette className="h-3 w-3" />
              Tipo de Pack
            </label>
            <Select value={selectedVariant} onValueChange={setSelectedVariant}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BOX 20">BOX 20</SelectItem>
                <SelectItem value="BOX 10">BOX 10</SelectItem>
                <SelectItem value="COMUN 20">COMUN 20</SelectItem>
                <SelectItem value="COMUN 10">COMUN 10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 bg-primary/5 p-4 rounded-xl border-2 border-dashed border-primary/20">
        <Switch id="variable-price" checked={isVariablePrice} onCheckedChange={setIsVariablePrice} />
        <Label htmlFor="variable-price" className="text-sm font-black text-primary uppercase tracking-tight cursor-pointer">Venta por Peso / Precio Variable</Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-bold">{isVariablePrice ? "Precio Sugerido" : "Precio de Venta *"}</label>
          <Input name="price" type="number" step="0.01" defaultValue={product?.price} placeholder="0.00" required />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold">Stock Inicial *</label>
          <Input name="stock" type="number" defaultValue={product?.stockQuantity} placeholder="0" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-bold">Unidad</label>
          <Select name="unit" defaultValue={product?.unit || "unidad"}>
            <SelectTrigger><SelectValue placeholder="Unidad..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unidad">Unidad (u.)</SelectItem>
              <SelectItem value="kg">Kilogramos (kg)</SelectItem>
              <SelectItem value="pack">Pack / Pack</SelectItem>
              <SelectItem value="litro">Litros (L)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold">SKU / Código</label>
          <Input name="sku" defaultValue={product?.sku} placeholder="Escanear..." />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-bold">Proveedor</label>
        <Input name="provider" defaultValue={product?.provider} placeholder="Nombre..." />
      </div>
    </div>
  );
}

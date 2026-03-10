
"use client";

import { useState, useRef } from "react";
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
import { Plus, Search, Trash2, Download, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { 
  useFirestore, 
  useUser, 
  useMemoFirebase, 
  useCollection, 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export default function InventoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Referencia a productos del usuario
  const productsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "products");
  }, [firestore, user?.uid]);

  // Referencia a categorías del usuario para el selector
  const categoriesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "categories");
  }, [firestore, user?.uid]);

  const { data: products = [], isLoading: isProductsLoading } = useCollection(productsRef);
  const { data: categories = [] } = useCollection(categoriesRef);

  const filteredProducts = products?.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleAddProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !productsRef) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo conectar con la base de datos." });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const price = Number(formData.get("price"));
    const stock = Number(formData.get("stock"));

    if (!name || isNaN(price) || isNaN(stock)) {
      toast({ variant: "destructive", title: "Campos inválidos", description: "Por favor complete los campos obligatorios." });
      return;
    }

    const newProduct = {
      name,
      price,
      stockQuantity: stock,
      category: selectedCategory || "Sin Categoría",
      provider: formData.get("provider") as string || "",
      sku: formData.get("sku") as string || `SKU-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(productsRef, newProduct);
    toast({ title: "Producto Agregado", description: `${name} se ha guardado correctamente.` });
    
    // Reset y cerrar
    setIsAddOpen(false);
    setSelectedCategory("");
  };

  const handleDelete = (productId: string) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, "users", user.uid, "products", productId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Producto Eliminado", description: "El producto ha sido removido." });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !productsRef) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast({ variant: "destructive", title: "Archivo vacío", description: "No se encontraron datos." });
          setIsImporting(false);
          return;
        }

        data.forEach((row: any) => {
          const newProduct = {
            name: row.Nombre || row.name || row.Producto || "Producto Importado",
            price: Number(row.Precio || row.price || 0),
            stockQuantity: Number(row.Stock || row.stockQuantity || 0),
            category: row.Categoría || row.category || "General",
            provider: row.Proveedor || row.provider || "",
            sku: row.SKU || row.sku || `SKU-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString()
          };
          addDocumentNonBlocking(productsRef, newProduct);
        });

        toast({ title: "Importación Finalizada", description: `Se procesaron ${data.length} productos.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Error al procesar el Excel." });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Nombre: "Arroz 1kg", Precio: 1500, Stock: 50, Categoría: "Almacén", SKU: "ARR001", Proveedor: "Molinos S.A." }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "vendixpro_plantilla.xlsx");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Inventario</h1>
            <p className="text-muted-foreground">Gestione sus productos y niveles de stock.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
            <Button variant="outline" className="gap-2" onClick={handleImportClick} disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar
            </Button>
            <Button variant="ghost" className="h-10 text-xs" onClick={downloadTemplate}>
              <Download className="h-3 w-3 mr-1" />
              Plantilla
            </Button>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleAddProduct}>
                  <DialogHeader>
                    <DialogTitle>Agregar Nuevo Producto</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Nombre del Producto *</label>
                      <Input name="name" placeholder="Ej: Coca Cola 1.5L" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Precio de Venta *</label>
                        <Input name="price" type="number" step="0.01" placeholder="0.00" required />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Stock Inicial *</label>
                        <Input name="stock" type="number" placeholder="0" required />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Categoría</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.length > 0 ? (
                            categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No hay categorías creadas</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Proveedor / SKU (Opcional)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input name="provider" placeholder="Proveedor" />
                        <Input name="sku" placeholder="SKU / Código" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full">Guardar Producto</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o código..." 
            className="pl-10 h-11" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
          {isProductsLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
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
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{product.name}</span>
                        <span className="text-[10px] text-muted-foreground">{product.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                        {product.category || "General"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">${product.price?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        (product.stockQuantity || 0) <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {product.stockQuantity || 0} u.
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="h-10 w-10 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron productos</p>
                        <p className="text-sm">Agrega uno nuevo o importa desde Excel.</p>
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

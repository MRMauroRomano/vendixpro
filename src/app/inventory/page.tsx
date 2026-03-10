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
import { Plus, Search, Trash2, Download, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { useFirestore, useUser, useMemoFirebase, useCollection, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export default function InventoryPage() {
  const { firestore } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "products");
  }, [firestore, user?.uid]);

  const { data: products = [], isLoading } = useCollection(productsRef);

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleAddProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !productsRef) return;

    const formData = new FormData(e.currentTarget);
    const newProduct = {
      name: formData.get("name") as string,
      price: Number(formData.get("price")),
      stockQuantity: Number(formData.get("stock")),
      category: formData.get("category") as string,
      provider: formData.get("provider") as string,
      sku: formData.get("sku") as string || `SKU-${Date.now()}`,
    };

    addDocumentNonBlocking(productsRef, newProduct);
    toast({ title: "Producto Agregado", description: "El producto se ha guardado en tu inventario." });
    setIsAddOpen(false);
  };

  const handleDelete = (productId: string) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, "users", user.uid, "products", productId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Producto Eliminado", description: "El producto ha sido removido del sistema." });
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
          toast({
            variant: "destructive",
            title: "Archivo vacío",
            description: "No se encontraron datos en el Excel seleccionado."
          });
          return;
        }

        data.forEach((row: any) => {
          // Mapeo flexible de columnas (español e inglés)
          const newProduct = {
            name: row.Nombre || row.name || row.Producto || "Producto sin nombre",
            price: Number(row.Precio || row.price || row.Monto || 0),
            stockQuantity: Number(row.Stock || row.stockQuantity || row.Cantidad || 0),
            category: row.Categoría || row.category || row.Rubro || "General",
            provider: row.Proveedor || row.provider || "",
            sku: row.SKU || row.sku || row.Código || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          };
          addDocumentNonBlocking(productsRef, newProduct);
        });

        toast({
          title: "Importación Exitosa",
          description: `Se han procesado ${data.length} productos correctamente.`
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error al importar",
          description: "Hubo un problema procesando el archivo Excel."
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Nombre: "Ej: Arroz 1kg", Precio: 1500, Stock: 100, Categoría: "Almacén", SKU: "ARR-001", Proveedor: "Distribuidora X" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla_vendixpro.xlsx");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Gestión de Stock</h1>
            <p className="text-muted-foreground">Administre sus productos de forma profesional.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
            <Button variant="outline" className="gap-2" onClick={handleImportClick} disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar Excel
            </Button>
            <Button variant="ghost" className="gap-2 text-xs h-10" onClick={downloadTemplate}>
              <Download className="h-3 w-3" />
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
                      <label className="text-sm font-medium">Nombre</label>
                      <Input name="name" placeholder="Ej: Arroz 1kg" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Precio</label>
                        <Input name="price" type="number" placeholder="0.00" required />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Stock Inicial</label>
                        <Input name="stock" type="number" placeholder="0" required />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Categoría</label>
                      <Input name="category" placeholder="Ej: Almacén" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Proveedor</label>
                      <Input name="provider" placeholder="Nombre del proveedor" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Guardar Producto</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrar por nombre..." 
              className="pl-10 h-11" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground uppercase">
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
                    <TableCell className="text-muted-foreground text-sm">{product.provider || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="h-8 w-8 opacity-20" />
                        <p>No se encontraron productos. ¡Carga uno o importa un Excel!</p>
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

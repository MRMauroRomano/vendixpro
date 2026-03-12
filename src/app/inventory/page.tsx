
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
  Upload, 
  Loader2, 
  LayoutGrid, 
  List, 
  Edit3, 
  Package,
  MoreVertical,
  TableProperties,
  Save,
  X,
  CheckSquare,
  AlertCircle,
  FileText,
  Info,
  Download,
  Image as ImageIcon
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
import * as XLSX from 'xlsx';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { importInventoryFromPdf } from "@/ai/flows/import-pdf-inventory-flow";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function InventoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMassEditOpen, setIsMassEditOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [massEditData, setMassEditData] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
    return products.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  useEffect(() => {
    if (isMassEditOpen) {
      const itemsToEdit = selectedIds.size > 0 
        ? products.filter(p => selectedIds.has(p.id))
        : filteredProducts;
      setMassEditData(itemsToEdit.map(p => ({ ...p })));
    }
  }, [isMassEditOpen, products, selectedIds, filteredProducts]);

  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !productsRef || !firestore) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const price = Number(formData.get("price") || 0);
    const stock = Number(formData.get("stock") || 0);
    const imageUrl = formData.get("imageUrl") as string || `https://picsum.photos/seed/${name}/400/300`;

    const productData = {
      name,
      price,
      stockQuantity: stock,
      category: selectedCategory || "Sin Categoría",
      provider: formData.get("provider") as string || "",
      sku: formData.get("sku") as string || (editingProduct ? editingProduct.sku : `SKU-${Date.now()}`),
      imageUrl,
      updatedAt: new Date().toISOString()
    };

    if (editingProduct) {
      const docRef = doc(firestore, "users", user.uid, "products", editingProduct.id);
      updateDocumentNonBlocking(docRef, productData);
      toast({ title: "Producto Actualizado", description: `${name} se ha guardado correctamente.` });
      setEditingProduct(null);
    } else {
      addDocumentNonBlocking(productsRef, { ...productData, createdAt: new Date().toISOString() });
      toast({ title: "Producto Agregado", description: `${name} se ha guardado correctamente.` });
      setIsAddOpen(false);
    }
    
    setSelectedCategory("");
  };

  const handleMassUpdateChange = (id: string, field: string, value: any) => {
    setMassEditData(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const saveMassChanges = () => {
    if (!user || !firestore) return;
    
    massEditData.forEach(p => {
      const original = products.find(op => op.id === p.id);
      if (original && (
        original.sku !== p.sku || 
        original.price !== Number(p.price) || 
        original.stockQuantity !== Number(p.stockQuantity) ||
        original.imageUrl !== p.imageUrl
      )) {
        const docRef = doc(firestore, "users", user.uid, "products", p.id);
        updateDocumentNonBlocking(docRef, {
          sku: p.sku || "",
          price: Number(p.price || 0),
          stockQuantity: Number(p.stockQuantity || 0),
          imageUrl: p.imageUrl || "",
          updatedAt: new Date().toISOString()
        });
      }
    });

    toast({ title: "Cambios Guardados", description: "Se han actualizado los productos seleccionados." });
    setIsMassEditOpen(false);
    setSelectedIds(new Set());
  };

  const handleDelete = (productId: string) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, "users", user.uid, "products", productId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Producto Eliminado", description: "El producto ha sido removido." });
    
    const newSelected = new Set(selectedIds);
    newSelected.delete(productId);
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (!user || !firestore || selectedIds.size === 0) return;
    
    selectedIds.forEach(id => {
      const docRef = doc(firestore, "users", user.uid, "products", id);
      deleteDocumentNonBlocking(docRef);
    });

    toast({ 
      title: "Eliminación Masiva", 
      description: `Se han eliminado ${selectedIds.size} productos.` 
    });
    setSelectedIds(new Set());
    setIsConfirmDeleteOpen(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handlePdfImportClick = () => {
    pdfInputRef.current?.click();
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
          toast({ variant: "destructive", title: "Archivo Vacío", description: "El Excel no contiene datos procesables." });
          return;
        }

        const normalize = (str: string) => 
          str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

        const getVal = (row: any, searchKeys: string[]) => {
          const rowKeys = Object.keys(row);
          const normalizedSearchKeys = searchKeys.map(normalize);

          for (const rowKey of rowKeys) {
            if (normalizedSearchKeys.includes(normalize(rowKey))) {
              return row[rowKey];
            }
          }
          return undefined;
        };

        data.forEach((row: any) => {
          const prodName = getVal(row, ["NOMBRE", "PRODUCTO", "NAME", "ITEM", "DESCRIPCION"]) || "Producto Importado";
          const newProduct = {
            name: prodName,
            price: Number(getVal(row, ["PRECIO", "PRICE", "COSTO", "COST", "MONTO", "VENTA"]) || 0),
            stockQuantity: Number(getVal(row, ["STOCK", "CANTIDAD", "QTY", "UNIDADES"]) || 0),
            category: getVal(row, ["CATEGORIA", "RUBRO", "CATEGORY", "DEPARTAMENTO"]) || "General",
            provider: getVal(row, ["PROVEEDOR", "PROVIDER", "MARCA"]) || "",
            sku: getVal(row, ["CODIGO", "SKU", "CODE", "REFERENCIA"]) || `SKU-${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: getVal(row, ["IMAGEN", "URL", "IMAGEURL", "FOTO"]) || `https://picsum.photos/seed/${prodName}/400/300`,
            createdAt: new Date().toISOString()
          };
          addDocumentNonBlocking(productsRef, newProduct);
        });

        toast({ title: "Importación Finalizada", description: `Se procesaron ${data.length} productos exitosamente.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Error al procesar el Excel. Verifique que sea un archivo .xlsx válido." });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !productsRef) return;

    setIsAiProcessing(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const base64 = evt.target?.result as string;
        const result = await importInventoryFromPdf({ pdfDataUri: base64 });

        if (result && result.products) {
          result.products.forEach((prod: any) => {
            const newProduct = {
              ...prod,
              imageUrl: `https://picsum.photos/seed/${prod.name}/400/300`,
              createdAt: new Date().toISOString()
            };
            addDocumentNonBlocking(productsRef, newProduct);
          });
          toast({ title: "IA: Importación Exitosa", description: `Se detectaron y cargaron ${result.products.length} productos.` });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error de IA", description: "No se pudo procesar el PDF." });
      } finally {
        setIsAiProcessing(false);
        if (pdfInputRef.current) pdfInputRef.current.value = "";
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Inventario</h1>
            <p className="text-muted-foreground">Gestione sus productos, precios y niveles de stock.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
            <input type="file" ref={pdfInputRef} className="hidden" accept=".pdf" onChange={handlePdfFileChange} />
            
            <div className="flex border rounded-md overflow-hidden bg-background mr-2 shadow-sm">
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="rounded-none h-10 w-10"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="rounded-none h-10 w-10"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" className="gap-2" onClick={handlePdfImportClick} disabled={isAiProcessing}>
              {isAiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Importar PDF (IA)
            </Button>

            <div className="flex gap-1">
              <Button variant="outline" className="gap-2" onClick={handleImportClick} disabled={isImporting}>
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importar Excel
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-4">
                    <div className="space-y-3">
                      <p className="font-bold border-b pb-1">Encabezados aceptados:</p>
                      <ul className="text-xs space-y-1.5 list-disc pl-4">
                        <li><strong>Nombre:</strong> NOMBRE, Producto, Item, Descripcion...</li>
                        <li><strong>Precio:</strong> PRECIO, Price, Venta, Costo, Monto...</li>
                        <li><strong>Stock:</strong> STOCK, Cantidad, Qty, Unidades...</li>
                        <li><strong>Código/SKU:</strong> CODIGO, SKU, Code, Referencia...</li>
                        <li><strong>Categoría:</strong> CATEGORIA, Rubro, Category...</li>
                      </ul>
                      <p className="text-[10px] text-muted-foreground italic">El sistema reconoce mayúsculas, minúsculas y variaciones comunes sin importar acentos.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Dialog open={isMassEditOpen} onOpenChange={setIsMassEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
                  <TableProperties className="h-4 w-4" />
                  Modificación Masiva
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b">
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <TableProperties className="h-6 w-6" />
                    Edición Rápida de Inventario
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="w-[180px]">SKU / Código</TableHead>
                            <TableHead className="w-[120px]">Precio ($)</TableHead>
                            <TableHead className="w-[100px]">Stock (U)</TableHead>
                            <TableHead className="min-w-[200px]">Imagen (URL)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {massEditData.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span className="text-sm truncate max-w-[200px]">{p.name}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">{p.category}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input 
                                  value={p.sku || ""} 
                                  onChange={(e) => handleMassUpdateChange(p.id, 'sku', e.target.value)}
                                  className="h-8 text-xs font-mono"
                                  placeholder="SKU"
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  value={p.price || 0} 
                                  onChange={(e) => handleMassUpdateChange(p.id, 'price', e.target.value)}
                                  className="h-8 text-xs text-right font-bold text-primary"
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  value={p.stockQuantity || 0} 
                                  onChange={(e) => handleMassUpdateChange(p.id, 'stockQuantity', e.target.value)}
                                  className={`h-8 text-xs text-right font-bold ${Number(p.stockQuantity) <= 5 ? 'text-red-500' : ''}`}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Input 
                                    value={p.imageUrl || ""} 
                                    onChange={(e) => handleMassUpdateChange(p.id, 'imageUrl', e.target.value)}
                                    className="h-8 text-xs font-mono"
                                    placeholder="https://..."
                                  />
                                  <div className="h-8 w-8 rounded border bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    {p.imageUrl ? (
                                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <ImageIcon className="h-4 w-4 text-muted-foreground opacity-30" />
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </div>
                <DialogFooter className="p-6 border-t bg-muted/20 gap-2">
                  <Button variant="outline" onClick={() => setIsMassEditOpen(false)} className="gap-2">
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button onClick={saveMassChanges} className="gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Todo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
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

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-primary/5 border-2 border-primary/20 p-4 rounded-xl animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-white p-2 rounded-lg">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-lg">{selectedIds.size}</span>
                <span className="text-muted-foreground ml-2">productos seleccionados</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setIsMassEditOpen(true)}>
                <Edit3 className="h-4 w-4" />
                Editar Seleccionados
              </Button>
              <Button variant="destructive" className="gap-2" onClick={() => setIsConfirmDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Eliminar Seleccionados
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setSelectedIds(new Set())}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o código SKU..." 
            className="pl-10 h-11 text-base shadow-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isProductsLoading ? (
          <div className="p-24 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Cargando inventario...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-card border rounded-xl border-dashed">
            <Package className="h-16 w-16 opacity-10 mb-4" />
            <p className="text-xl font-semibold">No hay productos que coincidan</p>
            <p className="text-sm">Agregue un nuevo producto o intente otra búsqueda.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0} 
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[80px]">Imagen</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className={`group hover:bg-muted/20 ${selectedIds.has(product.id) ? 'bg-primary/5' : ''}`}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.has(product.id)} 
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted border shadow-inner">
                        <img 
                          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/100/100`} 
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{product.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{product.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-[10px] uppercase">
                        {product.category || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary">
                      ${(product.price || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                        (product.stockQuantity || 0) <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {product.stockQuantity || 0} u.
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => {
                            setEditingProduct(product);
                            setSelectedCategory(product.category);
                          }}>
                            <Edit3 className="h-4 w-4 text-blue-500" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className={`overflow-hidden hover:shadow-xl transition-all border-2 group ${selectedIds.has(product.id) ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                <div className="relative aspect-video w-full overflow-hidden bg-muted border-b">
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox 
                      checked={selectedIds.has(product.id)} 
                      onCheckedChange={() => toggleSelect(product.id)}
                      className="bg-white"
                    />
                  </div>
                  <img 
                    src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/300`} 
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <Badge className={(product.stockQuantity || 0) <= 5 ? 'bg-red-500' : 'bg-primary'}>
                      {product.stockQuantity || 0} unid.
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{product.category}</span>
                    <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 rounded">{product.sku}</span>
                  </div>
                  <h3 className="font-bold text-sm line-clamp-2 h-10">{product.name}</h3>
                  <div className="text-xl font-black text-primary">${(product.price || 0).toLocaleString()}</div>
                </CardContent>
                <CardFooter className="p-3 bg-muted/20 border-t flex justify-between gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => {
                    setEditingProduct(product);
                    setSelectedCategory(product.category);
                  }}>
                    <Edit3 className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button variant="outline" size="icon" className="text-destructive h-9 w-9" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 text-destructive mb-2">
                <AlertCircle className="h-6 w-6" />
                <AlertDialogTitle>¿Confirmar eliminación masiva?</AlertDialogTitle>
              </div>
              <AlertDialogDescription>
                Estás a punto de eliminar <span className="font-bold">{selectedIds.size}</span> productos de forma permanente. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Sí, eliminar todo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

function ProductFormFields({ product, categories, selectedCategory, setSelectedCategory }: any) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Nombre del Producto *</label>
        <Input name="name" defaultValue={product?.name} placeholder="Ej: Coca Cola 1.5L" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Precio de Venta *</label>
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
          <SelectTrigger>
            <SelectValue placeholder="Seleccione una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.length > 0 ? (
              categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>No hay categorías creadas</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">URL de Imagen (Opcional)</label>
        <Input name="imageUrl" defaultValue={product?.imageUrl} placeholder="https://ejemplo.com/imagen.jpg" />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Proveedor / SKU (Opcional)</label>
        <div className="grid grid-cols-2 gap-2">
          <Input name="provider" defaultValue={product?.provider} placeholder="Proveedor" />
          <Input name="sku" defaultValue={product?.sku} placeholder="SKU / Código" />
        </div>
      </div>
    </div>
  );
}

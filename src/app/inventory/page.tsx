"use client";

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
import { Plus, Search, Filter, Pencil, Trash2, Download } from "lucide-react";

const PRODUCTS = [
  { id: "1", name: "Cerveza Quilmes 1L", category: "Bebidas", price: 2500, stock: 45, provider: "AB InBev" },
  { id: "2", name: "Leche La Serenísima", category: "Lácteos", price: 1200, stock: 20, provider: "Mastellone" },
  { id: "3", name: "Yerba Mate Playadito 1kg", category: "Almacén", price: 4200, stock: 15, provider: "Cooperativa Liebig" },
  { id: "4", name: "Pan Francés x kg", category: "Panadería", price: 1800, stock: 5, provider: "Elaboración Propia" },
  { id: "5", name: "Aceite Girasol 1.5L", category: "Almacén", price: 3100, stock: 8, provider: "Aceitera General Deheza" },
];

export default function InventoryPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Gestión de Stock</h1>
            <p className="text-muted-foreground">Administre sus productos, precios y niveles de inventario.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Producto</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Nombre</label>
                    <Input placeholder="Ej: Arroz 1kg" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Precio</label>
                      <Input type="number" placeholder="0.00" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Stock Inicial</label>
                      <Input type="number" placeholder="0" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Categoría</label>
                    <Input placeholder="Ej: Almacén" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Proveedor</label>
                    <Input placeholder="Nombre del proveedor" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Guardar Producto</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filtrar por nombre, categoría o código..." className="pl-10" />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Categorías
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
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
              {PRODUCTS.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right">${product.price.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      product.stock <= 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {product.stock} u.
                    </span>
                  </TableCell>
                  <TableCell>{product.provider}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}

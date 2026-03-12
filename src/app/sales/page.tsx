"use client";

import { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Search, Filter, Download, FileText, Calendar, Loader2, ShoppingBag, Receipt } from "lucide-react";
import { useFirestore, useUser, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SalesHistoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const salesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "users", user.uid, "sales"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
  }, [firestore, user?.uid]);

  const { data: sales, isLoading } = useCollection(salesRef);

  const filteredSales = (sales || []).filter(sale => 
    sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Historial de Ventas</h1>
            <p className="text-muted-foreground">Revise todas las transacciones realizadas en el sistema.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-primary/20 text-primary">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" className="gap-2 border-primary/20 text-primary">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por ID o método de pago..." 
              className="pl-10 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2 whitespace-nowrap h-11">
            <Calendar className="h-4 w-4" />
            Últimos 7 días
          </Button>
          <Button variant="outline" className="gap-2 h-11">
            <Filter className="h-4 w-4" />
            Más Filtros
          </Button>
        </div>

        <Card className="border-2 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-24 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse">Cargando transacciones...</p>
              </div>
            ) : filteredSales.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">ID Venta</TableHead>
                    <TableHead className="font-bold">Fecha / Hora</TableHead>
                    <TableHead className="font-bold">Método Pago</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                    <TableHead className="text-right font-bold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-[11px] font-bold uppercase truncate max-w-[120px] text-muted-foreground">
                        #{sale.id.substring(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {sale.createdAt ? format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: es }) : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sale.paymentMethod?.includes('Cuenta Corriente') 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {sale.paymentMethod || 'No especificado'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black text-primary text-base">
                        ${(sale.totalAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="font-bold h-8"
                          onClick={() => setSelectedSale(sale)}
                        >
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                <div className="bg-muted p-6 rounded-full mb-4 opacity-50">
                  <ShoppingBag className="h-12 w-12" />
                </div>
                <p className="text-xl font-bold">No hay ventas registradas</p>
                <p className="text-sm">Las ventas que realices en el POS aparecerán aquí automáticamente.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diálogo de Detalles de Venta */}
        <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
          <DialogContent className="max-w-2xl">
            {selectedSale && (
              <>
                <DialogHeader className="border-b pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                        <Receipt className="h-6 w-6" />
                        Detalle de Venta
                      </DialogTitle>
                      <DialogDescription className="font-mono mt-1">
                        ID: #{selectedSale.id}
                      </DialogDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground font-bold uppercase">Monto Total</div>
                      <div className="text-3xl font-black text-primary">${(selectedSale.totalAmount || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha y Hora</span>
                    <div className="font-semibold text-sm">
                      {selectedSale.createdAt ? format(new Date(selectedSale.createdAt), "PPPPp", { locale: es }) : '-'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Método de Pago</span>
                    <div>
                      <span className="px-2 py-1 bg-primary/10 text-primary text-[11px] font-black rounded uppercase">
                        {selectedSale.paymentMethod}
                      </span>
                    </div>
                  </div>
                  {selectedSale.notes && (
                    <div className="col-span-2 p-3 bg-muted/50 rounded-lg border text-sm italic">
                      {selectedSale.notes}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-black mb-3 flex items-center gap-2 text-primary/70 uppercase tracking-widest">
                    Productos del Pedido
                  </h4>
                  <div className="border rounded-xl overflow-hidden">
                    <SaleItemsTable saleId={selectedSale.id} userId={user?.uid!} />
                  </div>
                </div>

                <div className="flex justify-end pt-4 gap-2">
                  <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Imprimir Ticket
                  </Button>
                  <Button onClick={() => setSelectedSale(null)}>Cerrar</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function SaleItemsTable({ saleId, userId }: { saleId: string; userId: string }) {
  const firestore = useFirestore();
  const itemsRef = useMemoFirebase(() => {
    if (!firestore || !userId || !saleId) return null;
    return collection(firestore, "users", userId, "sales", saleId, "sale_items");
  }, [firestore, userId, saleId]);

  const { data: items, isLoading } = useCollection(itemsRef);

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead className="text-xs font-bold">Producto</TableHead>
          <TableHead className="text-center text-xs font-bold">Cant.</TableHead>
          <TableHead className="text-right text-xs font-bold">P. Unit</TableHead>
          <TableHead className="text-right text-xs font-bold">Subtotal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(items || []).map((item) => (
          <TableRow key={item.id} className="hover:bg-transparent">
            <TableCell className="text-sm font-semibold">{item.productName}</TableCell>
            <TableCell className="text-center font-mono font-bold text-sm">{item.quantity}</TableCell>
            <TableCell className="text-right text-sm">${(item.unitPrice || 0).toLocaleString()}</TableCell>
            <TableCell className="text-right font-black text-sm text-primary">
              ${(item.subtotal || 0).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
        {(!items || items.length === 0) && (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
              No se encontraron detalles de productos para esta venta.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

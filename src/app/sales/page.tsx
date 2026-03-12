
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Download, FileText, Calendar, Loader2, ShoppingBag } from "lucide-react";
import { useFirestore, useUser, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SalesHistoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const salesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "users", user.uid, "sales"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
  }, [firestore, user?.uid]);

  const { data: sales, isLoading } = useCollection(salesRef);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline">Historial de Ventas</h1>
            <p className="text-muted-foreground">Revise todas las transacciones realizadas en el sistema.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar ventas..." className="pl-10" />
          </div>
          <Button variant="outline" className="gap-2 whitespace-nowrap">
            <Calendar className="h-4 w-4" />
            Últimos 7 días
          </Button>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Más Filtros
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-24 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Cargando transacciones...</p>
              </div>
            ) : sales && sales.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Venta</TableHead>
                    <TableHead>Fecha / Hora</TableHead>
                    <TableHead>Método Pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-[10px] font-bold uppercase truncate max-w-[100px]">
                        #{sale.id.substring(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {sale.createdAt ? format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: es }) : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                          sale.paymentMethod === 'Cuenta Corriente' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {sale.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        ${(sale.totalAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Ver Detalle</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <ShoppingBag className="h-16 w-16 opacity-10 mb-4" />
                <p className="text-xl font-semibold">No hay ventas registradas</p>
                <p className="text-sm">Las ventas que realices en el POS aparecerán aquí.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

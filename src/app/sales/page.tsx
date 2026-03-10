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
import { Search, Filter, Download, FileText, Calendar } from "lucide-react";

export default function SalesHistoryPage() {
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
            <Input placeholder="Buscar por número de ticket o cliente..." className="pl-10" />
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Fecha / Hora</TableHead>
                  <TableHead>Metodo Pago</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { id: "10523", date: "24/05/2024 18:45", method: "Efectivo", items: 4, total: 12500 },
                  { id: "10522", date: "24/05/2024 17:30", method: "Tarjeta Visa", items: 2, total: 4200 },
                  { id: "10521", date: "24/05/2024 15:10", method: "Efectivo", items: 8, total: 24300 },
                  { id: "10520", date: "23/05/2024 20:20", method: "Cuenta Corriente", items: 3, total: 8900 },
                  { id: "10519", date: "23/05/2024 19:45", method: "Tarjeta Master", items: 1, total: 1500 },
                ].map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs font-bold">#{row.id}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                        row.method === 'Cuenta Corriente' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {row.method}
                      </span>
                    </TableCell>
                    <TableCell>{row.items} productos</TableCell>
                    <TableCell className="text-right font-bold">${row.total.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Detalle</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

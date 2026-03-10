"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Filter, Calendar, Receipt, Download } from "lucide-react";

export default function ExpensesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline">Gastos Operativos</h1>
            <p className="text-muted-foreground">Registre y categorice los egresos de su negocio.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Registrar Gasto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Egreso de Caja</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Concepto / Descripción</label>
                    <Input placeholder="Ej: Pago de Luz" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Categoría</label>
                      <Input placeholder="Ej: Servicios" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Monto</label>
                      <Input type="number" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Fecha</label>
                    <Input type="date" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Guardar Gasto</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Gastos (Mes)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,302.45</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categoría Mayor Gasto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Proveedores</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Retiros de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$1,500.00</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1">
                <Calendar className="h-4 w-4" />
                Mayo 2024
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { date: "15/05/2024", label: "Pago ABL", category: "Impuestos", amount: 2500 },
                  { date: "12/05/2024", label: "Mercaderia Frutas", category: "Proveedores", amount: 15400 },
                  { date: "10/05/2024", label: "Reparación Heladera", category: "Mantenimiento", amount: 8500 },
                  { date: "05/05/2024", label: "Pago Alquiler", category: "Infraestructura", amount: 120000 },
                  { date: "02/05/2024", label: "Internet Fibertel", category: "Servicios", amount: 4200 },
                ].map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded-full uppercase tracking-wider font-semibold">
                        {row.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-500">
                      ${row.amount.toLocaleString()}
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

"use client";

import { useState } from "react";
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
  ArrowUpCircle, 
  ArrowDownCircle, 
  History, 
  Lock, 
  Unlock,
  Plus
} from "lucide-react";

export default function CashControlPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline">Control de Caja Diario</h1>
            <p className="text-muted-foreground">Gestione el flujo de efectivo y el saldo disponible.</p>
          </div>
          <Button 
            variant={isOpen ? "destructive" : "default"} 
            className="gap-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            {isOpen ? "Cerrar Caja" : "Abrir Caja"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-80">Saldo en Caja (Actual)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$125,450.00</div>
              <div className="text-xs mt-1 opacity-70">Apertura: $45,000.00</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-accent" />
                Ingresos de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$92,300.00</div>
              <div className="text-xs text-muted-foreground mt-1">+15% vs ayer</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
                Egresos de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$11,850.00</div>
              <div className="text-xs text-muted-foreground mt-1">3 retiros registrados</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between border-b py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Movimientos Recientes
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Movimiento Manual
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { time: "14:25", label: "Venta POS #1235", type: "Ingreso", amount: 15400, color: "text-accent" },
                    { time: "13:10", label: "Pago Proveedor Pepsi", type: "Egreso", amount: -8500, color: "text-red-500" },
                    { time: "11:45", label: "Venta POS #1234", type: "Ingreso", amount: 4200, color: "text-accent" },
                    { time: "10:30", label: "Ajuste de caja (Faltante)", type: "Ajuste", amount: -150, color: "text-red-500" },
                    { time: "08:00", label: "Apertura de Caja", type: "Inicial", amount: 45000, color: "text-primary" },
                  ].map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{row.time}</TableCell>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell className={`text-right font-bold ${row.color}`}>
                        ${Math.abs(row.amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b py-4">
              <CardTitle className="text-lg">Resumen de Métodos</CardTitle>
            </CardHeader>
            <CardContent className="py-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Efectivo</span>
                <span className="font-bold">$68,400.00</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full w-[70%]" />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-muted-foreground">Tarjeta / QR</span>
                <span className="font-bold">$57,050.00</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-accent h-2 rounded-full w-[30%]" />
              </div>

              <div className="pt-6 border-t mt-6">
                <h4 className="font-semibold mb-3">Notas del Turno</h4>
                <textarea 
                  className="w-full min-h-[100px] p-3 text-sm border rounded-md resize-none"
                  placeholder="Escriba novedades relevantes aquí..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

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
import { Search, Plus, UserCircle, Phone, DollarSign, ArrowRight } from "lucide-react";

const CLIENTS = [
  { id: "1", name: "Juan Pérez", phone: "11 4455-6677", debt: 15400, lastPayment: "12/05/2024" },
  { id: "2", name: "María Rodríguez", phone: "11 3322-1100", debt: 0, lastPayment: "15/05/2024" },
  { id: "3", name: "Carlos López", phone: "11 9988-7766", debt: 2800, lastPayment: "05/05/2024" },
  { id: "4", name: "Ana Martínez", phone: "11 5566-4433", debt: 1250, lastPayment: "20/05/2024" },
  { id: "5", name: "Roberto Sánchez", phone: "11 2233-4455", debt: 45000, lastPayment: "01/04/2024" },
];

export default function ClientsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline">Cuentas Corrientes</h1>
            <p className="text-muted-foreground">Gestione clientes fieles y créditos otorgados ('Fiado').</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Deuda Total Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">$64,450.00</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clientes con Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cobros este Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">$12,400.00</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Nuevos Clientes (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o teléfono..." className="pl-10" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Deuda Pendiente</TableHead>
                  <TableHead>Último Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CLIENTS.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserCircle className="h-8 w-8 text-muted-foreground opacity-40" />
                        <span className="font-medium">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${client.debt > 0 ? 'text-red-500' : 'text-accent'}`}>
                        ${client.debt.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{client.lastPayment}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="gap-1 text-accent border-accent/20 hover:bg-accent/5">
                          <DollarSign className="h-3 w-3" />
                          Cobrar
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1">
                          Historial
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
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

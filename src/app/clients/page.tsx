"use client";

import { useState, useMemo } from "react";
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
import { 
  Search, 
  Plus, 
  UserCircle, 
  Phone, 
  DollarSign, 
  ArrowRight, 
  Loader2, 
  Trash2, 
  UserPlus,
  AlertCircle
} from "lucide-react";
import { 
  useFirestore, 
  useUser, 
  useMemoFirebase, 
  useCollection, 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function ClientsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const customersRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, "users", user.uid, "customers"), orderBy("name", "asc"));
  }, [firestore, user?.uid]);

  const { data: customersData, isLoading } = useCollection(customersRef);
  const customers = customersData || [];

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customers.filter(c => 
      String(c.name || "").toLowerCase().includes(term) ||
      String(c.phone || "").toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const stats = useMemo(() => {
    const totalDebt = customers.reduce((acc, c) => acc + (c.currentBalance || 0), 0);
    const withDebtCount = customers.filter(c => (c.currentBalance || 0) > 0).length;
    return { totalDebt, withDebtCount, totalCount: customers.length };
  }, [customers]);

  const handleSaveCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !customersRef) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const initialBalance = Number(formData.get("balance") || 0);

    const newCustomer = {
      name,
      phone,
      currentBalance: initialBalance,
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(customersRef as any, newCustomer);
    toast({ 
      title: "Cliente Registrado", 
      description: `${name} ha sido agregado a la lista.` 
    });
    setIsAddOpen(false);
  };

  const handleDelete = (customerId: string) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, "users", user.uid, "customers", customerId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Cliente Eliminado", description: "El registro ha sido removido." });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Cuentas Corrientes</h1>
            <p className="text-muted-foreground">Gestione clientes fieles y créditos otorgados ('Fiado').</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold">
                <UserPlus className="h-4 w-4" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSaveCustomer}>
                <DialogHeader>
                  <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Nombre Completo *</label>
                    <Input name="name" placeholder="Ej: Juan Pérez" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Teléfono / Celular</label>
                      <Input name="phone" placeholder="Ej: 11 2233-4455" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Saldo Inicial ($)</label>
                      <Input name="balance" type="number" step="0.01" defaultValue="0" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">El saldo inicial representa la deuda actual del cliente si la tuviera.</p>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full h-11">Guardar Cliente</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deuda Total Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-500">${stats.totalDebt.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Clientes con Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-primary">{stats.withDebtCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stats.totalCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre o teléfono..." 
                className="pl-10 h-11" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredCustomers.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">Cliente</TableHead>
                    <TableHead className="font-bold">Contacto</TableHead>
                    <TableHead className="text-right font-bold">Deuda Pendiente</TableHead>
                    <TableHead className="text-right font-bold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserCircle className="h-8 w-8 text-muted-foreground opacity-40" />
                          <span className="font-bold">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Phone className="h-3 w-3" />
                          {client.phone || "Sin teléfono"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-black text-base ${(client.currentBalance || 0) > 0 ? 'text-red-500' : 'text-accent'}`}>
                          ${(client.currentBalance || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="gap-1 text-accent border-accent/20 hover:bg-accent/5 font-bold">
                            <DollarSign className="h-3 w-3" />
                            Cobrar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDelete(client.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground opacity-50">
                <UserCircle className="h-12 w-12 mb-3" />
                <p className="font-bold">No hay clientes registrados</p>
                <p className="text-xs text-center max-w-[200px]">Los clientes que agregues para 'Fiado' aparecerán aquí.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

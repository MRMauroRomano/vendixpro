
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
import { Plus, Filter, Calendar, Download, Loader2, Receipt, Trash2, Lock } from "lucide-react";
import { 
  useFirestore, 
  useUser, 
  useMemoFirebase, 
  useCollection, 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase";
import { collection, doc, query, orderBy, where, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, isWithinInterval, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

export default function ExpensesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const activeSessionQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "users", user.uid, "cash_sessions"),
      where("status", "==", "open"),
      limit(1)
    );
  }, [firestore, user?.uid]);

  const { data: activeSessions, isLoading: isSessionLoading } = useCollection(activeSessionQuery);
  const isCashOpen = activeSessions && activeSessions.length > 0;

  const baseExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "expenses");
  }, [firestore, user?.uid]);

  const expensesQuery = useMemoFirebase(() => {
    if (!baseExpensesRef) return null;
    return query(baseExpensesRef, orderBy("date", "desc"));
  }, [baseExpensesRef]);

  const { data: expensesData, isLoading } = useCollection(expensesQuery);
  const expenses = expensesData || [];

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthlyExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
    });

    const totalMonthly = monthlyExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
    
    const catMap: Record<string, number> = {};
    monthlyExpenses.forEach(exp => {
      const cat = exp.category || "General";
      catMap[cat] = (catMap[cat] || 0) + exp.amount;
    });

    let topCategory = "-";
    let maxVal = 0;
    Object.entries(catMap).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        topCategory = cat;
      }
    });

    return {
      totalMonthly,
      topCategory,
      count: monthlyExpenses.length
    };
  }, [expenses]);

  const handleSaveExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !baseExpensesRef) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const concept = formData.get("concept") as string;
    const category = formData.get("category") as string;
    const date = formData.get("date") as string;

    const newExpense = {
      concept,
      category: category || "General",
      amount,
      date,
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(baseExpensesRef, newExpense);
    toast({ 
      title: "Gasto Registrado", 
      description: `Se guardó "${concept}" por $${amount.toLocaleString()}.` 
    });
    setIsAddOpen(false);
  };

  const handleDelete = (expenseId: string) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, "users", user.uid, "expenses", expenseId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Gasto Eliminado" });
  };

  if (isSessionLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isCashOpen) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 text-center max-w-lg mx-auto">
          <div className="bg-red-100 p-6 rounded-full">
            <Lock className="h-16 w-16 text-red-600" />
          </div>
          <h1 className="text-3xl font-black text-primary uppercase">Registro Bloqueado</h1>
          <p className="text-muted-foreground">Para registrar gastos operativos, primero debes abrir la caja.</p>
          <Button asChild size="lg" className="font-bold h-14 px-8">
            <Link href="/cash">Abrir Caja Ahora</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Gastos Operativos</h1>
            <p className="text-muted-foreground">Registre y categorice los egresos de su negocio.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> CSV</Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Registrar Gasto</Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSaveExpense}>
                  <DialogHeader><DialogTitle>Nuevo Egreso de Caja</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Concepto / Descripción *</label>
                      <Input name="concept" placeholder="Ej: Pago de Luz" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Categoría</label>
                        <Input name="category" placeholder="Ej: Servicios" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Monto ($) *</label>
                        <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Fecha *</label>
                      <Input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
                    </div>
                  </div>
                  <DialogFooter><Button type="submit" className="w-full">Guardar Gasto</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Total Gastos (Mes)</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-black text-primary">${stats.totalMonthly.toLocaleString()}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Categoría Mayor Gasto</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-black">{stats.topCategory}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Egresos del Mes</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-black">{stats.count} registros</div></CardContent>
          </Card>
        </div>

        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
            <Button variant="outline" size="sm" className="gap-1"><Calendar className="h-4 w-4" />{format(new Date(), "MMMM yyyy", { locale: es })}</Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando egresos...</p>
              </div>
            ) : expenses.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">Fecha</TableHead>
                    <TableHead className="font-bold">Concepto</TableHead>
                    <TableHead className="font-bold">Categoría</TableHead>
                    <TableHead className="text-right font-bold">Monto</TableHead>
                    <TableHead className="text-right font-bold">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{format(new Date(exp.date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-bold">{exp.concept}</TableCell>
                      <TableCell><span className="text-[10px] bg-muted px-2 py-1 rounded-full uppercase tracking-wider font-black text-muted-foreground">{exp.category}</span></TableCell>
                      <TableCell className="text-right font-black text-red-500 text-base">${(exp.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(exp.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground opacity-50">
                <Receipt className="h-12 w-12 mb-3" /><p className="font-bold">No hay gastos registrados</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

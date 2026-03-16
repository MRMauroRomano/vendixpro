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
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  History, 
  Lock, 
  Unlock,
  Loader2,
  CalendarDays
} from "lucide-react";
import { 
  useFirestore, 
  useUser, 
  useMemoFirebase, 
  useCollection, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking 
} from "@/firebase";
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CashControlPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isOpeningDialogOpen, setIsOpeningDialogOpen] = useState(false);
  const [isClosingDialogOpen, setIsClosingDialogOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [actualCash, setActualCash] = useState<number>(0);

  const sessionsBaseRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "cash_sessions");
  }, [firestore, user?.uid]);

  const sessionsQuery = useMemoFirebase(() => {
    if (!sessionsBaseRef) return null;
    return query(sessionsBaseRef, orderBy("openedAt", "desc"), limit(20));
  }, [sessionsBaseRef]);

  const { data: sessions, isLoading: sessionsLoading } = useCollection(sessionsQuery);
  
  const activeSession = useMemo(() => {
    return (sessions || []).find(s => s.status === 'open');
  }, [sessions]);

  const salesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !activeSession) return null;
    return query(
      collection(firestore, "users", user.uid, "sales"),
      where("createdAt", ">=", activeSession.openedAt)
    );
  }, [firestore, user?.uid, activeSession]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !activeSession) return null;
    return query(
      collection(firestore, "users", user.uid, "expenses"),
      where("createdAt", ">=", activeSession.openedAt)
    );
  }, [firestore, user?.uid, activeSession]);

  const { data: currentSales } = useCollection(salesQuery);
  const { data: currentExpenses } = useCollection(expensesQuery);

  const stats = useMemo(() => {
    if (!activeSession) return { cashSales: 0, totalExpenses: 0, expected: 0 };

    const cashSales = (currentSales || [])
      .filter(s => s.paymentMethod?.includes('Efectivo'))
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    
    const totalExpenses = (currentExpenses || [])
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const expected = (activeSession.openingBalance || 0) + cashSales - totalExpenses;

    return { cashSales, totalExpenses, expected };
  }, [activeSession, currentSales, currentExpenses]);

  const handleOpenCash = () => {
    if (!user || !sessionsBaseRef) return;

    const newSession = {
      userId: user.uid,
      status: 'open',
      openingBalance: openingAmount,
      openedAt: new Date().toISOString(),
      expectedClosingBalance: 0,
      actualClosingBalance: 0,
      difference: 0,
      notes: ""
    };

    addDocumentNonBlocking(sessionsBaseRef, newSession);
    toast({ title: "Caja Abierta", description: `Turno iniciado con $${openingAmount}.` });
    setIsOpeningDialogOpen(false);
    setOpeningAmount(0);
  };

  const handleCloseCash = () => {
    if (!user || !firestore || !activeSession) return;

    const docRef = doc(firestore, "users", user.uid, "cash_sessions", activeSession.id);
    const difference = actualCash - stats.expected;

    updateDocumentNonBlocking(docRef, {
      status: 'closed',
      closedAt: new Date().toISOString(),
      expectedClosingBalance: stats.expected,
      actualClosingBalance: actualCash,
      difference: difference,
      notes: `Ventas: $${stats.cashSales} | Gastos: $${stats.totalExpenses}`
    });

    toast({ title: "Caja Cerrada", description: "Arqueo completado." });
    setIsClosingDialogOpen(false);
    setActualCash(0);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Control de Caja</h1>
            <p className="text-muted-foreground">Arqueo y cierres de turno.</p>
          </div>

          {!activeSession ? (
            <Dialog open={isOpeningDialogOpen} onOpenChange={setIsOpeningDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-bold">
                  <Unlock className="h-4 w-4" />
                  Abrir Caja
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Apertura de Caja</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <label className="text-sm font-bold">Dinero Inicial ($)</label>
                  <Input 
                    type="number" 
                    value={openingAmount || ""}
                    onChange={(e) => setOpeningAmount(Number(e.target.value))}
                  />
                </div>
                <DialogFooter>
                  <Button className="w-full" onClick={handleOpenCash}>Confirmar Apertura</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={isClosingDialogOpen} onOpenChange={setIsClosingDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2 font-bold">
                  <Lock className="h-4 w-4" />
                  Cerrar Caja
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cierre de Caja (Arqueo)</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Saldo Esperado:</span>
                      <span className="font-bold">${stats.expected.toLocaleString()}</span>
                    </div>
                  </div>
                  <label className="text-sm font-bold">Efectivo Real en Caja ($)</label>
                  <Input 
                    type="number" 
                    placeholder="Cuente el dinero físico..."
                    value={actualCash || ""}
                    onChange={(e) => setActualCash(Number(e.target.value))}
                  />
                </div>
                <DialogFooter>
                  <Button className="w-full" variant="destructive" onClick={handleCloseCash}>Finalizar Turno</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {activeSession ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary text-primary-foreground">
              <CardHeader><CardTitle className="text-xs uppercase opacity-70">Saldo Esperado</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-black">${stats.expected.toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-xs uppercase text-muted-foreground flex gap-2"><ArrowUpCircle className="h-4 w-4 text-accent" /> Ventas Efectivo</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-black text-accent">${stats.cashSales.toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-xs uppercase text-muted-foreground flex gap-2"><ArrowDownCircle className="h-4 w-4 text-red-500" /> Gastos del Turno</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-black text-red-500">${stats.totalExpenses.toLocaleString()}</div></CardContent>
            </Card>
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed">
            <CardContent className="space-y-4">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-bold">Caja Cerrada</h3>
              <Button onClick={() => setIsOpeningDialogOpen(true)}>Iniciar Turno</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5" /> Historial de Sesiones</CardTitle></CardHeader>
          <CardContent className="p-0">
            {sessionsLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : sessions && sessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turno</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Real</TableHead>
                    <TableHead className="text-right">Dif.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">
                        {format(new Date(s.openedAt), "dd MMM HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'open' ? 'bg-accent/20 text-accent' : 'bg-muted'}`}>
                          {s.status === 'open' ? 'ABIERTO' : 'CERRADO'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">${(s.expectedClosingBalance || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">${(s.actualClosingBalance || 0).toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-bold ${s.difference < 0 ? 'text-red-500' : 'text-accent'}`}>
                        ${(s.difference || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center text-muted-foreground"><CalendarDays className="mx-auto h-8 w-8 opacity-20" /> Sin historial.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

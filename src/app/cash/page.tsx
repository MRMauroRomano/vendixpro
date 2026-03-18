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
  CalendarDays,
  CreditCard,
  QrCode,
  UserCheck,
  Banknote
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
    if (!activeSession) return { cashSales: 0, cardSales: 0, qrSales: 0, creditSales: 0, totalExpenses: 0, expected: 0 };

    const sales = currentSales || [];
    
    const cashSales = sales
      .filter(s => s.paymentMethod?.includes('Efectivo'))
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

    const cardSales = sales
      .filter(s => s.paymentMethod?.includes('Tarjeta'))
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

    const qrSales = sales
      .filter(s => s.paymentMethod?.includes('QR'))
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

    const creditSales = sales
      .filter(s => s.paymentMethod?.includes('Cuenta Corriente'))
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    
    const totalExpenses = (currentExpenses || [])
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    // El saldo esperado en CAJA FISICA solo contempla Efectivo y Gastos
    const expected = (activeSession.openingBalance || 0) + cashSales - totalExpenses;

    return { cashSales, cardSales, qrSales, creditSales, totalExpenses, expected };
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
    toast({ title: "Caja Abierta", description: `Turno iniciado con $${openingAmount.toLocaleString()}.` });
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
      notes: `Efectivo: $${stats.cashSales} | Tarjeta: $${stats.cardSales} | QR: $${stats.qrSales} | Gastos: $${stats.totalExpenses}`
    });

    toast({ title: "Caja Cerrada", description: "Arqueo completado y turno finalizado." });
    setIsClosingDialogOpen(false);
    setActualCash(0);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Control de Caja</h1>
            <p className="text-muted-foreground">Supervise el flujo de dinero y realice arqueos de turno.</p>
          </div>

          {!activeSession ? (
            <Dialog open={isOpeningDialogOpen} onOpenChange={setIsOpeningDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-bold h-12 px-6 shadow-lg bg-accent text-accent-foreground hover:bg-accent/90">
                  <Unlock className="h-5 w-5" />
                  ABRIR CAJA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Apertura de Turno</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Efectivo Inicial en Caja ($)</label>
                    <Input 
                      type="number" 
                      className="text-2xl font-black h-14 border-primary"
                      placeholder="0.00"
                      value={openingAmount || ""}
                      onChange={(e) => setOpeningAmount(Number(e.target.value))}
                      autoFocus
                    />
                    <p className="text-[10px] text-muted-foreground italic">Ingrese el monto físico con el que inicia el fondo de caja.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button className="w-full h-12 text-lg font-bold" onClick={handleOpenCash}>Confirmar Apertura</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={isClosingDialogOpen} onOpenChange={setIsClosingDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2 font-bold h-12 px-6 shadow-lg">
                  <Lock className="h-5 w-5" />
                  CERRAR CAJA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cierre de Turno (Arqueo)</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="bg-primary/5 p-4 rounded-xl border-2 border-dashed border-primary/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-primary">SALDO ESPERADO (EFECTIVO):</span>
                      <span className="text-xl font-black text-primary">${stats.expected.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Efectivo Real en Caja ($)</label>
                    <Input 
                      type="number" 
                      placeholder="Cuente el dinero físico..."
                      className="text-2xl font-black h-14 border-destructive"
                      value={actualCash || ""}
                      onChange={(e) => setActualCash(Number(e.target.value))}
                      autoFocus
                    />
                    <p className="text-[10px] text-muted-foreground">Cuente el dinero físico que hay actualmente en el cajón.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button className="w-full h-12 text-lg font-bold" variant="destructive" onClick={handleCloseCash}>Finalizar Turno</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {activeSession ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-primary text-primary-foreground border-none shadow-xl col-span-1 md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-2"><Banknote className="h-3 w-3" /> Saldo Esperado (Caja)</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black">${stats.expected.toLocaleString()}</div></CardContent>
            </Card>
            
            <Card className="border-2">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex gap-2 items-center"><ArrowUpCircle className="h-3 w-3 text-accent" /> Ventas Efectivo</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-black text-accent">${stats.cashSales.toLocaleString()}</div></CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex gap-2 items-center"><CreditCard className="h-3 w-3 text-blue-500" /> Ventas Tarjeta</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-black text-blue-500">${stats.cardSales.toLocaleString()}</div></CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex gap-2 items-center"><QrCode className="h-3 w-3 text-purple-500" /> Ventas QR/Trans</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-black text-purple-500">${stats.qrSales.toLocaleString()}</div></CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex gap-2 items-center"><UserCheck className="h-3 w-3 text-orange-500" /> Fiado (Cta Cte)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-black text-orange-500">${stats.creditSales.toLocaleString()}</div></CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex gap-2 items-center"><ArrowDownCircle className="h-3 w-3 text-red-500" /> Gastos de Caja</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-black text-red-500">${stats.totalExpenses.toLocaleString()}</div></CardContent>
            </Card>
          </div>
        ) : (
          <Card className="p-16 text-center border-2 border-dashed bg-muted/30">
            <CardContent className="space-y-6">
              <div className="bg-background w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-primary uppercase">Caja Cerrada</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Debe iniciar un turno para poder registrar ventas y ver las estadísticas del día.</p>
              </div>
              <Button size="lg" className="font-bold h-12 px-8 shadow-md" onClick={() => setIsOpeningDialogOpen(true)}>Iniciar Turno Ahora</Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-2">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> 
              Historial de Arqueos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sessionsLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : sessions && sessions.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">Apertura / Cierre</TableHead>
                    <TableHead className="font-bold">Estado</TableHead>
                    <TableHead className="text-right font-bold">Esperado</TableHead>
                    <TableHead className="text-right font-bold">Real (Físico)</TableHead>
                    <TableHead className="text-right font-bold">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">Inició: {format(new Date(s.openedAt), "dd/MM HH:mm", { locale: es })}</span>
                          {s.closedAt && <span className="text-muted-foreground">Cerró: {format(new Date(s.closedAt), "dd/MM HH:mm", { locale: es })}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${s.status === 'open' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-muted text-muted-foreground border-border'}`}>
                          {s.status === 'open' ? 'TURNO ACTIVO' : 'CONCLUIDO'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">${(s.expectedClosingBalance || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">${(s.actualClosingBalance || 0).toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-black ${s.difference < 0 ? 'text-red-500' : s.difference > 0 ? 'text-accent' : 'text-primary'}`}>
                        ${(s.difference || 0).toLocaleString()}
                        {s.difference !== 0 && (s.difference < 0 ? ' (Faltante)' : ' (Sobrante)')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-24 text-center text-muted-foreground italic flex flex-col items-center gap-3">
                <CalendarDays className="h-12 w-12 opacity-10" /> 
                <p>No se registran arqueos en la base de datos.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

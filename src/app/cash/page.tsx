
"use client";

import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogDescription
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
  Banknote,
  Calculator,
  AlertCircle,
  Receipt
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
import Link from "next/link";

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

  const activeSessionQuery = useMemoFirebase(() => {
    if (!sessionsBaseRef) return null;
    return query(sessionsBaseRef, where("status", "==", "open"), limit(1));
  }, [sessionsBaseRef]);

  const { data: activeSessions, isLoading: sessionsLoading } = useCollection(activeSessionQuery);
  const activeSession = activeSessions?.[0] || null;

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
    if (!activeSession) return { cashSales: 0, cardSales: 0, qrSales: 0, creditSales: 0, totalExpenses: 0, expected: 0, totalOperations: 0 };

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

    const expected = (activeSession.openingBalance || 0) + cashSales - totalExpenses;
    const totalOperations = sales.length + (currentExpenses || []).length;

    return { cashSales, cardSales, qrSales, creditSales, totalExpenses, expected, totalOperations };
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
      notes: `Efectivo: $${stats.cashSales} | Tarjeta: $${stats.cardSales} | QR: $${stats.qrSales} | Gastos: $${stats.totalExpenses} | Fiado: $${stats.creditSales}`
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
            <h1 className="text-3xl font-bold font-headline text-primary">Turno Actual</h1>
            <p className="text-muted-foreground">Monitoreo de flujo de caja en tiempo real.</p>
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
            <div className="flex gap-2">
              <Button asChild variant="outline" className="gap-2 h-12 border-primary/20">
                <Link href="/cash/history">
                   <History className="h-4 w-4" />
                   Ver Historial
                </Link>
              </Button>
              <Dialog open={isClosingDialogOpen} onOpenChange={setIsClosingDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2 font-bold h-12 px-6 shadow-lg">
                    <Lock className="h-5 w-5" />
                    ARQUEO Y CIERRE
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Arqueo de Turno
                    </DialogTitle>
                    <DialogDescription>
                      Revise los totales antes de finalizar la sesión de caja.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="bg-muted/50 p-4 rounded-xl border space-y-3">
                       <div className="flex justify-between text-sm">
                         <span>Fondo Inicial (Apertura):</span>
                         <span className="font-bold">${(activeSession.openingBalance || 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-sm text-accent">
                         <span className="flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" /> Ventas Efectivo (+):</span>
                         <span className="font-bold">${stats.cashSales.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-sm text-red-500">
                         <span className="flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" /> Gastos de Caja (-):</span>
                         <span className="font-bold">${stats.totalExpenses.toLocaleString()}</span>
                       </div>
                       <Separator />
                       <div className="flex justify-between items-center py-1">
                         <span className="text-sm font-black uppercase">Saldo Teórico (Efectivo):</span>
                         <span className="text-2xl font-black text-primary">${stats.expected.toLocaleString()}</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded border bg-blue-50">
                        <p className="text-[9px] font-bold text-blue-600 uppercase">Tarjeta</p>
                        <p className="text-sm font-black">${stats.cardSales.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-2 rounded border bg-purple-50">
                        <p className="text-[9px] font-bold text-purple-600 uppercase">QR/Trans</p>
                        <p className="text-sm font-black">${stats.qrSales.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-2 rounded border bg-orange-50">
                        <p className="text-[9px] font-bold text-orange-600 uppercase">Fiado</p>
                        <p className="text-sm font-black">${stats.creditSales.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        Efectivo Real en Mano ($)
                      </label>
                      <Input 
                        type="number" 
                        placeholder="Monto contado físicamente..."
                        className="text-2xl font-black h-14 border-destructive focus:ring-destructive/20"
                        value={actualCash || ""}
                        onChange={(e) => setActualCash(Number(e.target.value))}
                        autoFocus
                      />
                      <p className="text-[10px] text-muted-foreground italic">Cuente todo el efectivo del cajón y el fondo.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full h-12 text-lg font-bold" variant="destructive" onClick={handleCloseCash}>Finalizar Sesión</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {activeSession ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-primary text-primary-foreground border-none shadow-xl col-span-1 md:col-span-2 lg:col-span-1">
                <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-2"><Banknote className="h-3 w-3" /> Saldo Teórico (Caja)</CardTitle></CardHeader>
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-2">
                <CardHeader className="bg-muted/10 border-b">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Resumen Operativo del Turno
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg border bg-muted/5">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full"><Unlock className="h-4 w-4 text-primary" /></div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Fondo Inicial</p>
                          <p className="text-sm font-bold">Dinero con el que abrió la caja</p>
                        </div>
                      </div>
                      <span className="text-lg font-black">${(activeSession.openingBalance || 0).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-lg border bg-accent/5 border-accent/20">
                      <div className="flex items-center gap-3">
                        <div className="bg-accent/10 p-2 rounded-full"><ArrowUpCircle className="h-4 w-4 text-accent" /></div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-accent">Entradas (Efectivo)</p>
                          <p className="text-sm font-bold">Ventas cobradas en mano</p>
                        </div>
                      </div>
                      <span className="text-lg font-black text-accent">+ ${(stats.cashSales || 0).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-lg border bg-red-50 border-red-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-full"><ArrowDownCircle className="h-4 w-4 text-red-500" /></div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-red-500">Salidas (Gastos)</p>
                          <p className="text-sm font-bold">Retiros de dinero del cajón</p>
                        </div>
                      </div>
                      <span className="text-lg font-black text-red-500">- ${(stats.totalExpenses || 0).toLocaleString()}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center p-4 rounded-xl bg-primary text-primary-foreground shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full"><Calculator className="h-5 w-5" /></div>
                        <span className="text-sm font-black uppercase tracking-wider">Saldo Final Esperado en Efectivo</span>
                      </div>
                      <span className="text-3xl font-black">${stats.expected.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex gap-2 items-center">
                      <UserCheck className="h-3 w-3 text-orange-500" /> Fiado (Cta Cte)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-orange-500">${stats.creditSales.toLocaleString()}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Ventas no cobradas, a cuenta de clientes.</p>
                  </CardContent>
                </Card>

                <Card className="border-2 bg-muted/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Estado del Turno</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Operaciones:</span>
                      <span className="font-bold">{stats.totalOperations}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Inició el:</span>
                      <span className="font-bold">{new Date(activeSession.openedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Hora:</span>
                      <span className="font-bold">{new Date(activeSession.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] font-black px-2 py-1 bg-accent text-accent-foreground rounded-full animate-pulse">
                        EN CURSO
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
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
      </div>
    </AppLayout>
  );
}

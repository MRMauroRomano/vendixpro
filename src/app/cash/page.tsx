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
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
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

  // Referencias base para escrituras
  const sessionsBaseRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "cash_sessions");
  }, [firestore, user?.uid]);

  // Consultas para lectura
  const sessionsQuery = useMemoFirebase(() => {
    if (!sessionsBaseRef) return null;
    return query(sessionsBaseRef, orderBy("openedAt", "desc"), limit(20));
  }, [sessionsBaseRef]);

  const { data: sessions, isLoading: sessionsLoading } = useCollection(sessionsQuery);
  
  // Buscar sesión abierta
  const activeSession = useMemo(() => {
    return (sessions || []).find(s => s.status === 'open');
  }, [sessions]);

  // Consultar ventas y gastos DESDE la apertura de la sesión activa
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

  // Cálculos de la sesión actual
  const stats = useMemo(() => {
    if (!activeSession) return { cashSales: 0, totalExpenses: 0, expected: 0 };

    const cashSales = (currentSales || [])
      .filter(s => s.paymentMethod === 'Efectivo')
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
    toast({ title: "Caja Abierta", description: `Se inició el turno con $${openingAmount.toLocaleString()}.` });
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
      notes: `Ventas Efectivo: $${stats.cashSales} | Gastos: $${stats.totalExpenses}`
    });

    toast({ 
      title: "Caja Cerrada", 
      description: `Turno finalizado. Diferencia: $${difference.toLocaleString()}.`,
      variant: difference !== 0 ? "destructive" : "default"
    });
    
    setIsClosingDialogOpen(false);
    setActualCash(0);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Control de Caja Diario</h1>
            <p className="text-muted-foreground">Gestione el flujo de efectivo y el arqueo de sus turnos.</p>
          </div>

          {!activeSession ? (
            <Dialog open={isOpeningDialogOpen} onOpenChange={setIsOpeningDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold">
                  <Unlock className="h-4 w-4" />
                  Abrir Caja
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Apertura de Turno</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Efectivo Inicial en Caja ($)</label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="h-12 text-xl font-bold"
                      value={openingAmount || ""}
                      onChange={(e) => setOpeningAmount(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground italic">El dinero con el que comienza para dar vueltos.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button className="w-full h-11" onClick={handleOpenCash} disabled={openingAmount < 0}>
                    Confirmar Apertura
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={isClosingDialogOpen} onOpenChange={setIsClosingDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2 font-bold">
                  <Lock className="h-4 w-4" />
                  Cerrar Caja (Arqueo)
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Cierre de Caja y Arqueo</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="bg-muted p-4 rounded-lg space-y-2 border-2 border-dashed">
                    <div className="flex justify-between text-sm">
                      <span>Saldo Inicial:</span>
                      <span className="font-bold">${activeSession.openingBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-accent">
                      <span>(+) Ventas Efectivo:</span>
                      <span className="font-bold">+${stats.cashSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-500">
                      <span>(-) Gastos Registrados:</span>
                      <span className="font-bold">-${stats.totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t flex justify-between font-black text-primary">
                      <span>SALDO ESPERADO:</span>
                      <span>${stats.expected.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold">Efectivo REAL en Mano ($)</label>
                    <Input 
                      type="number" 
                      placeholder="Cuente el dinero físico..." 
                      className="h-12 text-xl font-bold border-primary"
                      value={actualCash || ""}
                      onChange={(e) => setActualCash(Number(e.target.value))}
                    />
                  </div>

                  {actualCash > 0 && (
                    <div className={`p-3 rounded text-center font-bold text-sm ${actualCash - stats.expected === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {actualCash - stats.expected === 0 
                        ? "Caja Cuadrada Perfecta" 
                        : `Diferencia: $${(actualCash - stats.expected).toLocaleString()}`}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button className="w-full h-11" variant="destructive" onClick={handleCloseCash}>
                    Confirmar Cierre de Turno
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {activeSession ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary text-primary-foreground border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-70">Saldo Esperado en Caja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">${stats.expected.toLocaleString()}</div>
                <div className="text-[10px] mt-2 bg-white/10 p-1 px-2 rounded-full inline-block">
                  Apertura: {format(new Date(activeSession.openedAt), "HH:mm")} hs
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-accent" />
                  Ingresos Efectivo (Turno)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-accent">${stats.cashSales.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Solo pagos registrados como "Efectivo"</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-red-500" />
                  Egresos de Caja (Turno)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-red-500">${stats.totalExpenses.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Gastos cargados durante este turno</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-muted/30 border-dashed border-2 p-12 text-center">
            <CardContent className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Caja Cerrada</h3>
                <p className="text-sm text-muted-foreground">Debe abrir el turno para registrar ventas y movimientos de efectivo.</p>
              </div>
              <Button onClick={() => setIsOpeningDialogOpen(true)} className="gap-2">
                <Unlock className="h-4 w-4" />
                Iniciar Turno Ahora
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historial de Cierres y Arqueos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sessionsLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : sessions && sessions.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">Fecha / Turno</TableHead>
                    <TableHead className="font-bold">Estado</TableHead>
                    <TableHead className="text-right font-bold">Inicial</TableHead>
                    <TableHead className="text-right font-bold">Esperado</TableHead>
                    <TableHead className="text-right font-bold">Real (Arqueo)</TableHead>
                    <TableHead className="text-right font-bold">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">{format(new Date(s.openedAt), "dd MMM yyyy", { locale: es })}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(s.openedAt), "HH:mm")} - {s.closedAt ? format(new Date(s.closedAt), "HH:mm") : '...'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${s.status === 'open' ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                          {s.status === 'open' ? 'En Curso' : 'Cerrada'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">${(s.openingBalance || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-medium">${(s.expectedClosingBalance || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-black text-primary">
                        {s.status === 'closed' ? `$${(s.actualClosingBalance || 0).toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.status === 'closed' ? (
                          <span className={`text-xs font-black ${(s.difference || 0) === 0 ? 'text-accent' : 'text-red-500'}`}>
                            ${(s.difference || 0).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground opacity-20">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-30">
                <CalendarDays className="h-12 w-12 mb-2" />
                <p className="text-sm italic">No hay registros de caja previos.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
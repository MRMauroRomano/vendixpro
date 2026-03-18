
"use client";

import { AppLayout } from "@/components/layout/app-layout";
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
  History, 
  Loader2,
  CalendarDays,
  ArrowLeft
} from "lucide-react";
import { 
  useFirestore, 
  useUser, 
  useMemoFirebase, 
  useCollection 
} from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CashHistoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const sessionsBaseRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "cash_sessions");
  }, [firestore, user?.uid]);

  const sessionsQuery = useMemoFirebase(() => {
    if (!sessionsBaseRef) return null;
    return query(sessionsBaseRef, orderBy("openedAt", "desc"), limit(50));
  }, [sessionsBaseRef]);

  const { data: sessions, isLoading: sessionsLoading } = useCollection(sessionsQuery);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href="/cash"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-headline text-primary">Historial de Cierres</h1>
              <p className="text-muted-foreground">Registro histórico de arqueos y sesiones finalizadas.</p>
            </div>
          </div>
        </div>

        <Card className="border-2">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> 
              Arqueos Recientes (Últimos 50)
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
                    <TableHead className="text-right font-bold">Teórico</TableHead>
                    <TableHead className="text-right font-bold">Físico</TableHead>
                    <TableHead className="text-right font-bold">Diferencia</TableHead>
                    <TableHead className="font-bold">Detalle de Medios</TableHead>
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
                      <TableCell className="text-[10px] text-muted-foreground max-w-[200px] truncate">
                        {s.notes || "Sin detalles"}
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

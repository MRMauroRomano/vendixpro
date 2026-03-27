
"use client";

import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  Loader2,
  Database,
  CheckCircle2,
  RefreshCcw,
  Trash2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { 
  useFirestore, 
  useUser, 
  useMemoFirebase, 
  useCollection, 
  addDocumentNonBlocking,
  deleteDocumentNonBlocking 
} from "@/firebase";
import { collection, query, orderBy, limit, getDocs, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const productsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "products");
  }, [firestore, user?.uid]);

  const salesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, "users", user.uid, "sales"), orderBy("createdAt", "desc"), limit(100));
  }, [firestore, user?.uid]);

  const expensesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "expenses");
  }, [firestore, user?.uid]);

  const { data: products } = useCollection(productsRef);
  const { data: sales } = useCollection(salesRef);
  const { data: expenses } = useCollection(expensesRef);

  const stats = useMemo(() => {
    const totalSales = (sales || []).reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);
    const totalExpenses = (expenses || []).reduce((acc, exp) => acc + (exp.amount || 0), 0);
    const productCount = (products || []).length;
    const lowStockCount = (products || []).filter(p => (p.stockQuantity || 0) <= 5).length;

    return [
      {
        title: "Ventas Totales",
        value: `$${totalSales.toLocaleString()}`,
        change: `${(sales || []).length} ventas`,
        trend: "up",
        icon: TrendingUp,
        color: "text-accent"
      },
      {
        title: "Gastos Registrados",
        value: `$${totalExpenses.toLocaleString()}`,
        change: `${(expenses || []).length} registros`,
        trend: "up",
        icon: TrendingDown,
        color: "text-red-500"
      },
      {
        title: "Productos Totales",
        value: productCount.toLocaleString(),
        change: "Variedad en inventario",
        trend: "neutral",
        icon: Package,
        color: "text-blue-500"
      },
      {
        title: "Bajo Stock",
        value: lowStockCount.toString(),
        change: "Requieren reposición",
        trend: lowStockCount > 0 ? "down" : "neutral",
        icon: AlertTriangle,
        color: "text-orange-500"
      }
    ];
  }, [sales, expenses, products]);

  const chartData = useMemo(() => {
    return (sales || []).slice(0, 7).reverse().map((sale, i) => ({
      name: `Venta ${i + 1}`,
      ventas: sale.totalAmount || 0,
      gastos: 0
    }));
  }, [sales]);

  const handleSeedData = () => {
    if (!user || !firestore) return;
    setIsSeeding(true);

    const catRef = collection(firestore, "users", user.uid, "categories");
    addDocumentNonBlocking(catRef, { 
      name: "Bebidas", 
      description: "Refrescos y aguas", 
      createdAt: new Date().toISOString() 
    });

    const prodRef = collection(firestore, "users", user.uid, "products");
    addDocumentNonBlocking(prodRef, {
      name: "Producto de Prueba",
      price: 1500,
      stockQuantity: 10,
      category: "Bebidas",
      sku: "PROV-001",
      imageUrl: "https://picsum.photos/seed/test/400/300",
      createdAt: new Date().toISOString()
    });

    const expRef = collection(firestore, "users", user.uid, "expenses");
    addDocumentNonBlocking(expRef, {
      concept: "Insumos Iniciales",
      category: "Limpieza",
      amount: 500,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    });

    toast({
      title: "Carga Iniciada",
      description: "Los datos de prueba se están sincronizando con el servidor.",
    });
    setIsSeeding(false);
  };

  const handleClearHistory = async () => {
    if (!user || !firestore) return;
    setIsClearing(true);

    try {
      // Borrar ventas
      const salesSnapshot = await getDocs(collection(firestore, "users", user.uid, "sales"));
      salesSnapshot.forEach((sDoc) => {
        deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "sales", sDoc.id));
      });

      // Borrar gastos
      const expensesSnapshot = await getDocs(collection(firestore, "users", user.uid, "expenses"));
      expensesSnapshot.forEach((eDoc) => {
        deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "expenses", eDoc.id));
      });

      toast({
        title: "Historial Reiniciado",
        description: "Se han eliminado todas las ventas y gastos. Los contadores volverán a 0.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al reiniciar",
        description: "Hubo un problema al intentar borrar los datos.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (!mounted || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Dashboard de Rendimiento</h1>
            <p className="text-muted-foreground italic">Kiosco el Tula - Panel de Control</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  disabled={isClearing}
                >
                  {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Reiniciar Contadores
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Reiniciar todas las estadísticas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará permanentemente todo el historial de **Ventas** y **Gastos**. 
                    Los contadores volverán a cero. El inventario de productos NO se verá afectado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory} className="bg-red-600 hover:bg-red-700">
                    Sí, poner en cero
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-accent text-accent hover:bg-accent/5"
              onClick={handleSeedData}
              disabled={isSeeding}
            >
              {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {isSeeding ? "Cargando..." : "Cargar Datos Prueba"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-2 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{stat.value}</div>
                <div className="flex items-center text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-tight">
                  {stat.change}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 border-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Rendimiento de Últimas Ventas</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[350px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground italic gap-2 p-10 text-center">
                    <CheckCircle2 className="h-12 w-12 text-accent opacity-20 mb-2" />
                    <p className="font-bold text-lg">Sin datos para graficar</p>
                    <p className="text-xs non-italic">Realiza ventas en el POS para ver el rendimiento del negocio.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-3 border-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Alertas de Reposición</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(products || [])
                  .filter(p => (p.stockQuantity || 0) <= 5)
                  .slice(0, 6)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between space-x-4 p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-bold truncate max-w-[150px]">{item.name}</span>
                        <span className="text-[10px] font-black bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground uppercase w-fit">{item.category}</span>
                      </div>
                      <div className="text-sm font-black text-red-500">
                        {item.stockQuantity} {item.unit || 'u.'}
                      </div>
                    </div>
                  ))}
                {(!products || products.filter(p => (p.stockQuantity || 0) <= 5).length === 0) && (
                  <div className="flex flex-col items-center py-16 opacity-30 italic text-sm text-center gap-2">
                    <div className="bg-accent/10 p-4 rounded-full">
                      <CheckCircle2 className="h-10 w-10 text-accent" />
                    </div>
                    <p className="font-bold">Stock al día</p>
                    <p className="text-[10px]">No hay productos con bajo stock.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

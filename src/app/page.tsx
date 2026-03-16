
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
  CheckCircle2
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
import { useFirestore, useUser, useMemoFirebase, useCollection, addDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold font-headline">Dashboard de Rendimiento</h1>
            <p className="text-muted-foreground">Visualización real de tu negocio.</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-accent text-accent hover:bg-accent/5"
            onClick={handleSeedData}
            disabled={isSeeding}
          >
            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {isSeeding ? "Cargando..." : "Cargar Datos de Prueba"}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {stat.change}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Rendimiento de Últimas Ventas</CardTitle>
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
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground italic gap-2">
                    <p>No hay ventas suficientes para mostrar el gráfico.</p>
                    <p className="text-[10px] non-italic">Realiza ventas en el POS para ver datos reales.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Productos Críticos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(products || [])
                  .filter(p => (p.stockQuantity || 0) <= 5)
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between space-x-4">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium truncate max-w-[150px]">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{item.category}</span>
                      </div>
                      <div className="text-sm font-bold text-red-500">
                        {item.stockQuantity} u.
                      </div>
                    </div>
                  ))}
                {(!products || products.filter(p => (p.stockQuantity || 0) <= 5).length === 0) && (
                  <div className="flex flex-col items-center py-10 opacity-30 italic text-sm text-center gap-2">
                    <CheckCircle2 className="h-10 w-10 text-accent" />
                    <p>Sin alertas de stock.</p>
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

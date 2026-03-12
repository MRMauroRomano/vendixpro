
"use client";

import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  ShoppingBag
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
import { useFirestore, useUser, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

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
    const totalStock = (products || []).reduce((acc, prod) => acc + (prod.stockQuantity || 0), 0);
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
        title: "Stock Total",
        value: totalStock.toLocaleString(),
        change: "Unidades en almacén",
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

  // Datos para el gráfico (basados en las últimas ventas)
  const chartData = useMemo(() => {
    // Agrupar ventas por día si es posible, o simplemente mostrar los últimos montos
    return (sales || []).slice(0, 7).reverse().map((sale, i) => ({
      name: `Venta ${i + 1}`,
      ventas: sale.totalAmount || 0,
      gastos: 0 // Simplificado para el MVP
    }));
  }, [sales]);

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
        <div>
          <h1 className="text-3xl font-bold font-headline">Dashboard de Rendimiento</h1>
          <p className="text-muted-foreground">Visualización real de tu negocio.</p>
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
                  <div className="flex items-center justify-center h-full text-muted-foreground italic">
                    No hay ventas suficientes para mostrar el gráfico.
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
                  <div className="text-center py-10 opacity-30 italic text-sm">
                    Sin alertas de stock.
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

"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

const data = [
  { name: "Lun", ventas: 4000, gastos: 2400 },
  { name: "Mar", ventas: 3000, gastos: 1398 },
  { name: "Mie", ventas: 2000, gastos: 9800 },
  { name: "Jue", ventas: 2780, gastos: 3908 },
  { name: "Vie", ventas: 1890, gastos: 4800 },
  { name: "Sab", ventas: 2390, gastos: 3800 },
  { name: "Dom", ventas: 3490, gastos: 4300 },
];

const stats = [
  {
    title: "Ventas del Mes",
    value: "$45,231.89",
    change: "+20.1%",
    trend: "up",
    icon: TrendingUp,
    color: "text-accent"
  },
  {
    title: "Gastos Operativos",
    value: "$12,302.45",
    change: "+4.5%",
    trend: "up",
    icon: TrendingDown,
    color: "text-red-500"
  },
  {
    title: "Stock Total",
    value: "1,204",
    change: "-2.4%",
    trend: "down",
    icon: Package,
    color: "text-blue-500"
  },
  {
    title: "Bajo Stock",
    value: "12",
    change: "Alerta Crítica",
    trend: "neutral",
    icon: AlertTriangle,
    color: "text-orange-500"
  }
];

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Dashboard de Rendimiento</h1>
          <p className="text-muted-foreground">Bienvenido de nuevo, administrador.</p>
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
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 text-accent mr-1" />
                  ) : stat.trend === "down" ? (
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  ) : null}
                  {stat.change} desde el mes pasado
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Resumen Semanal de Operaciones</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Productos con Stock Crítico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Cerveza Quilmes 1L", stock: 2, limit: 10 },
                  { name: "Pan de Molde Lactal", stock: 5, limit: 20 },
                  { name: "Leche Entera La Serenísima", stock: 3, limit: 15 },
                  { name: "Yerba Mate Taragüi 500g", stock: 1, limit: 12 },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between space-x-4">
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">Mínimo sugerido: {item.limit}</span>
                    </div>
                    <div className="text-sm font-bold text-red-500">
                      {item.stock} u.
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote,
  ShoppingBag,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

const MOCK_PRODUCTS: Product[] = [
  { id: "1", name: "Cerveza Quilmes 1L", price: 2500, stock: 45, category: "Bebidas" },
  { id: "2", name: "Leche La Serenísima", price: 1200, stock: 20, category: "Lácteos" },
  { id: "3", name: "Yerba Mate Playadito 1kg", price: 4200, stock: 15, category: "Almacén" },
  { id: "4", name: "Pan Francés x kg", price: 1800, stock: 10, category: "Panadería" },
  { id: "5", name: "Aceite Girasol 1.5L", price: 3100, stock: 8, category: "Almacén" },
  { id: "6", name: "Gaseosa Coca Cola 2.25L", price: 2800, stock: 30, category: "Bebidas" },
];

export default function POSPage() {
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const filteredProducts = MOCK_PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleCheckout = (method: string) => {
    if (cart.length === 0) return;
    toast({
      title: "Venta Exitosa",
      description: `Se ha registrado la venta por $${total.toLocaleString()} (${method}).`,
    });
    setCart([]);
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)]">
        {/* Product Selection */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar productos (nombre o código)..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:border-accent hover:shadow-md transition-all border-2"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="text-xs text-muted-foreground">{product.category}</div>
                  <div className="font-semibold text-sm line-clamp-2">{product.name}</div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-accent font-bold">${product.price.toLocaleString()}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${product.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      Stock: {product.stock}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Shopping Cart */}
        <Card className="lg:col-span-5 flex flex-col shadow-xl">
          <CardHeader className="pb-2 border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-accent" />
                Carrito de Compra
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-muted-foreground h-8 px-2">
                Limpiar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-4">
                <ShoppingBag className="h-12 w-12 opacity-20" />
                <p>El carrito está vacío. Seleccione productos para comenzar.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b z-10">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-4 font-medium">Producto</th>
                    <th className="p-4 font-medium">Cant.</th>
                    <th className="p-4 font-medium text-right">Subtotal</th>
                    <th className="p-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cart.map((item) => (
                    <tr key={item.product.id}>
                      <td className="p-4 align-top">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">${item.product.price.toLocaleString()} c/u</div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6 rounded-full"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6 rounded-full"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 align-top text-right font-medium">
                        ${(item.product.price * item.quantity).toLocaleString()}
                      </td>
                      <td className="p-4 align-top">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-red-400 hover:text-red-600"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
          <CardFooter className="flex-col p-6 border-t bg-muted/30">
            <div className="w-full space-y-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">${total.toLocaleString()}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  className="flex flex-col h-16 gap-1" 
                  disabled={cart.length === 0}
                  onClick={() => handleCheckout("Efectivo")}
                >
                  <Banknote className="h-5 w-5" />
                  <span className="text-[10px]">Efectivo</span>
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex flex-col h-16 gap-1" 
                  disabled={cart.length === 0}
                  onClick={() => handleCheckout("Tarjeta")}
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-[10px]">Tarjeta</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-16 gap-1" 
                  disabled={cart.length === 0}
                  onClick={() => handleCheckout("Cuenta Corriente")}
                >
                  <User className="h-5 w-5" />
                  <span className="text-[10px]">A Cuenta</span>
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}

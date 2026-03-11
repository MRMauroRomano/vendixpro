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
  User,
  QrCode,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useMemoFirebase,
  addDocumentNonBlocking 
} from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";

interface CartItem {
  product: any;
  quantity: number;
}

export default function POSPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cardType, setCardType] = useState<"Debito" | "Credito" | "">("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const productsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "products");
  }, [firestore, user?.uid]);

  const customersRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "customers");
  }, [firestore, user?.uid]);
  
  const { data: productsData } = useCollection(productsRef);
  const { data: customersData } = useCollection(customersRef);

  const products = productsData || [];
  const customers = customersData || [];

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToCart = (product: any) => {
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

  const subtotal = cart.reduce((acc, item) => acc + ((item.product.price || 0) * item.quantity), 0);
  const total = subtotal;
  const changeDue = Math.max(0, cashReceived - total);

  const resetPayment = () => {
    setPaymentMethod("");
    setCashReceived(0);
    setCardType("");
    setSelectedCustomerId("");
  };

  const handleCompleteSale = () => {
    if (!user || cart.length === 0 || !paymentMethod) return;
    
    if (paymentMethod === "Efectivo" && cashReceived < total) {
      toast({
        variant: "destructive",
        title: "Dinero insuficiente",
        description: "El monto recibido es menor al total de la venta."
      });
      return;
    }

    if (paymentMethod === "Cuenta Corriente" && !selectedCustomerId) {
      toast({
        variant: "destructive",
        title: "Falta Cliente",
        description: "Debe seleccionar un cliente para ventas a cuenta corriente."
      });
      return;
    }

    const saleData = {
      saleDateTime: serverTimestamp(),
      totalAmount: total,
      taxAmount: 0,
      discountAmount: 0,
      finalAmount: total,
      paymentMethod: paymentMethod === "Tarjeta" ? `Tarjeta ${cardType}` : paymentMethod,
      status: "Completed",
      userId: user.uid,
      customerId: selectedCustomerId || null,
      notes: paymentMethod === "Efectivo" ? `Recibido: $${cashReceived} - Vuelto: $${changeDue}` : "",
      createdAt: new Date().toISOString()
    };

    const salesRef = collection(firestore, "users", user.uid, "sales");
    addDocumentNonBlocking(salesRef, saleData).then((saleRef) => {
      if (saleRef) {
        const saleItemsRef = collection(firestore, "users", user.uid, "sales", saleRef.id, "sale_items");
        cart.forEach(item => {
          addDocumentNonBlocking(saleItemsRef, {
            saleId: saleRef.id,
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.price || 0,
            subtotal: (item.product.price || 0) * item.quantity,
          });
        });
      }
    });

    toast({
      title: "Venta Registrada",
      description: `Venta por $${total.toLocaleString()} completada con éxito.`,
    });

    setCart([]);
    setIsPaymentDialogOpen(false);
    resetPayment();
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar productos (nombre o SKU)..." 
              className="pl-10 h-12 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:border-accent hover:shadow-md transition-all border-2 active:scale-95 group overflow-hidden"
                onClick={() => addToCart(product)}
              >
                <div className="relative h-32 w-full overflow-hidden bg-muted border-b">
                   <img 
                    src={product.imageUrl || `https://picsum.photos/seed/${product.id}/300/200`} 
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm ${ (product.stockQuantity || 0) < 10 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                      {product.stockQuantity || 0} u.
                    </span>
                  </div>
                </div>
                <CardContent className="p-3 flex flex-col justify-between space-y-2">
                  <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">{product.category}</div>
                  <div className="font-semibold text-xs line-clamp-2 h-[32px]">{product.name}</div>
                  <div className="text-primary font-bold text-base pt-1">${(product.price || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="lg:col-span-5 flex flex-col shadow-xl overflow-hidden border-2">
          <CardHeader className="pb-2 border-b bg-muted/20">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Pedido Actual
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-muted-foreground h-8 px-2 hover:bg-red-50 hover:text-red-500">
                Limpiar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-4">
                <ShoppingBag className="h-12 w-12 opacity-10" />
                <p className="text-sm font-medium">No hay productos en el carrito.</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-4 flex gap-4 items-center group">
                    <div className="h-12 w-12 rounded-md overflow-hidden bg-muted border flex-shrink-0">
                       <img 
                        src={item.product.imageUrl || `https://picsum.photos/seed/${item.product.id}/50/50`} 
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-sm leading-tight line-clamp-1">{item.product.name}</div>
                      <div className="text-xs text-muted-foreground">${(item.product.price || 0).toLocaleString()} c/u</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 bg-muted/50 rounded-full p-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full bg-background border"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full bg-background border"
                          onClick={() => addToCart(item.product)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">${((item.product.price || 0) * item.quantity).toLocaleString()}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-red-500"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col p-6 border-t bg-muted/30 gap-4">
            <div className="w-full flex justify-between items-center text-2xl font-black">
              <span>TOTAL</span>
              <span className="text-primary">${total.toLocaleString()}</span>
            </div>
            
            <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => { setIsPaymentDialogOpen(open); if(!open) resetPayment(); }}>
              <DialogTrigger asChild>
                <Button className="w-full h-14 text-lg font-bold gap-2" disabled={cart.length === 0}>
                  Cobrar Venta
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Total a Cobrar: ${total.toLocaleString()}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "Efectivo", icon: Banknote, label: "Efectivo" },
                      { id: "Tarjeta", icon: CreditCard, label: "Tarjeta" },
                      { id: "QR", icon: QrCode, label: "QR / Trans" },
                      { id: "Cuenta Corriente", icon: User, label: "Fiado" },
                    ].map((method) => (
                      <Button
                        key={method.id}
                        variant={paymentMethod === method.id ? "default" : "outline"}
                        className="flex flex-col h-20 gap-2 border-2"
                        onClick={() => { resetPayment(); setPaymentMethod(method.id); }}
                      >
                        <method.icon className="h-6 w-6" />
                        <span className="text-[10px] font-bold uppercase">{method.label}</span>
                      </Button>
                    ))}
                  </div>

                  {paymentMethod === "Efectivo" && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                      <div className="space-y-2">
                        <label className="text-sm font-bold">Monto Recibido</label>
                        <Input 
                          type="number" 
                          className="text-2xl font-bold h-14"
                          placeholder="0.00"
                          autoFocus
                          value={cashReceived || ""}
                          onChange={(e) => setCashReceived(Number(e.target.value))}
                        />
                      </div>
                      <div className="flex justify-between items-center p-4 bg-background rounded-md border">
                        <span className="text-lg font-medium">Vuelto:</span>
                        <span className={`text-3xl font-black ${changeDue > 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                          ${changeDue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "Tarjeta" && (
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        variant={cardType === "Debito" ? "default" : "outline"}
                        className="h-16 text-lg font-bold"
                        onClick={() => setCardType("Debito")}
                      >
                        Débito
                      </Button>
                      <Button 
                        variant={cardType === "Credito" ? "default" : "outline"}
                        className="h-16 text-lg font-bold"
                        onClick={() => setCardType("Credito")}
                      >
                        Crédito
                      </Button>
                    </div>
                  )}

                  {paymentMethod === "Cuenta Corriente" && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Seleccionar Cliente</label>
                      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Buscar cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.length === 0 ? (
                            <SelectItem value="none" disabled>No hay clientes registrados</SelectItem>
                          ) : (
                            customers.map(customer => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} (Saldo: ${ (customer.currentBalance || 0).toLocaleString()})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <DialogFooter className="sm:justify-between gap-4 mt-4">
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1 h-12 text-lg font-bold gap-2"
                    disabled={
                      !paymentMethod || 
                      (paymentMethod === "Efectivo" && cashReceived < total) ||
                      (paymentMethod === "Tarjeta" && !cardType) ||
                      (paymentMethod === "Cuenta Corriente" && !selectedCustomerId)
                    }
                    onClick={handleCompleteSale}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Confirmar Pago
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}

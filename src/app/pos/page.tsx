"use client";

import { useState, useMemo } from "react";
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
  addDocumentNonBlocking,
  updateDocumentNonBlocking
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";

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

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      String(p.name || "").toLowerCase().includes(term) ||
      String(p.sku || "").toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

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
    if (!user || cart.length === 0 || !paymentMethod || !firestore) return;
    
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
      totalAmount: total,
      paymentMethod: paymentMethod === "Tarjeta" ? `Tarjeta ${cardType}` : paymentMethod,
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

          const productDocRef = doc(firestore, "users", user.uid, "products", item.product.id);
          const currentStock = item.product.stockQuantity || 0;
          updateDocumentNonBlocking(productDocRef, {
            stockQuantity: Math.max(0, currentStock - item.quantity)
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] overflow-hidden">
        <div className="lg:col-span-8 flex flex-col space-y-4 overflow-hidden h-full">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar productos (nombre o SKU)..." 
              className="pl-10 h-12 text-base shadow-sm bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-6 flex-1 custom-scrollbar">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-xl transition-all border-2 group overflow-hidden bg-card flex flex-col h-fit min-h-[280px]"
                onClick={() => addToCart(product)}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted border-b shrink-0">
                   <img 
                    src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/300`} 
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className={`shadow-md font-bold ${(product.stockQuantity || 0) <= 5 ? 'bg-red-500' : 'bg-primary'}`}>
                      {product.stockQuantity || 0} u.
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-2 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-2 h-4 mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                      {product.category || "General"}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 rounded shrink-0">
                      {product.sku}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm line-clamp-2 leading-tight h-10">
                    {product.name}
                  </h3>
                  <div className="text-xl font-black text-primary mt-auto pt-2">
                    ${(product.price || 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center">
                <ShoppingBag className="h-24 w-24 mb-4" />
                <p className="text-lg font-medium">
                  {searchTerm ? "No se encontraron productos" : "Cargue productos en el inventario para comenzar"}
                </p>
              </div>
            )}
          </div>
        </div>

        <Card className="lg:col-span-4 flex flex-col shadow-2xl overflow-hidden border-l-2 h-full bg-card max-w-[400px]">
          <CardHeader className="py-4 px-6 border-b bg-muted/20 shrink-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Pedido Actual
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCart([])} 
                className="text-muted-foreground hover:bg-red-50 hover:text-red-500 text-[10px] h-7"
                disabled={cart.length === 0}
              >
                Limpiar
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-4 opacity-30">
                <ShoppingBag className="h-10 w-10" />
                <p className="text-xs font-medium italic">Seleccione productos para iniciar</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-3 flex gap-3 items-center group hover:bg-muted/10 transition-colors">
                    <div className="h-10 w-10 rounded border overflow-hidden bg-muted flex-shrink-0">
                       <img 
                        src={item.product.imageUrl || `https://picsum.photos/seed/${item.product.id}/100/100`} 
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate">{item.product.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">${(item.product.price || 0).toLocaleString()} c/u</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 bg-muted/50 rounded p-0.5 border">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 rounded hover:bg-background"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 rounded hover:bg-background"
                          onClick={() => addToCart(item.product)}
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-primary">${((item.product.price || 0) * item.quantity).toLocaleString()}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 text-muted-foreground hover:text-red-500"
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
          
          <CardFooter className="flex-col p-5 border-t bg-primary/5 gap-3 shrink-0">
            <div className="w-full flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase">Total</span>
              <span className="text-2xl font-black text-primary">${total.toLocaleString()}</span>
            </div>
            
            <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => { setIsPaymentDialogOpen(open); if(!open) resetPayment(); }}>
              <DialogTrigger asChild>
                <Button className="w-full h-12 text-base font-black gap-2 shadow-lg" disabled={cart.length === 0}>
                  PAGAR
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Total a Cobrar: ${total.toLocaleString()}</DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-3">
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
                        className="flex flex-col h-16 gap-1 border-2"
                        onClick={() => { resetPayment(); setPaymentMethod(method.id); }}
                      >
                        <method.icon className="h-5 w-5" />
                        <span className="text-[9px] font-bold uppercase">{method.label}</span>
                      </Button>
                    ))}
                  </div>

                  {paymentMethod === "Efectivo" && (
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                      <div className="space-y-1">
                        <label className="text-xs font-bold">Monto Recibido</label>
                        <Input 
                          type="number" 
                          className="text-xl font-bold h-12"
                          placeholder="0.00"
                          autoFocus
                          value={cashReceived || ""}
                          onChange={(e) => setCashReceived(Number(e.target.value))}
                        />
                      </div>
                      <div className="flex justify-between items-center p-3 bg-background rounded border">
                        <span className="text-sm font-medium">Vuelto:</span>
                        <span className={`text-2xl font-black ${changeDue > 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                          ${changeDue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "Tarjeta" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant={cardType === "Debito" ? "default" : "outline"}
                        className="h-12 font-bold"
                        onClick={() => setCardType("Debito")}
                      >
                        Débito
                      </Button>
                      <Button 
                        variant={cardType === "Credito" ? "default" : "outline"}
                        className="h-12 font-bold"
                        onClick={() => setCardType("Credito")}
                      >
                        Crédito
                      </Button>
                    </div>
                  )}

                  {paymentMethod === "Cuenta Corriente" && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold">Seleccionar Cliente</label>
                      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger className="h-11">
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

                <DialogFooter className="sm:justify-between gap-3 mt-2">
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="flex-1 h-11">
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1 h-11 text-base font-bold gap-2"
                    disabled={
                      !paymentMethod || 
                      (paymentMethod === "Efectivo" && cashReceived < total) ||
                      (paymentMethod === "Tarjeta" && !cardType) ||
                      (paymentMethod === "Cuenta Corriente" && !selectedCustomerId)
                    }
                    onClick={handleCompleteSale}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar
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
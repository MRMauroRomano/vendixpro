
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
  ChevronRight,
  StickyNote,
  Scale,
  Loader2,
  Lock
} from "lucide-react";
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking
} from "@/firebase";
import { collection, doc, query, where, limit, addDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import Link from "next/link";

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
  const [isCustomItemDialogOpen, setIsCustomItemDialogOpen] = useState(false);
  
  const [variableProductDialog, setVariableProductDialog] = useState<any>(null);
  const [tempVariablePrice, setTempVariablePrice] = useState<number>(0);

  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState<number>(0);

  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cardType, setCardType] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // VALIDACIÓN DE CAJA ABIERTA
  const activeSessionQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "users", user.uid, "cash_sessions"),
      where("status", "==", "open"),
      limit(1)
    );
  }, [firestore, user?.uid]);

  const { data: activeSessions, isLoading: isSessionLoading } = useCollection(activeSessionQuery);
  const isCashOpen = activeSessions && activeSessions.length > 0;

  const productsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "products");
  }, [firestore, user?.uid]);

  const customersRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "customers");
  }, [firestore, user?.uid]);
  
  const { data: productsData, isLoading: isProductsLoading } = useCollection(productsRef);
  const { data: customersData } = useCollection(customersRef);

  const products = productsData || [];
  const customers = customersData || [];

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      String(p.name || "").toLowerCase().includes(term) ||
      String(p.sku || "").toLowerCase().includes(term) ||
      String(p.variant || "").toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const addToCart = (product: any, overridePrice?: number) => {
    if (product.isVariablePrice && overridePrice === undefined) {
      setVariableProductDialog(product);
      setTempVariablePrice(product.price || 0);
      return;
    }

    const productToAdd = overridePrice !== undefined 
      ? { ...product, price: overridePrice } 
      : product;

    setCart(prev => {
      const existing = prev.find(item => 
        item.product.id === productToAdd.id && item.product.price === productToAdd.price
      );

      if (existing) {
        return prev.map(item => 
          (item.product.id === productToAdd.id && item.product.price === productToAdd.price)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product: productToAdd, quantity: 1 }];
    });
  };

  const handleAddVariablePriceProduct = () => {
    if (variableProductDialog) {
      addToCart(variableProductDialog, tempVariablePrice);
      setVariableProductDialog(null);
      setTempVariablePrice(0);
    }
  };

  const addCustomItem = () => {
    if (!customName || customPrice < 0) return;

    const customProduct = {
      id: `custom-${Date.now()}`,
      name: customName,
      price: customPrice,
      category: "Personalizado",
      sku: "N/A",
      isCustom: true,
      imageUrl: ""
    };

    addToCart(customProduct);
    setCustomName("");
    setCustomPrice(0);
    setIsCustomItemDialogOpen(false);
  };

  const removeFromCart = (productId: string, price: number) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.product.price === price)));
  };

  const updateQuantity = (productId: string, delta: number, price: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId && item.product.price === price) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + ((item.product.price || 0) * item.quantity), 0);
  const changeDue = Math.max(0, cashReceived - total);

  const resetPayment = () => {
    setPaymentMethod("");
    setCashReceived(0);
    setCardType("");
    setSelectedCustomerId("");
  };

  const handleCompleteSale = () => {
    if (!user?.uid || !firestore || cart.length === 0 || !paymentMethod) return;
    
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
        title: "Cliente no seleccionado",
        description: "Debes elegir un cliente para registrar una venta a cuenta corriente."
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
    
    addDoc(salesRef, saleData).then((saleRef) => {
      if (saleRef) {
        const saleItemsRef = collection(firestore, "users", user.uid, "sales", saleRef.id, "sale_items");
        
        cart.forEach(item => {
          addDocumentNonBlocking(saleItemsRef, {
            saleId: saleRef.id,
            productId: item.product.id,
            productName: item.product.variant ? `${item.product.name} (${item.product.variant})` : item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.price || 0,
            subtotal: (item.product.price || 0) * item.quantity,
          });

          if (!item.product.isCustom) {
            const productDocRef = doc(firestore, "users", user.uid, "products", item.product.id);
            const currentProduct = products.find(p => p.id === item.product.id);
            if (currentProduct) {
               updateDocumentNonBlocking(productDocRef, {
                stockQuantity: Math.max(0, (currentProduct.stockQuantity || 0) - item.quantity)
              });
            }
          }
        });

        if (paymentMethod === "Cuenta Corriente" && selectedCustomerId) {
          const customer = customers.find(c => c.id === selectedCustomerId);
          if (customer) {
            const customerDocRef = doc(firestore, "users", user.uid, "customers", selectedCustomerId);
            updateDocumentNonBlocking(customerDocRef, {
              currentBalance: (customer.currentBalance || 0) + total
            });
          }
        }
      }
    });

    toast({ title: "Venta Registrada", description: `Venta por $${total.toLocaleString()} completada.` });
    setCart([]);
    setIsPaymentDialogOpen(false);
    resetPayment();
  };

  if (isSessionLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isCashOpen) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 text-center max-w-lg mx-auto">
          <div className="bg-red-100 p-6 rounded-full">
            <Lock className="h-16 w-16 text-red-600" />
          </div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight">Caja Cerrada</h1>
          <p className="text-muted-foreground">
            Para realizar ventas, primero debes iniciar un turno en el sistema. Esto asegura que el arqueo de dinero sea correcto.
          </p>
          <Button asChild size="lg" className="font-bold h-14 px-8">
            <Link href="/cash">Abrir Caja Ahora</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] overflow-hidden">
        <div className="lg:col-span-8 flex flex-col space-y-4 overflow-hidden h-full">
          <div className="flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar productos (nombre, SKU o variante)..." 
                className="pl-10 h-12 text-base shadow-sm bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Dialog open={isCustomItemDialogOpen} onOpenChange={setIsCustomItemDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-12 gap-2 border-accent text-accent hover:bg-accent/5 font-bold">
                  <StickyNote className="h-5 w-5" />
                  <span className="hidden sm:inline">Producto no listado</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Venta de Producto Manual</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Descripción del Producto</label>
                    <Input 
                      placeholder="Ej: Recarga, Artículo sin código..." 
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Precio ($)</label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="text-xl font-bold h-12"
                      value={customPrice || ""}
                      onChange={(e) => setCustomPrice(Number(e.target.value))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button className="w-full h-11" onClick={addCustomItem} disabled={!customName || customPrice <= 0}>
                    Añadir al Carrito
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-6 flex-1">
            {isProductsLoading ? (
              <div className="col-span-full flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className={`cursor-pointer hover:shadow-xl transition-all border-2 group overflow-hidden bg-card flex flex-col h-fit min-h-[280px] ${product.isVariablePrice ? 'border-dashed border-accent/40' : ''}`}
                onClick={() => addToCart(product)}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted border-b shrink-0">
                   <img 
                    src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/300`} 
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <Badge className={`shadow-md font-bold ${(product.stockQuantity || 0) <= 5 ? 'bg-red-500' : 'bg-primary'}`}>
                      {product.stockQuantity || 0} u.
                    </Badge>
                    {product.variant && (
                      <Badge variant="secondary" className="bg-accent text-accent-foreground font-black text-[9px] uppercase h-5 px-1.5 shadow-sm">
                        {product.variant}
                      </Badge>
                    )}
                    {product.isVariablePrice && (
                      <Badge variant="secondary" className="bg-white/90 text-accent font-black gap-1">
                        <Scale className="h-3 w-3" />
                        VARIABLE
                      </Badge>
                    )}
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
                    {product.isVariablePrice ? "Definir Precio" : `$${(product.price || 0).toLocaleString()}`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="lg:col-span-4 flex flex-col shadow-2xl overflow-hidden border-l-2 h-full bg-card max-w-[400px]">
          <CardHeader className="py-4 px-6 border-b bg-muted/20 shrink-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Pedido Actual
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-muted-foreground hover:text-red-500 text-[10px] h-7" disabled={cart.length === 0}>
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
                {cart.map((item, index) => (
                  <div key={`${item.product.id}-${index}`} className="p-3 flex gap-3 items-center group hover:bg-muted/10 transition-colors">
                    <div className="h-10 w-10 rounded border overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                       <img src={item.product.imageUrl || `https://picsum.photos/seed/${item.product.id}/100/100`} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate">
                        {item.product.name}
                        {item.product.variant && <span className="ml-1 text-[9px] opacity-60">({item.product.variant})</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">${(item.product.price || 0).toLocaleString()} c/u</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 bg-muted/50 rounded p-0.5 border">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateQuantity(item.product.id, -1, item.product.price)}>
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateQuantity(item.product.id, 1, item.product.price)}>
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-primary">${((item.product.price || 0) * item.quantity).toLocaleString()}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-red-500" onClick={() => removeFromCart(item.product.id, item.product.price)}>
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

                  {paymentMethod === "Cuenta Corriente" && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold">Seleccionar Cliente</label>
                      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Buscar cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} (Saldo: ${ (customer.currentBalance || 0).toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground mt-1">El monto de la venta se sumará a la deuda del cliente.</p>
                    </div>
                  )}
                </div>
                <DialogFooter className="sm:justify-between gap-3 mt-2">
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="flex-1 h-11">Cancelar</Button>
                  <Button className="flex-1 h-11 text-base font-bold gap-2" disabled={!paymentMethod || (paymentMethod === "Cuenta Corriente" && !selectedCustomerId)} onClick={handleCompleteSale}>
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={!!variableProductDialog} onOpenChange={(open) => !open && setVariableProductDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Precio para: {variableProductDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Ingresar Precio de Venta ($)</label>
              <Input 
                type="number" 
                placeholder="0.00" 
                className="h-14 text-2xl font-black text-primary border-primary"
                autoFocus
                value={tempVariablePrice || ""}
                onChange={(e) => setTempVariablePrice(Number(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddVariablePriceProduct()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 text-lg font-bold" onClick={handleAddVariablePriceProduct}>Añadir al Carrito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

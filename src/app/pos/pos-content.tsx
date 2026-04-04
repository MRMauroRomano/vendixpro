
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  Lock,
  Filter,
  GlassWater,
  Star,
  Layers,
  Barcode
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
import { useSearchParams } from "next/navigation";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Link from "next/link";

interface CartItem {
  product: any;
  quantity: number;
}

export default function POSContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
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

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategoryFilter(categoryParam);
    }
  }, [categoryParam]);

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

  const categoriesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "categories");
  }, [firestore, user?.uid]);

  const customersRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, "users", user.uid, "customers");
  }, [firestore, user?.uid]);
  
  const { data: productsData, isLoading: isProductsLoading } = useCollection(productsRef);
  const { data: categoriesData } = useCollection(categoriesRef);
  const { data: customersData } = useCollection(customersRef);

  const products = useMemo(() => productsData || [], [productsData]);
  const categories = categoriesData || [];
  const customers = customersData || [];

  const addToCart = useCallback((product: any, overridePrice?: number) => {
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

    // Mantener foco siempre en el buscador
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  // Lógica de Escaneo Ultra-Rápido (Supermercado)
  const processScan = useCallback((code: string) => {
    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode) return;

    const exactMatch = products.find(p => 
      p.sku && p.sku.trim().toLowerCase() === cleanCode
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setSearchTerm(""); // Limpiar instantáneamente para el próximo escaneo
      return true;
    }
    return false;
  }, [products, addToCart]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const found = processScan(searchTerm);
      if (found) {
        e.preventDefault();
      }
    }
  };

  // Efecto para búsqueda parcial o escaneos automáticos que no envían Enter (menos común)
  useEffect(() => {
    if (searchTerm.length >= 8) { // Generalmente un EAN o SKU tiene al menos 8 caracteres
      processScan(searchTerm);
    }
  }, [searchTerm, processScan]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const matches = products.filter(p => {
      const matchesSearch = !term || 
                          String(p.name || "").toLowerCase().includes(term) ||
                          String(p.sku || "").toLowerCase().includes(term) ||
                          String(p.variant || "").toLowerCase().includes(term);
      
      const matchesCategory = !selectedCategoryFilter || p.category === selectedCategoryFilter;
      
      return matchesSearch && matchesCategory;
    });
    return matches.slice(0, 60); 
  }, [products, searchTerm, selectedCategoryFilter]);

  const handleAddVariablePriceProduct = () => {
    if (variableProductDialog) {
      addToCart(variableProductDialog, tempVariablePrice);
      setVariableProductDialog(null);
      setTempVariablePrice(0);
      setTimeout(() => searchInputRef.current?.focus(), 100);
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

  const total = useMemo(() => cart.reduce((acc, item) => acc + ((item.product.price || 0) * item.quantity), 0), [cart]);
  const changeDue = Math.max(0, cashReceived - total);

  const resetPayment = () => {
    setPaymentMethod("");
    setCashReceived(0);
    setCardType("");
    setSelectedCustomerId("");
  };

  const handleCompleteSale = async () => {
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
    
    try {
      const saleRef = await addDoc(salesRef, saleData);
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
          if (item.product.category === "Promos" && item.product.bundleItems && item.product.bundleItems.length > 0) {
            item.product.bundleItems.forEach((bundleItem: any) => {
              const componentDocRef = doc(firestore, "users", user.uid, "products", bundleItem.productId);
              const originalProduct = products.find(p => p.id === bundleItem.productId);
              if (originalProduct) {
                const totalDeduction = bundleItem.quantity * item.quantity;
                updateDocumentNonBlocking(componentDocRef, {
                  stockQuantity: Math.max(0, (originalProduct.stockQuantity || 0) - totalDeduction)
                });
              }
            });
            const promoDocRef = doc(firestore, "users", user.uid, "products", item.product.id);
            updateDocumentNonBlocking(promoDocRef, {
              stockQuantity: Math.max(0, (item.product.stockQuantity || 0) - item.quantity)
            });
          } else {
            const productDocRef = doc(firestore, "users", user.uid, "products", item.product.id);
            const currentProduct = products.find(p => p.id === item.product.id);
            if (currentProduct) {
               updateDocumentNonBlocking(productDocRef, {
                stockQuantity: Math.max(0, (currentProduct.stockQuantity || 0) - item.quantity)
              });
            }
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

      toast({ title: "Venta Registrada", description: `Venta por $${total.toLocaleString()} completada.` });
      setCart([]);
      setIsPaymentDialogOpen(false);
      resetPayment();
      setTimeout(() => searchInputRef.current?.focus(), 150);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al registrar venta" });
    }
  };

  if (!isCashOpen && !isSessionLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 text-center max-w-lg mx-auto">
          <div className="bg-red-100 p-6 rounded-full">
            <Lock className="h-16 w-16 text-red-600" />
          </div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight">Caja Cerrada</h1>
          <p className="text-muted-foreground">
            Para realizar ventas, primero debes iniciar un turno en el sistema.
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
          <div className="flex flex-col gap-4 shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-accent animate-pulse" />
                <Input 
                  ref={searchInputRef}
                  placeholder="Escanee código o busque producto..." 
                  className="pl-11 h-12 text-base shadow-sm border-2 border-primary/20 focus:border-accent bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </div>
              
              <Dialog open={isCustomItemDialogOpen} onOpenChange={setIsCustomItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-12 gap-2 border-accent text-accent hover:bg-accent/5 font-bold">
                    <StickyNote className="h-5 w-5" />
                    <span className="hidden sm:inline">Manual</span>
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

            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex w-max space-x-2">
                <Button
                  variant={selectedCategoryFilter === null ? "default" : "outline"}
                  size="sm"
                  className="rounded-full font-bold uppercase text-[10px] tracking-wider h-9"
                  onClick={() => setSelectedCategoryFilter(null)}
                >
                  Todas
                </Button>
                <Button
                  variant={selectedCategoryFilter === "Promos" ? "default" : "outline"}
                  size="sm"
                  className="rounded-full font-bold uppercase text-[10px] tracking-wider h-9 gap-1.5 border-accent text-accent data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                  onClick={() => setSelectedCategoryFilter("Promos")}
                  data-state={selectedCategoryFilter === "Promos" ? "active" : "inactive"}
                >
                  <GlassWater className="h-3 w-3" />
                  Promos
                </Button>
                {categories.filter(c => c.name !== "Promos").map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategoryFilter === cat.name ? "default" : "outline"}
                    size="sm"
                    className="rounded-full font-bold uppercase text-[10px] tracking-wider h-9"
                    onClick={() => setSelectedCategoryFilter(cat.name)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-6 flex-1">
            {isProductsLoading ? (
              <div className="col-span-full flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className={`cursor-pointer hover:shadow-xl transition-all border-2 group overflow-hidden bg-card flex flex-col h-fit min-h-[260px] ${product.isVariablePrice ? 'border-dashed border-accent/40' : ''} ${product.category === 'Promos' ? 'border-accent/40 shadow-sm' : ''}`}
                onClick={() => addToCart(product)}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted border-b shrink-0">
                   <img 
                    src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/300`} 
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
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
                  </div>
                  <h3 className="font-bold text-sm line-clamp-2 leading-tight h-10">
                    {product.name} {product.variant && <span className="text-accent">({product.variant})</span>}
                  </h3>
                  <div className="text-xl font-black text-primary mt-auto pt-2">
                    {product.isVariablePrice ? "Variable" : `$${(product.price || 0).toLocaleString()}`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="lg:col-span-4 flex flex-col shadow-2xl overflow-hidden border-l-2 h-full bg-card max-w-[400px]">
          <CardHeader className="py-4 px-6 border-b bg-muted/20 shrink-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2 font-black uppercase tracking-tighter">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Venta Actual
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-muted-foreground hover:text-red-500 text-[10px] h-7" disabled={cart.length === 0}>
                VACIAR
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-4 opacity-30">
                <Barcode className="h-12 w-12" />
                <p className="text-sm font-black uppercase tracking-widest">Escanee un producto</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {cart.map((item, index) => (
                  <div key={`${item.product.id}-${index}`} className="p-3 flex gap-3 items-center group hover:bg-muted/10 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate">
                        {item.product.name}
                        {item.product.variant && <span className="ml-1 text-[9px] text-accent">({item.product.variant})</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">${(item.product.price || 0).toLocaleString()} x {item.quantity}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 bg-muted/50 rounded p-0.5 border">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateQuantity(item.product.id, -1, item.product.price)}>
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        <span className="w-5 text-center text-xs font-black">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateQuantity(item.product.id, 1, item.product.price)}>
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                      <span className="font-black text-xs text-primary">${((item.product.price || 0) * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex-col p-5 border-t bg-primary/5 gap-3 shrink-0">
            <div className="w-full flex justify-between items-center mb-2">
              <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Total</span>
              <span className="text-3xl font-black text-primary">${total.toLocaleString()}</span>
            </div>
            
            <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => { setIsPaymentDialogOpen(open); if(!open) resetPayment(); }}>
              <DialogTrigger asChild>
                <Button className="w-full h-14 text-lg font-black gap-2 shadow-lg bg-accent text-accent-foreground hover:bg-accent/90" disabled={cart.length === 0}>
                  COBRAR VENTA
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Resumen de Pago</DialogTitle>
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
                          className="text-2xl font-black h-14"
                          placeholder="0.00"
                          value={cashReceived || ""}
                          onChange={(e) => setCashReceived(Number(e.target.value))}
                          autoFocus
                        />
                      </div>
                      <div className="flex justify-between items-center p-3 bg-background rounded border">
                        <span className="text-sm font-black uppercase">Vuelto:</span>
                        <span className={`text-3xl font-black ${changeDue > 0 ? 'text-accent' : 'text-muted-foreground'}`}>
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
                    </div>
                  )}
                </div>
                <DialogFooter className="sm:justify-between gap-3 mt-2">
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="flex-1 h-12 font-bold">Cancelar</Button>
                  <Button className="flex-1 h-12 text-base font-black gap-2" disabled={!paymentMethod || (paymentMethod === "Cuenta Corriente" && !selectedCustomerId)} onClick={handleCompleteSale}>
                    Confirmar Venta
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

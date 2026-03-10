"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  // Efecto para redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>, type: "login" | "register") => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    try {
      if (type === "register") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
        toast({
          title: "Cuenta creada",
          description: "Bienvenido a VENDIXPRO. Tu cuenta ha sido registrada con éxito.",
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: "Sesión iniciada",
          description: "Has ingresado correctamente al sistema.",
        });
      }
      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: error.message || "Hubo un problema al procesar tu solicitud.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative overflow-hidden">
      {/* Círculos decorativos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary p-3 rounded-2xl shadow-lg mb-4">
            <ShoppingBag className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            VENDIX<span className="text-accent">PRO</span>
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            Punto de Venta Profesional para tu Negocio
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
            <TabsTrigger value="login" className="text-sm font-semibold">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register" className="text-sm font-semibold">Registrarse</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle>Bienvenido de nuevo</CardTitle>
                <CardDescription>
                  Ingresa tus credenciales para acceder a tu panel de control.
                </CardDescription>
              </CardHeader>
              <form onSubmit={(e) => handleAuth(e, "login")}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-login">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email-login" name="email" type="email" placeholder="ejemplo@vendix.pro" className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password-login">Contraseña</Label>
                      <Button variant="link" size="sm" className="px-0 font-normal text-xs">
                        ¿Olvidaste tu contraseña?
                      </Button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="password-login" name="password" type="password" placeholder="••••••••" className="pl-10" required />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full h-11 text-base font-bold gap-2" type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar al Sistema"}
                    {!isLoading && <ArrowRight className="h-5 w-5" />}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle>Crear una cuenta</CardTitle>
                <CardDescription>
                  Regístrate hoy y empieza a gestionar tu negocio de forma inteligente.
                </CardDescription>
              </CardHeader>
              <form onSubmit={(e) => handleAuth(e, "register")}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-reg">Nombre Completo / Negocio</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="name-reg" name="name" placeholder="Juan Pérez" className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-reg">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email-reg" name="email" type="email" placeholder="ejemplo@vendix.pro" className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-reg">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="password-reg" name="password" type="password" placeholder="••••••••" className="pl-10" required />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Mínimo 6 caracteres alfanuméricos recomendados.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full h-11 text-base font-bold gap-2" type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Crear mi Cuenta"}
                    {!isLoading && <User className="h-5 w-5" />}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Al continuar, aceptas nuestros <Button variant="link" className="h-auto p-0 text-xs">Términos de Servicio</Button> y <Button variant="link" className="h-auto p-0 text-xs">Política de Privacidad</Button>.
        </p>
      </div>
    </div>
  );
}

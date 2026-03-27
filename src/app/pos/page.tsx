
import { Suspense } from "react";
import POSContent from "./pos-content";

export const dynamic = "force-dynamic";

/**
 * Página principal del POS. 
 * En Next.js 15, cualquier componente que use useSearchParams() debe estar
 * envuelto en un Suspense boundary para evitar errores durante el build (prerendering).
 */
export default function POSPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">Iniciando Punto de Venta...</p>
        </div>
      </div>
    }>
      <POSContent />
    </Suspense>
  );
}

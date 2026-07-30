"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Cualquier fallo del servidor dentro de la app aterriza aquí en vez de en la
 * pantalla cruda de Next. `reset()` reintenta el render sin recargar.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="mt-10">
      <EmptyState
        icon={TriangleAlert}
        titulo="Algo ha fallado"
        descripcion={
          error.digest
            ? `No hemos podido cargar esta pantalla. Referencia: ${error.digest}`
            : "No hemos podido cargar esta pantalla."
        }
        accion={
          <Button size="sm" onClick={reset}>
            <RotateCw />
            Reintentar
          </Button>
        }
      />
    </Card>
  );
}

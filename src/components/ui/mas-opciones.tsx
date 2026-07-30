"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Zona plegada para lo que casi nunca se toca.
 *
 * El criterio de los diálogos de la app es que solo esté a la vista lo que hay
 * que decidir de verdad; todo lo que se puede adivinar o rara vez se cambia
 * vive aquí debajo. Antes era un bloque copiado dentro del diálogo de
 * movimiento y ahora lo comparten los cuatro.
 */
export function MasOpciones({
  etiqueta = "Más opciones",
  abiertoPorDefecto = false,
  children,
  className,
}: {
  etiqueta?: string;
  abiertoPorDefecto?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [abierto, setAbierto] = React.useState(abiertoPorDefecto);

  return (
    <div className={cn("border-t border-border pt-3", className)}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-150",
            abierto && "rotate-180",
          )}
        />
        {etiqueta}
      </button>

      {abierto && <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>}
    </div>
  );
}

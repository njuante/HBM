"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Paginación mínima: cuántas hay, en cuál estás y cómo moverse.
 *
 * Con una sola página no se pinta nada: una barra que solo dice «1 de 1» es
 * ruido.
 */
export function Paginacion({
  pagina,
  paginas,
  onIr,
}: {
  pagina: number;
  paginas: number;
  onIr: (pagina: number) => void;
}) {
  if (paginas <= 1) return null;

  return (
    <nav
      aria-label="Paginación"
      className="mt-3 flex items-center justify-end gap-2"
    >
      <span className="text-2xs text-faint">
        Página {pagina} de {paginas}
      </span>
      <Button
        variant="secondary"
        size="icon-sm"
        aria-label="Página anterior"
        disabled={pagina <= 1}
        onClick={() => onIr(pagina - 1)}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="secondary"
        size="icon-sm"
        aria-label="Página siguiente"
        disabled={pagina >= paginas}
        onClick={() => onIr(pagina + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}

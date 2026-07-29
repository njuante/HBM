"use client";

import { Check, Inbox, X } from "lucide-react";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
import { armonizarColor } from "@/components/charts/chart-theme";
import { useTheme } from "@/components/theme-provider";
import type { PropuestaDTO } from "@/lib/validation/recurrencia";
import {
  confirmarPropuestaAction,
  descartarPropuestaAction,
} from "@/app/(app)/recurrentes/actions";

/**
 * Bandeja de entrada de las recurrencias manuales: un sí o un no por fila.
 *
 * Cada botón es un formulario propio con su Server Action: así la acción es
 * independiente por fila y sigue funcionando sin JavaScript.
 */
export function PropuestasPendientes({
  propuestas,
  className,
}: {
  propuestas: PropuestaDTO[];
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  if (propuestas.length === 0) return null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <Inbox className="size-3.5 text-muted-foreground" />
        <h2 className="text-xs font-medium">
          {propuestas.length === 1
            ? "1 movimiento pendiente de confirmar"
            : `${propuestas.length} movimientos pendientes de confirmar`}
        </h2>
      </div>

      <ul className="divide-y divide-border">
        {propuestas.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
            <MarcaCategoria
              icono={p.categoria.icono}
              color={armonizarColor(p.categoria.color, resolvedTheme)}
              className="size-3.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.concepto}</p>
              <p className="text-2xs text-faint">
                {formatFecha(p.fecha)} · {p.categoria.nombre}
              </p>
            </div>

            <Money
              value={p.importe}
              tono={p.tipo === "GASTO" ? "gasto" : "ingreso"}
              className="shrink-0 text-sm font-medium"
            />

            <div className="flex shrink-0 gap-1">
              <form action={confirmarPropuestaAction}>
                <input type="hidden" name="id" value={p.id} />
                <Button
                  type="submit"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Confirmar ${p.concepto}`}
                >
                  <Check />
                </Button>
              </form>
              <form action={descartarPropuestaAction}>
                <input type="hidden" name="id" value={p.id} />
                <Button
                  type="submit"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Descartar ${p.concepto}`}
                >
                  <X />
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

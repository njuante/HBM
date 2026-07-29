import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Money } from "@/components/ui/money";
import type { PresupuestoConsumo } from "@/lib/validation/presupuesto";

/**
 * Tarjeta de presupuestos del panel: las cuatro partidas más apuradas del mes.
 * Es la respuesta a «¿puedo gastar?», que el resto del panel no da.
 */
export function PresupuestosPanel({
  items,
  limite,
  gastado,
}: {
  items: PresupuestoConsumo[];
  limite: number;
  gastado: number;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-base font-medium tracking-tight">
            Presupuesto del mes
          </h2>
          {limite > 0 && (
            <p className="mt-0.5 text-2xs text-muted-foreground">
              {formatEUR(gastado)} de {formatEUR(limite)} en categorías
            </p>
          )}
        </div>
        <Link
          href="/presupuestos"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Ver todos
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <ul className="space-y-3">
        {items.map((p) => {
          const nombre = p.categoria?.nombre ?? "Todas las categorías";
          return (
            <li key={p.id}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate font-medium">{nombre}</span>
                <span className="shrink-0 text-muted-foreground">
                  <Money
                    value={p.gastado}
                    tono={p.estado === "OK" ? "neutro" : "gasto"}
                  />{" "}
                  / {formatEUR(p.importe)}
                </span>
              </div>
              <Progress
                className="mt-1.5"
                valor={p.porcentaje}
                estado={p.estado}
                ariaLabel={`Consumo de ${nombre}`}
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

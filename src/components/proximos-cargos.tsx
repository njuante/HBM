import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatFecha } from "@/lib/format";
import { sumImportes } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import type { ProximoCargo } from "@/server/db/recurrencias";

/**
 * Lo que va a caer en los próximos 30 días. Es la vista de futuro que al panel
 * le faltaba: hasta ahora solo miraba hacia atrás.
 */
export function ProximosCargos({ cargos }: { cargos: ProximoCargo[] }) {
  const neto = sumImportes(
    cargos.map((c) => (c.tipo === "GASTO" ? -c.importe : c.importe)),
  );

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-base font-medium tracking-tight">
            Próximos cargos
          </h2>
          <p className="mt-0.5 text-2xs text-muted-foreground">
            30 días · neto <Money value={neto} tono="auto" signo />
          </p>
        </div>
        <Link
          href="/recurrentes"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Ver recurrentes
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <ul className="space-y-2">
        {cargos.slice(0, 6).map((c) => (
          <li
            key={`${c.recurrenciaId}-${c.fecha}`}
            className="flex items-baseline justify-between gap-3 text-xs"
          >
            <span className="truncate font-medium">{c.concepto}</span>
            <span className="shrink-0 text-faint">{formatFecha(c.fecha)}</span>
            <Money
              value={c.importe}
              tono={c.tipo === "GASTO" ? "gasto" : "ingreso"}
              className="w-24 shrink-0 text-right font-medium"
            />
          </li>
        ))}
        {cargos.length > 6 && (
          <li className="text-2xs text-faint">y {cargos.length - 6} más</li>
        )}
      </ul>
    </Card>
  );
}

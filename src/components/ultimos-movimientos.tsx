import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft, FileText, ChevronRight, History } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { formatFecha } from "@/lib/format";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MovimientoDTO } from "@/lib/validation/movimiento";

export function UltimosMovimientos({ items }: { items: MovimientoDTO[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:border-border">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <History className="size-4" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-medium leading-none">Últimos movimientos</h2>
            <p className="mt-1 text-2xs text-muted-foreground">Transacciones más recientes registradas</p>
          </div>
        </div>
        <Button asChild variant="ghost" size="xs" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/movimientos">
            Ver todos <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="divide-y divide-border/40">
        {items.slice(0, 5).map((m) => {
          const esIngreso = m.tipo === "INGRESO";
          return (
            <div key={m.id} className="group flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    esIngreso ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  }`}
                >
                  {esIngreso ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-medium text-foreground">{m.concepto}</span>
                    {m.tieneFactura && (
                      <span title="Tiene factura adjunta" className="text-primary">
                        <FileText className="size-3" />
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
                    <span>{formatFecha(m.fecha)}</span>
                    {m.origen && <span>• {m.origen}</span>}
                    {m.categoria && (
                      <span className="inline-flex items-center gap-1 font-medium">
                        • <MarcaCategoria icono={m.categoria.icono} color={m.categoria.color} className="size-2.5" />
                        {m.categoria.nombre}
                      </span>
                    )}
                    {m.casa && <Badge variant="outline" className="h-4 px-1 text-[10px]">{m.casa.nombre}</Badge>}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`text-xs font-semibold tabular-nums ${esIngreso ? "text-success" : "text-foreground"}`}>
                  {esIngreso ? "+" : "-"}{formatEUR(m.importe)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

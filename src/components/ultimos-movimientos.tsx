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
    <div className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-sm transition-all hover:border-border">
      <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <History className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-base sm:text-lg font-medium leading-none truncate">Últimos movimientos</h2>
            <p className="mt-1 text-2xs text-muted-foreground truncate">Transacciones más recientes registradas</p>
          </div>
        </div>
        <Button asChild variant="ghost" size="xs" className="gap-1 text-xs shrink-0 text-muted-foreground hover:text-foreground">
          <Link href="/movimientos">
            Ver todos <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="divide-y divide-border/40">
        {items.slice(0, 5).map((m) => {
          const esIngreso = m.tipo === "INGRESO";
          return (
            <div key={m.id} className="group flex items-center justify-between gap-2.5 py-2.5 transition-colors hover:bg-muted/30 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    esIngreso ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  }`}
                >
                  {esIngreso ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{m.concepto}</span>
                    {m.tieneFactura && (
                      <span title="Tiene factura adjunta" className="text-primary shrink-0">
                        <FileText className="size-3" />
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-2xs text-muted-foreground">
                    <span>{formatFecha(m.fecha)}</span>
                    {m.origen && <span>• {m.origen}</span>}
                    {m.categoria && (
                      <span className="inline-flex items-center gap-1 font-medium min-w-0 truncate max-w-[140px]">
                        • <MarcaCategoria icono={m.categoria.icono} color={m.categoria.color} className="size-2.5 shrink-0" />
                        <span className="truncate">{m.categoria.nombre}</span>
                      </span>
                    )}
                    {m.casa && <Badge variant="outline" className="h-4 px-1 text-[10px] shrink-0">{m.casa.nombre}</Badge>}
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

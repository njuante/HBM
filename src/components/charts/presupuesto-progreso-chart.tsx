"use client";

import Link from "next/link";
import { PiggyBank, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR } from "@/lib/money";
import { ChartFrame } from "./chart-frame";
import type { PresupuestoConsumo } from "@/lib/validation/presupuesto";

export function PresupuestoProgresoChart({
  items,
  limiteTotal,
  gastadoTotal,
}: {
  items: PresupuestoConsumo[];
  limiteTotal: number;
  gastadoTotal: number;
}) {
  const porcentajeTotal = limiteTotal > 0 ? Math.min(Math.round((gastadoTotal / limiteTotal) * 100), 999) : 0;
  const restanteTotal = Math.max(limiteTotal - gastadoTotal, 0);

  // Determinar color de salud presupuestaria
  const tonoColor =
    porcentajeTotal >= 100
      ? "text-red-500 bg-red-500/10 border-red-500/20"
      : porcentajeTotal >= 85
        ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
        : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";

  const barColor =
    porcentajeTotal >= 100
      ? "bg-red-500"
      : porcentajeTotal >= 85
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <ChartFrame
      titulo="Consumo de Presupuesto Mensual"
      subtitulo={
        limiteTotal > 0
          ? `${formatEUR(gastadoTotal)} gastados de ${formatEUR(limiteTotal)}`
          : "Presupuestos configurados para este mes"
      }
      descripcion="Barra de progreso de los presupuestos mensuales por categoría"
      acciones={
        <Link
          href="/presupuestos"
          className="inline-flex items-center gap-1 text-2xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          Ver todos <ArrowRight className="size-3" />
        </Link>
      }
    >
      <div className="flex flex-col gap-4 p-3 pt-1">
        {limiteTotal > 0 ? (
          /* Barra de Consumo Global */
          <div className="rounded-lg border border-border bg-muted/30 p-3.5">
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="flex items-center gap-1.5 text-foreground">
                <PiggyBank className="size-4 text-primary" />
                Presupuesto Global
              </span>
              <span className={cn("px-2 py-0.5 rounded-full text-2xs font-semibold border", tonoColor)}>
                {porcentajeTotal}% consumido
              </span>
            </div>

            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full transition-all duration-500 ease-out", barColor)}
                style={{ width: `${Math.min(porcentajeTotal, 100)}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-2xs text-muted-foreground">
              <span>Gastado: {formatEUR(gastadoTotal)}</span>
              <span>
                {porcentajeTotal >= 100 ? (
                  <span className="text-red-500 font-medium">Excedido en {formatEUR(gastadoTotal - limiteTotal)}</span>
                ) : (
                  <span>Quedan: {formatEUR(restanteTotal)}</span>
                )}
              </span>
            </div>
          </div>
        ) : null}

        {/* Desglose por categorías principales */}
        {items.length > 0 ? (
          <div className="space-y-3">
            <p className="text-2xs uppercase tracking-wider font-semibold text-muted-foreground">
              Principales Categorías
            </p>

            <div className="space-y-2.5">
              {items.slice(0, 4).map((p) => {
                const pct = p.porcentaje;
                const esExcedido = pct >= 100;
                const esAviso = pct >= 85 && pct < 100;

                const colorBarra = esExcedido
                  ? "bg-red-500"
                  : esAviso
                    ? "bg-amber-500"
                    : "bg-primary";

                const nombreCat = p.categoria?.nombre ?? p.casa?.nombre ?? "Presupuesto General";

                return (
                  <div key={p.id} className="group space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1.5 truncate max-w-[65%]">
                        {esExcedido ? (
                          <AlertTriangle className="size-3.5 text-red-500 shrink-0" />
                        ) : esAviso ? (
                          <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="size-3.5 text-emerald-500/80 shrink-0" />
                        )}
                        <span className="truncate">{nombreCat}</span>
                      </span>

                      <span className="text-2xs text-muted-foreground font-mono">
                        <strong className="text-foreground">{formatEUR(p.gastado)}</strong> / {formatEUR(p.importe)}
                      </span>
                    </div>

                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full transition-all duration-300", colorBarra)}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <PiggyBank className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs font-medium text-foreground">Sin presupuestos este mes</p>
            <p className="text-2xs text-muted-foreground mt-0.5 mb-3 max-w-[200px]">
              Establece límites por categoría para controlar tus gastos.
            </p>
            <Link
              href="/presupuestos"
              className="inline-flex items-center justify-center rounded-md bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              + Crear Presupuesto
            </Link>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}

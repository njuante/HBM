"use client";

import Link from "next/link";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
import type { CategoriaTotal } from "@/server/db/dashboard";
import { ChartFrame } from "./chart-frame";
import { armonizarColor } from "./chart-theme";
import { useTheme } from "@/components/theme-provider";

const TOP = 7;

/**
 * Reparto del gasto por categoría, como lista ordenada.
 *
 * Deliberadamente NO es Recharts: para barras horizontales rankeadas el DOM
 * gana en todo —texto nítido, nombres largos que no se recortan, filas que
 * son enlaces reales al listado filtrado— y ahorra el SVG entero.
 */
export function GastosPorCategoriaChart({
  data,
  casaId,
}: {
  data: CategoriaTotal[];
  /** Se arrastra al enlace para no perder el filtro de casa del panel. */
  casaId?: string;
}) {
  const { resolvedTheme } = useTheme();

  const total = data.reduce((s, c) => s + c.total, 0);
  if (total === 0) return null;

  const cabeza = data.slice(0, TOP);
  const cola = data.slice(TOP);
  const restoTotal = cola.reduce((s, c) => s + c.total, 0);

  const filas = [
    ...cabeza,
    ...(cola.length > 0
      ? [
          {
            categoriaId: null,
            nombre: `Otras ${cola.length}`,
            color: "#8a8a8a",
            icono: "ellipsis",
            total: restoTotal,
          } satisfies CategoriaTotal,
        ]
      : []),
  ];

  const mayor = filas[0]?.total ?? 1;

  return (
    <ChartFrame
      titulo="Reparto del gasto"
      subtitulo={`${formatEUR(total)} en ${data.length} ${data.length === 1 ? "categoría" : "categorías"}`}
      descripcion="Gasto total del periodo repartido por categoría, de mayor a menor."
      tabla={{
        cabeceras: ["Categoría", "Importe", "Porcentaje"],
        filas: filas.map((c) => [
          c.nombre,
          formatEUR(c.total),
          `${((c.total / total) * 100).toFixed(1)} %`,
        ]),
      }}
    >
      <ul className="space-y-1.5 px-2 pb-1.5 pt-1.5 sm:space-y-px sm:px-3 sm:pb-1 sm:pt-1">
        {filas.map((c) => {
          const color = armonizarColor(c.color, resolvedTheme);
          const pct = (c.total / total) * 100;
          const ancho = Math.max(1.5, (c.total / mayor) * 100);

          const contenido = (
            <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
              {/* Línea superior en móvil / izquierda en desktop */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MarcaCategoria
                  icono={c.icono}
                  color={color}
                  className="size-3.5 shrink-0"
                  puntoClassName="ml-0.5 mr-0.5 size-2 shrink-0 rounded-full"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground sm:w-32 sm:flex-none">
                  {c.nombre}
                </span>

                {/* Importe y porcentaje visibles a la derecha en móvil */}
                <div className="ml-auto flex items-baseline gap-1.5 shrink-0 sm:hidden">
                  <span className="text-xs font-semibold tabular-nums text-foreground">
                    {formatEUR(c.total)}
                  </span>
                  <span className="text-2xs tabular-nums text-faint">
                    ({pct.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Barra de progreso */}
              <span className="relative h-2 w-full overflow-hidden rounded-full bg-muted/70 sm:h-3.5 sm:min-w-0 sm:flex-1 sm:rounded-xs">
                <span
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out-quint sm:rounded-xs"
                  style={{ width: `${ancho}%`, backgroundColor: color }}
                />
              </span>

              {/* Importe y porcentaje visibles solo en desktop */}
              <div className="hidden items-center gap-2 shrink-0 sm:flex">
                <span className="w-20 text-right text-xs tabular-nums font-medium">
                  {formatEUR(c.total)}
                </span>
                <span className="w-11 text-right text-2xs tabular-nums text-faint">
                  {pct.toFixed(0)} %
                </span>
              </div>
            </div>
          );

          const clases =
            "block rounded-md px-2 py-2 transition-colors sm:py-1.5";

          return (
            <li key={c.categoriaId ?? c.nombre}>
              {c.categoriaId ? (
                <Link
                  href={{
                    pathname: "/gastos",
                    query: { categoriaId: c.categoriaId, ...(casaId ? { casaId } : {}) },
                  }}
                  className={cn(clases, "hover:bg-muted/70 bg-muted/30 sm:bg-transparent")}
                >
                  {contenido}
                </Link>
              ) : (
                <div className={cn(clases, "bg-muted/20 sm:bg-transparent")}>{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}

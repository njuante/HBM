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
      <ul className="space-y-px px-3 pb-1 pt-1">
        {filas.map((c) => {
          const color = armonizarColor(c.color, resolvedTheme);
          const pct = (c.total / total) * 100;
          const ancho = Math.max(1.5, (c.total / mayor) * 100);

          const contenido = (
            <>
              {/* Sin icono en BD, un punto del color dice más que repetir el
                  icono genérico en todas las filas. */}
              <MarcaCategoria
                icono={c.icono}
                color={color}
                className="size-3.5 shrink-0"
                puntoClassName="ml-1 mr-1 size-2 shrink-0 rounded-full"
              />
              <span className="w-28 shrink-0 truncate text-xs font-medium sm:w-32">
                {c.nombre}
              </span>
              <span className="relative h-4 min-w-0 flex-1 overflow-hidden rounded-xs bg-muted/70">
                <span
                  className="absolute inset-y-0 left-0 rounded-xs transition-[width] duration-500 ease-out-quint"
                  style={{ width: `${ancho}%`, backgroundColor: color }}
                />
              </span>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums">
                {formatEUR(c.total)}
              </span>
              <span className="w-11 shrink-0 text-right text-2xs tabular-nums text-faint">
                {pct.toFixed(0)} %
              </span>
            </>
          );

          const clases =
            "flex items-center gap-2.5 rounded-sm px-2 py-1.5 transition-colors";

          return (
            <li key={c.categoriaId ?? c.nombre}>
              {c.categoriaId ? (
                <Link
                  href={{
                    pathname: "/gastos",
                    query: { categoriaId: c.categoriaId, ...(casaId ? { casaId } : {}) },
                  }}
                  className={cn(clases, "hover:bg-muted")}
                >
                  {contenido}
                </Link>
              ) : (
                <div className={clases}>{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}

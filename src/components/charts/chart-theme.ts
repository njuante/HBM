"use client";

import { useTheme } from "@/components/theme-provider";

/**
 * Recharts pinta atributos SVG (`fill`, `stroke`) y no resuelve de forma
 * fiable `var(--chart-1)` heredado del CSS, así que la paleta vive también
 * aquí en valores concretos. Debe mantenerse en paralelo con los tokens
 * `--chart-*` de `globals.css`.
 */
export type ChartTheme = {
  /** Paleta categórica de ocho tonos, en orden de asignación. */
  serie: readonly string[];
  ingresos: string;
  gastos: string;
  /** Tinta: la serie de saldo y cualquier trazo de referencia. */
  neto: string;
  grid: string;
  axis: string;
  /** Fondo de la tarjeta, para huecos y contornos de punto. */
  superficie: string;
};

const PALETA: Record<"light" | "dark", ChartTheme> = {
  light: {
    serie: [
      "#a85b22", // ámbar     26°
      "#4a6b3d", // oliva    100°
      "#26606b", // teal     192°
      "#8e3b5c", // vino     335°
      "#86691e", // ocre      48°
      "#4c4a7c", // índigo   245°
      "#2f7a5e", // pino     160°
      "#7a4a86", // ciruela  285°
    ],
    ingresos: "#4a6b3d",
    gastos: "#a33b28",
    neto: "#1c1b19",
    grid: "#d6d0c6",
    axis: "#78736b",
    superficie: "#ffffff",
  },
  dark: {
    serie: [
      "#d98a45",
      "#86a96f",
      "#5fa8b8",
      "#d4788f",
      "#c4a24a",
      "#8a87c4",
      "#62be9a",
      "#b287c0",
    ],
    ingresos: "#86a96f",
    gastos: "#d9705a",
    neto: "#edebe7",
    grid: "#34343a",
    axis: "#8c8880",
    superficie: "#141416",
  },
};

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  return PALETA[resolvedTheme];
}

/* La armonización se mudó a `@/lib/color-categoria` (es aritmética pura y la
   necesita también el servidor). Se reexporta para no tocar a quien ya la
   importaba desde aquí. */
export { armonizarColor } from "@/lib/color-categoria";

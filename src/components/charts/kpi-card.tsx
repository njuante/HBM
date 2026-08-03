"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import { useChartTheme } from "./chart-theme";

export type KpiTono = "ingresos" | "gastos" | "neto";

/**
 * Tarjeta de indicador: cifra en serif, miniserie y variación contra el
 * periodo anterior.
 *
 * El delta es lo que convierte un número en información: 1.075 € no dice
 * nada; «1.075 €, un 12 % menos que el mes pasado» sí.
 */
export function KpiCard({
  label,
  valor,
  serie,
  tono = "neto",
  delta,
  sufijo,
  href,
  /** Cuando el valor no es dinero (p. ej. un recuento). */
  crudo,
}: {
  label: string;
  valor: number;
  serie?: number[];
  tono?: KpiTono;
  /** Variación relativa contra el periodo anterior, en tanto por uno. */
  delta?: number | null;
  sufijo?: string;
  href?: string;
  crudo?: boolean;
}) {
  const t = useChartTheme();

  const color =
    tono === "ingresos" ? t.ingresos : tono === "gastos" ? t.gastos : t.neto;

  const claseValor =
    tono === "ingresos"
      ? "text-success"
      : tono === "gastos"
        ? "text-danger"
        : valor < 0
          ? "text-danger"
          : "text-foreground";

  const cuerpo = (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <p className="text-2xs font-medium uppercase tracking-wide text-faint truncate">
          {label}
        </p>
        {serie && serie.length > 1 && (
          <Sparkline data={serie} color={color} className="mt-0.5 shrink-0" />
        )}
      </div>
      <p
        className={cn(
          "mt-2 font-serif text-2xl sm:text-3xl font-medium leading-none tabular-nums truncate",
          claseValor,
        )}
      >
        {crudo ? valor : formatEUR(valor)}
      </p>
      <div className="mt-2 flex h-4 items-center gap-1.5 min-w-0 overflow-hidden">
        {delta != null && <Delta valor={delta} invertido={tono === "gastos"} />}
        {sufijo && <span className="text-2xs text-faint truncate">{sufijo}</span>}
      </div>
    </div>
  );

  const accentClass =
    tono === "ingresos"
      ? "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-success/80"
      : tono === "gastos"
        ? "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-danger/80"
        : "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary/80";

  const clases = cn(
    "relative overflow-hidden block rounded-xl border border-border/80 bg-card px-4 py-3.5 shadow-xs transition-all hover:shadow-md hover:border-border",
    accentClass,
  );

  return href ? (
    <Link href={href} className={cn(clases, "hover:border-primary/50")}>
      {cuerpo}
    </Link>
  ) : (
    <div className={clases}>{cuerpo}</div>
  );
}

/** En gastos, subir es malo: el color del delta se invierte. */
function Delta({ valor, invertido }: { valor: number; invertido?: boolean }) {
  if (!Number.isFinite(valor)) return null;

  const pct = Math.abs(valor) * 100;
  if (pct < 0.5) {
    return (
      <span className="flex items-center gap-0.5 text-2xs text-faint">
        <Minus className="size-3" />
        sin cambio
      </span>
    );
  }

  const sube = valor > 0;
  const bueno = invertido ? !sube : sube;
  const Icono = sube ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-2xs tabular-nums",
        bueno ? "text-success" : "text-danger",
      )}
    >
      <Icono className="size-3" />
      {pct.toFixed(0)} %
      <span className="text-faint"> vs. anterior</span>
    </span>
  );
}

import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Toda cifra monetaria de la app pasa por aquí: mismo formato, mismas
 * cifras tabulares y el mismo criterio de color.
 *
 * `tono`:
 *  - "auto"     color según el signo (lo natural para un saldo)
 *  - "gasto"    siempre teja, aunque el número sea positivo
 *  - "ingreso"  siempre oliva
 *  - "neutro"   hereda el color del texto (por defecto: la cifra no grita)
 */
export function Money({
  value,
  tono = "neutro",
  signo = false,
  className,
}: {
  value: number;
  tono?: "auto" | "gasto" | "ingreso" | "neutro";
  /** Antepone + / − explícito. Útil en listas mixtas y deltas. */
  signo?: boolean;
  className?: string;
}) {
  const color =
    tono === "gasto"
      ? "text-danger"
      : tono === "ingreso"
        ? "text-success"
        : tono === "auto"
          ? value < 0
            ? "text-danger"
            : "text-success"
          : undefined;

  const texto = signo
    ? `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatEUR(Math.abs(value))}`
    : formatEUR(value);

  return (
    <span className={cn("tabular-nums", color, className)}>{texto}</span>
  );
}

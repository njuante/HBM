import { cn } from "@/lib/utils";
import type { EstadoPresupuesto } from "@/lib/validation/presupuesto";

const RELLENO: Record<EstadoPresupuesto, string> = {
  OK: "bg-success",
  AVISO: "bg-warning",
  EXCEDIDO: "bg-danger",
};

/**
 * Barra de consumo. El color lo pone el estado, no el componente: así la misma
 * escala verde→ámbar→teja significa lo mismo en el panel y en la lista.
 *
 * Por encima del 100 % la barra se llena entera y el exceso se marca con una
 * franja diagonal, en vez de dejar que se salga del carril.
 */
export function Progress({
  valor,
  estado = "OK",
  ariaLabel,
  className,
}: {
  /** Porcentaje consumido; admite valores mayores que 100. */
  valor: number;
  estado?: EstadoPresupuesto;
  ariaLabel: string;
  className?: string;
}) {
  const ancho = Math.min(Math.max(valor, 0), 100);

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(valor)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          RELLENO[estado],
          valor > 100 &&
            "bg-[repeating-linear-gradient(45deg,currentColor_0_4px,transparent_4px_8px)] text-danger",
        )}
        style={{ width: `${ancho}%` }}
      />
    </div>
  );
}

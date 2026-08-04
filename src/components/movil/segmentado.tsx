"use client";

import { cn } from "@/lib/utils";

export type OpcionSegmento = { value: string; label: string };

/**
 * Control segmentado a ancho completo, al modo de iOS.
 *
 * Se aparta del `Segmented` de la web en lo que importa en un móvil: reparte
 * la línea entera entre las opciones —así cada una es un blanco cómodo, en
 * vez de tres botones apretados a la izquierda dejando media pantalla vacía—
 * y el fondo del activo se desliza en lugar de saltar, que es lo que hace que
 * el cambio se lea como un movimiento y no como un parpadeo.
 */
export function SegmentadoMovil({
  opciones,
  value,
  onChange,
  ariaLabel,
  ocupado,
  className,
}: {
  opciones: readonly OpcionSegmento[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  ocupado?: boolean;
  className?: string;
}) {
  const indice = Math.max(
    0,
    opciones.findIndex((o) => o.value === value),
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-busy={ocupado}
      className={cn("relative flex rounded-full bg-muted p-1", className)}
    >
      {/* El indicador es un único elemento que viaja, no un fondo por botón. */}
      <span
        aria-hidden
        className="absolute inset-y-1 rounded-full bg-card shadow-sm transition-[left] duration-300 ease-out-quint"
        style={{
          width: `calc((100% - 0.5rem) / ${opciones.length})`,
          left: `calc(0.25rem + (100% - 0.5rem) / ${opciones.length} * ${indice})`,
        }}
      />
      {opciones.map((o) => {
        const activo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 min-h-8 flex-1 rounded-full text-[13px] font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              activo ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOMBRES_ICONO } from "@/lib/iconos";
import { IconoCategoria } from "@/components/ui/icono-categoria";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Paleta cerrada en lugar de `<input type="color">`.
 *
 * Un selector libre garantiza que antes o después alguien elija un fucsia
 * puro y rompa las gráficas; estos son los ocho tonos del sistema más tres
 * neutros, todos ya validados en claro y oscuro.
 */
export const COLORES = [
  "#a85b22", "#4a6b3d", "#26606b", "#8e3b5c",
  "#86691e", "#4c4a7c", "#2f7a5e", "#7a4a86",
  "#a33b28", "#3d7f8c", "#155661", "#78736b",
] as const;

export function AparienciaPicker({
  color,
  icono,
  onChange,
}: {
  color: string;
  icono: string | null;
  onChange: (v: { color: string; icono: string | null }) => void;
}) {
  const [abierto, setAbierto] = React.useState(false);

  return (
    <>
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="icono" value={icono ?? ""} />

      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Color e icono"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-2",
              "transition-colors hover:border-border-strong",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            <span
              className="flex size-5 items-center justify-center rounded-sm"
              style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)` }}
            >
              <IconoCategoria nombre={icono} className="size-3.5" color={color} />
            </span>
            <ChevronDown className="size-3 text-faint" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-64 space-y-3">
          <div>
            <p className="mb-1.5 text-2xs font-medium uppercase tracking-wide text-faint">
              Color
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  aria-pressed={c === color}
                  onClick={() => onChange({ color: c, icono })}
                  className="flex size-7 items-center justify-center rounded-md transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                  style={{ backgroundColor: c }}
                >
                  {c === color && (
                    <Check className="size-3.5 text-white" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-2xs font-medium uppercase tracking-wide text-faint">
              Icono
            </p>
            <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto pr-1">
              {NOMBRES_ICONO.map((nombre) => {
                const activo = nombre === icono;
                return (
                  <button
                    key={nombre}
                    type="button"
                    aria-label={nombre}
                    aria-pressed={activo}
                    // Volver a pulsar el icono activo lo quita.
                    onClick={() =>
                      onChange({ color, icono: activo ? null : nombre })
                    }
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                      activo
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <IconoCategoria nombre={nombre} className="size-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

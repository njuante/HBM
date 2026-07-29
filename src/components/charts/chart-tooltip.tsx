"use client";

import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";

export type FilaTooltip = {
  label: string;
  value: number;
  color?: string;
  /** Traza discontinua en la leyenda (para series de línea). */
  linea?: boolean;
  destacado?: boolean;
};

/** Panel flotante compartido por todas las gráficas. */
export function TooltipPanel({
  titulo,
  filas,
  pie,
}: {
  titulo?: React.ReactNode;
  filas: FilaTooltip[];
  pie?: React.ReactNode;
}) {
  return (
    <div className="pointer-events-none min-w-40 rounded-md border border-border bg-card px-2.5 py-2 text-xs shadow-md">
      {titulo && (
        <p className="mb-1.5 font-medium text-foreground">{titulo}</p>
      )}
      <dl className="space-y-1">
        {filas.map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            {f.color && (
              <span
                aria-hidden
                className={cn(
                  "shrink-0",
                  f.linea ? "h-px w-3" : "size-2 rounded-xs",
                )}
                style={{ backgroundColor: f.color }}
              />
            )}
            <dt className="min-w-0 flex-1 truncate text-muted-foreground">
              {f.label}
            </dt>
            <dd
              className={cn(
                "shrink-0 tabular-nums",
                f.destacado ? "font-medium text-foreground" : "text-foreground",
              )}
            >
              {formatEUR(f.value)}
            </dd>
          </div>
        ))}
      </dl>
      {pie && (
        <p className="mt-1.5 border-t border-border pt-1.5 text-2xs text-faint">
          {pie}
        </p>
      )}
    </div>
  );
}

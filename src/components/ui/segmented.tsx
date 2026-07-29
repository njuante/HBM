"use client";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  /** Texto accesible cuando `label` es un icono. */
  aria?: string;
};

/**
 * Control segmentado sobre botones reales, con `role="radiogroup"` para que
 * sea navegable y consultable por rol en los tests.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "sm",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const activo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={activo}
            aria-label={o.aria}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-sm font-medium transition-colors duration-150",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              activo
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

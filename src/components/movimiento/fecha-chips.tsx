"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { inputBase } from "@/components/ui/input";

const hoy = () => toDateInputValue(new Date());
const ayer = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateInputValue(d);
};

const legible = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });

/**
 * Selector de fecha en tres golpes. El 95 % de los movimientos se registran
 * el mismo día o el siguiente, así que «Hoy» y «Ayer» cubren casi todo y el
 * calendario queda para el resto.
 */
export function FechaChips({
  name = "fecha",
  value,
  onChange,
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [abierto, setAbierto] = React.useState(false);
  const valores = { hoy: hoy(), ayer: ayer() };
  const otra = value !== valores.hoy && value !== valores.ayer;

  return (
    <div role="radiogroup" aria-label="Fecha" className="flex items-center gap-1.5">
      <input type="hidden" name={name} value={value} />

      {(["hoy", "ayer"] as const).map((k) => (
        <Chip
          key={k}
          activo={value === valores[k]}
          onClick={() => onChange(valores[k])}
        >
          {k === "hoy" ? "Hoy" : "Ayer"}
        </Chip>
      ))}

      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="radio"
            aria-checked={otra}
            aria-label="Otra fecha"
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              otra
                ? "border-primary bg-primary-soft text-primary"
                : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            <CalendarDays className="size-3.5" />
            {otra ? legible(value) : "Otra"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <input
            type="date"
            aria-label="Elegir fecha"
            value={value}
            autoFocus
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value);
            }}
            className={cn(inputBase, "h-8 px-2 text-xs")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      onClick={onClick}
      className={cn(
        "h-8 rounded-md border px-2.5 text-xs font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        activo
          ? "border-primary bg-primary-soft text-primary"
          : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

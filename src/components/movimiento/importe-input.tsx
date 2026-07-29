"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Campo de importe: lo primero que se ve y lo primero que recibe el foco.
 *
 * Es `type="text"` con `inputMode="decimal"` a propósito, no `type="number"`:
 * el spinner nativo estorba, la rueda del ratón cambia el valor sin querer
 * y `importeSchema` ya acepta la coma decimal española.
 */
export function ImporteInput({
  name = "importe",
  defaultValue,
  invalido,
  id,
  inputRef,
}: {
  name?: string;
  defaultValue?: number | string;
  invalido?: boolean;
  id?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [valor, setValor] = React.useState(
    defaultValue != null && defaultValue !== ""
      ? String(defaultValue).replace(".", ",")
      : "",
  );

  return (
    <div
      className={cn(
        "flex items-baseline gap-2 rounded-lg border bg-card px-4 py-3 transition-[border-color,box-shadow]",
        "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20",
        invalido ? "border-danger" : "border-input",
      )}
    >
      <input
        ref={inputRef}
        id={id}
        name={name}
        value={valor}
        onChange={(e) => {
          // Solo dígitos y un separador decimal; el resto se descarta al vuelo
          // en vez de esperar al envío para dar un error.
          const limpio = e.target.value
            .replace(/[^\d.,]/g, "")
            .replace(/[.,]/g, (m, i, s) => (s.indexOf(m) === i ? "," : ""));
          setValor(limpio);
        }}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        aria-invalid={invalido}
        required
        className={cn(
          "min-w-0 flex-1 bg-transparent font-serif text-4xl font-medium tabular-nums",
          "outline-none placeholder:text-faint",
        )}
      />
      <span aria-hidden className="font-serif text-2xl text-muted-foreground">
        €
      </span>
    </div>
  );
}

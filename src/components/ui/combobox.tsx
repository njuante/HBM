"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBase } from "./input";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

export type ComboOption = {
  value: string;
  label: string;
  /** Segunda línea: contexto que ayuda a decidir sin abrir nada más. */
  detalle?: string;
  /** Adorno a la izquierda (punto de color, icono…). */
  adorno?: React.ReactNode;
};

/**
 * Campo de texto libre con sugerencias. No es un `<select>`: el usuario
 * puede escribir cualquier cosa, y las sugerencias solo aceleran.
 *
 * Se usa para el concepto de un movimiento, donde elegir una sugerencia
 * arrastra además la categoría, la casa y el emisor de la última vez.
 */
export function ComboboxTexto({
  name,
  value,
  onValueChange,
  onSelect,
  options,
  placeholder,
  autoFocus,
  required,
  id,
  className,
  vacio = "Sin coincidencias",
}: {
  name: string;
  value: string;
  onValueChange: (v: string) => void;
  /** Se dispara solo al elegir una sugerencia, no al teclear. */
  onSelect?: (option: ComboOption) => void;
  options: ComboOption[];
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  vacio?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listaId = React.useId();

  const filtradas = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    const base = q
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.detalle?.toLowerCase().includes(q),
        )
      : options;
    // Una coincidencia exacta no aporta nada: ya está escrita.
    return base
      .filter((o) => o.label.toLowerCase() !== q)
      .slice(0, 7);
  }, [options, value]);

  const hayLista = open && filtradas.length > 0;

  return (
    <Popover open={hayLista} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <input
          ref={inputRef}
          id={id}
          name={name}
          value={value}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder}
          role="combobox"
          aria-expanded={hayLista}
          aria-controls={listaId}
          aria-autocomplete="list"
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && hayLista) {
              e.stopPropagation(); // no cerrar el modal que lo contiene
              setOpen(false);
            }
            if (e.key === "ArrowDown" && !open) setOpen(true);
          }}
          className={cn(inputBase, "h-9 px-2.5 py-1.5", className)}
        />
      </PopoverAnchor>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} loop>
          <Command.List id={listaId}>
            <Command.Empty className="px-2 py-3 text-center text-xs text-faint">
              {vacio}
            </Command.Empty>
            {filtradas.map((o) => (
              <Command.Item
                key={o.value}
                value={o.value}
                // onMouseDown: el blur del input llega antes que el click.
                onMouseDown={(e) => e.preventDefault()}
                onSelect={() => {
                  onValueChange(o.label);
                  onSelect?.(o);
                  setOpen(false);
                  inputRef.current?.focus();
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  "data-[selected=true]:bg-muted",
                )}
              >
                {o.adorno}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.detalle && (
                  <span className="shrink-0 text-2xs text-faint">{o.detalle}</span>
                )}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Selector de un valor entre muchos, con búsqueda. Para listas largas donde
 * el `<select>` nativo se hace incómodo (categorías de una familia grande).
 */
export function ComboboxLista({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  vacio = "Sin resultados",
  className,
}: {
  options: ComboOption[];
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  vacio?: string;
  className?: string;
}) {
  return (
    <Command className={cn("overflow-hidden", className)} loop>
      <div className="flex items-center gap-2 border-b border-border px-2.5 pb-2">
        <Search className="size-3.5 shrink-0 text-faint" />
        <Command.Input
          placeholder={placeholder}
          className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-faint"
        />
      </div>
      <Command.List className="mt-1 max-h-60 overflow-y-auto">
        <Command.Empty className="px-2 py-4 text-center text-xs text-faint">
          {vacio}
        </Command.Empty>
        {options.map((o) => (
          <Command.Item
            key={o.value}
            value={`${o.label} ${o.detalle ?? ""}`}
            onSelect={() => onChange(o.value)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
              "data-[selected=true]:bg-muted",
            )}
          >
            {o.adorno}
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
            {o.value === value && <Check className="size-3.5 text-primary" />}
          </Command.Item>
        ))}
      </Command.List>
    </Command>
  );
}

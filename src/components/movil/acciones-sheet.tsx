"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Copy, Pencil, Repeat, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccionMovil = {
  clave: string;
  etiqueta: string;
  icono: LucideIcon;
  onSelect: () => void;
  peligro?: boolean;
  oculta?: boolean;
};

/**
 * Hoja de acciones al estilo de iOS.
 *
 * Sustituye al menú desplegable de la tabla, que en un móvil sale anclado al
 * botón —arriba del todo, lejos del pulgar— y con filas pensadas para un
 * ratón. Aquí las opciones son botones grandes en el borde inferior, y
 * «Cancelar» va en un bloque aparte, que es lo que hace que se distinga de
 * las acciones de verdad sin necesidad de leerlo.
 */
export function AccionesSheet({
  titulo,
  descripcion,
  acciones,
  abierta,
  onOpenChange,
}: {
  titulo: string;
  descripcion?: string;
  acciones: AccionMovil[];
  abierta: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const visibles = acciones.filter((a) => !a.oculta);

  return (
    <DialogPrimitive.Root open={abierta} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-[2px] data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-2 bottom-2 z-50 flex flex-col gap-2 focus:outline-none",
            "mb-[env(safe-area-inset-bottom)]",
            "data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in",
            "sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2",
          )}
        >
          <div className="overflow-hidden rounded-[18px] border border-border/70 bg-card shadow-xl">
            <div className="border-b border-border/60 px-4 py-3 text-center">
              <DialogPrimitive.Title className="truncate text-[13px] font-medium">
                {titulo}
              </DialogPrimitive.Title>
              {descripcion && (
                <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
                  {descripcion}
                </DialogPrimitive.Description>
              )}
            </div>

            {visibles.map(({ clave, etiqueta, icono: Icono, onSelect, peligro }) => (
              <button
                key={clave}
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  // Se salta un turno: Radix desmonta la hoja al cerrarse, y
                  // una acción que abre otro diálogo nacería y moriría en el
                  // mismo tick.
                  setTimeout(onSelect, 0);
                }}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 border-b border-border/60 px-4 text-left",
                  "text-[15px] font-medium transition-colors last:border-b-0 active:bg-muted",
                  peligro ? "text-danger" : "text-foreground",
                )}
              >
                <Icono className="size-[18px] shrink-0" />
                {etiqueta}
              </button>
            ))}
          </div>

          <DialogPrimitive.Close
            className={cn(
              "min-h-[52px] rounded-[18px] border border-border/70 bg-card text-[15px] font-semibold",
              "shadow-xl transition-colors active:bg-muted",
            )}
          >
            Cancelar
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Las acciones de un movimiento, que son las mismas que en la tabla web. */
export function accionesMovimiento({
  puedeEditar,
  onEditar,
  onDuplicar,
  onConvertir,
  onEliminar,
}: {
  puedeEditar: boolean;
  onEditar: () => void;
  onDuplicar: () => void;
  onConvertir?: () => void;
  onEliminar: () => void;
}): AccionMovil[] {
  return [
    { clave: "editar", etiqueta: "Editar", icono: Pencil, onSelect: onEditar, oculta: !puedeEditar },
    { clave: "duplicar", etiqueta: "Duplicar", icono: Copy, onSelect: onDuplicar },
    {
      clave: "convertir",
      etiqueta: "Convertir en recurrente",
      icono: Repeat,
      onSelect: () => onConvertir?.(),
      oculta: !onConvertir,
    },
    {
      clave: "eliminar",
      etiqueta: "Eliminar",
      icono: Trash2,
      onSelect: onEliminar,
      peligro: true,
      oculta: !puedeEditar,
    },
  ];
}

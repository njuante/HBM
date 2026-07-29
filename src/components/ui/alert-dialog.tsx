"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

/**
 * Confirmación destructiva. Sustituye a `window.confirm()`, que bloquea el
 * hilo, no se puede estilar y se comporta distinto en cada navegador.
 *
 * Admite dos usos:
 *  - con disparador: `<ConfirmarAccion …><Button/></ConfirmarAccion>`
 *  - controlado: `open` + `onOpenChange`, para lanzarlo desde un menú.
 */
export function ConfirmarAccion({
  children,
  titulo,
  descripcion,
  etiquetaConfirmar = "Eliminar",
  onConfirmar,
  open,
  onOpenChange,
}: {
  children?: React.ReactNode;
  titulo: string;
  descripcion?: string;
  etiquetaConfirmar?: string;
  onConfirmar: () => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children && (
        <AlertDialogPrimitive.Trigger asChild>
          {children}
        </AlertDialogPrimitive.Trigger>
      )}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-background/70 backdrop-blur-[2px]",
            "data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out",
          )}
        />
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-border bg-card p-5 shadow-lg focus:outline-none",
            "data-[state=open]:animate-panel-in data-[state=closed]:animate-panel-out",
          )}
        >
          <AlertDialogPrimitive.Title className="font-serif text-lg font-medium tracking-tight">
            {titulo}
          </AlertDialogPrimitive.Title>
          {descripcion && (
            <AlertDialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
              {descripcion}
            </AlertDialogPrimitive.Description>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Cancelar
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={onConfirmar}
              className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
            >
              {etiquetaConfirmar}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

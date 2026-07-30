import * as React from "react";
import { cn } from "@/lib/utils";

/** Superficie base: filete y fondo, nunca sombra. La elevación se reserva
 *  para lo que flota de verdad (modal, popover, tooltip). */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Cabecera de tarjeta: título y descripción apilados, y una acción opcional a
 * la derecha.
 *
 * Antes era un `flex justify-between` a secas, así que un `CardTitle` y un
 * `CardDescription` sueltos se repartían a los dos extremos y la descripción
 * acababa pegada al borde derecho. Quien lo esquivaba tenía que envolverlos en
 * un `<div>` que solo existía para eso.
 */
export function CardHeader({
  className,
  accion,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { accion?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 pb-1 pt-4",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">{children}</div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-serif text-lg font-medium leading-tight tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-0.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-border px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}

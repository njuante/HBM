import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════════════
   Bloques de la pantalla móvil.

   El patrón es la lista agrupada de iOS: secciones con un rótulo suelto
   encima y las filas dentro de una tarjeta redondeada con separadores
   sangrados. Frente a la tabla de la web, aquí manda una sola columna
   ancha, y lo que separa un bloque de otro es el aire, no un filete.
   ══════════════════════════════════════════════════════════════════════ */

/** Rótulo de sección. Va fuera de la tarjeta, como en Ajustes de iOS. */
export function Rotulo({
  children,
  accion,
}: {
  children: React.ReactNode;
  accion?: { texto: string; href: string };
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
        {children}
      </h2>
      {accion && (
        <Link
          href={accion.href}
          className="pulsable shrink-0 text-xs font-medium text-primary"
        >
          {accion.texto}
        </Link>
      )}
    </div>
  );
}

/**
 * La tarjeta que agrupa las filas.
 *
 * El radio grande (22px) y la sombra difusa son lo que da el aire de app
 * nativa; el filete se mantiene porque en modo claro la sombra sola no
 * despega la tarjeta de un fondo tan claro como este papel.
 */
export function Grupo({
  children,
  className,
  sinRelleno,
}: {
  children: React.ReactNode;
  className?: string;
  sinRelleno?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[22px] border border-border/70 bg-card",
        "shadow-[0_1px_2px_rgb(var(--shadow-color)/0.04),0_8px_24px_-12px_rgb(var(--shadow-color)/0.10)]",
        !sinRelleno && "px-4 py-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Fila de lista. Con `href` es navegable y saca su galón; sin él es
 * informativa y no finge que se puede pulsar.
 */
export function Fila({
  icono,
  titulo,
  detalle,
  valor,
  pie,
  href,
  onClick,
  className,
}: {
  icono?: React.ReactNode;
  titulo: React.ReactNode;
  detalle?: React.ReactNode;
  valor?: React.ReactNode;
  /** Ocupa el ancho completo bajo el título: barras de progreso y demás. */
  pie?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const interactiva = Boolean(href || onClick);

  const cuerpo = (
    <div className={cn("flex w-full items-center gap-3 py-3 text-left", className)}>
      {icono && <div className="shrink-0">{icono}</div>}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[15px] font-medium leading-tight">
            {titulo}
          </span>
          {valor && <span className="shrink-0 tabular-nums">{valor}</span>}
        </div>
        {detalle && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {detalle}
          </div>
        )}
        {pie && <div className="mt-2">{pie}</div>}
      </div>

      {interactiva && (
        <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
      )}
    </div>
  );

  // El separador se sangra hasta donde empieza el texto, no hasta el borde:
  // es el detalle que hace que una lista parezca nativa y no una tabla.
  const separador =
    "border-b border-border/60 last:border-b-0";

  if (href) {
    return (
      <Link href={href} className={cn("pulsable block", separador)}>
        {cuerpo}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn("pulsable block w-full", separador)}>
        {cuerpo}
      </button>
    );
  }
  return <div className={separador}>{cuerpo}</div>;
}

/** Espaciador entre secciones: el ritmo vertical de toda la pantalla. */
export function Seccion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn("mt-7 first:mt-0", className)}>{children}</section>;
}

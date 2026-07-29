import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Etiqueta + control + error. Antes estaba copiado en tres formularios y el
 * error en otros tres; ahora es un único sitio.
 *
 * Envuelve el control en un <label>, así que `getByLabel()` sigue
 * funcionando sin necesidad de `htmlFor`.
 */
export function Field({
  label,
  error,
  ayuda,
  className,
  opcional,
  children,
}: {
  label: string;
  error?: string[];
  ayuda?: React.ReactNode;
  className?: string;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  const mensaje = error?.[0];
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {opcional && <span className="text-2xs text-faint">opcional</span>}
      </span>
      {children}
      {mensaje ? (
        <FieldError>{mensaje}</FieldError>
      ) : (
        ayuda && <p className="mt-1 text-2xs text-faint">{ayuda}</p>
      )}
    </label>
  );
}

export function FieldError({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p className={cn("mt-1 text-xs text-danger", className)} role="alert">
      {children}
    </p>
  );
}

/** Error de formulario completo (credenciales inválidas, conflicto, …). */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/25 bg-danger/8 px-3 py-2 text-sm text-danger"
    >
      {children}
    </p>
  );
}

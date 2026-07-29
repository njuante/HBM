import type { ZodError } from "zod";

// Estado común de las Server Actions basadas en formularios.
export type FormState =
  | {
      ok?: boolean;
      errors?: Record<string, string[]>;
      message?: string;
      /**
       * Dato que la acción devuelve una sola vez y el formulario tiene que
       * mostrar. Hoy solo lo usa el enlace de invitación, cuyo token no se
       * puede recuperar después porque en BD vive hasheado.
       */
      valor?: string;
    }
  | undefined;

type ClavesOpcionales<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

/**
 * Marca como opcionales las claves cuyo valor puede ser `undefined`.
 *
 * Los helpers de `helpers.ts` normalizan lo que llega de FormData con un
 * `.transform()`, y Zod deja esas claves como **obligatorias con valor
 * `undefined`**. Sin esto, cualquier llamada directa a la capa de datos (tests
 * incluidos) tiene que escribir `emisor: undefined, metodoPago: undefined, …`.
 */
export type Entrada<T> = Omit<T, ClavesOpcionales<T>> &
  Partial<Pick<T, ClavesOpcionales<T>>>;

/** Aplana los errores de Zod a { campo: string[] } para pintarlos en el form. */
export function flattenZodErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

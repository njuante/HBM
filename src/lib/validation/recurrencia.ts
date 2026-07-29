import * as z from "zod";
import {
  importeSchema,
  fechaSchema,
  opcionalFecha,
  opcionalTexto,
  opcionalId,
} from "./helpers";
import { metodoPagoSchema } from "./gasto";
import type { Entrada } from "./form";

export const frecuenciaSchema = z.enum([
  "SEMANAL",
  "MENSUAL",
  "BIMESTRAL",
  "TRIMESTRAL",
  "SEMESTRAL",
  "ANUAL",
]);

export const tipoMovimientoSchema = z.enum(["GASTO", "INGRESO"]);

/**
 * Booleano tal como llega de un Switch dentro de FormData. Ausente es `false`:
 * el valor por defecto lo pone el formulario, no el esquema, porque si no
 * apagar el interruptor (que deja de enviar el campo) se leería como encenderlo.
 */
const interruptor = () =>
  z
    .union([z.string(), z.boolean(), z.null(), z.undefined()])
    .transform((v) => v === true || v === "on" || v === "true");

const enteroEntre = (min: number, max: number, mensaje: string) =>
  z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => (v === null || v === "" ? undefined : Number(v)))
    .refine(
      (n) => n === undefined || (Number.isInteger(n) && n >= min && n <= max),
      mensaje,
    );

export const recurrenciaSchema = z.object({
  tipo: tipoMovimientoSchema,
  casaId: opcionalId(),
  categoriaId: z.string().min(1, "Selecciona una categoría."),
  subcategoriaId: opcionalId(),
  importe: importeSchema,
  concepto: z.string().trim().min(2, "El concepto debe tener al menos 2 caracteres."),
  contraparte: opcionalTexto(120),
  metodoPago: metodoPagoSchema,
  frecuencia: frecuenciaSchema,
  intervalo: enteroEntre(1, 24, "El intervalo debe estar entre 1 y 24.").transform(
    (n) => n ?? 1,
  ),
  diaMes: enteroEntre(1, 31, "El día debe estar entre 1 y 31."),
  proximaFecha: fechaSchema,
  fin: opcionalFecha(),
  automatica: interruptor(),
});

export type RecurrenciaInput = Entrada<z.infer<typeof recurrenciaSchema>>;

export const recurrenciaFiltrosSchema = z.object({
  tipo: z.preprocess((v) => (v ? v : undefined), tipoMovimientoSchema.optional()),
});
export type RecurrenciaFiltros = Entrada<z.infer<typeof recurrenciaFiltrosSchema>>;

/** Recurrencia lista para pintar. Fuera de `server/db` para que la vea el cliente. */
export type RecurrenciaDTO = {
  id: string;
  tipo: "GASTO" | "INGRESO";
  importe: number;
  concepto: string;
  contraparte: string | null;
  metodoPago: string | null;
  frecuencia: z.infer<typeof frecuenciaSchema>;
  intervalo: number;
  diaMes: number | null;
  proximaFecha: string; // ISO
  fin: string | null;
  automatica: boolean;
  activa: boolean;
  casa: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string; color: string; icono: string | null };
  subcategoria: { id: string; nombre: string } | null;
  generados: number;
};

export type PropuestaDTO = {
  id: string;
  fecha: string; // ISO
  importe: number;
  tipo: "GASTO" | "INGRESO";
  concepto: string;
  categoria: { nombre: string; color: string; icono: string | null };
};

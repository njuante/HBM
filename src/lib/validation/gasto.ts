import * as z from "zod";
import { importeSchema, fechaSchema, opcionalTexto, opcionalId } from "./helpers";
import type { Entrada } from "./form";

// Enum opcional desde un <select> con opción vacía "": preprocesamos "" → undefined
// (un enum de Zod no acepta "") manteniendo los tipos literales para Prisma.
export const metodoPagoSchema = z.preprocess(
  (v) => (v ? v : undefined),
  z
    .enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "DOMICILIACION", "OTRO"])
    .optional(),
);

export const gastoSchema = z.object({
  casaId: z.string().min(1, "Selecciona una casa."),
  categoriaId: z.string().min(1, "Selecciona una categoría."),
  subcategoriaId: opcionalId(),
  importe: importeSchema,
  fecha: fechaSchema,
  concepto: z.string().trim().min(2, "El concepto debe tener al menos 2 caracteres."),
  emisor: opcionalTexto(120),
  metodoPago: metodoPagoSchema,
  recurrente: z
    .union([z.string(), z.boolean(), z.null()])
    .transform((v) => v === true || v === "on" || v === "true"),
});

export type GastoInput = Entrada<z.infer<typeof gastoSchema>>;

// Filtros del visor.
export const gastoFiltrosSchema = z.object({
  casaId: opcionalId(),
  categoriaId: opcionalId(),
  desde: opcionalTexto(10),
  hasta: opcionalTexto(10),
  texto: opcionalTexto(120),
});
export type GastoFiltros = Entrada<z.infer<typeof gastoFiltrosSchema>>;

import * as z from "zod";
import {
  importeSchema,
  fechaSchema,
  opcionalTexto,
  opcionalId,
} from "./helpers";
import type { Entrada } from "./form";

export const ingresoSchema = z.object({
  casaId: opcionalId(), // los ingresos pueden no estar ligados a una casa
  categoriaId: z.string().min(1, "Selecciona una categoría."),
  importe: importeSchema,
  fecha: fechaSchema,
  concepto: z.string().trim().min(2, "El concepto debe tener al menos 2 caracteres."),
  fuente: opcionalTexto(120),
  recurrente: z
    .union([z.string(), z.boolean(), z.null()])
    .transform((v) => v === true || v === "on" || v === "true"),
});

export type IngresoInput = Entrada<z.infer<typeof ingresoSchema>>;

export const ingresoFiltrosSchema = z.object({
  casaId: opcionalId(),
  categoriaId: opcionalId(),
  desde: opcionalTexto(10),
  hasta: opcionalTexto(10),
  texto: opcionalTexto(120),
});
export type IngresoFiltros = Entrada<z.infer<typeof ingresoFiltrosSchema>>;

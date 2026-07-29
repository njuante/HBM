import * as z from "zod";
import {
  opcionalTexto,
  opcionalId,
  opcionalFecha,
  opcionalNumero,
} from "./helpers";
import type { Entrada } from "./form";

export const estadoPagoSchema = z.enum(["PENDIENTE", "PAGADA"]);

// Metadatos de la factura (sin el archivo, que se valida aparte en la acción).
export const facturaMetaSchema = z.object({
  casaId: opcionalId(),
  gastoId: opcionalId(),
  emisor: opcionalTexto(120),
  numeroFactura: opcionalTexto(60),
  fechaEmision: opcionalFecha(),
  fechaVencimiento: opcionalFecha(),
  estadoPago: z.preprocess(
    (v) => (v ? v : "PENDIENTE"),
    estadoPagoSchema,
  ),
  // datosExtra: consumo (kWh/m³) y periodo, guardados como JSON.
  consumo: opcionalNumero(),
  periodo: opcionalTexto(20),
});

export type FacturaMetaInput = Entrada<z.infer<typeof facturaMetaSchema>>;

/**
 * Contenido de `Factura.datosExtra`. Se lee siempre a través de este esquema en
 * vez de castear el JSON a mano. Es *loose* a propósito: los módulos de
 * suministros y de lectura automática añadirán sus propias claves y no deben
 * perderse al editar la factura desde el formulario.
 */
export const datosExtraSchema = z.looseObject({
  consumo: z.number().optional(),
  periodo: z.string().optional(),
});
export type DatosExtra = z.infer<typeof datosExtraSchema>;

/** Lee `datosExtra` con tolerancia: un JSON corrupto o nulo devuelve `{}`. */
export function parseDatosExtra(valor: unknown): DatosExtra {
  const res = datosExtraSchema.safeParse(valor ?? {});
  return res.success ? res.data : {};
}

// Restricciones del archivo subido.
export const MAX_ARCHIVO_BYTES = 10 * 1024 * 1024; // 10 MB
export const TIPOS_PERMITIDOS: Record<string, "PDF" | "IMAGEN"> = {
  "application/pdf": "PDF",
  "image/jpeg": "IMAGEN",
  "image/png": "IMAGEN",
  "image/webp": "IMAGEN",
  "image/heic": "IMAGEN",
};

export const facturaFiltrosSchema = z.object({
  estadoPago: z.preprocess(
    (v) => (v ? v : undefined),
    estadoPagoSchema.optional(),
  ),
  texto: opcionalTexto(120),
});
export type FacturaFiltros = Entrada<z.infer<typeof facturaFiltrosSchema>>;

import * as z from "zod";
import {
  importeSchema,
  fechaSchema,
  opcionalFecha,
  opcionalTexto,
} from "./helpers";
import type { Entrada } from "./form";

export const contratoSchema = z.object({
  casaId: z.string().min(1, "Selecciona una casa."),
  inquilinoNombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres."),
  inquilinoEmail: z.email("Introduce un email válido.").trim().toLowerCase(),
  inicio: fechaSchema,
  fin: opcionalFecha(),
  rentaMensual: importeSchema,
  fianza: z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => {
      if (v === null || v === "" || v === undefined) return undefined;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined;
    }),
  diaCobro: z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => (v === null || v === "" ? 1 : Number(v)))
    .refine(
      (n) => Number.isInteger(n) && n >= 1 && n <= 31,
      "El día de cobro debe estar entre 1 y 31.",
    ),
  notas: opcionalTexto(500),
});

export type ContratoInput = Entrada<z.infer<typeof contratoSchema>>;

/** Estado del acceso del inquilino al portal. */
export type EstadoAcceso = "SIN_INVITAR" | "INVITADO" | "ACTIVO";

export type ContratoDTO = {
  id: string;
  casa: { id: string; nombre: string; direccion: string | null };
  inquilinoNombre: string;
  inquilinoEmail: string;
  inicio: string; // ISO
  fin: string | null;
  rentaMensual: number;
  fianza: number | null;
  diaCobro: number;
  activo: boolean;
  notas: string | null;
  acceso: EstadoAcceso;
  /** Id de la invitación viva, para poder revocarla. */
  invitacionId: string | null;
  tieneRecurrencia: boolean;
  facturasCompartidas: number;
};

/** Factura tal como la ve el inquilino en su portal. */
export type FacturaPortalDTO = {
  id: string;
  emisor: string | null;
  numeroFactura: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  estadoPago: "PENDIENTE" | "PAGADA";
  pagoDeclarado: boolean;
  compartidaAt: string;
  archivoTipo: "PDF" | "IMAGEN";
  importe: number | null;
  consumo: number | null;
  periodo: string | null;
};

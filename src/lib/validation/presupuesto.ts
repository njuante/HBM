import * as z from "zod";
import { importeSchema, opcionalId, mesSchema, opcionalMes } from "./helpers";
import type { Entrada } from "./form";

export const periodoPresupuestoSchema = z.enum(["MENSUAL", "ANUAL"]);

export const presupuestoSchema = z.object({
  // Vacío = presupuesto global de la familia / de todas las casas.
  categoriaId: opcionalId(),
  casaId: opcionalId(),
  importe: importeSchema,
  periodo: z.preprocess(
    (v) => (v ? v : "MENSUAL"),
    periodoPresupuestoSchema,
  ),
  desde: mesSchema,
  hasta: opcionalMes(),
});

export type PresupuestoInput = Entrada<z.infer<typeof presupuestoSchema>>;

/** Umbral a partir del cual el presupuesto avisa antes de agotarse. */
export const UMBRAL_AVISO = 85;

export type EstadoPresupuesto = "OK" | "AVISO" | "EXCEDIDO";

export function estadoPresupuesto(porcentaje: number): EstadoPresupuesto {
  if (porcentaje > 100) return "EXCEDIDO";
  if (porcentaje >= UMBRAL_AVISO) return "AVISO";
  return "OK";
}

/** Clave del agregado sin categoría en el mapa de medias. */
export const CLAVE_GLOBAL = "TODAS";

/**
 * Presupuesto ya resuelto con su consumo. Vive aquí y no en `server/db` para
 * que lo puedan importar los componentes de cliente sin arrastrar `server-only`.
 */
export type PresupuestoConsumo = {
  id: string;
  importe: number;
  periodo: "MENSUAL" | "ANUAL";
  desde: string; // 'YYYY-MM'
  hasta: string | null;
  activo: boolean;
  categoria: {
    id: string;
    nombre: string;
    color: string;
    icono: string | null;
  } | null;
  casa: { id: string; nombre: string } | null;
  gastado: number;
  restante: number;
  porcentaje: number;
  estado: EstadoPresupuesto;
};

import * as z from "zod";
import { opcionalTexto, opcionalId } from "./helpers";
import type { Entrada } from "./form";

export const tipoFiltroSchema = z.preprocess(
  (v) => (v === "GASTO" || v === "INGRESO" ? v : undefined),
  z.enum(["GASTO", "INGRESO"]).optional(),
);

/**
 * Filtros del visor unificado. Son los mismos de gastos e ingresos más el tipo,
 * que puede venir vacío («Todo»).
 */
export const movimientoFiltrosSchema = z.object({
  tipo: tipoFiltroSchema,
  casaId: opcionalId(),
  categoriaId: opcionalId(),
  desde: opcionalTexto(10),
  hasta: opcionalTexto(10),
  texto: opcionalTexto(120),
});
export type MovimientoFiltros = Entrada<z.infer<typeof movimientoFiltrosSchema>>;

export type TipoMovimiento = "GASTO" | "INGRESO";

/** Una fila del visor, venga de `Gasto` o de `Ingreso`. */
export type MovimientoDTO = {
  id: string;
  tipo: TipoMovimiento;
  usuarioId: string;
  importe: number;
  fecha: string; // ISO
  concepto: string;
  /** `emisor` en gastos, `fuente` en ingresos. */
  origen: string | null;
  metodoPago: string | null;
  recurrente: boolean;
  casa: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string; color: string; icono: string | null };
  subcategoria: { id: string; nombre: string } | null;
  tieneFactura: boolean;
  /** Falso para un MEMBER sobre un movimiento ajeno. */
  puedeEditar: boolean;
};

export type ResumenMovimientos = {
  ingresos: number;
  gastos: number;
  saldo: number;
  cuantos: number;
};

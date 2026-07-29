import "server-only";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/money";
import { parseDatosExtra } from "@/lib/validation/factura";
import type { FacturaPortalDTO } from "@/lib/validation/alquiler";

/**
 * Todo lo que ve un inquilino pasa por aquí.
 *
 * Regla del módulo: **ninguna función de la app se reutiliza en el portal**.
 * Cada consulta lleva `familiaId` *y* `casaId` en el `where`, y las facturas
 * exigen además `compartidaAt: { not: null }`. Así, lo que el inquilino puede
 * ver está enumerado en este fichero y en ningún otro sitio.
 */

export async function contratoDelInquilino(familiaId: string, casaId: string) {
  const c = await prisma.contratoAlquiler.findFirst({
    where: { familiaId, casaId, activo: true },
    orderBy: { inicio: "desc" },
  });
  if (!c) return null;

  return {
    id: c.id,
    inquilinoNombre: c.inquilinoNombre,
    inicio: c.inicio.toISOString(),
    fin: c.fin ? c.fin.toISOString() : null,
    rentaMensual: decimalToNumber(c.rentaMensual),
    fianza: c.fianza ? decimalToNumber(c.fianza) : null,
    diaCobro: c.diaCobro,
    notas: c.notas,
  };
}

export async function facturasCompartidas(
  familiaId: string,
  casaId: string,
): Promise<FacturaPortalDTO[]> {
  const filas = await prisma.factura.findMany({
    where: { familiaId, casaId, compartidaAt: { not: null } },
    orderBy: [{ fechaVencimiento: "asc" }, { compartidaAt: "desc" }],
    include: { gasto: { select: { importe: true } } },
  });

  return filas.map((f) => {
    const extra = parseDatosExtra(f.datosExtra);
    return {
      id: f.id,
      emisor: f.emisor,
      numeroFactura: f.numeroFactura,
      fechaEmision: f.fechaEmision ? f.fechaEmision.toISOString() : null,
      fechaVencimiento: f.fechaVencimiento
        ? f.fechaVencimiento.toISOString()
        : null,
      estadoPago: f.estadoPago,
      pagoDeclarado: Boolean(f.pagoDeclaradoAt),
      compartidaAt: f.compartidaAt!.toISOString(),
      archivoTipo: f.archivoTipo,
      // El importe vive en el gasto asociado; sin gasto no hay cifra que dar.
      importe: f.gasto ? decimalToNumber(f.gasto.importe) : null,
      consumo: extra.consumo ?? null,
      periodo: extra.periodo ?? null,
    };
  });
}

/**
 * Datos del archivo de una factura, **solo si está compartida con esa casa**.
 * Es la comprobación que protege la descarga: sin ella, un id adivinado daría
 * acceso a cualquier PDF de la familia.
 */
export async function archivoCompartido(
  familiaId: string,
  casaId: string,
  facturaId: string,
) {
  return prisma.factura.findFirst({
    where: {
      id: facturaId,
      familiaId,
      casaId,
      compartidaAt: { not: null },
    },
    select: { archivoPath: true, archivoNombre: true, archivoTipo: true },
  });
}

/**
 * El inquilino declara que ha pagado. No cambia `estadoPago`: eso lo confirma
 * el propietario, que es quien ve el dinero entrar.
 */
export async function declararPago(
  familiaId: string,
  casaId: string,
  facturaId: string,
): Promise<boolean> {
  const res = await prisma.factura.updateMany({
    where: {
      id: facturaId,
      familiaId,
      casaId,
      compartidaAt: { not: null },
      estadoPago: "PENDIENTE",
    },
    data: { pagoDeclaradoAt: new Date() },
  });
  return res.count > 0;
}

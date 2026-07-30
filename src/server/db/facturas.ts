import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { TipoArchivo } from "@/generated/prisma/enums";
import type { FacturaMetaInput, FacturaFiltros } from "@/lib/validation/factura";
import { parseDatosExtra } from "@/lib/validation/factura";

function datosExtra(meta: FacturaMetaInput): Prisma.InputJsonValue | undefined {
  const d: Record<string, unknown> = {};
  if (meta.consumo !== undefined) d.consumo = meta.consumo;
  if (meta.periodo) d.periodo = meta.periodo;
  return Object.keys(d).length ? (d as Prisma.InputJsonValue) : undefined;
}

/**
 * Mezcla lo que llega del formulario sobre el JSON que ya había. El formulario
 * solo conoce `consumo` y `periodo`; cualquier otra clave (suministros, OCR)
 * sobrevive a la edición. Un campo vaciado sí se borra.
 */
function mezclarDatosExtra(
  previo: Prisma.JsonValue | null,
  meta: FacturaMetaInput,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const base: Record<string, unknown> = { ...parseDatosExtra(previo) };

  if (meta.consumo !== undefined) base.consumo = meta.consumo;
  else delete base.consumo;
  if (meta.periodo) base.periodo = meta.periodo;
  else delete base.periodo;

  return Object.keys(base).length
    ? (base as Prisma.InputJsonValue)
    : Prisma.JsonNull;
}

async function validarPertenencia(
  familiaId: string,
  casaId?: string,
  gastoId?: string,
): Promise<string | null> {
  if (casaId) {
    const casa = await prisma.casa.findFirst({ where: { id: casaId, familiaId } });
    if (!casa) return "La casa seleccionada no es válida.";
  }
  if (gastoId) {
    const gasto = await prisma.gasto.findFirst({
      where: { id: gastoId, familiaId },
      include: { factura: { select: { id: true } } },
    });
    if (!gasto) return "El gasto seleccionado no es válido.";
    if (gasto.factura) return "Ese gasto ya tiene una factura asociada.";
  }
  return null;
}

export async function listFacturas(familiaId: string, filtros: FacturaFiltros) {
  const where: Prisma.FacturaWhereInput = { familiaId };
  if (filtros.estadoPago) where.estadoPago = filtros.estadoPago;
  if (filtros.texto) {
    where.OR = [
      { emisor: { contains: filtros.texto, mode: "insensitive" } },
      { numeroFactura: { contains: filtros.texto, mode: "insensitive" } },
    ];
  }

  return prisma.factura.findMany({
    where,
    orderBy: [{ fechaEmision: "desc" }, { createdAt: "desc" }],
    include: {
      casa: { select: { id: true, nombre: true, enAlquiler: true } },
      gasto: { select: { id: true, concepto: true } },
    },
  });
}

/** Gastos de la familia que aún no tienen factura (para el select del formulario). */
export async function gastosSinFactura(familiaId: string) {
  return prisma.gasto.findMany({
    where: { familiaId, factura: null },
    orderBy: { fecha: "desc" },
    select: { id: true, concepto: true, fecha: true },
    take: 200,
  });
}

export type AlertaFactura = {
  id: string;
  emisor: string | null;
  numeroFactura: string | null;
  fechaVencimiento: string; // ISO
  diasRestantes: number; // negativo si ya venció
};

/**
 * Facturas PENDIENTES con vencimiento: vencidas (fecha pasada) y próximas a vencer
 * dentro de `dias` días. Base del módulo de alertas.
 */
export async function alertasFacturas(
  familiaId: string,
  dias = 7,
): Promise<{ vencidas: AlertaFactura[]; proximas: AlertaFactura[] }> {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000);

  const rows = await prisma.factura.findMany({
    where: {
      familiaId,
      estadoPago: "PENDIENTE",
      fechaVencimiento: { not: null, lte: limite },
    },
    orderBy: { fechaVencimiento: "asc" },
    select: { id: true, emisor: true, numeroFactura: true, fechaVencimiento: true },
  });

  const msDia = 24 * 60 * 60 * 1000;
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const vencidas: AlertaFactura[] = [];
  const proximas: AlertaFactura[] = [];

  for (const r of rows) {
    const venc = r.fechaVencimiento!;
    const diaVenc = new Date(venc.getFullYear(), venc.getMonth(), venc.getDate());
    const diasRestantes = Math.round((diaVenc.getTime() - hoy.getTime()) / msDia);
    const alerta: AlertaFactura = {
      id: r.id,
      emisor: r.emisor,
      numeroFactura: r.numeroFactura,
      fechaVencimiento: venc.toISOString(),
      diasRestantes,
    };
    if (diasRestantes < 0) vencidas.push(alerta);
    else proximas.push(alerta);
  }
  return { vencidas, proximas };
}

export async function getFacturaArchivo(familiaId: string, id: string) {
  return prisma.factura.findFirst({
    where: { id, familiaId },
    select: { archivoPath: true, archivoNombre: true, archivoTipo: true },
  });
}

type Result =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function crearFactura(
  familiaId: string,
  meta: FacturaMetaInput,
  archivo: { path: string; nombre: string; tipo: TipoArchivo },
): Promise<Result> {
  const err = await validarPertenencia(familiaId, meta.casaId, meta.gastoId);
  if (err) return { ok: false, error: err };

  const f = await prisma.factura.create({
    data: {
      familiaId,
      casaId: meta.casaId ?? null,
      gastoId: meta.gastoId ?? null,
      emisor: meta.emisor ?? null,
      numeroFactura: meta.numeroFactura ?? null,
      fechaEmision: meta.fechaEmision ?? null,
      fechaVencimiento: meta.fechaVencimiento ?? null,
      estadoPago: meta.estadoPago,
      importe: meta.importe !== undefined ? meta.importe.toFixed(2) : null,
      archivoPath: archivo.path,
      archivoNombre: archivo.nombre,
      archivoTipo: archivo.tipo,
      datosExtra: datosExtra(meta),
    },
  });
  return { ok: true, id: f.id };
}

export async function actualizarFacturaMeta(
  familiaId: string,
  id: string,
  meta: FacturaMetaInput,
): Promise<Result> {
  const existe = await prisma.factura.findFirst({ where: { id, familiaId } });
  if (!existe) return { ok: false, error: "Factura no encontrada." };

  // Si cambia el gasto vinculado, validar (excluyendo el vínculo actual).
  if (meta.gastoId && meta.gastoId !== existe.gastoId) {
    const err = await validarPertenencia(familiaId, meta.casaId, meta.gastoId);
    if (err) return { ok: false, error: err };
  } else if (meta.casaId) {
    const err = await validarPertenencia(familiaId, meta.casaId);
    if (err) return { ok: false, error: err };
  }

  await prisma.factura.update({
    where: { id },
    data: {
      casaId: meta.casaId ?? null,
      gastoId: meta.gastoId ?? null,
      emisor: meta.emisor ?? null,
      numeroFactura: meta.numeroFactura ?? null,
      fechaEmision: meta.fechaEmision ?? null,
      fechaVencimiento: meta.fechaVencimiento ?? null,
      estadoPago: meta.estadoPago,
      importe: meta.importe !== undefined ? meta.importe.toFixed(2) : null,
      datosExtra: mezclarDatosExtra(existe.datosExtra, meta),
    },
  });
  return { ok: true, id };
}

export async function cambiarEstadoPago(
  familiaId: string,
  id: string,
  estado: "PENDIENTE" | "PAGADA",
) {
  const res = await prisma.factura.updateMany({
    where: { id, familiaId },
    data: { estadoPago: estado },
  });
  return res.count > 0;
}

/** Elimina la factura y devuelve la ruta del archivo para borrarlo del almacén. */
export async function eliminarFactura(
  familiaId: string,
  id: string,
): Promise<string | null> {
  const f = await prisma.factura.findFirst({
    where: { id, familiaId },
    select: { archivoPath: true },
  });
  if (!f) return null;
  await prisma.factura.delete({ where: { id } });
  return f.archivoPath;
}

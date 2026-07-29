import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/money";
import type { GastoInput, GastoFiltros } from "@/lib/validation/gasto";

function buildWhere(
  familiaId: string,
  f: GastoFiltros,
): Prisma.GastoWhereInput {
  const where: Prisma.GastoWhereInput = { familiaId };
  if (f.casaId) where.casaId = f.casaId;
  if (f.categoriaId) {
    where.OR = [
      { categoriaId: f.categoriaId },
      { subcategoriaId: f.categoriaId },
    ];
  }
  if (f.desde || f.hasta) {
    where.fecha = {};
    if (f.desde) where.fecha.gte = new Date(f.desde);
    if (f.hasta) {
      const h = new Date(f.hasta);
      h.setHours(23, 59, 59, 999);
      where.fecha.lte = h;
    }
  }
  if (f.texto) {
    where.AND = [
      {
        OR: [
          { concepto: { contains: f.texto, mode: "insensitive" } },
          { emisor: { contains: f.texto, mode: "insensitive" } },
        ],
      },
    ];
  }
  return where;
}

export async function listGastos(familiaId: string, filtros: GastoFiltros) {
  const where = buildWhere(familiaId, filtros);
  const [rows, agg] = await Promise.all([
    prisma.gasto.findMany({
      where,
      orderBy: { fecha: "desc" },
      include: {
        casa: { select: { id: true, nombre: true } },
        categoria: { select: { id: true, nombre: true, color: true, icono: true } },
        subcategoria: { select: { id: true, nombre: true, color: true, icono: true } },
        factura: { select: { id: true } },
      },
    }),
    prisma.gasto.aggregate({ where, _sum: { importe: true } }),
  ]);

  const items = rows.map((g) => ({
    id: g.id,
    usuarioId: g.usuarioId,
    importe: decimalToNumber(g.importe),
    fecha: g.fecha,
    concepto: g.concepto,
    emisor: g.emisor,
    metodoPago: g.metodoPago,
    recurrente: g.recurrente,
    casa: g.casa,
    categoria: g.categoria,
    subcategoria: g.subcategoria,
    tieneFactura: Boolean(g.factura),
  }));

  return { items, total: decimalToNumber(agg._sum.importe) };
}

export async function getGasto(familiaId: string, id: string) {
  return prisma.gasto.findFirst({ where: { id, familiaId } });
}

export type SugerenciaGasto = {
  concepto: string;
  categoriaId: string;
  subcategoriaId: string | null;
  casaId: string;
  emisor: string | null;
  metodoPago: string | null;
  importe: number;
  veces: number;
};

/**
 * Conceptos ya usados, con el contexto de la última vez.
 *
 * Es lo que hace rápido el alta: al elegir «Mercadona» el modal rellena de
 * golpe categoría, casa, emisor y método de pago, y solo queda el importe.
 * Se ordena por frecuencia (lo habitual arriba) y se desempata por recencia.
 */
export async function sugerenciasGasto(
  familiaId: string,
  limite = 40,
): Promise<SugerenciaGasto[]> {
  // DISTINCT ON necesita ordenar primero por la clave de distinción, así que
  // el ranking por frecuencia se hace en una segunda pasada.
  const rows = await prisma.$queryRaw<
    {
      concepto: string;
      categoriaId: string;
      subcategoriaId: string | null;
      casaId: string;
      emisor: string | null;
      metodoPago: string | null;
      importe: Prisma.Decimal;
      veces: bigint;
    }[]
  >`
    SELECT DISTINCT ON (lower(concepto))
      concepto,
      "categoriaId",
      "subcategoriaId",
      "casaId",
      emisor,
      "metodoPago"::text AS "metodoPago",
      importe,
      COUNT(*) OVER (PARTITION BY lower(concepto)) AS veces
    FROM "Gasto"
    WHERE "familiaId" = ${familiaId}
    ORDER BY lower(concepto), fecha DESC
  `;

  return rows
    .map((r) => ({
      concepto: r.concepto,
      categoriaId: r.categoriaId,
      subcategoriaId: r.subcategoriaId,
      casaId: r.casaId,
      emisor: r.emisor,
      metodoPago: r.metodoPago,
      importe: decimalToNumber(r.importe),
      veces: Number(r.veces),
    }))
    .sort((a, b) => b.veces - a.veces)
    .slice(0, limite);
}

type CrearResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function validarPertenencia(
  familiaId: string,
  casaId: string,
  categoriaId: string,
  subcategoriaId?: string,
): Promise<string | null> {
  const casa = await prisma.casa.findFirst({ where: { id: casaId, familiaId } });
  if (!casa) return "La casa seleccionada no es válida.";
  const cat = await prisma.categoria.findFirst({
    where: { id: categoriaId, familiaId, tipo: "GASTO" },
  });
  if (!cat) return "La categoría seleccionada no es válida.";
  if (subcategoriaId) {
    const sub = await prisma.categoria.findFirst({
      where: { id: subcategoriaId, familiaId, tipo: "GASTO", parentId: categoriaId },
    });
    if (!sub) return "La subcategoría no pertenece a la categoría elegida.";
  }
  return null;
}

export async function crearGasto(
  familiaId: string,
  usuarioId: string,
  data: GastoInput,
): Promise<CrearResult> {
  const err = await validarPertenencia(
    familiaId,
    data.casaId,
    data.categoriaId,
    data.subcategoriaId,
  );
  if (err) return { ok: false, error: err };

  const g = await prisma.gasto.create({
    data: {
      familiaId,
      usuarioId,
      casaId: data.casaId,
      categoriaId: data.categoriaId,
      subcategoriaId: data.subcategoriaId ?? null,
      importe: data.importe.toFixed(2),
      fecha: data.fecha,
      concepto: data.concepto,
      emisor: data.emisor ?? null,
      metodoPago: data.metodoPago ?? null,
      recurrente: data.recurrente,
    },
  });
  return { ok: true, id: g.id };
}

/**
 * `autorId` acota la operación al creador del movimiento: se pasa cuando quien
 * edita no tiene permiso de gestión sobre toda la familia (ver `autorRequerido`).
 */
export async function actualizarGasto(
  familiaId: string,
  id: string,
  data: GastoInput,
  autorId?: string,
): Promise<CrearResult> {
  const existe = await prisma.gasto.findFirst({
    where: { id, familiaId, ...(autorId ? { usuarioId: autorId } : {}) },
  });
  if (!existe) return { ok: false, error: "Gasto no encontrado." };

  const err = await validarPertenencia(
    familiaId,
    data.casaId,
    data.categoriaId,
    data.subcategoriaId,
  );
  if (err) return { ok: false, error: err };

  await prisma.gasto.update({
    where: { id },
    data: {
      casaId: data.casaId,
      categoriaId: data.categoriaId,
      subcategoriaId: data.subcategoriaId ?? null,
      importe: data.importe.toFixed(2),
      fecha: data.fecha,
      concepto: data.concepto,
      emisor: data.emisor ?? null,
      metodoPago: data.metodoPago ?? null,
      recurrente: data.recurrente,
    },
  });
  return { ok: true, id };
}

export async function eliminarGasto(
  familiaId: string,
  id: string,
  autorId?: string,
) {
  const res = await prisma.gasto.deleteMany({
    where: { id, familiaId, ...(autorId ? { usuarioId: autorId } : {}) },
  });
  return res.count > 0;
}

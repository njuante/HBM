import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/money";
import type { IngresoInput, IngresoFiltros } from "@/lib/validation/ingreso";

function buildWhere(
  familiaId: string,
  f: IngresoFiltros,
): Prisma.IngresoWhereInput {
  const where: Prisma.IngresoWhereInput = { familiaId };
  if (f.casaId) where.casaId = f.casaId;
  if (f.categoriaId) where.categoriaId = f.categoriaId;
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
    where.OR = [
      { concepto: { contains: f.texto, mode: "insensitive" } },
      { fuente: { contains: f.texto, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listIngresos(familiaId: string, filtros: IngresoFiltros) {
  const where = buildWhere(familiaId, filtros);
  const [rows, agg] = await Promise.all([
    prisma.ingreso.findMany({
      where,
      orderBy: { fecha: "desc" },
      include: {
        casa: { select: { id: true, nombre: true } },
        categoria: { select: { id: true, nombre: true, color: true, icono: true } },
      },
    }),
    prisma.ingreso.aggregate({ where, _sum: { importe: true } }),
  ]);

  const items = rows.map((i) => ({
    id: i.id,
    usuarioId: i.usuarioId,
    importe: decimalToNumber(i.importe),
    fecha: i.fecha,
    concepto: i.concepto,
    fuente: i.fuente,
    recurrente: i.recurrente,
    casa: i.casa,
    categoria: i.categoria,
  }));

  return { items, total: decimalToNumber(agg._sum.importe) };
}

export async function getIngreso(familiaId: string, id: string) {
  return prisma.ingreso.findFirst({ where: { id, familiaId } });
}

export type SugerenciaIngreso = {
  concepto: string;
  categoriaId: string;
  casaId: string | null;
  fuente: string | null;
  importe: number;
  veces: number;
};

/** Conceptos ya usados con su contexto. Ver `sugerenciasGasto`. */
export async function sugerenciasIngreso(
  familiaId: string,
  limite = 40,
): Promise<SugerenciaIngreso[]> {
  const rows = await prisma.$queryRaw<
    {
      concepto: string;
      categoriaId: string;
      casaId: string | null;
      fuente: string | null;
      importe: Prisma.Decimal;
      veces: bigint;
    }[]
  >`
    SELECT DISTINCT ON (lower(concepto))
      concepto,
      "categoriaId",
      "casaId",
      fuente,
      importe,
      COUNT(*) OVER (PARTITION BY lower(concepto)) AS veces
    FROM "Ingreso"
    WHERE "familiaId" = ${familiaId}
    ORDER BY lower(concepto), fecha DESC
  `;

  return rows
    .map((r) => ({
      concepto: r.concepto,
      categoriaId: r.categoriaId,
      casaId: r.casaId,
      fuente: r.fuente,
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
  categoriaId: string,
  casaId?: string,
): Promise<string | null> {
  const cat = await prisma.categoria.findFirst({
    where: { id: categoriaId, familiaId, tipo: "INGRESO" },
  });
  if (!cat) return "La categoría seleccionada no es válida.";
  if (casaId) {
    const casa = await prisma.casa.findFirst({ where: { id: casaId, familiaId } });
    if (!casa) return "La casa seleccionada no es válida.";
  }
  return null;
}

export async function crearIngreso(
  familiaId: string,
  usuarioId: string,
  data: IngresoInput,
): Promise<CrearResult> {
  const err = await validarPertenencia(familiaId, data.categoriaId, data.casaId);
  if (err) return { ok: false, error: err };

  const i = await prisma.ingreso.create({
    data: {
      familiaId,
      usuarioId,
      casaId: data.casaId ?? null,
      categoriaId: data.categoriaId,
      importe: data.importe.toFixed(2),
      fecha: data.fecha,
      concepto: data.concepto,
      fuente: data.fuente ?? null,
      recurrente: data.recurrente,
    },
  });
  return { ok: true, id: i.id };
}

/** `autorId` acota la operación al creador del movimiento (ver `autorRequerido`). */
export async function actualizarIngreso(
  familiaId: string,
  id: string,
  data: IngresoInput,
  autorId?: string,
): Promise<CrearResult> {
  const existe = await prisma.ingreso.findFirst({
    where: { id, familiaId, ...(autorId ? { usuarioId: autorId } : {}) },
  });
  if (!existe) return { ok: false, error: "Ingreso no encontrado." };

  const err = await validarPertenencia(familiaId, data.categoriaId, data.casaId);
  if (err) return { ok: false, error: err };

  await prisma.ingreso.update({
    where: { id },
    data: {
      casaId: data.casaId ?? null,
      categoriaId: data.categoriaId,
      importe: data.importe.toFixed(2),
      fecha: data.fecha,
      concepto: data.concepto,
      fuente: data.fuente ?? null,
      recurrente: data.recurrente,
    },
  });
  return { ok: true, id };
}

export async function eliminarIngreso(
  familiaId: string,
  id: string,
  autorId?: string,
) {
  const res = await prisma.ingreso.deleteMany({
    where: { id, familiaId, ...(autorId ? { usuarioId: autorId } : {}) },
  });
  return res.count > 0;
}

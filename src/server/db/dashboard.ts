import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/money";

export type RangoDashboard = {
  casaId?: string;
  desde: Date;
  hasta: Date;
};

/** Devuelve las claves de mes 'YYYY-MM' entre desde y hasta (inclusive). */
function bucketsMeses(desde: Date, hasta: Date): string[] {
  const out: string[] = [];
  const d = new Date(desde.getFullYear(), desde.getMonth(), 1);
  const fin = new Date(hasta.getFullYear(), hasta.getMonth(), 1);
  while (d <= fin) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

async function serieMensual(
  tabla: "Gasto" | "Ingreso",
  familiaId: string,
  rango: RangoDashboard,
): Promise<Map<string, number>> {
  const casaCond =
    rango.casaId != null
      ? Prisma.sql`AND "casaId" = ${rango.casaId}`
      : Prisma.empty;
  const tableSql =
    tabla === "Gasto" ? Prisma.sql`"Gasto"` : Prisma.sql`"Ingreso"`;

  const rows = await prisma.$queryRaw<{ mes: string; total: Prisma.Decimal }[]>`
    SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS mes,
           COALESCE(SUM(importe), 0) AS total
    FROM ${tableSql}
    WHERE "familiaId" = ${familiaId}
      AND fecha >= ${rango.desde}
      AND fecha <= ${rango.hasta}
      ${casaCond}
    GROUP BY 1
    ORDER BY 1
  `;
  return new Map(rows.map((r) => [r.mes, decimalToNumber(r.total)]));
}

export type PuntoMensual = { mes: string; ingresos: number; gastos: number };

export async function resumenMensual(
  familiaId: string,
  rango: RangoDashboard,
): Promise<PuntoMensual[]> {
  const [gastos, ingresos] = await Promise.all([
    serieMensual("Gasto", familiaId, rango),
    serieMensual("Ingreso", familiaId, rango),
  ]);
  return bucketsMeses(rango.desde, rango.hasta).map((mes) => ({
    mes,
    gastos: gastos.get(mes) ?? 0,
    ingresos: ingresos.get(mes) ?? 0,
  }));
}

export type CategoriaTotal = {
  categoriaId: string | null;
  nombre: string;
  color: string;
  icono: string | null;
  total: number;
};

export async function gastosPorCategoria(
  familiaId: string,
  rango: RangoDashboard,
): Promise<CategoriaTotal[]> {
  const grupos = await prisma.gasto.groupBy({
    by: ["categoriaId"],
    where: {
      familiaId,
      fecha: { gte: rango.desde, lte: rango.hasta },
      ...(rango.casaId ? { casaId: rango.casaId } : {}),
    },
    _sum: { importe: true },
  });
  if (grupos.length === 0) return [];

  const cats = await prisma.categoria.findMany({
    where: { id: { in: grupos.map((g) => g.categoriaId) } },
    select: { id: true, nombre: true, color: true, icono: true },
  });
  const byId = new Map(cats.map((c) => [c.id, c]));

  return grupos
    .map((g) => ({
      categoriaId: g.categoriaId,
      nombre: byId.get(g.categoriaId)?.nombre ?? "—",
      color: byId.get(g.categoriaId)?.color ?? "#64748b",
      icono: byId.get(g.categoriaId)?.icono ?? null,
      total: decimalToNumber(g._sum.importe),
    }))
    .sort((a, b) => b.total - a.total);
}

export type PuntoDiario = { dia: string; total: number };

/**
 * Gasto agregado por día. Alimenta el calendario de intensidad: a
 * diferencia de la serie mensual NO se rellenan huecos, porque un día sin
 * gasto es información y la rejilla ya conoce todas las fechas del rango.
 */
export async function serieDiaria(
  familiaId: string,
  rango: RangoDashboard,
): Promise<PuntoDiario[]> {
  const casaCond =
    rango.casaId != null ? Prisma.sql`AND "casaId" = ${rango.casaId}` : Prisma.empty;

  const rows = await prisma.$queryRaw<{ dia: string; total: Prisma.Decimal }[]>`
    SELECT to_char(date_trunc('day', fecha), 'YYYY-MM-DD') AS dia,
           COALESCE(SUM(importe), 0) AS total
    FROM "Gasto"
    WHERE "familiaId" = ${familiaId}
      AND fecha >= ${rango.desde}
      AND fecha <= ${rango.hasta}
      ${casaCond}
    GROUP BY 1
    ORDER BY 1
  `;
  return rows.map((r) => ({ dia: r.dia, total: decimalToNumber(r.total) }));
}

export type Kpis = {
  ingresos: number;
  gastos: number;
  saldo: number;
  facturasPendientes: number;
};

export async function kpisDashboard(
  familiaId: string,
  rango: RangoDashboard,
): Promise<Kpis> {
  const casaGasto = rango.casaId ? { casaId: rango.casaId } : {};
  const [gAgg, iAgg, pend] = await Promise.all([
    prisma.gasto.aggregate({
      where: { familiaId, fecha: { gte: rango.desde, lte: rango.hasta }, ...casaGasto },
      _sum: { importe: true },
    }),
    prisma.ingreso.aggregate({
      where: { familiaId, fecha: { gte: rango.desde, lte: rango.hasta }, ...casaGasto },
      _sum: { importe: true },
    }),
    prisma.factura.count({
      where: { familiaId, estadoPago: "PENDIENTE", ...(rango.casaId ? { casaId: rango.casaId } : {}) },
    }),
  ]);
  const gastos = decimalToNumber(gAgg._sum.importe);
  const ingresos = decimalToNumber(iAgg._sum.importe);
  return { ingresos, gastos, saldo: ingresos - gastos, facturasPendientes: pend };
}

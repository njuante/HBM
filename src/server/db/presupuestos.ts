import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { PeriodoPresupuesto } from "@/generated/prisma/enums";
import { decimalToNumber, sumImportes } from "@/lib/money";
import { claveMes, rangoAno, rangoMes, sumarMeses, primerDiaDeMes } from "@/lib/periodo";
import {
  estadoPresupuesto,
  CLAVE_GLOBAL,
  type PresupuestoConsumo,
  type PresupuestoInput,
} from "@/lib/validation/presupuesto";

type FilaGasto = {
  mes: string;
  categoriaId: string;
  casaId: string;
  total: Prisma.Decimal;
};

/**
 * Gasto del año natural agrupado por mes, categoría raíz y casa.
 *
 * Una sola consulta sirve tanto a los presupuestos mensuales como a los
 * anuales; agregar por presupuesto dispararía una consulta por fila. Los gastos
 * con subcategoría se imputan a su categoría raíz, que es lo que guarda
 * `Gasto.categoriaId` (mismo criterio que `gastosPorCategoria`).
 */
async function gastoDelAno(familiaId: string, mes: string): Promise<FilaGasto[]> {
  const { desde, hasta } = rangoAno(mes);
  return prisma.$queryRaw<FilaGasto[]>`
    SELECT
      to_char(date_trunc('month', fecha), 'YYYY-MM') AS mes,
      "categoriaId",
      "casaId",
      SUM(importe) AS total
    FROM "Gasto"
    WHERE "familiaId" = ${familiaId}
      AND fecha >= ${desde}
      AND fecha < ${hasta}
    GROUP BY 1, 2, 3
  `;
}

type PresupuestoFila = {
  id: string;
  categoriaId: string | null;
  casaId: string | null;
  importe: Prisma.Decimal;
  periodo: PeriodoPresupuesto;
  desde: Date;
  hasta: Date | null;
  activo: boolean;
};

/** ¿Está vigente este presupuesto en el mes pedido? */
function vigente(p: PresupuestoFila, mes: string): boolean {
  if (!p.activo) return false;
  if (p.periodo === "ANUAL") {
    const ano = mes.slice(0, 4);
    if (String(p.desde.getFullYear()) > ano) return false;
    return !p.hasta || String(p.hasta.getFullYear()) >= ano;
  }
  if (claveMes(p.desde) > mes) return false;
  return !p.hasta || claveMes(p.hasta) >= mes;
}

function gastadoDe(p: PresupuestoFila, filas: FilaGasto[], mes: string): number {
  const delPeriodo = p.periodo === "ANUAL" ? filas : filas.filter((f) => f.mes === mes);
  return sumImportes(
    delPeriodo
      .filter(
        (f) =>
          (!p.categoriaId || f.categoriaId === p.categoriaId) &&
          (!p.casaId || f.casaId === p.casaId),
      )
      .map((f) => decimalToNumber(f.total)),
  );
}

/** Presupuestos vigentes en `mes` ('YYYY-MM') con su consumo ya calculado. */
export async function listPresupuestos(
  familiaId: string,
  mes: string,
): Promise<PresupuestoConsumo[]> {
  const [filas, gastos] = await Promise.all([
    prisma.presupuesto.findMany({
      where: { familiaId },
      include: {
        categoria: { select: { id: true, nombre: true, color: true, icono: true } },
        casa: { select: { id: true, nombre: true } },
      },
      orderBy: [{ periodo: "asc" }, { createdAt: "asc" }],
    }),
    gastoDelAno(familiaId, mes),
  ]);

  return filas
    .filter((p) => vigente(p, mes))
    .map((p) => {
      const importe = decimalToNumber(p.importe);
      const gastado = gastadoDe(p, gastos, mes);
      const porcentaje = importe > 0 ? Math.round((gastado / importe) * 100) : 0;
      return {
        id: p.id,
        importe,
        periodo: p.periodo,
        desde: claveMes(p.desde),
        hasta: p.hasta ? claveMes(p.hasta) : null,
        activo: p.activo,
        categoria: p.categoria,
        casa: p.casa,
        gastado,
        restante: Math.round((importe - gastado) * 100) / 100,
        porcentaje,
        estado: estadoPresupuesto(porcentaje),
      };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje);
}

export type ResumenPresupuestos = {
  limite: number;
  gastado: number;
  excedidos: PresupuestoConsumo[];
  avisos: PresupuestoConsumo[];
  destacados: PresupuestoConsumo[];
};

/** Agregado para el panel y para los avisos. */
export async function resumenPresupuestos(
  familiaId: string,
  mes: string,
): Promise<ResumenPresupuestos> {
  const items = await listPresupuestos(familiaId, mes);
  // El total suma solo los presupuestos mensuales **por categoría**: el global
  // ya cubre a esos mismos gastos y sumarlo los contaría dos veces.
  const mensuales = items.filter((p) => p.periodo === "MENSUAL" && p.categoria);

  return {
    limite: sumImportes(mensuales.map((p) => p.importe)),
    gastado: sumImportes(mensuales.map((p) => p.gastado)),
    excedidos: items.filter((p) => p.estado === "EXCEDIDO"),
    avisos: items.filter((p) => p.estado === "AVISO"),
    destacados: items.slice(0, 4),
  };
}

/**
 * Gasto medio mensual de una categoría en los últimos `meses` completos.
 * Alimenta la sugerencia de importe al crear un presupuesto: proponer una cifra
 * es lo que evita la página en blanco.
 */
export async function mediaGastoMensual(
  familiaId: string,
  categoriaId: string | null,
  casaId: string | null,
  mes: string,
  meses = 3,
): Promise<number> {
  const finActual = rangoMes(mes).desde;
  const desde = sumarMeses(finActual, -meses);

  const agg = await prisma.gasto.aggregate({
    where: {
      familiaId,
      ...(categoriaId ? { categoriaId } : {}),
      ...(casaId ? { casaId } : {}),
      fecha: { gte: desde, lt: finActual },
    },
    _sum: { importe: true },
  });

  const total = decimalToNumber(agg._sum.importe);
  return Math.round((total / meses) * 100) / 100;
}

/**
 * Media mensual por categoría raíz (y la global bajo la clave `TODAS`) en los
 * `meses` anteriores al mes pedido. El diálogo la usa para proponer un importe
 * de partida sin obligar al usuario a mirar el histórico.
 */
export async function mediasPorCategoria(
  familiaId: string,
  mes: string,
  meses = 3,
): Promise<Record<string, number>> {
  const hasta = rangoMes(mes).desde;
  const desde = sumarMeses(hasta, -meses);

  const filas = await prisma.gasto.groupBy({
    by: ["categoriaId"],
    where: { familiaId, fecha: { gte: desde, lt: hasta } },
    _sum: { importe: true },
  });

  const out: Record<string, number> = {};
  let total = 0;
  for (const f of filas) {
    const media = decimalToNumber(f._sum.importe) / meses;
    out[f.categoriaId] = Math.round(media * 100) / 100;
    total += media;
  }
  out[CLAVE_GLOBAL] = Math.round(total * 100) / 100;
  return out;
}

type Result = { ok: true; id: string } | { ok: false; error: string };

async function validarPertenencia(
  familiaId: string,
  categoriaId?: string,
  casaId?: string,
): Promise<string | null> {
  if (categoriaId) {
    const cat = await prisma.categoria.findFirst({
      where: { id: categoriaId, familiaId, tipo: "GASTO", parentId: null },
    });
    if (!cat) {
      return "Elige una categoría de gasto principal (las subcategorías cuentan dentro de la suya).";
    }
  }
  if (casaId) {
    const casa = await prisma.casa.findFirst({ where: { id: casaId, familiaId } });
    if (!casa) return "La casa seleccionada no es válida.";
  }
  return null;
}

/**
 * Dos presupuestos del mismo ámbito y periodo no pueden solaparse en el tiempo:
 * si lo hicieran no habría forma de decir cuál manda en un mes dado. El
 * `@@unique` del esquema no basta porque en Postgres los NULL no colisionan.
 */
async function haySolape(
  familiaId: string,
  data: PresupuestoInput,
  excluirId?: string,
): Promise<boolean> {
  const candidatos = await prisma.presupuesto.findMany({
    where: {
      familiaId,
      categoriaId: data.categoriaId ?? null,
      casaId: data.casaId ?? null,
      periodo: data.periodo,
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    select: { desde: true, hasta: true },
  });

  const desdeNuevo = claveMes(data.desde);
  const hastaNuevo = data.hasta ? claveMes(data.hasta) : null;

  return candidatos.some((c) => {
    const desde = claveMes(c.desde);
    const hasta = c.hasta ? claveMes(c.hasta) : null;
    // Se solapan si cada intervalo empieza antes de que acabe el otro.
    return (
      (!hastaNuevo || desde <= hastaNuevo) && (!hasta || desdeNuevo <= hasta)
    );
  });
}

function normalizar(data: PresupuestoInput) {
  return {
    categoriaId: data.categoriaId ?? null,
    casaId: data.casaId ?? null,
    importe: data.importe.toFixed(2),
    periodo: data.periodo,
    // Se guarda siempre el día 1: el presupuesto es de un mes, no de un día.
    desde: primerDiaDeMes(claveMes(data.desde)),
    hasta: data.hasta ? primerDiaDeMes(claveMes(data.hasta)) : null,
  };
}

export async function crearPresupuesto(
  familiaId: string,
  data: PresupuestoInput,
): Promise<Result> {
  const err = await validarPertenencia(familiaId, data.categoriaId, data.casaId);
  if (err) return { ok: false, error: err };

  if (data.hasta && data.hasta < data.desde) {
    return { ok: false, error: "El mes final no puede ser anterior al inicial." };
  }
  if (await haySolape(familiaId, data)) {
    return {
      ok: false,
      error: "Ya hay un presupuesto para ese ámbito en esas fechas.",
    };
  }

  const p = await prisma.presupuesto.create({
    data: { familiaId, ...normalizar(data) },
  });
  return { ok: true, id: p.id };
}

export async function actualizarPresupuesto(
  familiaId: string,
  id: string,
  data: PresupuestoInput,
): Promise<Result> {
  const existe = await prisma.presupuesto.findFirst({ where: { id, familiaId } });
  if (!existe) return { ok: false, error: "Presupuesto no encontrado." };

  const err = await validarPertenencia(familiaId, data.categoriaId, data.casaId);
  if (err) return { ok: false, error: err };

  if (data.hasta && data.hasta < data.desde) {
    return { ok: false, error: "El mes final no puede ser anterior al inicial." };
  }
  if (await haySolape(familiaId, data, id)) {
    return {
      ok: false,
      error: "Ya hay un presupuesto para ese ámbito en esas fechas.",
    };
  }

  await prisma.presupuesto.updateMany({
    where: { id, familiaId },
    data: normalizar(data),
  });
  return { ok: true, id };
}

export async function cambiarActivoPresupuesto(
  familiaId: string,
  id: string,
  activo: boolean,
): Promise<boolean> {
  const res = await prisma.presupuesto.updateMany({
    where: { id, familiaId },
    data: { activo },
  });
  return res.count > 0;
}

export async function eliminarPresupuesto(
  familiaId: string,
  id: string,
): Promise<boolean> {
  const res = await prisma.presupuesto.deleteMany({ where: { id, familiaId } });
  return res.count > 0;
}

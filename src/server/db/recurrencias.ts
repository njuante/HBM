import "server-only";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/money";
import { ocurrenciasHasta, siguienteFecha } from "@/lib/recurrencia";
import type {
  PropuestaDTO,
  RecurrenciaDTO,
  RecurrenciaFiltros,
  RecurrenciaInput,
} from "@/lib/validation/recurrencia";

type Result = { ok: true; id: string } | { ok: false; error: string };

/** Fecha sin hora: hace determinista el candado `@@unique([recurrenciaId, fecha])`. */
function aDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/* ── Lectura ───────────────────────────────────────────────────────────── */

export async function listRecurrencias(
  familiaId: string,
  filtros: RecurrenciaFiltros = {},
): Promise<RecurrenciaDTO[]> {
  const filas = await prisma.recurrencia.findMany({
    where: { familiaId, ...(filtros.tipo ? { tipo: filtros.tipo } : {}) },
    orderBy: [{ activa: "desc" }, { proximaFecha: "asc" }],
    include: {
      casa: { select: { id: true, nombre: true } },
      categoria: { select: { id: true, nombre: true, color: true, icono: true } },
      subcategoria: { select: { id: true, nombre: true } },
      _count: { select: { gastos: true, ingresos: true } },
    },
  });

  return filas.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    importe: decimalToNumber(r.importe),
    concepto: r.concepto,
    contraparte: r.contraparte,
    metodoPago: r.metodoPago,
    frecuencia: r.frecuencia,
    intervalo: r.intervalo,
    diaMes: r.diaMes,
    proximaFecha: r.proximaFecha.toISOString(),
    fin: r.fin ? r.fin.toISOString() : null,
    automatica: r.automatica,
    activa: r.activa,
    casa: r.casa,
    categoria: r.categoria,
    subcategoria: r.subcategoria,
    generados: r._count.gastos + r._count.ingresos,
  }));
}

export async function getRecurrencia(familiaId: string, id: string) {
  return prisma.recurrencia.findFirst({ where: { id, familiaId } });
}

/** Propuestas vivas: las que esperan un sí o un no. */
export async function listPropuestas(familiaId: string): Promise<PropuestaDTO[]> {
  const filas = await prisma.movimientoPropuesto.findMany({
    where: { familiaId, descartadaAt: null },
    orderBy: { fecha: "asc" },
    include: {
      recurrencia: {
        select: {
          tipo: true,
          concepto: true,
          categoria: { select: { nombre: true, color: true, icono: true } },
        },
      },
    },
  });

  return filas.map((p) => ({
    id: p.id,
    fecha: p.fecha.toISOString(),
    importe: decimalToNumber(p.importe),
    tipo: p.recurrencia.tipo,
    concepto: p.recurrencia.concepto,
    categoria: p.recurrencia.categoria,
  }));
}

export type ProximoCargo = {
  recurrenciaId: string;
  tipo: "GASTO" | "INGRESO";
  concepto: string;
  importe: number;
  fecha: string; // ISO
};

/**
 * Lo que va a caer en los próximos `dias`. Se calcula en memoria a partir de
 * las plantillas activas: no hay nada que guardar para saberlo.
 */
export async function proximosCargos(
  familiaId: string,
  dias = 30,
): Promise<ProximoCargo[]> {
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + dias);

  const filas = await prisma.recurrencia.findMany({
    where: { familiaId, activa: true, proximaFecha: { lte: hasta } },
    select: {
      id: true,
      tipo: true,
      concepto: true,
      importe: true,
      frecuencia: true,
      intervalo: true,
      diaMes: true,
      proximaFecha: true,
      fin: true,
    },
  });

  const cargos = filas.flatMap((r) =>
    ocurrenciasHasta(
      r.proximaFecha,
      hasta,
      r.frecuencia,
      r.intervalo,
      r.diaMes,
      r.fin,
      12,
    ).map((fecha) => ({
      recurrenciaId: r.id,
      tipo: r.tipo,
      concepto: r.concepto,
      importe: decimalToNumber(r.importe),
      fecha: fecha.toISOString(),
    })),
  );

  return cargos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* ── Materialización ───────────────────────────────────────────────────── */

export type ResultadoMaterializacion = { creados: number; propuestos: number };

/**
 * Crea los movimientos que ya tocaban y adelanta el reloj de cada plantilla.
 *
 * Es **idempotente** por dos vías independientes: `proximaFecha` avanza dentro
 * de la misma transacción que las inserciones, y el `@@unique([recurrenciaId,
 * fecha])` de Gasto/Ingreso rechaza cualquier duplicado que se colara por una
 * ejecución simultánea (de ahí el `skipDuplicates`).
 */
export async function materializarRecurrencias(
  familiaId: string,
  hasta: Date = new Date(),
): Promise<ResultadoMaterializacion> {
  const pendientes = await prisma.recurrencia.findMany({
    where: { familiaId, activa: true, proximaFecha: { lte: hasta } },
  });

  let creados = 0;
  let propuestos = 0;

  for (const r of pendientes) {
    const fechas = ocurrenciasHasta(
      r.proximaFecha,
      hasta,
      r.frecuencia,
      r.intervalo,
      r.diaMes,
      r.fin,
    ).map(aDia);

    if (fechas.length === 0) {
      // La plantilla ya venció: se desactiva para no volver a mirarla.
      if (r.fin && r.proximaFecha > r.fin) {
        await prisma.recurrencia.update({
          where: { id: r.id },
          data: { activa: false },
        });
      }
      continue;
    }

    const ultima = fechas[fechas.length - 1];
    const proxima = siguienteFecha(ultima, r.frecuencia, r.intervalo, r.diaMes);
    const agotada = Boolean(r.fin && proxima > r.fin);

    await prisma.$transaction(async (tx) => {
      if (!r.automatica) {
        const res = await tx.movimientoPropuesto.createMany({
          data: fechas.map((fecha) => ({
            familiaId,
            recurrenciaId: r.id,
            fecha,
            importe: r.importe,
          })),
          skipDuplicates: true,
        });
        propuestos += res.count;
      } else if (r.tipo === "GASTO") {
        // Una recurrencia de gasto siempre tiene casa (se valida al crearla).
        const res = await tx.gasto.createMany({
          data: fechas.map((fecha) => ({
            familiaId,
            casaId: r.casaId!,
            categoriaId: r.categoriaId,
            subcategoriaId: r.subcategoriaId,
            usuarioId: r.usuarioId,
            importe: r.importe,
            fecha,
            concepto: r.concepto,
            emisor: r.contraparte,
            metodoPago: r.metodoPago,
            recurrente: true,
            recurrenciaId: r.id,
          })),
          skipDuplicates: true,
        });
        creados += res.count;
      } else {
        const res = await tx.ingreso.createMany({
          data: fechas.map((fecha) => ({
            familiaId,
            casaId: r.casaId,
            categoriaId: r.categoriaId,
            usuarioId: r.usuarioId,
            importe: r.importe,
            fecha,
            concepto: r.concepto,
            fuente: r.contraparte,
            recurrente: true,
            recurrenciaId: r.id,
          })),
          skipDuplicates: true,
        });
        creados += res.count;
      }

      await tx.recurrencia.update({
        where: { id: r.id },
        data: { proximaFecha: proxima, activa: !agotada },
      });
    });
  }

  return { creados, propuestos };
}

// Última materialización por familia, en memoria del proceso. Evita repetir la
// consulta en cada navegación sin añadir una escritura por petición; si el
// proceso se reinicia, como mucho se ejecuta de más, y es idempotente.
const ultimaPasada = new Map<string, number>();
const INTERVALO_MS = 10 * 60 * 1000;

/**
 * Materializa de forma perezosa, con freno. Es la vía que hace que el módulo
 * funcione sin cron: quien abre la app pone al día su familia. El endpoint
 * `/api/cron/recurrencias` es la vía fiable para quien sí tenga programador.
 */
export async function asegurarRecurrencias(familiaId: string): Promise<void> {
  const ahora = Date.now();
  const previa = ultimaPasada.get(familiaId) ?? 0;
  if (ahora - previa < INTERVALO_MS) return;

  ultimaPasada.set(familiaId, ahora);
  try {
    await materializarRecurrencias(familiaId);
  } catch (e) {
    // Nunca debe tumbar la página que la invoca.
    console.error("materializarRecurrencias falló", e);
    ultimaPasada.delete(familiaId);
  }
}

/**
 * Levanta el freno para esa familia.
 *
 * El freno mide tiempo, no cambios: sin esto, crear una recurrencia con fecha
 * pasada no genera nada hasta diez minutos después, porque cualquier visita
 * anterior al panel ya había marcado la familia como puesta al día.
 */
export function invalidarPasada(familiaId: string): void {
  ultimaPasada.delete(familiaId);
}

/** Materializa todas las familias. Solo para el endpoint de cron. */
export async function materializarTodas(): Promise<ResultadoMaterializacion> {
  const familias = await prisma.familia.findMany({ select: { id: true } });
  let creados = 0;
  let propuestos = 0;
  for (const f of familias) {
    const r = await materializarRecurrencias(f.id);
    creados += r.creados;
    propuestos += r.propuestos;
  }
  return { creados, propuestos };
}

/* ── Propuestas ────────────────────────────────────────────────────────── */

export async function confirmarPropuesta(
  familiaId: string,
  id: string,
): Promise<boolean> {
  const p = await prisma.movimientoPropuesto.findFirst({
    where: { id, familiaId, descartadaAt: null },
    include: { recurrencia: true },
  });
  if (!p) return false;
  const r = p.recurrencia;

  await prisma.$transaction(async (tx) => {
    if (r.tipo === "GASTO") {
      await tx.gasto.createMany({
        data: [
          {
            familiaId,
            casaId: r.casaId!,
            categoriaId: r.categoriaId,
            subcategoriaId: r.subcategoriaId,
            usuarioId: r.usuarioId,
            importe: p.importe,
            fecha: p.fecha,
            concepto: r.concepto,
            emisor: r.contraparte,
            metodoPago: r.metodoPago,
            recurrente: true,
            recurrenciaId: r.id,
          },
        ],
        skipDuplicates: true,
      });
    } else {
      await tx.ingreso.createMany({
        data: [
          {
            familiaId,
            casaId: r.casaId,
            categoriaId: r.categoriaId,
            usuarioId: r.usuarioId,
            importe: p.importe,
            fecha: p.fecha,
            concepto: r.concepto,
            fuente: r.contraparte,
            recurrente: true,
            recurrenciaId: r.id,
          },
        ],
        skipDuplicates: true,
      });
    }
    // Se marca como resuelta en vez de borrarse, por el mismo motivo que en
    // `descartarPropuesta`: si se borra, la siguiente materialización vuelve a
    // proponer esa fecha y la propuesta reaparece una y otra vez aunque el
    // movimiento ya exista. `descartadaAt` es hoy el único campo disponible y
    // se usa como «resuelta»; separar confirmada de descartada pediría una
    // migración.
    await tx.movimientoPropuesto.update({
      where: { id: p.id },
      data: { descartadaAt: new Date() },
    });
  });

  return true;
}

export async function descartarPropuesta(
  familiaId: string,
  id: string,
): Promise<boolean> {
  // Se marca en vez de borrarse: si se borrara, la siguiente materialización
  // volvería a proponer la misma fecha.
  const res = await prisma.movimientoPropuesto.updateMany({
    where: { id, familiaId, descartadaAt: null },
    data: { descartadaAt: new Date() },
  });
  return res.count > 0;
}

/* ── Escritura ─────────────────────────────────────────────────────────── */

async function validarPertenencia(
  familiaId: string,
  data: RecurrenciaInput,
): Promise<string | null> {
  const tipoCategoria = data.tipo === "GASTO" ? "GASTO" : "INGRESO";

  const cat = await prisma.categoria.findFirst({
    where: { id: data.categoriaId, familiaId, tipo: tipoCategoria },
  });
  if (!cat) return "La categoría seleccionada no es válida.";

  if (data.subcategoriaId) {
    const sub = await prisma.categoria.findFirst({
      where: {
        id: data.subcategoriaId,
        familiaId,
        tipo: tipoCategoria,
        parentId: data.categoriaId,
      },
    });
    if (!sub) return "La subcategoría no pertenece a la categoría elegida.";
  }

  if (data.casaId) {
    const casa = await prisma.casa.findFirst({
      where: { id: data.casaId, familiaId },
    });
    if (!casa) return "La casa seleccionada no es válida.";
  } else if (data.tipo === "GASTO") {
    return "Un gasto recurrente necesita una casa.";
  }

  if (data.fin && data.fin < data.proximaFecha) {
    return "La fecha de fin no puede ser anterior a la próxima.";
  }
  return null;
}

function aDatos(data: RecurrenciaInput) {
  return {
    tipo: data.tipo,
    casaId: data.casaId ?? null,
    categoriaId: data.categoriaId,
    subcategoriaId: data.subcategoriaId ?? null,
    importe: data.importe.toFixed(2),
    concepto: data.concepto,
    contraparte: data.contraparte ?? null,
    metodoPago: data.tipo === "GASTO" ? (data.metodoPago ?? null) : null,
    frecuencia: data.frecuencia,
    intervalo: data.intervalo,
    // Si no se dice, el día lo fija la primera fecha. Guardarlo explícito es lo
    // que hace que un recibo del 31 se recorte al último día en los meses
    // cortos y vuelva al 31 en los largos.
    diaMes: data.diaMes ?? data.proximaFecha.getDate(),
    proximaFecha: aDia(data.proximaFecha),
    fin: data.fin ? aDia(data.fin) : null,
    automatica: data.automatica,
  };
}

export async function crearRecurrencia(
  familiaId: string,
  usuarioId: string,
  data: RecurrenciaInput,
): Promise<Result> {
  const err = await validarPertenencia(familiaId, data);
  if (err) return { ok: false, error: err };

  const r = await prisma.recurrencia.create({
    data: { familiaId, usuarioId, ...aDatos(data) },
  });
  invalidarPasada(familiaId);
  return { ok: true, id: r.id };
}

export async function actualizarRecurrencia(
  familiaId: string,
  id: string,
  data: RecurrenciaInput,
): Promise<Result> {
  const existe = await prisma.recurrencia.findFirst({ where: { id, familiaId } });
  if (!existe) return { ok: false, error: "Recurrencia no encontrada." };

  const err = await validarPertenencia(familiaId, data);
  if (err) return { ok: false, error: err };

  await prisma.recurrencia.updateMany({
    where: { id, familiaId },
    data: aDatos(data),
  });
  invalidarPasada(familiaId);
  return { ok: true, id };
}

export async function cambiarActivaRecurrencia(
  familiaId: string,
  id: string,
  activa: boolean,
): Promise<boolean> {
  const res = await prisma.recurrencia.updateMany({
    where: { id, familiaId },
    data: { activa },
  });
  invalidarPasada(familiaId);
  return res.count > 0;
}

/**
 * Borra la plantilla. Los movimientos ya generados **se quedan**: son gasto
 * real y borrarlos falsearía el histórico (el FK es `SET NULL`).
 */
export async function eliminarRecurrencia(
  familiaId: string,
  id: string,
): Promise<boolean> {
  const res = await prisma.recurrencia.deleteMany({ where: { id, familiaId } });
  return res.count > 0;
}

/**
 * Convierte un gasto existente/importado en una plantilla de suscripción/recurrencia activa.
 */
export async function vincularGastoARecurrencia(
  familiaId: string,
  usuarioId: string,
  gastoId: string,
  frecuencia: "MENSUAL" | "ANUAL" | "SEMANAL" = "MENSUAL",
  automatica = true,
): Promise<Result> {
  const gasto = await prisma.gasto.findFirst({
    where: { id: gastoId, familiaId },
  });
  if (!gasto) return { ok: false, error: "Gasto no encontrado." };

  const proximaFecha = siguienteFecha(
    aDia(gasto.fecha),
    frecuencia,
    1,
    gasto.fecha.getDate(),
  );

  const r = await prisma.recurrencia.create({
    data: {
      familiaId,
      usuarioId,
      tipo: "GASTO",
      casaId: gasto.casaId,
      categoriaId: gasto.categoriaId,
      subcategoriaId: gasto.subcategoriaId,
      importe: gasto.importe,
      concepto: gasto.concepto,
      contraparte: gasto.emisor,
      metodoPago: gasto.metodoPago,
      frecuencia,
      intervalo: 1,
      diaMes: gasto.fecha.getDate(),
      proximaFecha,
      automatica,
      activa: true,
    },
  });

  // Vincular el gasto original a esta nueva recurrencia
  await prisma.gasto.update({
    where: { id: gasto.id },
    data: { recurrente: true, recurrenciaId: r.id },
  });

  invalidarPasada(familiaId);
  return { ok: true, id: r.id };
}

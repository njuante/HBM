import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/money";
import type {
  MovimientoDTO,
  MovimientoFiltros,
  ResumenMovimientos,
} from "@/lib/validation/movimiento";

/**
 * Visor unificado de gastos e ingresos.
 *
 * Se resuelve con un `UNION ALL` en vez de mezclar en memoria los resultados de
 * `listGastos` y `listIngresos`: paginar dos listas por separado y luego
 * intercalarlas da páginas incorrectas en cuanto una de las dos se agota antes.
 * Con la unión, el orden y el corte los hace la base de datos.
 */

const PAGINA = 50;

type Fila = {
  id: string;
  tipo: "GASTO" | "INGRESO";
  usuarioId: string;
  importe: Prisma.Decimal;
  fecha: Date;
  concepto: string;
  origen: string | null;
  metodoPago: string | null;
  recurrente: boolean;
  casaId: string | null;
  categoriaId: string;
  subcategoriaId: string | null;
  tieneFactura: boolean;
};

/** Recorte del día final: `hasta` es inclusivo, como en el resto de la app. */
function finDelDia(iso: string): Date {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * La unión con los filtros ya aplicados. Se construye una vez y se reutiliza
 * para la página y para los totales, que así no pueden discrepar.
 */
function union(familiaId: string, f: MovimientoFiltros): Prisma.Sql {
  const patron = f.texto ? `%${f.texto}%` : null;

  // Las columnas van cualificadas por alias: la rama de gastos se une con
  // `Factura`, que también tiene `emisor`, y sin prefijo la referencia es
  // ambigua.
  const desdeG = f.desde ? Prisma.sql`AND g.fecha >= ${new Date(f.desde)}` : Prisma.empty;
  const hastaG = f.hasta ? Prisma.sql`AND g.fecha <= ${finDelDia(f.hasta)}` : Prisma.empty;
  const casaG = f.casaId ? Prisma.sql`AND g."casaId" = ${f.casaId}` : Prisma.empty;
  // En gastos la categoría casa con la raíz o con la subcategoría.
  const catG = f.categoriaId
    ? Prisma.sql`AND (g."categoriaId" = ${f.categoriaId} OR g."subcategoriaId" = ${f.categoriaId})`
    : Prisma.empty;
  const textoG = patron
    ? Prisma.sql`AND (g.concepto ILIKE ${patron} OR g.emisor ILIKE ${patron})`
    : Prisma.empty;

  const desdeI = f.desde ? Prisma.sql`AND i.fecha >= ${new Date(f.desde)}` : Prisma.empty;
  const hastaI = f.hasta ? Prisma.sql`AND i.fecha <= ${finDelDia(f.hasta)}` : Prisma.empty;
  const casaI = f.casaId ? Prisma.sql`AND i."casaId" = ${f.casaId}` : Prisma.empty;
  const catI = f.categoriaId
    ? Prisma.sql`AND i."categoriaId" = ${f.categoriaId}`
    : Prisma.empty;
  const textoI = patron
    ? Prisma.sql`AND (i.concepto ILIKE ${patron} OR i.fuente ILIKE ${patron})`
    : Prisma.empty;

  const gastos = Prisma.sql`
    SELECT
      g.id, 'GASTO' AS tipo, g."usuarioId", g.importe, g.fecha, g.concepto,
      g.emisor AS origen, g."metodoPago"::text AS "metodoPago", g.recurrente,
      g."casaId", g."categoriaId", g."subcategoriaId",
      (fa.id IS NOT NULL) AS "tieneFactura"
    FROM "Gasto" g
    LEFT JOIN "Factura" fa ON fa."gastoId" = g.id
    WHERE g."familiaId" = ${familiaId} ${desdeG} ${hastaG} ${casaG} ${catG} ${textoG}
  `;

  const ingresos = Prisma.sql`
    SELECT
      i.id, 'INGRESO' AS tipo, i."usuarioId", i.importe, i.fecha, i.concepto,
      i.fuente AS origen, NULL::text AS "metodoPago", i.recurrente,
      i."casaId", i."categoriaId", NULL::text AS "subcategoriaId",
      false AS "tieneFactura"
    FROM "Ingreso" i
    WHERE i."familiaId" = ${familiaId} ${desdeI} ${hastaI} ${casaI} ${catI} ${textoI}
  `;

  if (f.tipo === "GASTO") return Prisma.sql`(${gastos})`;
  if (f.tipo === "INGRESO") return Prisma.sql`(${ingresos})`;
  return Prisma.sql`(${gastos} UNION ALL ${ingresos})`;
}

export async function listMovimientos(
  familiaId: string,
  filtros: MovimientoFiltros,
  opciones: { pagina?: number; porPagina?: number; autorId?: string } = {},
): Promise<{ items: MovimientoDTO[]; resumen: ResumenMovimientos; paginas: number }> {
  const porPagina = opciones.porPagina ?? PAGINA;
  const pagina = Math.max(1, opciones.pagina ?? 1);
  const salto = (pagina - 1) * porPagina;
  const u = union(familiaId, filtros);

  const [filas, totales] = await Promise.all([
    prisma.$queryRaw<Fila[]>`
      SELECT * FROM ${u} AS m
      ORDER BY m.fecha DESC, m.id DESC
      LIMIT ${porPagina} OFFSET ${salto}
    `,
    prisma.$queryRaw<{ tipo: string; total: Prisma.Decimal; cuantos: bigint }[]>`
      SELECT tipo, SUM(importe) AS total, COUNT(*) AS cuantos
      FROM ${u} AS m
      GROUP BY tipo
    `,
  ]);

  // Los nombres de casa y categoría se resuelven aparte: son pocos ids y
  // repetidos, y ahorra tres LEFT JOIN en la unión.
  const casaIds = [...new Set(filas.map((f) => f.casaId).filter(Boolean))] as string[];
  const catIds = [
    ...new Set(
      filas.flatMap((f) => [f.categoriaId, f.subcategoriaId]).filter(Boolean),
    ),
  ] as string[];

  const [casas, categorias] = await Promise.all([
    casaIds.length
      ? prisma.casa.findMany({
          where: { id: { in: casaIds }, familiaId },
          select: { id: true, nombre: true },
        })
      : [],
    catIds.length
      ? prisma.categoria.findMany({
          where: { id: { in: catIds }, familiaId },
          select: { id: true, nombre: true, color: true, icono: true },
        })
      : [],
  ]);

  const porCasa = new Map(casas.map((c) => [c.id, c]));
  const porCategoria = new Map(categorias.map((c) => [c.id, c]));
  const sinCategoria = { id: "", nombre: "Sin categoría", color: "#64748b", icono: null };

  const items: MovimientoDTO[] = filas.map((f) => {
    const sub = f.subcategoriaId ? porCategoria.get(f.subcategoriaId) : undefined;
    return {
      id: f.id,
      tipo: f.tipo,
      usuarioId: f.usuarioId,
      importe: decimalToNumber(f.importe),
      fecha: f.fecha.toISOString(),
      concepto: f.concepto,
      origen: f.origen,
      metodoPago: f.metodoPago,
      recurrente: f.recurrente,
      casa: (f.casaId && porCasa.get(f.casaId)) || null,
      categoria: porCategoria.get(f.categoriaId) ?? sinCategoria,
      subcategoria: sub ? { id: sub.id, nombre: sub.nombre } : null,
      tieneFactura: f.tieneFactura,
      puedeEditar: !opciones.autorId || f.usuarioId === opciones.autorId,
    };
  });

  const suma = (tipo: string) =>
    decimalToNumber(totales.find((t) => t.tipo === tipo)?.total);
  const cuantos = totales.reduce((n, t) => n + Number(t.cuantos), 0);
  const ingresos = suma("INGRESO");
  const gastos = suma("GASTO");

  return {
    items,
    resumen: {
      ingresos,
      gastos,
      saldo: Math.round((ingresos - gastos) * 100) / 100,
      cuantos,
    },
    paginas: Math.max(1, Math.ceil(cuantos / porPagina)),
  };
}

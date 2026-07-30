import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/money";

export type Resultado = {
  id: string;
  tipo: "GASTO" | "INGRESO" | "FACTURA";
  titulo: string;
  detalle: string;
  importe: number | null;
  href: string;
};

const TOPE = 5;

/**
 * Compara ignorando tildes y mayúsculas.
 *
 * Nadie escribe «Nómina» con tilde en un buscador, y un `ILIKE` a secas no la
 * encuentra. Se pliegan los acentos con `translate` en vez de instalar la
 * extensión `unaccent`, que obligaría a tocar la base de datos en cada
 * despliegue —y esto es una app que se instala en casa de la gente.
 */
const ACENTOS = "áéíóúüàèìòùâêîôûäëïöñçÁÉÍÓÚÜÀÈÌÒÙÂÊÎÔÛÄËÏÖÑÇ";
const LLANAS = "aeiouuaeiouaeiouaeioncAEIOUUAEIOUAEIOUAEIONC";

function plano(columna: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`translate(lower(coalesce(${columna}, '')), ${ACENTOS}, ${LLANAS})`;
}

type Fila = {
  id: string;
  tipo: "GASTO" | "INGRESO" | "FACTURA";
  titulo: string;
  detalle: string | null;
  importe: Prisma.Decimal | null;
  fecha: Date | null;
};

/**
 * Búsqueda transversal para la paleta de comandos.
 *
 * Acotada a propósito: unos pocos resultados por tipo y ordenados por fecha. No
 * sustituye a los filtros de cada pantalla, sirve para llegar rápido a algo que
 * se recuerda por su nombre.
 */
export async function buscarGlobal(
  familiaId: string,
  q: string,
): Promise<Resultado[]> {
  const texto = q.trim();
  if (texto.length < 2) return [];

  const patron = `%${texto.toLowerCase()}%`;
  const busca = (col: Prisma.Sql) => Prisma.sql`${plano(col)} LIKE ${patron}`;

  const filas = await prisma.$queryRaw<Fila[]>`
    (
      SELECT id, 'GASTO' AS tipo, concepto AS titulo, emisor AS detalle,
             importe, fecha
      FROM "Gasto"
      WHERE "familiaId" = ${familiaId}
        AND (${busca(Prisma.sql`concepto`)} OR ${busca(Prisma.sql`emisor`)})
      ORDER BY fecha DESC
      LIMIT ${TOPE}
    )
    UNION ALL
    (
      SELECT id, 'INGRESO', concepto, fuente, importe, fecha
      FROM "Ingreso"
      WHERE "familiaId" = ${familiaId}
        AND (${busca(Prisma.sql`concepto`)} OR ${busca(Prisma.sql`fuente`)})
      ORDER BY fecha DESC
      LIMIT ${TOPE}
    )
    UNION ALL
    (
      SELECT id, 'FACTURA',
             coalesce(emisor, "numeroFactura", 'Factura'),
             "numeroFactura", importe, "fechaVencimiento"
      FROM "Factura"
      WHERE "familiaId" = ${familiaId}
        AND (${busca(Prisma.sql`emisor`)} OR ${busca(Prisma.sql`"numeroFactura"`)})
      ORDER BY "fechaVencimiento" DESC NULLS LAST
      LIMIT ${TOPE}
    )
  `;

  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

  return filas.map((f) => {
    const importe = f.importe === null ? null : decimalToNumber(f.importe);
    const q = encodeURIComponent(f.titulo);
    return {
      id: f.id,
      tipo: f.tipo,
      titulo: f.titulo,
      detalle: [f.detalle, fmt(f.fecha)].filter(Boolean).join(" · "),
      importe: f.tipo === "GASTO" && importe !== null ? -importe : importe,
      href:
        f.tipo === "FACTURA"
          ? `/facturas?texto=${q}`
          : `/movimientos?tipo=${f.tipo}&texto=${q}`,
    };
  });
}

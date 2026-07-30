import "server-only";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, sumImportes } from "@/lib/money";
import { rangoMes } from "@/lib/periodo";

export type CategoriaPagosHormiga = {
  id: string;
  nombre: string;
  color: string;
  total: number;
  porcentaje: number;
};

export type ConceptoPagosHormiga = {
  concepto: string;
  veces: number;
  total: number;
  promedio: number;
  categoriaNombre?: string;
  categoriaColor?: string;
};

export type ResumenPagosHormiga = {
  umbralLimite: number;
  totalMes: number;
  proyeccionAnual: number;
  porcentajeGastoTotal: number;
  cantidadMovimientos: number;
  categorias: CategoriaPagosHormiga[];
  topConceptos: ConceptoPagosHormiga[];
};

/**
 * Calcula el análisis de Pagos Hormiga (gastos ≤ `umbralLimite`, por defecto 20€) para un mes dado.
 */
export async function obtenerPagosHormiga(
  familiaId: string,
  mes: string,
  umbralLimite = 20.0,
): Promise<ResumenPagosHormiga> {
  const { desde, hasta } = rangoMes(mes);

  // Obtener todos los gastos del mes
  const todosLosGastos = await prisma.gasto.findMany({
    where: {
      familiaId,
      fecha: { gte: desde, lt: hasta },
    },
    include: {
      categoria: { select: { id: true, nombre: true, color: true } },
    },
  });

  const totalGastoGlobal = sumImportes(todosLosGastos.map((g) => decimalToNumber(g.importe)));

  const CATEGORIAS_EXCLUIDAS_HORMIGA = ["alimentación", "alimentacion", "supermercado", "supermercados"];

  // Filtrar micro-gastos (Pagos Hormiga: prescindibles/ocio/suscripciones ≤ umbralLimite)
  const microGastos = todosLosGastos.filter((g) => {
    const imp = decimalToNumber(g.importe);
    const nombreCat = g.categoria.nombre.toLowerCase().trim();
    const esExcluida = CATEGORIAS_EXCLUIDAS_HORMIGA.some((ex) => nombreCat.includes(ex));
    return imp > 0 && imp <= umbralLimite && !esExcluida;
  });

  const totalMes = sumImportes(microGastos.map((g) => decimalToNumber(g.importe)));
  const proyeccionAnual = Math.round(totalMes * 12 * 100) / 100;
  const porcentajeGastoTotal = totalGastoGlobal > 0 ? Math.round((totalMes / totalGastoGlobal) * 100) : 0;

  // Agrupar por categoría
  const porCatMap = new Map<string, { id: string; nombre: string; color: string; total: number }>();
  for (const g of microGastos) {
    const imp = decimalToNumber(g.importe);
    const catId = g.categoria.id;
    const actual = porCatMap.get(catId) || {
      id: catId,
      nombre: g.categoria.nombre,
      color: g.categoria.color,
      total: 0,
    };
    actual.total = Math.round((actual.total + imp) * 100) / 100;
    porCatMap.set(catId, actual);
  }

  const categorias: CategoriaPagosHormiga[] = Array.from(porCatMap.values())
    .map((c) => ({
      ...c,
      porcentaje: totalMes > 0 ? Math.round((c.total / totalMes) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Agrupar por concepto
  const porConceptoMap = new Map<
    string,
    { concepto: string; veces: number; total: number; catNombre?: string; catColor?: string }
  >();

  for (const g of microGastos) {
    const key = g.concepto.trim();
    const imp = decimalToNumber(g.importe);
    const actual = porConceptoMap.get(key) || {
      concepto: key,
      veces: 0,
      total: 0,
      catNombre: g.categoria.nombre,
      catColor: g.categoria.color,
    };
    actual.veces += 1;
    actual.total = Math.round((actual.total + imp) * 100) / 100;
    porConceptoMap.set(key, actual);
  }

  const topConceptos: ConceptoPagosHormiga[] = Array.from(porConceptoMap.values())
    .map((c) => ({
      ...c,
      promedio: Math.round((c.total / c.veces) * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    umbralLimite,
    totalMes,
    proyeccionAnual,
    porcentajeGastoTotal,
    cantidadMovimientos: microGastos.length,
    categorias,
    topConceptos,
  };
}

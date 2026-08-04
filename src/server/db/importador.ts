import "server-only";
import { prisma } from "@/lib/prisma";
import { huellaApunte, type ApunteExtracto } from "@/lib/importacion/huella";

export type ElementoImportacion = {
  fecha: Date | string;
  concepto: string;
  importe: number;
  tipo: "GASTO" | "INGRESO";
  categoriaId: string;
  casaId?: string;
  emisorOrFuente?: string;
};

type ResultadoImportacion =
  | { ok: true; importados: number; duplicados: number }
  | { ok: false; error: string };

/** Qué le toca a cada apunte de la lista que se quiere importar. */
export type PlanApunte = {
  huella: string;
  /** 1, 2, 3… entre los apuntes idénticos del mismo día. */
  orden: number;
  /** Ya está en la base de datos de una importación anterior. */
  yaImportado: boolean;
};

/**
 * Decide, para una tanda de apuntes, cuáles son nuevos y con qué número de
 * orden entra cada uno.
 *
 * El caso que hay que resolver es reimportar los últimos días una y otra vez:
 * la mayoría de los apuntes ya estarán dentro y solo deben entrar los que no.
 *
 * La sutileza son los apuntes repetidos de verdad: dos cafés de 1,50 € el
 * mismo día son dos líneas legítimas del extracto y comparten huella. Por eso
 * se numeran. Si el extracto trae tres y ya hay dos guardados, entra uno.
 */
export async function planificarImportacion(
  familiaId: string,
  apuntes: ApunteExtracto[],
): Promise<PlanApunte[]> {
  const huellas = apuntes.map(huellaApunte);
  const distintas = [...new Set(huellas)];

  // Cuántos hay ya guardados de cada huella. La huella lleva dentro el tipo,
  // así que un gasto y un ingreso nunca se pisan aunque coincidan importe y día.
  const yaGuardados = new Map<string, number>();
  if (distintas.length > 0) {
    const [gastos, ingresos] = await Promise.all([
      prisma.gasto.findMany({
        where: { familiaId, huellaImport: { in: distintas } },
        select: { huellaImport: true },
      }),
      prisma.ingreso.findMany({
        where: { familiaId, huellaImport: { in: distintas } },
        select: { huellaImport: true },
      }),
    ]);
    for (const { huellaImport } of [...gastos, ...ingresos]) {
      if (!huellaImport) continue;
      yaGuardados.set(huellaImport, (yaGuardados.get(huellaImport) ?? 0) + 1);
    }
  }

  // Se numeran en el orden en que vienen en el fichero.
  const vistos = new Map<string, number>();
  return huellas.map((huella) => {
    const orden = (vistos.get(huella) ?? 0) + 1;
    vistos.set(huella, orden);
    return { huella, orden, yaImportado: orden <= (yaGuardados.get(huella) ?? 0) };
  });
}

/** Detecta el método de pago probable a partir del texto del apunte. */
function metodoPagoDe(
  concepto: string,
): "TARJETA" | "TRANSFERENCIA" | "DOMICILIACION" | "OTRO" {
  const c = concepto.toUpperCase();
  if (c.includes("COMPRA") || c.includes("TARJETA") || c.includes("PAGO MOVIL"))
    return "TARJETA";
  if (c.includes("BIZUM") || c.includes("TRANSFERENCIA")) return "TRANSFERENCIA";
  if (c.includes("RECIBO") || c.includes("DOMICILIACION")) return "DOMICILIACION";
  return "OTRO";
}

/**
 * Importa en bloque una lista de movimientos categorizados a mano por el usuario.
 *
 * Es idempotente: lo que ya se importó antes se deja fuera. El filtro previo
 * evita el trabajo, pero quien de verdad manda es la restricción única de la
 * base de datos —con `skipDuplicates`—, que además cubre el caso de dos
 * importaciones simultáneas del mismo extracto.
 */
export async function importarMovimientosBatch(
  familiaId: string,
  usuarioId: string,
  items: ElementoImportacion[],
): Promise<ResultadoImportacion> {
  if (!items || items.length === 0) {
    return { ok: false, error: "No se han seleccionado movimientos para importar." };
  }

  // Filtrar solo los ítems que tienen categoría asignada
  const validos = items.filter((item) => item.categoriaId && item.importe > 0);
  if (validos.length === 0) {
    return { ok: false, error: "Por favor asigna una categoría a los movimientos a importar." };
  }

  // Si no se especifica casaId, obtener la casa por defecto o primera casa de la familia
  let casaPorDefectoId = validos.find((v) => v.casaId)?.casaId;
  if (!casaPorDefectoId) {
    const primeraCasa = await prisma.casa.findFirst({
      where: { familiaId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!primeraCasa) {
      return { ok: false, error: "Debes tener al menos una casa creada para asociar los gastos." };
    }
    casaPorDefectoId = primeraCasa.id;
  }

  try {
    const plan = await planificarImportacion(familiaId, validos);

    const gastos = [];
    const ingresos = [];
    let duplicados = 0;

    for (const [i, item] of validos.entries()) {
      const { huella, orden, yaImportado } = plan[i];
      if (yaImportado) {
        duplicados++;
        continue;
      }

      const fecha = typeof item.fecha === "string" ? new Date(item.fecha) : item.fecha;
      const comun = {
        familiaId,
        usuarioId,
        categoriaId: item.categoriaId,
        importe: item.importe.toFixed(2),
        fecha,
        concepto: item.concepto,
        recurrente: false,
        huellaImport: huella,
        ordenImport: orden,
      };

      if (item.tipo === "GASTO") {
        gastos.push({
          ...comun,
          casaId: item.casaId || casaPorDefectoId!,
          emisor: item.emisorOrFuente || null,
          metodoPago: metodoPagoDe(item.concepto),
        });
      } else {
        ingresos.push({
          ...comun,
          casaId: item.casaId || null,
          fuente: item.emisorOrFuente || item.concepto,
        });
      }
    }

    // `skipDuplicates` se apoya en @@unique([familiaId, huellaImport, ordenImport]):
    // lo que la comprobación previa no viera por una carrera, lo para el índice.
    const [resGastos, resIngresos] = await prisma.$transaction([
      prisma.gasto.createMany({ data: gastos, skipDuplicates: true }),
      prisma.ingreso.createMany({ data: ingresos, skipDuplicates: true }),
    ]);

    const importados = resGastos.count + resIngresos.count;
    // Lo que el índice frenó también es un duplicado, aunque no lo previéramos.
    duplicados += gastos.length + ingresos.length - importados;

    return { ok: true, importados, duplicados };
  } catch (error) {
    console.error("Error al importar movimientos:", error);
    return { ok: false, error: "Ocurrió un error al guardar los movimientos en la base de datos." };
  }
}

import "server-only";
import { prisma } from "@/lib/prisma";

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
  | { ok: true; importados: number }
  | { ok: false; error: string };

/**
 * Importa en bloque una lista de movimientos categorizados a mano por el usuario.
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
    let creados = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of validos) {
        const fechaObj = typeof item.fecha === "string" ? new Date(item.fecha) : item.fecha;
        const casaIdTarget = item.casaId || casaPorDefectoId!;

        // Detectar método de pago probable según el concepto
        let metodoPago: "TARJETA" | "TRANSFERENCIA" | "DOMICILIACION" | "OTRO" = "OTRO";
        const conceptoUpper = item.concepto.toUpperCase();
        if (conceptoUpper.includes("COMPRA") || conceptoUpper.includes("TARJETA") || conceptoUpper.includes("PAGO MOVIL")) {
          metodoPago = "TARJETA";
        } else if (conceptoUpper.includes("BIZUM") || conceptoUpper.includes("TRANSFERENCIA")) {
          metodoPago = "TRANSFERENCIA";
        } else if (conceptoUpper.includes("RECIBO") || conceptoUpper.includes("DOMICILIACION")) {
          metodoPago = "DOMICILIACION";
        }

        if (item.tipo === "GASTO") {
          await tx.gasto.create({
            data: {
              familiaId,
              usuarioId,
              casaId: casaIdTarget,
              categoriaId: item.categoriaId,
              importe: item.importe.toFixed(2),
              fecha: fechaObj,
              concepto: item.concepto,
              emisor: item.emisorOrFuente || null,
              metodoPago,
              recurrente: false,
            },
          });
        } else {
          await tx.ingreso.create({
            data: {
              familiaId,
              usuarioId,
              casaId: item.casaId || null,
              categoriaId: item.categoriaId,
              importe: item.importe.toFixed(2),
              fecha: fechaObj,
              concepto: item.concepto,
              fuente: item.emisorOrFuente || item.concepto,
              recurrente: false,
            },
          });
        }
        creados++;
      }
    });

    return { ok: true, importados: creados };
  } catch (error) {
    console.error("Error al importar movimientos:", error);
    return { ok: false, error: "Ocurrió un error al guardar los movimientos en la base de datos." };
  }
}

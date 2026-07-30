import "server-only";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, sumImportes } from "@/lib/money";

export type MetaAhorroDTO = {
  id: string;
  nombre: string;
  concepto: string | null;
  objetivoImporte: number;
  actualImporte: number;
  porcentaje: number;
  fechaObjetivo: string | null;
  color: string;
  icono: string;
  completada: boolean;
  restante: number;
  createdAt: string;
};

export type ResumenAhorroGlobal = {
  totalAhorradoMetas: number;
  metasActivas: number;
  metasCompletadas: number;
  metas: MetaAhorroDTO[];
};

export async function listMetasAhorro(familiaId: string): Promise<ResumenAhorroGlobal> {
  const filas = await prisma.metaAhorro.findMany({
    where: { familiaId },
    orderBy: [{ completada: "asc" }, { createdAt: "desc" }],
  });

  const metas: MetaAhorroDTO[] = filas.map((m) => {
    const objetivo = decimalToNumber(m.objetivoImporte);
    const actual = decimalToNumber(m.actualImporte);
    const porcentaje = objetivo > 0 ? Math.min(100, Math.round((actual / objetivo) * 100)) : 0;
    const restante = Math.max(0, Math.round((objetivo - actual) * 100) / 100);

    return {
      id: m.id,
      nombre: m.nombre,
      concepto: m.concepto,
      objetivoImporte: objetivo,
      actualImporte: actual,
      porcentaje,
      fechaObjetivo: m.fechaObjetivo ? m.fechaObjetivo.toISOString() : null,
      color: m.color,
      icono: m.icono,
      completada: m.completada || actual >= objetivo,
      restante,
      createdAt: m.createdAt.toISOString(),
    };
  });

  const totalAhorradoMetas = sumImportes(metas.map((m) => m.actualImporte));
  const metasCompletadas = metas.filter((m) => m.completada).length;
  const metasActivas = metas.length - metasCompletadas;

  return {
    totalAhorradoMetas,
    metasActivas,
    metasCompletadas,
    metas,
  };
}

export async function crearMetaAhorro(
  familiaId: string,
  data: {
    nombre: string;
    concepto?: string;
    objetivoImporte: number;
    fechaObjetivo?: Date | null;
    color?: string;
    icono?: string;
  },
) {
  if (!data.nombre.trim()) return { ok: false, error: "El nombre es obligatorio." };
  if (data.objetivoImporte <= 0) return { ok: false, error: "El importe objetivo debe ser mayor que 0." };

  const meta = await prisma.metaAhorro.create({
    data: {
      familiaId,
      nombre: data.nombre.trim(),
      concepto: data.concepto?.trim() || null,
      objetivoImporte: data.objetivoImporte.toFixed(2),
      actualImporte: "0.00",
      fechaObjetivo: data.fechaObjetivo || null,
      color: data.color || "#3b82f6",
      icono: data.icono || "piggy-bank",
    },
  });

  return { ok: true, id: meta.id };
}

export async function aportarAMetaAhorro(
  familiaId: string,
  usuarioId: string,
  metaId: string,
  importe: number,
  notas?: string,
) {
  const meta = await prisma.metaAhorro.findFirst({
    where: { id: metaId, familiaId },
  });
  if (!meta) return { ok: false, error: "Meta de ahorro no encontrada." };

  const actualActual = decimalToNumber(meta.actualImporte);
  const nuevoActual = Math.max(0, actualActual + importe);
  const objetivo = decimalToNumber(meta.objetivoImporte);
  const completada = nuevoActual >= objetivo;

  await prisma.$transaction([
    prisma.aportacionAhorro.create({
      data: {
        metaId: meta.id,
        usuarioId,
        importe: importe.toFixed(2),
        notas: notas?.trim() || null,
      },
    }),
    prisma.metaAhorro.update({
      where: { id: meta.id },
      data: {
        actualImporte: nuevoActual.toFixed(2),
        completada,
      },
    }),
  ]);

  return { ok: true };
}

export async function eliminarMetaAhorro(familiaId: string, id: string) {
  const res = await prisma.metaAhorro.deleteMany({
    where: { id, familiaId },
  });
  return res.count > 0;
}

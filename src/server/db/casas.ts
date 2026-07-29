import "server-only";
import { prisma } from "@/lib/prisma";
import type { CasaInput } from "@/lib/validation/casa";

// Todas las funciones exigen `familiaId`: es el pilar del aislamiento multi-tenant.

export async function listCasas(familiaId: string) {
  return prisma.casa.findMany({
    where: { familiaId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { gastos: true, ingresos: true, facturas: true } },
    },
  });
}

export async function getCasa(familiaId: string, id: string) {
  return prisma.casa.findFirst({ where: { id, familiaId } });
}

export async function crearCasa(familiaId: string, data: CasaInput) {
  return prisma.casa.create({
    data: {
      familiaId,
      nombre: data.nombre,
      direccion: data.direccion || null,
    },
  });
}

export async function actualizarCasa(
  familiaId: string,
  id: string,
  data: CasaInput,
) {
  // updateMany con familiaId evita editar casas de otra familia.
  const res = await prisma.casa.updateMany({
    where: { id, familiaId },
    data: { nombre: data.nombre, direccion: data.direccion || null },
  });
  return res.count > 0;
}

export async function eliminarCasa(familiaId: string, id: string) {
  const res = await prisma.casa.deleteMany({ where: { id, familiaId } });
  return res.count > 0;
}

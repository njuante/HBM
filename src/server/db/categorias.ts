import "server-only";
import { prisma } from "@/lib/prisma";
import { TipoCategoria } from "@/generated/prisma/enums";
import type { CategoriaInput } from "@/lib/validation/categoria";

// Todas las funciones exigen `familiaId` (aislamiento multi-tenant).

/** Categorías raíz (sin parent) con sus subcategorías, opcionalmente filtradas por tipo. */
export async function listCategorias(familiaId: string, tipo?: TipoCategoria) {
  return prisma.categoria.findMany({
    where: { familiaId, parentId: null, ...(tipo ? { tipo } : {}) },
    orderBy: { nombre: "asc" },
    include: {
      subcategorias: {
        orderBy: { nombre: "asc" },
        include: {
          _count: {
            select: { gastosComoSubcategoria: true, ingresos: true },
          },
        },
      },
      _count: {
        select: { gastosComoCategoria: true, ingresos: true },
      },
    },
  });
}

/** Lista plana (raíz + subcategorías) de un tipo — útil para selects de formularios. */
export async function listCategoriasPlano(
  familiaId: string,
  tipo: TipoCategoria,
) {
  return prisma.categoria.findMany({
    where: { familiaId, tipo },
    orderBy: [{ parentId: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, color: true, parentId: true },
  });
}

export async function crearCategoria(familiaId: string, data: CategoriaInput) {
  // Valida que el parent (si lo hay) pertenece a la familia y es del mismo tipo.
  let parentId: string | null = null;
  if (data.parentId) {
    const parent = await prisma.categoria.findFirst({
      where: { id: data.parentId, familiaId, tipo: data.tipo },
    });
    if (!parent) return { ok: false as const, error: "Categoría padre no válida." };
    if (parent.parentId) {
      return { ok: false as const, error: "Solo se permite un nivel de subcategorías." };
    }
    parentId = parent.id;
  }

  // El índice único no cubre las raíces (parentId NULL) porque en Postgres
  // NULL != NULL, así que comprobamos duplicados explícitamente.
  const duplicada = await prisma.categoria.findFirst({
    where: { familiaId, tipo: data.tipo, parentId, nombre: data.nombre },
  });
  if (duplicada) {
    return { ok: false as const, error: "Ya existe una categoría con ese nombre." };
  }

  try {
    const cat = await prisma.categoria.create({
      data: {
        familiaId,
        tipo: data.tipo,
        nombre: data.nombre,
        color: data.color,
        icono: data.icono || null,
        parentId,
      },
    });
    return { ok: true as const, id: cat.id };
  } catch {
    return { ok: false as const, error: "Ya existe una categoría con ese nombre." };
  }
}

export async function actualizarCategoria(
  familiaId: string,
  id: string,
  data: Pick<CategoriaInput, "nombre" | "color" | "icono">,
) {
  const res = await prisma.categoria.updateMany({
    where: { id, familiaId },
    data: { nombre: data.nombre, color: data.color, icono: data.icono || null },
  });
  return res.count > 0;
}

/** Elimina una categoría. Bloquea si tiene gastos/ingresos asociados. */
export async function eliminarCategoria(familiaId: string, id: string) {
  const cat = await prisma.categoria.findFirst({
    where: { id, familiaId },
    include: {
      _count: {
        select: {
          gastosComoCategoria: true,
          gastosComoSubcategoria: true,
          ingresos: true,
          subcategorias: true,
        },
      },
    },
  });
  if (!cat) return { ok: false as const, error: "Categoría no encontrada." };

  if (cat._count.subcategorias > 0) {
    return {
      ok: false as const,
      error: "Elimina primero sus subcategorías.",
    };
  }

  const usos =
    cat._count.gastosComoCategoria +
    cat._count.gastosComoSubcategoria +
    cat._count.ingresos;
  if (usos > 0) {
    return {
      ok: false as const,
      error: `No se puede eliminar: tiene ${usos} movimiento(s) asociados.`,
    };
  }

  await prisma.categoria.delete({ where: { id } });
  return { ok: true as const };
}

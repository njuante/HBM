import "server-only";
import { prisma } from "@/lib/prisma";
import { Rol } from "@/generated/prisma/enums";

/** Miembros de la familia. Los inquilinos no lo son: viven en su portal. */
export async function listMiembros(familiaId: string) {
  return prisma.membership.findMany({
    where: { familiaId, rol: { not: Rol.INQUILINO } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      rol: true,
      user: { select: { id: true, nombre: true, email: true } },
    },
  });
}

export type ResultadoMiembro =
  | { ok: true }
  | { ok: false; error: string };

async function contarOwners(familiaId: string) {
  return prisma.membership.count({ where: { familiaId, rol: Rol.OWNER } });
}

/** Cambia el rol de un miembro, protegiendo que siempre quede al menos un OWNER. */
export async function cambiarRol(
  familiaId: string,
  membershipId: string,
  nuevoRol: Rol,
): Promise<ResultadoMiembro> {
  const m = await prisma.membership.findFirst({
    where: { id: membershipId, familiaId },
  });
  if (!m) return { ok: false, error: "Miembro no encontrado." };

  if (m.rol === Rol.OWNER && nuevoRol !== Rol.OWNER) {
    if ((await contarOwners(familiaId)) <= 1) {
      return { ok: false, error: "Debe quedar al menos un propietario (OWNER)." };
    }
  }
  await prisma.membership.update({
    where: { id: membershipId },
    data: { rol: nuevoRol },
  });
  return { ok: true };
}

/** Elimina un miembro, protegiendo que no se quede la familia sin OWNER. */
export async function eliminarMiembro(
  familiaId: string,
  membershipId: string,
): Promise<ResultadoMiembro> {
  const m = await prisma.membership.findFirst({
    where: { id: membershipId, familiaId },
  });
  if (!m) return { ok: false, error: "Miembro no encontrado." };

  if (m.rol === Rol.OWNER && (await contarOwners(familiaId)) <= 1) {
    return { ok: false, error: "No puedes eliminar al único propietario." };
  }
  await prisma.membership.delete({ where: { id: membershipId } });
  return { ok: true };
}

export async function renombrarFamilia(familiaId: string, nombre: string) {
  await prisma.familia.update({ where: { id: familiaId }, data: { nombre } });
}

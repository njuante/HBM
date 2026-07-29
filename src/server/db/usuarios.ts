import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Rol } from "@/generated/prisma/enums";
import type { PerfilInput } from "@/lib/validation/auth";

type Result = { ok: true } | { ok: false; error: string };

export async function actualizarPerfil(
  userId: string,
  data: PerfilInput,
): Promise<Result> {
  const otro = await prisma.user.findUnique({ where: { email: data.email } });
  if (otro && otro.id !== userId) {
    return { ok: false, error: "Ya existe una cuenta con ese email." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { nombre: data.nombre, email: data.email },
  });
  return { ok: true };
}

/**
 * Cambia la contraseña y **cierra el resto de sesiones**: si alguien la tenía
 * comprometida, el cambio tiene que echarlo fuera, no solo estorbarle.
 */
export async function cambiarPassword(
  userId: string,
  sessionIdActual: string,
  actual: string,
  nueva: string,
): Promise<Result> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Usuario no encontrado." };

  const ok = await bcrypt.compare(actual, user.passwordHash);
  if (!ok) return { ok: false, error: "La contraseña actual no es correcta." };

  const passwordHash = await bcrypt.hash(nueva, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId, id: { not: sessionIdActual } } }),
  ]);
  return { ok: true };
}

export type SesionDTO = {
  id: string;
  createdAt: string; // ISO
  expiresAt: string;
  actual: boolean;
};

export async function listSesiones(
  userId: string,
  sessionIdActual: string,
): Promise<SesionDTO[]> {
  const filas = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, expiresAt: true },
  });

  return filas.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    actual: s.id === sessionIdActual,
  }));
}

/** Cierra una sesión concreta del propio usuario (nunca la de otro). */
export async function cerrarSesion(userId: string, id: string): Promise<boolean> {
  const res = await prisma.session.deleteMany({ where: { id, userId } });
  return res.count > 0;
}

/**
 * Abandonar la familia por decisión propia. Un MEMBER no podía irse: la única
 * salida era que un OWNER lo expulsara.
 */
export async function abandonarFamilia(
  familiaId: string,
  userId: string,
): Promise<Result> {
  const m = await prisma.membership.findUnique({
    where: { userId_familiaId: { userId, familiaId } },
  });
  if (!m) return { ok: false, error: "No perteneces a esa familia." };

  if (m.rol === Rol.OWNER) {
    const owners = await prisma.membership.count({
      where: { familiaId, rol: Rol.OWNER },
    });
    if (owners <= 1) {
      return {
        ok: false,
        error: "Eres el único propietario: nombra a otro antes de salir.",
      };
    }
  }

  await prisma.membership.delete({ where: { id: m.id } });
  return { ok: true };
}

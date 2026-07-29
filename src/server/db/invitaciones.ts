import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Rol } from "@/generated/prisma/enums";
import type { RolFamilia } from "@/lib/validation/auth";

/** Días que vive un enlace de invitación antes de caducar. */
export const DIAS_VALIDEZ = 7;

/**
 * El token viaja en el enlace y **solo se devuelve una vez**, al crearlo. En la
 * base de datos vive su sha-256: quien lea la tabla no puede entrar con él.
 */
function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type InvitacionDTO = {
  id: string;
  email: string;
  rol: RolFamilia;
  casa: { id: string; nombre: string } | null;
  expiresAt: string; // ISO
  caducada: boolean;
};

export async function listInvitaciones(
  familiaId: string,
): Promise<InvitacionDTO[]> {
  const filas = await prisma.invitacion.findMany({
    // Las de inquilino se gestionan desde /alquileres, junto a su contrato.
    where: { familiaId, aceptadaAt: null, rol: { not: Rol.INQUILINO } },
    orderBy: { createdAt: "desc" },
    include: { casa: { select: { id: true, nombre: true } } },
  });

  const ahora = new Date();
  return filas.map((i) => ({
    id: i.id,
    email: i.email,
    rol: i.rol as RolFamilia,
    casa: i.casa,
    expiresAt: i.expiresAt.toISOString(),
    caducada: i.expiresAt < ahora,
  }));
}

type CrearResult =
  | { ok: true; id: string; token: string }
  | { ok: false; error: string };

/**
 * Crea la invitación y devuelve el token en claro para construir el enlace.
 * `actorRol` decide qué se puede repartir: solo un OWNER nombra a otro OWNER.
 */
export async function crearInvitacion(
  familiaId: string,
  actorId: string,
  actorRol: Rol,
  datos: { email: string; rol: Rol; casaId?: string },
): Promise<CrearResult> {
  if (actorRol !== Rol.OWNER && actorRol !== Rol.ADMIN) {
    return { ok: false, error: "No tienes permiso para invitar." };
  }
  if (datos.rol === Rol.OWNER && actorRol !== Rol.OWNER) {
    return { ok: false, error: "Solo un propietario puede nombrar a otro." };
  }

  const email = datos.email.trim().toLowerCase();

  const usuario = await prisma.user.findUnique({ where: { email } });
  if (usuario) {
    const yaEsta = await prisma.membership.findUnique({
      where: { userId_familiaId: { userId: usuario.id, familiaId } },
    });
    if (yaEsta) return { ok: false, error: "Esa persona ya está en la familia." };
  }

  if (datos.casaId) {
    const casa = await prisma.casa.findFirst({
      where: { id: datos.casaId, familiaId },
    });
    if (!casa) return { ok: false, error: "La casa seleccionada no es válida." };
  } else if (datos.rol === Rol.INQUILINO) {
    // Un inquilino sin casa sería un acceso sin alcance: no se permite.
    return { ok: false, error: "Un inquilino necesita una casa asignada." };
  }

  // Una invitación viva por email y familia: reinvitar renueva la anterior.
  await prisma.invitacion.deleteMany({ where: { familiaId, email, aceptadaAt: null } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + DIAS_VALIDEZ * 24 * 60 * 60 * 1000);

  const inv = await prisma.invitacion.create({
    data: {
      familiaId,
      email,
      rol: datos.rol,
      casaId: datos.casaId ?? null,
      tokenHash: hash(token),
      expiresAt,
      creadaPor: actorId,
    },
  });

  return { ok: true, id: inv.id, token };
}

export type InvitacionResuelta = {
  id: string;
  email: string;
  rol: Rol;
  familia: { id: string; nombre: string };
  casa: { id: string; nombre: string } | null;
};

/** Lee una invitación por su token. `null` si no existe, ya se usó o caducó. */
export async function resolverInvitacion(
  token: string,
): Promise<InvitacionResuelta | null> {
  if (!token) return null;

  const inv = await prisma.invitacion.findUnique({
    where: { tokenHash: hash(token) },
    include: {
      familia: { select: { id: true, nombre: true } },
      casa: { select: { id: true, nombre: true } },
    },
  });

  if (!inv || inv.aceptadaAt || inv.expiresAt < new Date()) return null;

  return {
    id: inv.id,
    email: inv.email,
    rol: inv.rol,
    familia: inv.familia,
    casa: inv.casa,
  };
}

export type AceptarResult = { ok: true; familiaId: string } | { ok: false; error: string };

/**
 * Une al usuario a la familia. Exige que el email de la cuenta sea el mismo al
 * que se invitó: si no, el enlace reenviado a un tercero le daría acceso.
 */
export async function aceptarInvitacion(
  token: string,
  userId: string,
): Promise<AceptarResult> {
  const inv = await resolverInvitacion(token);
  if (!inv) return { ok: false, error: "La invitación no es válida o ha caducado." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Usuario no encontrado." };
  if (user.email.toLowerCase() !== inv.email) {
    return {
      ok: false,
      error: `Esta invitación es para ${inv.email}. Entra con esa cuenta para aceptarla.`,
    };
  }

  const yaEsta = await prisma.membership.findUnique({
    where: { userId_familiaId: { userId, familiaId: inv.familia.id } },
  });
  if (yaEsta) {
    await prisma.invitacion.update({
      where: { id: inv.id },
      data: { aceptadaAt: new Date() },
    });
    return { ok: true, familiaId: inv.familia.id };
  }

  await prisma.$transaction([
    prisma.membership.create({
      data: {
        userId,
        familiaId: inv.familia.id,
        rol: inv.rol,
        // El inquilino queda atado a su casa: ese es todo su alcance.
        casaId: inv.rol === Rol.INQUILINO ? (inv.casa?.id ?? null) : null,
      },
    }),
    // Marcar en vez de borrar deja rastro de quién entró por dónde.
    prisma.invitacion.update({
      where: { id: inv.id },
      data: { aceptadaAt: new Date() },
    }),
  ]);

  return { ok: true, familiaId: inv.familia.id };
}

export async function revocarInvitacion(
  familiaId: string,
  id: string,
): Promise<boolean> {
  const res = await prisma.invitacion.deleteMany({ where: { id, familiaId } });
  return res.count > 0;
}

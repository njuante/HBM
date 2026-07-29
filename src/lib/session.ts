import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE as COOKIE } from "@/lib/session-cookie";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

export type SessionData = {
  sessionId: string;
  userId: string;
  activeFamiliaId: string | null;
};

/** Crea una sesión en BD y guarda el token en una cookie httpOnly. */
export async function createSession(
  userId: string,
  activeFamiliaId: string | null,
): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE_MS);

  await prisma.session.create({
    data: { token, userId, activeFamiliaId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/** Lee y valida la sesión actual desde la cookie. Devuelve null si no es válida. */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    activeFamiliaId: session.activeFamiliaId,
  };
}

/** Cambia la familia activa de la sesión en curso. */
export async function setActiveFamilia(familiaId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return;
  await prisma.session.update({
    where: { token },
    data: { activeFamiliaId: familiaId },
  });
}

/** Borra la sesión (logout). */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(COOKIE);
}

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Rol } from "@/generated/prisma/enums";

/** Verifica que hay sesión válida; si no, redirige a /login. Memoizado por render. */
export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
});

/** Devuelve el usuario autenticado (sin datos sensibles) o redirige a /login. */
export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, nombre: true, email: true },
  });
  if (!user) redirect("/login");
  return user;
});

export type FamiliaContext = {
  userId: string;
  familiaId: string;
  rol: Rol;
  alquileresActivo: boolean;
  user: { id: string; nombre: string; email: string };
  familia: { id: string; nombre: string };
  memberships: { familiaId: string; nombre: string; rol: Rol }[];
};

/**
 * Contexto de la familia activa: usuario + familia + rol. Redirige a /login si no
 * hay sesión y a /onboarding si el usuario no pertenece a ninguna familia.
 * Es la base del aislamiento multi-tenant: todo el acceso a datos usa `familiaId`.
 */
export const requireFamilia = cache(async (): Promise<FamiliaContext> => {
  const session = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      nombre: true,
      email: true,
      memberships: {
        // Las membresías de inquilino no cuentan como pertenencia a la
        // familia: su sitio es el portal, y colarlas aquí llevaría a alguien
        // con dos roles al tenant equivocado.
        where: { rol: { not: "INQUILINO" } },
        select: {
          familiaId: true,
          rol: true,
          familia: { select: { id: true, nombre: true, alquileresActivo: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) redirect("/login");
  // Sin membresía plena: o es un inquilino (y su sitio es el portal) o aún no
  // tiene familia.
  if (user.memberships.length === 0) {
    const esInquilino = await prisma.membership.count({
      where: { userId: user.id, rol: "INQUILINO" },
    });
    redirect(esInquilino > 0 ? "/portal" : "/onboarding");
  }

  // Elige la familia activa: la de la sesión si el usuario sigue siendo miembro,
  // si no la primera de la lista.
  const active =
    user.memberships.find((m) => m.familiaId === session.activeFamiliaId) ??
    user.memberships[0];

  return {
    userId: user.id,
    familiaId: active.familiaId,
    rol: active.rol,
    alquileresActivo: active.familia.alquileresActivo,
    user: { id: user.id, nombre: user.nombre, email: user.email },
    familia: { id: active.familia.id, nombre: active.familia.nombre },
    memberships: user.memberships.map((m) => ({
      familiaId: m.familiaId,
      nombre: m.familia.nombre,
      rol: m.rol,
    })),
  };
});

/** Lanza (redirige) si el rol de la familia activa no está permitido. */
export function assertRol(ctx: FamiliaContext, permitidos: Rol[]): void {
  if (!permitidos.includes(ctx.rol)) {
    redirect("/dashboard");
  }
}

/** OWNER y ADMIN pueden gestionar (crear/editar/borrar) los datos de la familia. */
export function puedeGestionar(ctx: FamiliaContext): boolean {
  return ctx.rol === "OWNER" || ctx.rol === "ADMIN";
}

/**
 * Política de movimientos: cualquier miembro apunta sus gastos e ingresos, pero
 * un MEMBER solo edita o borra los suyos. Devuelve el `usuarioId` al que hay que
 * acotar la consulta, o `undefined` si no hay límite (OWNER/ADMIN).
 */
export function autorRequerido(ctx: FamiliaContext): string | undefined {
  return puedeGestionar(ctx) ? undefined : ctx.userId;
}

export type InquilinoContext = {
  userId: string;
  familiaId: string;
  casaId: string;
  user: { id: string; nombre: string; email: string };
  casa: { id: string; nombre: string; direccion: string | null };
};

/**
 * Contexto del portal del inquilino.
 *
 * Es deliberadamente distinto de `requireFamilia`: un inquilino **no** es un
 * miembro con menos permisos, es otro tenant. Devuelve la casa a la que está
 * atado, y todas las consultas del portal se acotan a ese par (familia, casa).
 */
export const requireInquilino = cache(async (): Promise<InquilinoContext> => {
  const session = await verifySession();

  const m = await prisma.membership.findFirst({
    where: { userId: session.userId, rol: "INQUILINO", casaId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      familiaId: true,
      casaId: true,
      casa: { select: { id: true, nombre: true, direccion: true } },
      user: { select: { id: true, nombre: true, email: true } },
    },
  });

  // Quien no sea inquilino no pinta nada aquí: se le manda a su sitio.
  if (!m || !m.casa) redirect("/dashboard");

  return {
    userId: m.user.id,
    familiaId: m.familiaId,
    casaId: m.casa.id,
    user: m.user,
    casa: m.casa,
  };
});

/** ¿Esta sesión pertenece a un inquilino? Lo usa el shell para no ofrecerle la app. */
export const esInquilino = cache(async (): Promise<boolean> => {
  const session = await getSession();
  if (!session) return false;
  const plenas = await prisma.membership.count({
    where: { userId: session.userId, rol: { not: "INQUILINO" } },
  });
  if (plenas > 0) return false;
  const arrendado = await prisma.membership.count({
    where: { userId: session.userId, rol: "INQUILINO" },
  });
  return arrendado > 0;
});

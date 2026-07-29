"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  deleteSession,
  getSession,
  setActiveFamilia,
} from "@/lib/session";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { Rol } from "@/generated/prisma/enums";
import {
  registroSchema,
  loginSchema,
  type AuthFormState,
} from "@/lib/validation/auth";
import { flattenZodErrors } from "@/lib/validation/form";

export async function registro(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registroSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
    familia: formData.get("familia"),
  });

  if (!parsed.success) {
    return { errors: flattenZodErrors(parsed.error) };
  }

  const { nombre, email, password, familia } = parsed.data;

  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) {
    return { errors: { email: ["Ya existe una cuenta con este email."] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { userId, familiaId } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { nombre, email, passwordHash },
    });
    const fam = await tx.familia.create({ data: { nombre: familia } });
    await tx.membership.create({
      data: { userId: user.id, familiaId: fam.id, rol: Rol.OWNER },
    });
    return { userId: user.id, familiaId: fam.id };
  });

  // Categorías por defecto (fuera de la transacción principal).
  await crearCategoriasPorDefecto(familiaId);

  await createSession(userId, familiaId);
  redirect("/dashboard");
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: flattenZodErrors(parsed.error) };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { orderBy: { createdAt: "asc" } } },
  });

  // Mensaje genérico para no revelar si el email existe.
  const generico = { message: "Email o contraseña incorrectos." };
  if (!user) return generico;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return generico;

  // La familia activa solo puede salir de una membresía plena: si el usuario
  // es además inquilino en otro sitio, esa no cuenta.
  const plenas = user.memberships.filter((m) => m.rol !== Rol.INQUILINO);
  await createSession(user.id, plenas[0]?.familiaId ?? null);

  // Quien solo es inquilino va directo a su portal.
  redirect(plenas.length === 0 && user.memberships.length > 0 ? "/portal" : "/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

/**
 * Cambia la familia activa. Verifica la pertenencia contra la BD: el
 * `familiaId` viene del cliente y nunca se acepta a ciegas.
 */
export async function cambiarFamilia(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const familiaId = String(formData.get("familiaId") ?? "");
  if (!familiaId) return;

  const membership = await prisma.membership.findUnique({
    where: { userId_familiaId: { userId: session.userId, familiaId } },
    select: { familiaId: true },
  });
  if (!membership) return;

  await setActiveFamilia(familiaId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

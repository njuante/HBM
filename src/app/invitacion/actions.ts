"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createSession, getSession, setActiveFamilia } from "@/lib/session";
import { aceptarInvitacion, resolverInvitacion } from "@/server/db/invitaciones";
import { passwordSchema, type AuthFormState } from "@/lib/validation/auth";
import { flattenZodErrors } from "@/lib/validation/form";
import * as z from "zod";

const altaSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  password: passwordSchema,
});

/** Acepta la invitación con la sesión ya abierta. */
export async function aceptarInvitacionAction(
  formData: FormData,
): Promise<void> {
  const session = await getSession();
  const token = String(formData.get("token") ?? "");
  if (!session) redirect(`/login?siguiente=/invitacion/${token}`);

  const inv = await resolverInvitacion(token);
  const esInquilino = inv?.rol === "INQUILINO";

  const res = await aceptarInvitacion(token, session.userId);
  if (!res.ok) return;

  // Un inquilino no "entra" en la familia: su sitio es el portal, y la familia
  // activa debe seguir siendo la suya (si tiene alguna).
  if (!esInquilino) await setActiveFamilia(res.familiaId);
  revalidatePath("/", "layout");
  redirect(esInquilino ? "/portal" : "/dashboard");
}

/**
 * Alta desde una invitación: crea la cuenta con el email invitado (no se
 * pregunta, viene fijado por el enlace) y entra en la familia.
 */
export async function registroConInvitacionAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "");
  const inv = await resolverInvitacion(token);
  if (!inv) return { message: "La invitación no es válida o ha caducado." };

  const parsed = altaSchema.safeParse({
    nombre: formData.get("nombre"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const existe = await prisma.user.findUnique({ where: { email: inv.email } });
  if (existe) {
    return {
      message: "Ya hay una cuenta con ese email. Entra con ella para aceptar.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: { nombre: parsed.data.nombre, email: inv.email, passwordHash },
  });

  const res = await aceptarInvitacion(token, user.id);
  if (!res.ok) return { message: res.error };

  const esInquilino = inv.rol === "INQUILINO";
  await createSession(user.id, esInquilino ? null : res.familiaId);
  redirect(esInquilino ? "/portal" : "/dashboard");
}

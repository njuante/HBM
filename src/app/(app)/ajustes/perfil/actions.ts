"use server";

import { revalidatePath } from "next/cache";
import { verifySession, getCurrentUser } from "@/server/auth/dal";
import {
  actualizarPerfil,
  cambiarPassword,
  cerrarSesion,
} from "@/server/db/usuarios";
import { perfilSchema, cambioPasswordSchema } from "@/lib/validation/auth";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";

export async function actualizarPerfilAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();

  const parsed = perfilSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await actualizarPerfil(user.id, parsed.data);
  if (!res.ok) return { message: res.error };

  revalidatePath("/ajustes/perfil");
  revalidatePath("/", "layout");
  return { ok: true, message: "Perfil actualizado." };
}

export async function cambiarPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();

  const parsed = cambioPasswordSchema.safeParse({
    actual: formData.get("actual"),
    nueva: formData.get("nueva"),
    repetir: formData.get("repetir"),
  });
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await cambiarPassword(
    session.userId,
    session.sessionId,
    parsed.data.actual,
    parsed.data.nueva,
  );
  if (!res.ok) return { message: res.error };

  revalidatePath("/ajustes/perfil");
  return {
    ok: true,
    message: "Contraseña cambiada. Se han cerrado las demás sesiones.",
  };
}

export async function cerrarSesionAction(formData: FormData): Promise<void> {
  const session = await verifySession();
  await cerrarSesion(session.userId, String(formData.get("id") ?? ""));
  revalidatePath("/ajustes/perfil");
}

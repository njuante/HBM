"use server";

import { revalidatePath } from "next/cache";
import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import {
  cambiarRol,
  eliminarMiembro,
  renombrarFamilia,
} from "@/server/db/familia";
import { crearInvitacion, revocarInvitacion } from "@/server/db/invitaciones";
import { abandonarFamilia } from "@/server/db/usuarios";
import { miembroSchema, renombrarFamiliaSchema } from "@/lib/validation/familia";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";
import { Rol } from "@/generated/prisma/enums";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function cambiarRolAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (ctx.rol !== "OWNER") return; // solo OWNER cambia roles
  const membershipId = String(formData.get("membershipId") ?? "");
  const rol = String(formData.get("rol") ?? "");
  if (!["OWNER", "ADMIN", "MEMBER"].includes(rol)) return;
  await cambiarRol(ctx.familiaId, membershipId, rol as Rol);
  revalidatePath("/familia");
}

export async function eliminarMiembroAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (ctx.rol !== "OWNER") return; // solo OWNER elimina miembros
  const membershipId = String(formData.get("membershipId") ?? "");
  await eliminarMiembro(ctx.familiaId, membershipId);
  revalidatePath("/familia");
}

export async function renombrarFamiliaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) {
    return { message: "No tienes permiso para editar la familia." };
  }
  const parsed = renombrarFamiliaSchema.safeParse({
    nombre: formData.get("nombre"),
  });
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };
  await renombrarFamilia(ctx.familiaId, parsed.data.nombre);
  revalidatePath("/familia");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Crea una invitación y devuelve el enlace **una sola vez**: en la base de
 * datos solo queda el hash del token, así que no se puede volver a construir.
 * Si se pierde, se revoca y se invita de nuevo.
 */
export async function invitarAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();

  const parsed = miembroSchema.safeParse({
    email: formData.get("email"),
    rol: formData.get("rol") || "MEMBER",
  });
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await crearInvitacion(ctx.familiaId, ctx.userId, ctx.rol, {
    email: parsed.data.email,
    rol: parsed.data.rol as Rol,
  });
  if (!res.ok) return { message: res.error };

  // El enlace se arma con el host de la petición: la app es self-hosted y no
  // conoce su propia URL pública de antemano.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";

  revalidatePath("/familia");
  return { ok: true, valor: `${proto}://${host}/invitacion/${res.token}` };
}

export async function revocarInvitacionAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  await revocarInvitacion(ctx.familiaId, String(formData.get("id") ?? ""));
  revalidatePath("/familia");
}

export async function abandonarFamiliaAction(): Promise<void> {
  const ctx = await requireFamilia();
  const res = await abandonarFamilia(ctx.familiaId, ctx.userId);
  if (!res.ok) return;
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

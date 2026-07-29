"use server";

import { revalidatePath } from "next/cache";
import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import { crearCasa, actualizarCasa, eliminarCasa } from "@/server/db/casas";
import { casaSchema } from "@/lib/validation/casa";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";

const SIN_PERMISO = "No tienes permiso para gestionar las casas.";

export async function crearCasaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const parsed = casaSchema.safeParse({
    nombre: formData.get("nombre"),
    direccion: formData.get("direccion"),
  });
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  await crearCasa(ctx.familiaId, parsed.data);
  revalidatePath("/casas");
  return { ok: true };
}

export async function actualizarCasaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const id = String(formData.get("id") ?? "");
  const parsed = casaSchema.safeParse({
    nombre: formData.get("nombre"),
    direccion: formData.get("direccion"),
  });
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const ok = await actualizarCasa(ctx.familiaId, id, parsed.data);
  if (!ok) return { message: "No se encontró la casa." };
  revalidatePath("/casas");
  return { ok: true };
}

export async function eliminarCasaAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  const id = String(formData.get("id") ?? "");
  await eliminarCasa(ctx.familiaId, id);
  revalidatePath("/casas");
}

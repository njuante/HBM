"use server";

import { revalidatePath } from "next/cache";
import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import {
  crearPresupuesto,
  actualizarPresupuesto,
  eliminarPresupuesto,
  cambiarActivoPresupuesto,
} from "@/server/db/presupuestos";
import { presupuestoSchema } from "@/lib/validation/presupuesto";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";

const SIN_PERMISO = "No tienes permiso para gestionar los presupuestos.";

function parsePresupuesto(formData: FormData) {
  return presupuestoSchema.safeParse({
    categoriaId: formData.get("categoriaId"),
    casaId: formData.get("casaId"),
    importe: formData.get("importe"),
    periodo: formData.get("periodo"),
    desde: formData.get("desde"),
    hasta: formData.get("hasta"),
  });
}

export async function crearPresupuestoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const parsed = parsePresupuesto(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await crearPresupuesto(ctx.familiaId, parsed.data);
  if (!res.ok) return { message: res.error };
  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function actualizarPresupuestoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const id = String(formData.get("id") ?? "");
  const parsed = parsePresupuesto(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await actualizarPresupuesto(ctx.familiaId, id, parsed.data);
  if (!res.ok) return { message: res.error };
  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cambiarActivoPresupuestoAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  const id = String(formData.get("id") ?? "");
  await cambiarActivoPresupuesto(ctx.familiaId, id, formData.get("activo") === "on");
  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
}

export async function eliminarPresupuestoAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  const id = String(formData.get("id") ?? "");
  await eliminarPresupuesto(ctx.familiaId, id);
  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
}

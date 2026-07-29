"use server";

import { revalidatePath } from "next/cache";
import { requireFamilia, autorRequerido } from "@/server/auth/dal";
import {
  crearIngreso,
  actualizarIngreso,
  eliminarIngreso,
  getIngreso,
} from "@/server/db/ingresos";
import { ingresoSchema } from "@/lib/validation/ingreso";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";

const SIN_PERMISO = "Solo puedes editar los ingresos que has apuntado tú.";

function parseIngreso(formData: FormData) {
  return ingresoSchema.safeParse({
    casaId: formData.get("casaId"),
    categoriaId: formData.get("categoriaId"),
    importe: formData.get("importe"),
    fecha: formData.get("fecha"),
    concepto: formData.get("concepto"),
    fuente: formData.get("fuente"),
    recurrente: formData.get("recurrente"),
  });
}

export async function crearIngresoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  const parsed = parseIngreso(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await crearIngreso(ctx.familiaId, ctx.userId, parsed.data);
  if (!res.ok) return { message: res.error };
  revalidatePath("/ingresos");
  return { ok: true };
}

export async function actualizarIngresoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  const id = String(formData.get("id") ?? "");
  const parsed = parseIngreso(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  // Chequeo previo solo para dar un mensaje útil; quien manda es el `autorId`
  // que se pasa a la capa de datos.
  const autorId = autorRequerido(ctx);
  if (autorId) {
    const actual = await getIngreso(ctx.familiaId, id);
    if (actual && actual.usuarioId !== autorId) return { message: SIN_PERMISO };
  }

  const res = await actualizarIngreso(ctx.familiaId, id, parsed.data, autorId);
  if (!res.ok) return { message: res.error };
  revalidatePath("/ingresos");
  return { ok: true };
}

export async function eliminarIngresoAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  const id = String(formData.get("id") ?? "");
  await eliminarIngreso(ctx.familiaId, id, autorRequerido(ctx));
  revalidatePath("/ingresos");
}

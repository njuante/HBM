"use server";

import { revalidatePath } from "next/cache";
import { requireFamilia, autorRequerido } from "@/server/auth/dal";
import {
  crearGasto,
  actualizarGasto,
  eliminarGasto,
  getGasto,
} from "@/server/db/gastos";
import { gastoSchema } from "@/lib/validation/gasto";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";

const SIN_PERMISO = "Solo puedes editar los gastos que has apuntado tú.";

function parseGasto(formData: FormData) {
  return gastoSchema.safeParse({
    casaId: formData.get("casaId"),
    categoriaId: formData.get("categoriaId"),
    subcategoriaId: formData.get("subcategoriaId"),
    importe: formData.get("importe"),
    fecha: formData.get("fecha"),
    concepto: formData.get("concepto"),
    emisor: formData.get("emisor"),
    metodoPago: formData.get("metodoPago"),
    recurrente: formData.get("recurrente"),
  });
}

export async function crearGastoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  const parsed = parseGasto(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await crearGasto(ctx.familiaId, ctx.userId, parsed.data);
  if (!res.ok) return { message: res.error };
  revalidatePath("/gastos");
  return { ok: true };
}

export async function actualizarGastoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  const id = String(formData.get("id") ?? "");
  const parsed = parseGasto(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  // Chequeo previo solo para dar un mensaje útil; quien manda es el `autorId`
  // que se pasa a la capa de datos.
  const autorId = autorRequerido(ctx);
  if (autorId) {
    const actual = await getGasto(ctx.familiaId, id);
    if (actual && actual.usuarioId !== autorId) return { message: SIN_PERMISO };
  }

  const res = await actualizarGasto(ctx.familiaId, id, parsed.data, autorId);
  if (!res.ok) return { message: res.error };
  revalidatePath("/gastos");
  return { ok: true };
}

export async function eliminarGastoAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  const id = String(formData.get("id") ?? "");
  await eliminarGasto(ctx.familiaId, id, autorRequerido(ctx));
  revalidatePath("/gastos");
}

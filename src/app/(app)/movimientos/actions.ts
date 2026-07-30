"use server";

import { revalidatePath } from "next/cache";
import { requireFamilia, autorRequerido } from "@/server/auth/dal";
import {
  crearGasto,
  crearGastoProrrateado,
  actualizarGasto,
  eliminarGasto,
  getGasto,
} from "@/server/db/gastos";
import {
  crearIngreso,
  actualizarIngreso,
  eliminarIngreso,
  getIngreso,
} from "@/server/db/ingresos";
import { gastoSchema } from "@/lib/validation/gasto";
import { ingresoSchema } from "@/lib/validation/ingreso";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";

const SIN_PERMISO = "Solo puedes editar los movimientos que has apuntado tú.";

/**
 * Un solo juego de acciones para el visor unificado: el tipo viaja en el propio
 * formulario y aquí se reparte a la tabla que toca. Las dos capas de datos
 * siguen siendo independientes; lo único que se comparte es la puerta.
 */
function esGasto(formData: FormData): boolean {
  return formData.get("tipo") !== "INGRESO";
}

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

function revalidar() {
  revalidatePath("/movimientos");
  revalidatePath("/dashboard");
}

export async function crearMovimientoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();

  if (esGasto(formData)) {
    const parsed = parseGasto(formData);
    if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };
    const mesesProrrateo = Number(formData.get("mesesProrrateo") ?? 1);
    const res = await crearGastoProrrateado(ctx.familiaId, ctx.userId, parsed.data, mesesProrrateo);
    if (!res.ok) return { message: res.error };
  } else {
    const parsed = parseIngreso(formData);
    if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };
    const res = await crearIngreso(ctx.familiaId, ctx.userId, parsed.data);
    if (!res.ok) return { message: res.error };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarMovimientoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  const id = String(formData.get("id") ?? "");
  const autorId = autorRequerido(ctx);
  const gasto = esGasto(formData);

  // Chequeo previo solo para dar un mensaje útil; quien manda es el `autorId`
  // que se pasa a la capa de datos.
  if (autorId) {
    const actual = gasto
      ? await getGasto(ctx.familiaId, id)
      : await getIngreso(ctx.familiaId, id);
    if (actual && actual.usuarioId !== autorId) return { message: SIN_PERMISO };
  }

  if (gasto) {
    const parsed = parseGasto(formData);
    if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };
    const res = await actualizarGasto(ctx.familiaId, id, parsed.data, autorId);
    if (!res.ok) return { message: res.error };
  } else {
    const parsed = parseIngreso(formData);
    if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };
    const res = await actualizarIngreso(ctx.familiaId, id, parsed.data, autorId);
    if (!res.ok) return { message: res.error };
  }

  revalidar();
  return { ok: true };
}

export async function eliminarMovimientoAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  const id = String(formData.get("id") ?? "");
  const autorId = autorRequerido(ctx);

  if (esGasto(formData)) await eliminarGasto(ctx.familiaId, id, autorId);
  else await eliminarIngreso(ctx.familiaId, id, autorId);

  revalidar();
}

import { importarMovimientosBatch, type ElementoImportacion } from "@/server/db/importador";

export async function importarMovimientosAction(items: ElementoImportacion[]) {
  const ctx = await requireFamilia();
  const res = await importarMovimientosBatch(ctx.familiaId, ctx.userId, items);
  if (res.ok) {
    revalidar();
  }
  return res;
}

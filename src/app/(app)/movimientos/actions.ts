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
import { cambiarCategoriaMovimiento } from "@/server/db/movimientos";
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

/**
 * Recategoriza de un toque desde la lista, sin abrir el formulario completo.
 *
 * Devuelve el error en vez de lanzarlo: quien llama pinta el cambio antes de
 * que llegue la respuesta y necesita saber si tiene que echarlo atrás.
 */
export async function cambiarCategoriaAction(input: {
  id: string;
  tipo: "GASTO" | "INGRESO";
  categoriaId: string;
  subcategoriaId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireFamilia();
  const autorId = autorRequerido(ctx);

  const res = await cambiarCategoriaMovimiento(
    ctx.familiaId,
    input.id,
    input.tipo,
    input.categoriaId,
    input.subcategoriaId,
    autorId,
  );

  if (!res.ok) {
    // El único motivo por el que un MEMBER no encuentra el movimiento es que
    // no sea suyo; decirlo así ahorra buscar un fallo que no existe.
    if (autorId && res.error === "Movimiento no encontrado.") {
      return { ok: false, error: SIN_PERMISO };
    }
    return { ok: false, error: res.error };
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

import {
  importarMovimientosBatch,
  planificarImportacion,
  type ElementoImportacion,
} from "@/server/db/importador";
import type { ApunteExtracto } from "@/lib/importacion/huella";

export async function importarMovimientosAction(items: ElementoImportacion[]) {
  const ctx = await requireFamilia();
  const res = await importarMovimientosBatch(ctx.familiaId, ctx.userId, items);
  if (res.ok) {
    revalidar();
  }
  return res;
}

/**
 * Marca, para el extracto recién leído, qué apuntes ya se importaron.
 *
 * La huella se calcula aquí y no en el navegador: es lo que decide si algo se
 * duplica, así que no puede venir del cliente.
 */
export async function comprobarImportadosAction(
  apuntes: ApunteExtracto[],
): Promise<boolean[]> {
  const ctx = await requireFamilia();
  const plan = await planificarImportacion(ctx.familiaId, apuntes);
  return plan.map((p) => p.yaImportado);
}

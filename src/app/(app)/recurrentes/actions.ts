"use server";

import { revalidatePath } from "next/cache";
import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import {
  crearRecurrencia,
  actualizarRecurrencia,
  eliminarRecurrencia,
  cambiarActivaRecurrencia,
  confirmarPropuesta,
  descartarPropuesta,
} from "@/server/db/recurrencias";
import { recurrenciaSchema } from "@/lib/validation/recurrencia";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";

const SIN_PERMISO = "No tienes permiso para gestionar las recurrencias.";

function parseRecurrencia(formData: FormData) {
  return recurrenciaSchema.safeParse({
    tipo: formData.get("tipo"),
    casaId: formData.get("casaId"),
    categoriaId: formData.get("categoriaId"),
    subcategoriaId: formData.get("subcategoriaId"),
    importe: formData.get("importe"),
    concepto: formData.get("concepto"),
    contraparte: formData.get("contraparte"),
    metodoPago: formData.get("metodoPago"),
    frecuencia: formData.get("frecuencia"),
    intervalo: formData.get("intervalo"),
    diaMes: formData.get("diaMes"),
    proximaFecha: formData.get("proximaFecha"),
    fin: formData.get("fin"),
    automatica: formData.get("automatica"),
  });
}

function revalidar() {
  revalidatePath("/recurrentes");
  revalidatePath("/dashboard");
  revalidatePath("/gastos");
  revalidatePath("/ingresos");
}

export async function crearRecurrenciaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const parsed = parseRecurrencia(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await crearRecurrencia(ctx.familiaId, ctx.userId, parsed.data);
  if (!res.ok) return { message: res.error };
  revalidar();
  return { ok: true };
}

export async function actualizarRecurrenciaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const id = String(formData.get("id") ?? "");
  const parsed = parseRecurrencia(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await actualizarRecurrencia(ctx.familiaId, id, parsed.data);
  if (!res.ok) return { message: res.error };
  revalidar();
  return { ok: true };
}

export async function cambiarActivaAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  const id = String(formData.get("id") ?? "");
  await cambiarActivaRecurrencia(ctx.familiaId, id, formData.get("activa") === "on");
  revalidar();
}

export async function eliminarRecurrenciaAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  const id = String(formData.get("id") ?? "");
  await eliminarRecurrencia(ctx.familiaId, id);
  revalidar();
}

/** Confirmar y descartar los abre cualquier miembro: es su bandeja de entrada. */
export async function confirmarPropuestaAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  const id = String(formData.get("id") ?? "");
  await confirmarPropuesta(ctx.familiaId, id);
  revalidar();
}

export async function descartarPropuestaAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  const id = String(formData.get("id") ?? "");
  await descartarPropuesta(ctx.familiaId, id);
  revalidar();
}

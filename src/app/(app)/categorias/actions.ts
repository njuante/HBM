"use server";

import { revalidatePath } from "next/cache";
import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import {
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
} from "@/server/db/categorias";
import { categoriaSchema } from "@/lib/validation/categoria";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";

const SIN_PERMISO = "No tienes permiso para gestionar las categorías.";

export async function crearCategoriaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const parsed = categoriaSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
    color: formData.get("color") || "#64748b",
    icono: formData.get("icono"),
    parentId: formData.get("parentId"),
  });
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await crearCategoria(ctx.familiaId, parsed.data);
  if (!res.ok) return { message: res.error };
  revalidatePath("/categorias");
  return { ok: true };
}

export async function actualizarCategoriaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const id = String(formData.get("id") ?? "");
  const parsed = categoriaSchema
    .pick({ nombre: true, color: true, icono: true })
    .safeParse({
      nombre: formData.get("nombre"),
      color: formData.get("color") || "#64748b",
      icono: formData.get("icono"),
    });
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const ok = await actualizarCategoria(ctx.familiaId, id, parsed.data);
  if (!ok) return { message: "No se encontró la categoría." };
  revalidatePath("/categorias");
  return { ok: true };
}

export async function eliminarCategoriaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };
  const id = String(formData.get("id") ?? "");
  const res = await eliminarCategoria(ctx.familiaId, id);
  if (!res.ok) return { message: res.error };
  revalidatePath("/categorias");
  return { ok: true };
}

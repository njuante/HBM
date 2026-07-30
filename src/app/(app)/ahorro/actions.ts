"use server";

import { revalidatePath } from "next/cache";
import { requireFamilia } from "@/server/auth/dal";
import {
  crearMetaAhorro,
  aportarAMetaAhorro,
  eliminarMetaAhorro,
} from "@/server/db/ahorro";

function revalidar() {
  revalidatePath("/ahorro");
  revalidatePath("/dashboard");
}

export async function crearMetaAction(formData: FormData) {
  const ctx = await requireFamilia();

  const nombre = String(formData.get("nombre") ?? "");
  const concepto = String(formData.get("concepto") ?? "");
  const objetivoImporte = Number(formData.get("objetivoImporte") ?? 0);
  const fechaStr = String(formData.get("fechaObjetivo") ?? "");
  const color = String(formData.get("color") ?? "#3b82f6");
  const icono = String(formData.get("icono") ?? "piggy-bank");

  const fechaObjetivo = fechaStr ? new Date(fechaStr) : null;

  const res = await crearMetaAhorro(ctx.familiaId, {
    nombre,
    concepto,
    objetivoImporte,
    fechaObjetivo,
    color,
    icono,
  });

  if (res.ok) {
    revalidar();
  }

  return res;
}

export async function aportarMetaAction(metaId: string, importe: number, notas?: string) {
  const ctx = await requireFamilia();

  const res = await aportarAMetaAhorro(
    ctx.familiaId,
    ctx.userId,
    metaId,
    importe,
    notas,
  );

  if (res.ok) {
    revalidar();
  }

  return res;
}

export async function eliminarMetaAction(id: string) {
  const ctx = await requireFamilia();
  const ok = await eliminarMetaAhorro(ctx.familiaId, id);
  if (ok) {
    revalidar();
  }
  return ok;
}

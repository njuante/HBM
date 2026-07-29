"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import {
  crearFactura,
  actualizarFacturaMeta,
  cambiarEstadoPago,
  eliminarFactura,
} from "@/server/db/facturas";
import { compartirFactura } from "@/server/db/alquileres";
import { fileStorage } from "@/server/storage";
import {
  facturaMetaSchema,
  MAX_ARCHIVO_BYTES,
  TIPOS_PERMITIDOS,
} from "@/lib/validation/factura";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";

function parseMeta(formData: FormData) {
  return facturaMetaSchema.safeParse({
    casaId: formData.get("casaId"),
    gastoId: formData.get("gastoId"),
    emisor: formData.get("emisor"),
    numeroFactura: formData.get("numeroFactura"),
    fechaEmision: formData.get("fechaEmision"),
    fechaVencimiento: formData.get("fechaVencimiento"),
    estadoPago: formData.get("estadoPago"),
    consumo: formData.get("consumo"),
    periodo: formData.get("periodo"),
  });
}

function sanitizeNombre(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "archivo";
}

export async function crearFacturaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();

  const parsed = parseMeta(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { message: "Adjunta un archivo (PDF o imagen)." };
  }
  if (archivo.size > MAX_ARCHIVO_BYTES) {
    return { message: "El archivo supera el tamaño máximo (10 MB)." };
  }
  const tipo = TIPOS_PERMITIDOS[archivo.type];
  if (!tipo) {
    return { message: "Formato no admitido. Usa PDF o imagen (JPG, PNG, WebP)." };
  }

  const nombre = sanitizeNombre(archivo.name);
  const relPath = `facturas/${ctx.familiaId}/${randomBytes(8).toString("hex")}-${nombre}`;
  const buffer = Buffer.from(await archivo.arrayBuffer());
  await fileStorage.save(relPath, buffer);

  const res = await crearFactura(ctx.familiaId, parsed.data, {
    path: relPath,
    nombre,
    tipo,
  });
  if (!res.ok) {
    await fileStorage.remove(relPath); // rollback del archivo
    return { message: res.error };
  }

  revalidatePath("/facturas");
  return { ok: true };
}

export async function actualizarFacturaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  const id = String(formData.get("id") ?? "");
  const parsed = parseMeta(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await actualizarFacturaMeta(ctx.familiaId, id, parsed.data);
  if (!res.ok) return { message: res.error };
  revalidatePath("/facturas");
  return { ok: true };
}

export async function cambiarEstadoPagoAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  const id = String(formData.get("id") ?? "");
  const pagada = formData.get("pagada") === "on";
  await cambiarEstadoPago(ctx.familiaId, id, pagada ? "PAGADA" : "PENDIENTE");
  revalidatePath("/facturas");
  revalidatePath("/dashboard");
}

/**
 * Cualquier miembro sube facturas y cambia su estado de pago, pero borrar el
 * archivo es irreversible y queda reservado a OWNER/ADMIN.
 */
export async function eliminarFacturaAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  const id = String(formData.get("id") ?? "");
  const path = await eliminarFactura(ctx.familiaId, id);
  if (path) await fileStorage.remove(path);
  revalidatePath("/facturas");
}

/**
 * Comparte (o deja de compartir) la factura con el inquilino de su casa.
 * Es lo único del expediente de la familia que sale del tenant, así que va
 * explícito y por acción propia, no como efecto secundario de otra cosa.
 */
export async function compartirFacturaAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  await compartirFactura(
    ctx.familiaId,
    String(formData.get("id") ?? ""),
    formData.get("compartir") === "on",
  );
  revalidatePath("/facturas");
  revalidatePath("/alquileres");
}

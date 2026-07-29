"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import {
  activarAlquileres,
  actualizarContrato,
  cerrarContrato,
  crearContrato,
  eliminarContrato,
  enlazarRecurrencia,
  getContrato,
  marcarCasaEnAlquiler,
} from "@/server/db/alquileres";
import { crearInvitacion, revocarInvitacion } from "@/server/db/invitaciones";
import { crearRecurrencia } from "@/server/db/recurrencias";
import { listCategorias } from "@/server/db/categorias";
import { contratoSchema } from "@/lib/validation/alquiler";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";
import { Rol, TipoCategoria } from "@/generated/prisma/enums";
import { decimalToNumber } from "@/lib/money";

const SIN_PERMISO = "No tienes permiso para gestionar los alquileres.";

function revalidar() {
  revalidatePath("/alquileres");
  revalidatePath("/casas");
  revalidatePath("/facturas");
  revalidatePath("/", "layout");
}

function parseContrato(formData: FormData) {
  return contratoSchema.safeParse({
    casaId: formData.get("casaId"),
    inquilinoNombre: formData.get("inquilinoNombre"),
    inquilinoEmail: formData.get("inquilinoEmail"),
    inicio: formData.get("inicio"),
    fin: formData.get("fin"),
    rentaMensual: formData.get("rentaMensual"),
    fianza: formData.get("fianza"),
    diaCobro: formData.get("diaCobro"),
    notas: formData.get("notas"),
  });
}

export async function activarAlquileresAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (ctx.rol !== "OWNER") return; // encender un módulo es cosa del propietario
  await activarAlquileres(ctx.familiaId, formData.get("activo") === "on");
  revalidar();
}

export async function marcarEnAlquilerAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  await marcarCasaEnAlquiler(
    ctx.familiaId,
    String(formData.get("id") ?? ""),
    formData.get("enAlquiler") === "on",
  );
  revalidar();
}

export async function crearContratoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const parsed = parseContrato(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await crearContrato(ctx.familiaId, parsed.data);
  if (!res.ok) return { message: res.error };

  // La renta es un ingreso que se repite: se crea la recurrencia con el
  // contrato, que es cuando el usuario tiene los datos delante.
  if (formData.get("crearRecurrencia") === "on") {
    await crearRentaRecurrente(ctx.familiaId, ctx.userId, res.id);
  }

  revalidar();
  return { ok: true };
}

export async function actualizarContratoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const id = String(formData.get("id") ?? "");
  const parsed = parseContrato(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const res = await actualizarContrato(ctx.familiaId, id, parsed.data);
  if (!res.ok) return { message: res.error };
  revalidar();
  return { ok: true };
}

export async function cerrarContratoAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  await cerrarContrato(ctx.familiaId, String(formData.get("id") ?? ""));
  revalidar();
}

export async function eliminarContratoAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  await eliminarContrato(ctx.familiaId, String(formData.get("id") ?? ""));
  revalidar();
}

/** Invita al inquilino del contrato al portal de su casa. */
export async function invitarInquilinoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return { message: SIN_PERMISO };

  const contrato = await getContrato(
    ctx.familiaId,
    String(formData.get("id") ?? ""),
  );
  if (!contrato) return { message: "Contrato no encontrado." };

  const res = await crearInvitacion(ctx.familiaId, ctx.userId, ctx.rol, {
    email: contrato.inquilinoEmail,
    rol: Rol.INQUILINO,
    casaId: contrato.casaId,
  });
  if (!res.ok) return { message: res.error };

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";

  revalidar();
  return { ok: true, valor: `${proto}://${host}/invitacion/${res.token}` };
}

export async function revocarAccesoAction(formData: FormData): Promise<void> {
  const ctx = await requireFamilia();
  if (!puedeGestionar(ctx)) return;
  await revocarInvitacion(ctx.familiaId, String(formData.get("id") ?? ""));
  revalidar();
}

/**
 * Crea el ingreso recurrente de la renta y lo enlaza al contrato. Usa la
 * categoría de ingreso «Alquiler» si existe; si no, la primera disponible.
 */
async function crearRentaRecurrente(
  familiaId: string,
  usuarioId: string,
  contratoId: string,
): Promise<void> {
  const contrato = await getContrato(familiaId, contratoId);
  if (!contrato) return;

  const categorias = await listCategorias(familiaId, TipoCategoria.INGRESO);
  const categoria =
    categorias.find((c) => c.nombre.toLowerCase().includes("alquiler")) ??
    categorias[0];
  if (!categoria) return;

  // El primer cobro es el día pactado del mes en que empieza el contrato.
  const primera = new Date(
    contrato.inicio.getFullYear(),
    contrato.inicio.getMonth(),
    contrato.diaCobro,
  );
  if (primera < contrato.inicio) primera.setMonth(primera.getMonth() + 1);

  const rec = await crearRecurrencia(familiaId, usuarioId, {
    tipo: "INGRESO",
    casaId: contrato.casaId,
    categoriaId: categoria.id,
    importe: decimalToNumber(contrato.rentaMensual),
    concepto: `Alquiler · ${contrato.inquilinoNombre}`,
    contraparte: contrato.inquilinoNombre,
    frecuencia: "MENSUAL",
    intervalo: 1,
    diaMes: contrato.diaCobro,
    proximaFecha: primera,
    fin: contrato.fin ?? undefined,
    automatica: true,
  });

  if (rec.ok) await enlazarRecurrencia(familiaId, contratoId, rec.id);
}

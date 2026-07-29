"use server";

import { revalidatePath } from "next/cache";
import { requireInquilino } from "@/server/auth/dal";
import { declararPago } from "@/server/db/portal";

/**
 * El inquilino declara que ha pagado una factura.
 *
 * `requireInquilino()` es quien fija familia y casa: el formulario solo aporta
 * el id de la factura, y la comprobación de que esa factura es suya y está
 * compartida vive en `declararPago`.
 */
export async function declararPagoAction(formData: FormData): Promise<void> {
  const ctx = await requireInquilino();
  await declararPago(
    ctx.familiaId,
    ctx.casaId,
    String(formData.get("id") ?? ""),
  );
  revalidatePath("/portal");
}

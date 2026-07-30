"use server";

import { requireFamilia } from "@/server/auth/dal";
import { buscarGlobal, type Resultado } from "@/server/db/busqueda";

/** Puerta de la búsqueda de la paleta. La familia sale de la sesión, nunca del cliente. */
export async function buscarAction(q: string): Promise<Resultado[]> {
  const ctx = await requireFamilia();
  return buscarGlobal(ctx.familiaId, q);
}

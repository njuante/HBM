import { redirect } from "next/navigation";
import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import { listContratos } from "@/server/db/alquileres";
import { listCasas } from "@/server/db/casas";
import { AlquileresClient } from "./alquileres-client";

export default async function AlquileresPage() {
  const ctx = await requireFamilia();

  // El módulo es opcional: si está apagado, la ruta no existe para esta familia.
  if (!ctx.alquileresActivo) redirect("/familia");

  const [contratos, casas] = await Promise.all([
    listContratos(ctx.familiaId),
    listCasas(ctx.familiaId),
  ]);

  return (
    <AlquileresClient
        contratos={contratos}
        casas={casas.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          enAlquiler: c.enAlquiler,
        }))}
        puedeGestionar={puedeGestionar(ctx)}
      />
  );
}

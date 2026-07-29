import { redirect } from "next/navigation";
import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import { listContratos } from "@/server/db/alquileres";
import { listCasas } from "@/server/db/casas";
import { PageHeader } from "@/components/page-header";
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
    <div>
      <PageHeader
        title="Alquileres"
        description="Contratos, rentas y lo que compartes con cada inquilino."
      />
      <AlquileresClient
        contratos={contratos}
        casas={casas.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          enAlquiler: c.enAlquiler,
        }))}
        puedeGestionar={puedeGestionar(ctx)}
      />
    </div>
  );
}

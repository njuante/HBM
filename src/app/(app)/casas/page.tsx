import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import { listCasas } from "@/server/db/casas";
import { CasasClient, type CasaDTO } from "./casas-client";

export default async function CasasPage() {
  const ctx = await requireFamilia();
  const casas = await listCasas(ctx.familiaId);

  const dto: CasaDTO[] = casas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    direccion: c.direccion,
    enAlquiler: c.enAlquiler,
    movimientos: c._count.gastos + c._count.ingresos + c._count.facturas,
  }));

  return (
    <CasasClient
        casas={dto}
        puedeGestionar={puedeGestionar(ctx)}
        alquileresActivo={ctx.alquileresActivo}
      />
  );
}

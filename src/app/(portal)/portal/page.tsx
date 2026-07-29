import { requireInquilino } from "@/server/auth/dal";
import { contratoDelInquilino, facturasCompartidas } from "@/server/db/portal";
import { PageHeader } from "@/components/page-header";
import { PortalClient } from "./portal-client";

export default async function PortalPage() {
  const ctx = await requireInquilino();

  const [contrato, facturas] = await Promise.all([
    contratoDelInquilino(ctx.familiaId, ctx.casaId),
    facturasCompartidas(ctx.familiaId, ctx.casaId),
  ]);

  return (
    <div>
      <PageHeader
        title={ctx.casa.nombre}
        description={
          ctx.casa.direccion ?? "Tus facturas y las condiciones de tu alquiler."
        }
      />
      <PortalClient contrato={contrato} facturas={facturas} />
    </div>
  );
}

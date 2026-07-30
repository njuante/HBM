import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import { listFacturas, gastosSinFactura } from "@/server/db/facturas";
import { listCasas } from "@/server/db/casas";
import { facturaFiltrosSchema, parseDatosExtra } from "@/lib/validation/factura";
import { formatFecha } from "@/lib/format";
import { FacturasClient, type FacturaItem } from "./facturas-client";

export default async function FacturasPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireFamilia();
  const sp = await props.searchParams;

  const filtros = facturaFiltrosSchema.parse({
    estadoPago: sp.estadoPago,
    texto: sp.texto,
  });

  const [facturas, casas, gastos] = await Promise.all([
    listFacturas(ctx.familiaId, filtros),
    listCasas(ctx.familiaId),
    gastosSinFactura(ctx.familiaId),
  ]);

  const items: FacturaItem[] = facturas.map((f) => {
    const extra = parseDatosExtra(f.datosExtra);
    return {
      id: f.id,
      emisor: f.emisor,
      numeroFactura: f.numeroFactura,
      fechaEmision: f.fechaEmision ? f.fechaEmision.toISOString() : null,
      fechaVencimiento: f.fechaVencimiento ? f.fechaVencimiento.toISOString() : null,
      estadoPago: f.estadoPago,
      importe: f.importe ? Number(f.importe) : null,
      archivoTipo: f.archivoTipo,
      casa: f.casa,
      gasto: f.gasto,
      compartida: f.compartidaAt !== null,
      pagoDeclarado: f.pagoDeclaradoAt !== null,
      casaEnAlquiler: f.casa?.enAlquiler ?? false,
      consumo: extra.consumo ?? null,
      periodo: extra.periodo ?? null,
    };
  });

  return (
    <FacturasClient
        alquileresActivo={ctx.alquileresActivo}
        puedeGestionar={puedeGestionar(ctx)}
        items={items}
        casas={casas.map((c) => ({ id: c.id, nombre: c.nombre }))}
        gastosDisponibles={gastos.map((g) => ({
          id: g.id,
          nombre: `${formatFecha(g.fecha)} · ${g.concepto}`,
        }))}
        filtros={filtros}
      />
  );
}

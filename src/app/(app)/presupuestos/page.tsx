import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import {
  listPresupuestos,
  mediasPorCategoria,
  resumenPresupuestos,
} from "@/server/db/presupuestos";
import { listCategorias } from "@/server/db/categorias";
import { listCasas } from "@/server/db/casas";
import { TipoCategoria } from "@/generated/prisma/enums";
import { mesActual } from "@/lib/periodo";
import { PresupuestosClient } from "./presupuestos-client";

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function PresupuestosPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireFamilia();
  const sp = await props.searchParams;

  const pedido = typeof sp.mes === "string" && MES_RE.test(sp.mes) ? sp.mes : null;
  const mes = pedido ?? mesActual();

  const [items, resumen, categorias, casas, medias] = await Promise.all([
    listPresupuestos(ctx.familiaId, mes),
    resumenPresupuestos(ctx.familiaId, mes),
    listCategorias(ctx.familiaId, TipoCategoria.GASTO),
    listCasas(ctx.familiaId),
    mediasPorCategoria(ctx.familiaId, mes),
  ]);

  return (
    <PresupuestosClient
        mes={mes}
        items={items}
        limite={resumen.limite}
        gastado={resumen.gastado}
        categorias={categorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          color: c.color,
          icono: c.icono,
        }))}
        casas={casas.map((c) => ({ id: c.id, nombre: c.nombre }))}
        medias={medias}
        puedeGestionar={puedeGestionar(ctx)}
        abrirNuevo={sp.nuevo === "1"}
      />
  );
}

import { requireFamilia, autorRequerido } from "@/server/auth/dal";
import { listGastos, sugerenciasGasto } from "@/server/db/gastos";
import { listCasas } from "@/server/db/casas";
import { listCategorias } from "@/server/db/categorias";
import { listPresupuestos } from "@/server/db/presupuestos";
import { gastoFiltrosSchema } from "@/lib/validation/gasto";
import { TipoCategoria } from "@/generated/prisma/enums";
import { mesActual } from "@/lib/periodo";
import { PageHeader } from "@/components/page-header";
import { GastosClient } from "./gastos-client";

export default async function GastosPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireFamilia();
  const sp = await props.searchParams;

  const filtros = gastoFiltrosSchema.parse({
    casaId: sp.casaId,
    categoriaId: sp.categoriaId,
    desde: sp.desde,
    hasta: sp.hasta,
    texto: sp.texto,
  });

  const [{ items, total }, casas, categorias, sugerencias, presupuestos] =
    await Promise.all([
      listGastos(ctx.familiaId, filtros),
      listCasas(ctx.familiaId),
      listCategorias(ctx.familiaId, TipoCategoria.GASTO),
      sugerenciasGasto(ctx.familiaId),
      listPresupuestos(ctx.familiaId, mesActual()),
    ]);

  // Solo los mensuales por categoría: son los que tienen sentido enseñar
  // mientras se apunta un gasto concreto.
  const restantes = Object.fromEntries(
    presupuestos
      .filter((p) => p.periodo === "MENSUAL" && p.categoria)
      .map((p) => [p.categoria!.id, { restante: p.restante, importe: p.importe }]),
  );

  // Un MEMBER solo edita lo suyo; OWNER/ADMIN, todo (ver `autorRequerido`).
  const autorId = autorRequerido(ctx);

  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Todo lo que sale, con su categoría y su casa."
      />
      <GastosClient
        items={items.map((g) => ({
          ...g,
          fecha: g.fecha.toISOString(),
          puedeEditar: !autorId || g.usuarioId === autorId,
        }))}
        total={total}
        casas={casas.map((c) => ({ id: c.id, nombre: c.nombre }))}
        categorias={categorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          color: c.color,
          icono: c.icono,
          subcategorias: c.subcategorias.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            color: s.color,
            icono: s.icono,
          })),
        }))}
        sugerencias={sugerencias.map((s) => ({
          concepto: s.concepto,
          categoriaId: s.categoriaId,
          subcategoriaId: s.subcategoriaId,
          casaId: s.casaId,
          origen: s.emisor,
          metodoPago: s.metodoPago,
          importe: s.importe,
          veces: s.veces,
        }))}
        filtros={filtros}
        presupuestos={restantes}
      />
    </div>
  );
}

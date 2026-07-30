import { requireFamilia, autorRequerido } from "@/server/auth/dal";
import { listMovimientos } from "@/server/db/movimientos";
import { sugerenciasGasto } from "@/server/db/gastos";
import { sugerenciasIngreso } from "@/server/db/ingresos";
import { listCasas } from "@/server/db/casas";
import { listCategorias } from "@/server/db/categorias";
import { listPresupuestos } from "@/server/db/presupuestos";
import { movimientoFiltrosSchema } from "@/lib/validation/movimiento";
import { TipoCategoria } from "@/generated/prisma/enums";
import { mesActual } from "@/lib/periodo";
import { MovimientosClient } from "./movimientos-client";

export default async function MovimientosPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireFamilia();
  const sp = await props.searchParams;

  const filtros = movimientoFiltrosSchema.parse({
    tipo: sp.tipo,
    casaId: sp.casaId,
    categoriaId: sp.categoriaId,
    desde: sp.desde,
    hasta: sp.hasta,
    texto: sp.texto,
  });
  const pagina = Number(sp.pagina) > 0 ? Number(sp.pagina) : 1;
  const abrirNuevo = sp.nuevo === "1";

  const [
    { items, resumen, paginas },
    casas,
    catGasto,
    catIngreso,
    sugGasto,
    sugIngreso,
    presupuestos,
  ] = await Promise.all([
    listMovimientos(ctx.familiaId, filtros, {
      pagina,
      autorId: autorRequerido(ctx),
    }),
    listCasas(ctx.familiaId),
    listCategorias(ctx.familiaId, TipoCategoria.GASTO),
    listCategorias(ctx.familiaId, TipoCategoria.INGRESO),
    sugerenciasGasto(ctx.familiaId),
    sugerenciasIngreso(ctx.familiaId),
    listPresupuestos(ctx.familiaId, mesActual()),
  ]);

  const aChip = (c: (typeof catGasto)[number]) => ({
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
  });

  // Solo los mensuales por categoría: son los que tienen sentido enseñar
  // mientras se apunta un gasto concreto.
  const restantes = Object.fromEntries(
    presupuestos
      .filter((p) => p.periodo === "MENSUAL" && p.categoria)
      .map((p) => [p.categoria!.id, { restante: p.restante, importe: p.importe }]),
  );

  return (
    <MovimientosClient
      items={items}
      resumen={resumen}
      pagina={pagina}
      paginas={paginas}
      filtros={filtros}
      casas={casas.map((c) => ({ id: c.id, nombre: c.nombre }))}
      categoriasGasto={catGasto.map(aChip)}
      categoriasIngreso={catIngreso.map(aChip)}
      sugerenciasGasto={sugGasto.map((s) => ({
        concepto: s.concepto,
        categoriaId: s.categoriaId,
        subcategoriaId: s.subcategoriaId,
        casaId: s.casaId,
        origen: s.emisor,
        metodoPago: s.metodoPago,
        importe: s.importe,
        veces: s.veces,
      }))}
      sugerenciasIngreso={sugIngreso.map((s) => ({
        concepto: s.concepto,
        categoriaId: s.categoriaId,
        casaId: s.casaId,
        origen: s.fuente,
        importe: s.importe,
        veces: s.veces,
      }))}
      presupuestos={restantes}
      abrirNuevo={abrirNuevo}
    />
  );
}

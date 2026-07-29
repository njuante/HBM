import { requireFamilia, autorRequerido } from "@/server/auth/dal";
import { listIngresos, sugerenciasIngreso } from "@/server/db/ingresos";
import { listCasas } from "@/server/db/casas";
import { listCategorias } from "@/server/db/categorias";
import { ingresoFiltrosSchema } from "@/lib/validation/ingreso";
import { TipoCategoria } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/page-header";
import { IngresosClient } from "./ingresos-client";

export default async function IngresosPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireFamilia();
  const sp = await props.searchParams;

  const filtros = ingresoFiltrosSchema.parse({
    casaId: sp.casaId,
    categoriaId: sp.categoriaId,
    desde: sp.desde,
    hasta: sp.hasta,
    texto: sp.texto,
  });

  const [{ items, total }, casas, categorias, sugerencias] = await Promise.all([
    listIngresos(ctx.familiaId, filtros),
    listCasas(ctx.familiaId),
    listCategorias(ctx.familiaId, TipoCategoria.INGRESO),
    sugerenciasIngreso(ctx.familiaId),
  ]);

  // Un MEMBER solo edita lo suyo; OWNER/ADMIN, todo (ver `autorRequerido`).
  const autorId = autorRequerido(ctx);

  return (
    <div>
      <PageHeader
        title="Ingresos"
        description="Todo lo que entra, con su origen y su categoría."
      />
      <IngresosClient
        items={items.map((i) => ({
          ...i,
          fecha: i.fecha.toISOString(),
          puedeEditar: !autorId || i.usuarioId === autorId,
        }))}
        total={total}
        casas={casas.map((c) => ({ id: c.id, nombre: c.nombre }))}
        categorias={categorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          color: c.color,
          icono: c.icono,
        }))}
        sugerencias={sugerencias.map((s) => ({
          concepto: s.concepto,
          categoriaId: s.categoriaId,
          casaId: s.casaId,
          origen: s.fuente,
          importe: s.importe,
          veces: s.veces,
        }))}
        filtros={filtros}
      />
    </div>
  );
}

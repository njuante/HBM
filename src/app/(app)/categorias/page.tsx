import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import { listCategorias } from "@/server/db/categorias";
import { TipoCategoria } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/page-header";
import { CategoriasClient, type CategoriaNodo } from "./categorias-client";

type Raw = Awaited<ReturnType<typeof listCategorias>>[number];

function toNodo(c: Raw): CategoriaNodo {
  return {
    id: c.id,
    nombre: c.nombre,
    color: c.color,
    icono: c.icono,
    usos: c._count.gastosComoCategoria + c._count.ingresos,
    subcategorias: c.subcategorias.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      color: s.color,
      icono: s.icono,
      usos: s._count.gastosComoSubcategoria + s._count.ingresos,
    })),
  };
}

export default async function CategoriasPage() {
  const ctx = await requireFamilia();
  const [gastos, ingresos] = await Promise.all([
    listCategorias(ctx.familiaId, TipoCategoria.GASTO),
    listCategorias(ctx.familiaId, TipoCategoria.INGRESO),
  ]);

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Organiza y colorea las categorías de gastos e ingresos."
      />
      <CategoriasClient
        gastos={gastos.map(toNodo)}
        ingresos={ingresos.map(toNodo)}
        puedeGestionar={puedeGestionar(ctx)}
      />
    </div>
  );
}

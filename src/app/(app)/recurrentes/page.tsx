import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import {
  asegurarRecurrencias,
  listRecurrencias,
  listPropuestas,
} from "@/server/db/recurrencias";
import { listCasas } from "@/server/db/casas";
import { listCategorias } from "@/server/db/categorias";
import { getGasto } from "@/server/db/gastos";
import { getIngreso } from "@/server/db/ingresos";
import { decimalToNumber } from "@/lib/money";
import { TipoCategoria } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/page-header";
import { RecurrentesClient, type BorradorRecurrencia } from "./recurrentes-client";

export default async function RecurrentesPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireFamilia();
  const sp = await props.searchParams;

  // Al abrir la sección se pone al día lo que ya tocaba.
  await asegurarRecurrencias(ctx.familiaId);

  const [items, propuestas, casas, catGasto, catIngreso] = await Promise.all([
    listRecurrencias(ctx.familiaId),
    listPropuestas(ctx.familiaId),
    listCasas(ctx.familiaId),
    listCategorias(ctx.familiaId, TipoCategoria.GASTO),
    listCategorias(ctx.familiaId, TipoCategoria.INGRESO),
  ]);

  // «Convertir en recurrente» llega desde la lista de movimientos con el id en
  // la URL: se precarga el diálogo con lo que ya se apuntó una vez.
  const borrador = await borradorDesdeMovimiento(
    ctx.familiaId,
    typeof sp.desde === "string" ? sp.desde : undefined,
    sp.tipo === "INGRESO" ? "INGRESO" : "GASTO",
  );

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

  return (
    <div>
      <PageHeader
        title="Recurrentes"
        description="Lo que se repite solo: alquiler, nóminas, suministros."
      />
      <RecurrentesClient
        items={items}
        propuestas={propuestas}
        casas={casas.map((c) => ({ id: c.id, nombre: c.nombre }))}
        categoriasGasto={catGasto.map(aChip)}
        categoriasIngreso={catIngreso.map(aChip)}
        puedeGestionar={puedeGestionar(ctx)}
        borrador={borrador}
      />
    </div>
  );
}

async function borradorDesdeMovimiento(
  familiaId: string,
  id: string | undefined,
  tipo: "GASTO" | "INGRESO",
): Promise<BorradorRecurrencia | undefined> {
  if (!id) return undefined;

  if (tipo === "GASTO") {
    const g = await getGasto(familiaId, id);
    if (!g) return undefined;
    return {
      tipo: "GASTO",
      concepto: g.concepto,
      importe: decimalToNumber(g.importe),
      categoriaId: g.categoriaId,
      subcategoriaId: g.subcategoriaId,
      casaId: g.casaId,
      contraparte: g.emisor,
      diaMes: g.fecha.getDate(),
    };
  }

  const i = await getIngreso(familiaId, id);
  if (!i) return undefined;
  return {
    tipo: "INGRESO",
    concepto: i.concepto,
    importe: decimalToNumber(i.importe),
    categoriaId: i.categoriaId,
    subcategoriaId: null,
    casaId: i.casaId,
    contraparte: i.fuente,
    diaMes: i.fecha.getDate(),
  };
}

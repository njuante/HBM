"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeftRight, Plus, FileSpreadsheet } from "lucide-react";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { Paginacion } from "@/components/ui/paginacion";
import {
  MovimientoDialog,
  type CasaOpt,
  type MovimientoDefaults,
  type PresupuestoRestante,
  type SugerenciaMovimiento,
  type Tipo,
} from "@/components/movimiento/movimiento-dialog";
import { ImportadorDialog } from "@/components/movimiento/importador-dialog";
import type { CategoriaChip } from "@/components/movimiento/categoria-chips";
import { MovimientosTabla } from "@/components/movimiento/movimientos-tabla";
import { FiltrosMovimientos } from "@/components/movimiento/filtros-movimientos";
import type {
  MovimientoDTO,
  MovimientoFiltros,
  ResumenMovimientos,
} from "@/lib/validation/movimiento";
import {
  actualizarMovimientoAction,
  crearMovimientoAction,
  eliminarMovimientoAction,
  importarMovimientosAction,
} from "./actions";

const TIPOS = [
  { value: "", label: "Todo" },
  { value: "GASTO", label: "Gastos" },
  { value: "INGRESO", label: "Ingresos" },
] as const;

/**
 * Visor único de gastos e ingresos.
 *
 * Antes eran dos pantallas casi idénticas y dos entradas de menú. Verlo todo
 * junto es además lo que permite enseñar el saldo, que es la cifra que de
 * verdad se busca: cuánto queda, no cuánto se ha gastado.
 */
export function MovimientosClient({
  items,
  resumen,
  pagina,
  paginas,
  filtros,
  casas,
  categoriasGasto,
  categoriasIngreso,
  sugerenciasGasto,
  sugerenciasIngreso,
  presupuestos,
  abrirNuevo,
}: {
  items: MovimientoDTO[];
  resumen: ResumenMovimientos;
  pagina: number;
  paginas: number;
  filtros: MovimientoFiltros;
  casas: CasaOpt[];
  categoriasGasto: CategoriaChip[];
  categoriasIngreso: CategoriaChip[];
  sugerenciasGasto: SugerenciaMovimiento[];
  sugerenciasIngreso: SugerenciaMovimiento[];
  presupuestos: Record<string, PresupuestoRestante>;
  /** Llega desde la paleta de comandos: la pantalla nace con el alta abierta. */
  abrirNuevo?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { avisar } = useToast();

  // `null` = cerrado. Un objeto vacío abre el alta; con `id`, la edición.
  const [borrador, setBorrador] = React.useState<MovimientoDefaults | null>(
    abrirNuevo ? {} : null,
  );

  const [importarAbierto, setImportarAbierto] = React.useState(false);

  const hayFiltros = Object.values(filtros).some(Boolean);
  const mostrarCasa = casas.length > 1;

  const irA = (cambios: Record<string, string>) => {
    const params = new URLSearchParams();
    const siguiente: Record<string, string | undefined> = {
      ...filtros,
      pagina: undefined, // cualquier cambio de filtro vuelve a la primera página
      ...cambios,
    };
    for (const [k, v] of Object.entries(siguiente)) if (v) params.set(k, v);
    router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  };

  const desde = (id: string): MovimientoDefaults | null => {
    const m = items.find((i) => i.id === id);
    if (!m) return null;
    return {
      id: m.id,
      tipo: m.tipo,
      importe: m.importe,
      fecha: toDateInputValue(m.fecha),
      concepto: m.concepto,
      categoriaId: m.categoria.id,
      subcategoriaId: m.subcategoria?.id ?? "",
      casaId: m.casa?.id ?? "",
      origen: m.origen,
      metodoPago: m.metodoPago,
      recurrente: m.recurrente,
    };
  };

  /**
   * Borrar avisa y deja deshacerlo. «Deshacer» vuelve a crear el movimiento
   * con los mismos datos: no recupera el registro original —el id es otro—,
   * pero devuelve las cuentas a donde estaban, que es lo que importa.
   */
  const eliminar = (id: string) => {
    const m = items.find((i) => i.id === id);
    if (!m) return;

    const fd = new FormData();
    fd.set("id", id);
    fd.set("tipo", m.tipo);
    void eliminarMovimientoAction(fd);

    avisar(`«${m.concepto}» eliminado`, () => {
      const alta = new FormData();
      alta.set("tipo", m.tipo);
      alta.set("importe", String(m.importe));
      alta.set("fecha", toDateInputValue(m.fecha));
      alta.set("concepto", m.concepto);
      alta.set("categoriaId", m.categoria.id);
      if (m.subcategoria) alta.set("subcategoriaId", m.subcategoria.id);
      if (m.casa) alta.set("casaId", m.casa.id);
      if (m.origen) alta.set(m.tipo === "GASTO" ? "emisor" : "fuente", m.origen);
      if (m.metodoPago) alta.set("metodoPago", m.metodoPago);
      if (m.recurrente) alta.set("recurrente", "on");
      void crearMovimientoAction(undefined, alta);
    });
  };

  // El tipo del alta sigue al filtro: si estás mirando ingresos, añades uno.
  const tipoInicial: Tipo = filtros.tipo === "INGRESO" ? "INGRESO" : "GASTO";

  const todasLasCategorias = React.useMemo(() => {
    const list: { id: string; nombre: string; color?: string; tipo: "GASTO" | "INGRESO" }[] = [];
    categoriasGasto.forEach((c) => {
      list.push({ id: c.id, nombre: c.nombre, color: c.color, tipo: "GASTO" });
      c.subcategorias?.forEach((s) => list.push({ id: s.id, nombre: `${c.nombre} > ${s.nombre}`, color: s.color, tipo: "GASTO" }));
    });
    categoriasIngreso.forEach((c) => {
      list.push({ id: c.id, nombre: c.nombre, color: c.color, tipo: "INGRESO" });
    });
    return list;
  }, [categoriasGasto, categoriasIngreso]);

  return (
    <div>
      <PageHeader
        title="Movimientos"
        description={<Saldo resumen={resumen} />}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setImportarAbierto(true)} className="gap-1.5 text-xs">
              <FileSpreadsheet className="size-4 text-success" />
              Importar Extracto
            </Button>
            <Button onClick={() => setBorrador({})}>
              <Plus />
              Añadir
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Tipo de movimiento"
          value={filtros.tipo ?? ""}
          onChange={(v) => irA({ tipo: v })}
          options={[...TIPOS]}
        />
        <FiltrosMovimientos
          filtros={filtros}
          casas={casas}
          categorias={[...categoriasGasto, ...categoriasIngreso]}
          mostrarCasa={mostrarCasa}
        />
      </div>

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            titulo={
              hayFiltros ? "Nada con estos filtros" : "Aún no hay movimientos"
            }
            descripcion={
              hayFiltros
                ? "Prueba a quitar alguno."
                : "Usa «Añadir» ahí arriba para apuntar el primero."
            }
          />
        ) : (
          <MovimientosTabla
            items={items}
            mostrarCasa={mostrarCasa}
            onEditar={(id) => setBorrador(desde(id))}
            onDuplicar={(id) => {
              const d = desde(id);
              // Duplicar es un alta prerrellenada: se suelta el id y la fecha
              // pasa a hoy, que es lo que se busca casi siempre.
              if (d) setBorrador({ ...d, id: undefined, fecha: toDateInputValue() });
            }}
            onConvertir={(id) => {
              const m = items.find((i) => i.id === id);
              if (m) router.push(`/recurrentes?desde=${id}&tipo=${m.tipo}`);
            }}
            onEliminar={eliminar}
          />
        )}
      </Card>

      <Paginacion
        pagina={pagina}
        paginas={paginas}
        onIr={(p) => irA({ pagina: String(p) })}
      />

      <MovimientoDialog
        tipoInicial={borrador?.tipo ?? tipoInicial}
        abierto={borrador !== null}
        onOpenChange={(v) => !v && setBorrador(null)}
        categoriasGasto={categoriasGasto}
        categoriasIngreso={categoriasIngreso}
        casas={casas}
        sugerenciasGasto={sugerenciasGasto}
        sugerenciasIngreso={sugerenciasIngreso}
        presupuestos={presupuestos}
        defaults={borrador ?? undefined}
        action={borrador?.id ? actualizarMovimientoAction : crearMovimientoAction}
      />

      <ImportadorDialog
        open={importarAbierto}
        onOpenChange={setImportarAbierto}
        categorias={todasLasCategorias}
        casas={casas}
        actionImportar={importarMovimientosAction}
      />
    </div>
  );
}

/** Lo que entra, lo que sale y la diferencia, que es la cifra que se busca. */
function Saldo({ resumen }: { resumen: ResumenMovimientos }) {
  if (resumen.cuantos === 0) return <>Todo lo que entra y lo que sale.</>;

  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="font-serif text-xl font-medium text-foreground">
        <Money value={resumen.saldo} tono="auto" signo />
      </span>
      <span className="text-xs text-faint">
        {resumen.ingresos > 0 && <>{fmt(resumen.ingresos)} entran</>}
        {resumen.ingresos > 0 && resumen.gastos > 0 && " · "}
        {resumen.gastos > 0 && <>{fmt(resumen.gastos)} salen</>}
      </span>
    </span>
  );
}

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

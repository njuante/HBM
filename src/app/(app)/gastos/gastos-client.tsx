"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, TrendingDown } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MovimientoDialog,
  type CasaOpt,
  type MovimientoDefaults,
  type PresupuestoRestante,
  type SugerenciaMovimiento,
} from "@/components/movimiento/movimiento-dialog";
import type { CategoriaChip } from "@/components/movimiento/categoria-chips";
import { MovimientosTabla } from "@/components/movimiento/movimientos-tabla";
import {
  FiltrosMovimientos,
  type FiltrosMovimiento,
} from "@/components/movimiento/filtros-movimientos";
import {
  actualizarGastoAction,
  crearGastoAction,
  eliminarGastoAction,
} from "./actions";

export type GastoItem = {
  id: string;
  usuarioId: string;
  puedeEditar: boolean;
  importe: number;
  fecha: string;
  concepto: string;
  emisor: string | null;
  metodoPago: string | null;
  recurrente: boolean;
  casa: { id: string; nombre: string };
  categoria: { id: string; nombre: string; color: string; icono: string | null };
  subcategoria: { id: string; nombre: string } | null;
  tieneFactura: boolean;
};

export function GastosClient({
  items,
  total,
  casas,
  categorias,
  sugerencias,
  filtros,
  presupuestos,
}: {
  items: GastoItem[];
  total: number;
  casas: CasaOpt[];
  categorias: CategoriaChip[];
  sugerencias: SugerenciaMovimiento[];
  filtros: FiltrosMovimiento;
  presupuestos: Record<string, PresupuestoRestante>;
}) {
  const router = useRouter();
  // `null` = cerrado. Un objeto vacío abre el alta; con `id`, la edición.
  const [borrador, setBorrador] = React.useState<MovimientoDefaults | null>(null);

  const hayFiltros = Object.values(filtros).some(Boolean);
  const mostrarCasa = casas.length > 1;

  const desde = (id: string): MovimientoDefaults | null => {
    const g = items.find((i) => i.id === id);
    if (!g) return null;
    return {
      id: g.id,
      importe: g.importe,
      fecha: toDateInputValue(g.fecha),
      concepto: g.concepto,
      categoriaId: g.categoria.id,
      subcategoriaId: g.subcategoria?.id ?? "",
      casaId: g.casa.id,
      origen: g.emisor,
      metodoPago: g.metodoPago,
      recurrente: g.recurrente,
    };
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xs font-medium uppercase tracking-wide text-faint">
            {hayFiltros ? "Total filtrado" : "Total"}
          </p>
          <p className="mt-1 font-serif text-2xl font-medium tabular-nums text-danger">
            {formatEUR(total)}
          </p>
          <p className="mt-0.5 text-2xs text-faint">
            {items.length} {items.length === 1 ? "movimiento" : "movimientos"}
          </p>
        </div>
        <Button onClick={() => setBorrador({})}>
          <Plus />
          Añadir gasto
        </Button>
      </div>

      <FiltrosMovimientos
        filtros={filtros}
        casas={casas}
        categorias={categorias}
        mostrarCasa={mostrarCasa}
      />

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            titulo={hayFiltros ? "Ningún gasto con estos filtros" : "Aún no hay gastos"}
            descripcion={
              hayFiltros
                ? "Prueba a quitar alguno de los filtros activos."
                : "Registra el primero y empezarás a ver el reparto en el panel."
            }
            accion={
              !hayFiltros && (
                <Button size="sm" onClick={() => setBorrador({})}>
                  <Plus />
                  Añadir gasto
                </Button>
              )
            }
          />
        ) : (
          <MovimientosTabla
            items={items.map((g) => ({ ...g, origen: g.emisor, casa: g.casa }))}
            tono="gasto"
            mostrarCasa={mostrarCasa}
            onEditar={(id) => setBorrador(desde(id))}
            onDuplicar={(id) => {
              const d = desde(id);
              // Duplicar es un alta prerrellenada: se suelta el id y la fecha
              // pasa a hoy, que es lo que se busca casi siempre.
              if (d) setBorrador({ ...d, id: undefined, fecha: toDateInputValue() });
            }}
            onConvertir={(id) =>
              router.push(`/recurrentes?desde=${id}&tipo=GASTO`)
            }
            onEliminar={(id) => {
              const fd = new FormData();
              fd.set("id", id);
              void eliminarGastoAction(fd);
            }}
          />
        )}
      </Card>

      <MovimientoDialog
        tipo="gasto"
        camposGasto
        abierto={borrador !== null}
        onOpenChange={(v) => !v && setBorrador(null)}
        categorias={categorias}
        casas={casas}
        sugerencias={sugerencias}
        presupuestos={presupuestos}
        defaults={borrador ?? undefined}
        action={borrador?.id ? actualizarGastoAction : crearGastoAction}
      />
    </>
  );
}

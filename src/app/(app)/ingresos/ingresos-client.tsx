"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, TrendingUp } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MovimientoDialog,
  type CasaOpt,
  type MovimientoDefaults,
  type SugerenciaMovimiento,
} from "@/components/movimiento/movimiento-dialog";
import type { CategoriaChip } from "@/components/movimiento/categoria-chips";
import { MovimientosTabla } from "@/components/movimiento/movimientos-tabla";
import {
  FiltrosMovimientos,
  type FiltrosMovimiento,
} from "@/components/movimiento/filtros-movimientos";
import {
  actualizarIngresoAction,
  crearIngresoAction,
  eliminarIngresoAction,
} from "./actions";

export type IngresoItem = {
  id: string;
  usuarioId: string;
  puedeEditar: boolean;
  importe: number;
  fecha: string;
  concepto: string;
  fuente: string | null;
  recurrente: boolean;
  casa: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string; color: string; icono: string | null };
};

export function IngresosClient({
  items,
  total,
  casas,
  categorias,
  sugerencias,
  filtros,
}: {
  items: IngresoItem[];
  total: number;
  casas: CasaOpt[];
  categorias: CategoriaChip[];
  sugerencias: SugerenciaMovimiento[];
  filtros: FiltrosMovimiento;
}) {
  const router = useRouter();
  const [borrador, setBorrador] = React.useState<MovimientoDefaults | null>(null);

  const hayFiltros = Object.values(filtros).some(Boolean);
  const mostrarCasa = casas.length > 1;

  const desde = (id: string): MovimientoDefaults | null => {
    const i = items.find((x) => x.id === id);
    if (!i) return null;
    return {
      id: i.id,
      importe: i.importe,
      fecha: toDateInputValue(i.fecha),
      concepto: i.concepto,
      categoriaId: i.categoria.id,
      casaId: i.casa?.id ?? "",
      origen: i.fuente,
      recurrente: i.recurrente,
    };
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xs font-medium uppercase tracking-wide text-faint">
            {hayFiltros ? "Total filtrado" : "Total"}
          </p>
          <p className="mt-1 font-serif text-2xl font-medium tabular-nums text-success">
            {formatEUR(total)}
          </p>
          <p className="mt-0.5 text-2xs text-faint">
            {items.length} {items.length === 1 ? "movimiento" : "movimientos"}
          </p>
        </div>
        <Button onClick={() => setBorrador({})}>
          <Plus />
          Añadir ingreso
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
            icon={TrendingUp}
            titulo={
              hayFiltros ? "Ningún ingreso con estos filtros" : "Aún no hay ingresos"
            }
            descripcion={
              hayFiltros
                ? "Prueba a quitar alguno de los filtros activos."
                : "Registra el primero para ver el saldo real de la familia."
            }
            accion={
              !hayFiltros && (
                <Button size="sm" onClick={() => setBorrador({})}>
                  <Plus />
                  Añadir ingreso
                </Button>
              )
            }
          />
        ) : (
          <MovimientosTabla
            items={items.map((i) => ({
              ...i,
              origen: i.fuente,
              subcategoria: null,
            }))}
            tono="ingreso"
            mostrarCasa={mostrarCasa}
            onEditar={(id) => setBorrador(desde(id))}
            onDuplicar={(id) => {
              const d = desde(id);
              if (d) setBorrador({ ...d, id: undefined, fecha: toDateInputValue() });
            }}
            onConvertir={(id) =>
              router.push(`/recurrentes?desde=${id}&tipo=INGRESO`)
            }
            onEliminar={(id) => {
              const fd = new FormData();
              fd.set("id", id);
              void eliminarIngresoAction(fd);
            }}
          />
        )}
      </Card>

      <MovimientoDialog
        tipo="ingreso"
        abierto={borrador !== null}
        onOpenChange={(v) => !v && setBorrador(null)}
        categorias={categorias}
        casas={casas}
        sugerencias={sugerencias}
        defaults={borrador ?? undefined}
        action={borrador?.id ? actualizarIngresoAction : crearIngresoAction}
      />
    </>
  );
}

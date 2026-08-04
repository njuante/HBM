"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, MoreHorizontal, Paperclip, Repeat } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { tonosCategoria } from "@/lib/color-categoria";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
import type { MovimientoDTO } from "@/lib/validation/movimiento";
import { Grupo, Rotulo, Seccion } from "./lista";

const MES_FMT = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const DIA_FMT = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" });

/**
 * El libro de movimientos en móvil.
 *
 * La tabla de la web ya se plegaba a fichas por debajo de `md`, pero seguía
 * siendo una tabla plegada: el mes era una banda gris más y las acciones un
 * menú de tres puntos heredado del escritorio. Aquí cada mes es una sección
 * con su rótulo y su neto —que es el dato que se busca al bajar—, y las dos
 * cosas que de verdad se hacen sobre una fila están al alcance del pulgar:
 * tocar la categoría la cambia, y el resto abre la ficha.
 */
export function ListaMovimientosMovil({
  items,
  mostrarCasa,
  onEditar,
  onCambiarCategoria,
  onAcciones,
}: {
  items: MovimientoDTO[];
  mostrarCasa: boolean;
  onEditar: (id: string) => void;
  onCambiarCategoria: (id: string) => void;
  onAcciones: (id: string) => void;
}) {
  const grupos = React.useMemo(() => {
    const mapa = new Map<string, { etiqueta: string; filas: MovimientoDTO[] }>();
    for (const it of items) {
      const d = new Date(it.fecha);
      const clave = `${d.getFullYear()}-${d.getMonth()}`;
      if (!mapa.has(clave)) mapa.set(clave, { etiqueta: MES_FMT.format(d), filas: [] });
      mapa.get(clave)!.filas.push(it);
    }
    return [...mapa.values()];
  }, [items]);

  return (
    <div>
      {grupos.map((g) => {
        // Neto y no suma bruta: en una lista mixta el total no dice nada.
        const neto = g.filas.reduce(
          (s, f) => s + (f.tipo === "GASTO" ? -f.importe : f.importe),
          0,
        );
        return (
          <Seccion key={g.etiqueta}>
            <Rotulo>
              <span className="flex w-full items-baseline justify-between gap-3">
                <span>{g.etiqueta}</span>
                <span
                  className={cn(
                    "font-medium tabular-nums normal-case tracking-normal",
                    neto >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {neto >= 0 ? "+" : "−"}
                  {formatEUR(Math.abs(neto))}
                </span>
              </span>
            </Rotulo>

            <Grupo>
              {g.filas.map((m) => (
                <FilaMovimiento
                  key={m.id}
                  m={m}
                  mostrarCasa={mostrarCasa}
                  onEditar={() => onEditar(m.id)}
                  onCambiarCategoria={() => onCambiarCategoria(m.id)}
                  onAcciones={() => onAcciones(m.id)}
                />
              ))}
            </Grupo>
          </Seccion>
        );
      })}
    </div>
  );
}

function FilaMovimiento({
  m,
  mostrarCasa,
  onEditar,
  onCambiarCategoria,
  onAcciones,
}: {
  m: MovimientoDTO;
  mostrarCasa: boolean;
  onEditar: () => void;
  onCambiarCategoria: () => void;
  onAcciones: () => void;
}) {
  const esIngreso = m.tipo === "INGRESO";
  const Icono = esIngreso ? ArrowDownLeft : ArrowUpRight;
  const puedeEditar = m.puedeEditar !== false;

  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0">
      {/* El cuerpo abre la ficha; la categoría, de dentro, se escapa del
          botón para poder tener su propia acción sin anidar dos botones. */}
      <button
        type="button"
        onClick={puedeEditar ? onEditar : undefined}
        disabled={!puedeEditar}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 text-left",
          puedeEditar && "pulsable",
        )}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            esIngreso ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
          )}
        >
          <Icono className="size-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-medium leading-tight">
              {m.concepto}
            </span>
            {m.recurrente && (
              <Repeat className="size-3 shrink-0 text-faint" aria-label="Se repite" />
            )}
            {m.tieneFactura && (
              <Paperclip className="size-3 shrink-0 text-faint" aria-label="Con factura" />
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {DIA_FMT.format(new Date(m.fecha))}
            {mostrarCasa && m.casa && ` · ${m.casa.nombre}`}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <span className="text-right">
          <span
            className={cn(
              "block text-[15px] font-semibold tabular-nums leading-tight",
              esIngreso ? "text-success" : "text-foreground",
            )}
          >
            {esIngreso ? "+" : "−"}
            {formatEUR(m.importe)}
          </span>

          {/* La categoría, como pastilla pulsable: es el cambio que más se
              repite al revisar el extracto del mes. */}
          <button
            type="button"
            onClick={puedeEditar ? onCambiarCategoria : undefined}
            disabled={!puedeEditar}
            aria-label={`Cambiar la categoría de ${m.concepto}, ahora ${m.categoria.nombre}`}
            className={cn(
              "cat mt-1 inline-flex max-w-[9rem] items-center gap-1 rounded-full px-1.5 py-0.5",
              "text-[11px] font-medium leading-tight",
              puedeEditar && "pulsable",
            )}
            style={{
              ...tonosCategoria(m.categoria.color),
              backgroundColor: "color-mix(in oklab, var(--cat) 14%, transparent)",
              color: "var(--cat)",
            }}
          >
            <MarcaCategoria
              icono={m.categoria.icono}
              color="var(--cat)"
              className="size-2.5 shrink-0"
            />
            <span className="truncate">{m.categoria.nombre}</span>
          </button>
        </span>

        <button
          type="button"
          onClick={onAcciones}
          aria-label={`Acciones de ${m.concepto}`}
          className="pulsable flex size-9 shrink-0 items-center justify-center rounded-full text-faint"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </div>
  );
}

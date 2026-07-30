"use client";

import * as React from "react";
import { Copy, MoreHorizontal, Paperclip, Pencil, Repeat, Trash2 } from "lucide-react";
import { Money } from "@/components/ui/money";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
import { armonizarColor } from "@/components/charts/chart-theme";
import { useTheme } from "@/components/theme-provider";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmarAccion } from "@/components/ui/alert-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MovimientoFila = {
  id: string;
  tipo: "GASTO" | "INGRESO";
  importe: number;
  fecha: string;
  concepto: string;
  origen: string | null;
  recurrente: boolean;
  casa: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string; color: string; icono?: string | null };
  subcategoria: { id: string; nombre: string } | null;
  tieneFactura?: boolean;
  /** Falso para un MEMBER sobre un movimiento ajeno: solo puede duplicarlo. */
  puedeEditar?: boolean;
};

const MES_FMT = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const DIA_FMT = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" });

/**
 * Libro mayor: filas agrupadas por mes con su total.
 *
 * Agrupar evita repetir el mes en cada línea y da lo que una lista plana no
 * da —cuánto se movió cada mes— sin añadir ninguna consulta.
 */
export function MovimientosTabla({
  items,
  mostrarCasa,
  onEditar,
  onDuplicar,
  onEliminar,
  onConvertir,
}: {
  items: MovimientoFila[];
  mostrarCasa: boolean;
  onEditar: (id: string) => void;
  onDuplicar: (id: string) => void;
  onEliminar: (id: string) => void;
  /** Abre la creación de una recurrencia a partir de este movimiento. */
  onConvertir?: (id: string) => void;
}) {
  const { resolvedTheme } = useTheme();

  const grupos = React.useMemo(() => {
    const mapa = new Map<string, { etiqueta: string; filas: MovimientoFila[] }>();
    for (const it of items) {
      const d = new Date(it.fecha);
      const clave = `${d.getFullYear()}-${d.getMonth()}`;
      if (!mapa.has(clave)) mapa.set(clave, { etiqueta: MES_FMT.format(d), filas: [] });
      mapa.get(clave)!.filas.push(it);
    }
    return [...mapa.values()];
  }, [items]);

  const columnas = mostrarCasa ? 6 : 5;

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH className="w-20">Fecha</TH>
            <TH>Concepto</TH>
            <TH>Categoría</TH>
            {mostrarCasa && <TH className="w-32">Casa</TH>}
            <TH numerico className="w-28">
              Importe
            </TH>
            <TH className="w-10" />
          </TR>
        </THead>

        {grupos.map((g) => {
          // Neto: en una lista mixta la suma bruta no significa nada.
          const netoMes = g.filas.reduce(
            (s, f) => s + (f.tipo === "GASTO" ? -f.importe : f.importe),
            0,
          );
          return (
            <TBody key={g.etiqueta}>
              <tr className="border-b border-border bg-muted/40">
                <td
                  colSpan={columnas - 1}
                  className="px-3 py-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {g.etiqueta}
                </td>
                <td
                  colSpan={2}
                  className="px-3 py-1.5 text-right text-2xs text-muted-foreground"
                >
                  <Money value={netoMes} signo />
                </td>
              </tr>

              {g.filas.map((m) => {
                const color = armonizarColor(m.categoria.color, resolvedTheme);

                return (
                  <TR key={m.id}>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {DIA_FMT.format(new Date(m.fecha))}
                    </TD>

                    <TD>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{m.concepto}</span>
                        {m.recurrente && (
                          <Tooltip texto="Se repite cada mes">
                            <Repeat className="size-3 text-faint" />
                          </Tooltip>
                        )}
                        {m.tieneFactura && (
                          <Tooltip texto="Tiene factura adjunta">
                            <Paperclip className="size-3 text-faint" />
                          </Tooltip>
                        )}
                      </div>
                      {m.origen && (
                        <span className="text-2xs text-faint">{m.origen}</span>
                      )}
                    </TD>

                    <TD>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <MarcaCategoria
                          icono={m.categoria.icono}
                          color={color}
                          className="size-3.5 shrink-0"
                        />
                        <span className="text-muted-foreground">
                          {m.categoria.nombre}
                          {m.subcategoria && (
                            <span className="text-faint">
                              {" "}
                              / {m.subcategoria.nombre}
                            </span>
                          )}
                        </span>
                      </span>
                    </TD>

                    {mostrarCasa && (
                      <TD className="truncate text-xs text-muted-foreground">
                        {m.casa?.nombre ?? "—"}
                      </TD>
                    )}

                    <TD numerico>
                      <Money
                        value={m.tipo === "GASTO" ? -m.importe : m.importe}
                        tono="auto"
                        signo
                        className="font-medium"
                      />
                    </TD>

                    <TD className="pr-2">
                      <AccionesFila
                        onEditar={() => onEditar(m.id)}
                        onDuplicar={() => onDuplicar(m.id)}
                        onEliminar={() => onEliminar(m.id)}
                        onConvertir={
                          onConvertir ? () => onConvertir(m.id) : undefined
                        }
                        concepto={m.concepto}
                        tipo={m.tipo}
                        puedeEditar={m.puedeEditar !== false}
                      />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          );
        })}
      </Table>
    </TableWrap>
  );
}

function AccionesFila({
  onEditar,
  onDuplicar,
  onEliminar,
  onConvertir,
  concepto,
  tipo,
  puedeEditar,
}: {
  onEditar: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
  onConvertir?: () => void;
  concepto: string;
  tipo: "GASTO" | "INGRESO";
  puedeEditar: boolean;
}) {
  const [confirmando, setConfirmando] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Acciones de ${concepto}`}
            // Las acciones aparecen al posar el cursor o al enfocar con el
            // teclado; dos botones fijos por fila convierten la tabla en ruido.
            className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {puedeEditar && (
            <DropdownMenuItem onSelect={onEditar}>
              <Pencil />
              Editar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onDuplicar}>
            <Copy />
            Duplicar
          </DropdownMenuItem>
          {onConvertir && (
            <DropdownMenuItem onSelect={onConvertir}>
              <Repeat />
              Convertir en recurrente
            </DropdownMenuItem>
          )}
          {puedeEditar && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                peligro
                // Radix cierra el menú antes de montar el diálogo; sin este
                // salto de turno el AlertDialog nace y muere en el mismo tick.
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => setConfirmando(true), 0);
                }}
              >
                <Trash2 />
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmarAccion
        open={confirmando}
        onOpenChange={setConfirmando}
        titulo={`¿Eliminar «${concepto}»?`}
        descripcion={`Se borrará este ${tipo === "GASTO" ? "gasto" : "ingreso"} de forma permanente.`}
        onConfirmar={onEliminar}
      />
    </>
  );
}

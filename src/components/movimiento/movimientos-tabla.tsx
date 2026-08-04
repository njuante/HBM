"use client";

import * as React from "react";
import {
  Copy,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Money } from "@/components/ui/money";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
import { armonizarColor } from "@/components/charts/chart-theme";
import { useTheme } from "@/components/theme-provider";
import {
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
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
  categoria: {
    id: string;
    nombre: string;
    color: string;
    icono?: string | null;
  };
  subcategoria: { id: string; nombre: string } | null;
  tieneFactura?: boolean;
  /** Falso para un MEMBER sobre un movimiento ajeno: solo puede duplicarlo. */
  puedeEditar?: boolean;
};

const MES_FMT = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});
const DIA_FMT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
});

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
  onCambiarCategoria,
}: {
  items: MovimientoFila[];
  mostrarCasa: boolean;
  onEditar: (id: string) => void;
  onDuplicar: (id: string) => void;
  onEliminar: (id: string) => void;
  /** Abre la creación de una recurrencia a partir de este movimiento. */
  onConvertir?: (id: string) => void;
  /** Recategorizar de un toque: la categoría de cada fila es un botón. */
  onCambiarCategoria?: (id: string) => void;
}) {
  const { resolvedTheme } = useTheme();

  const grupos = React.useMemo(() => {
    const mapa = new Map<
      string,
      { etiqueta: string; filas: MovimientoFila[] }
    >();
    for (const it of items) {
      const d = new Date(it.fecha);
      const clave = `${d.getFullYear()}-${d.getMonth()}`;
      if (!mapa.has(clave))
        mapa.set(clave, { etiqueta: MES_FMT.format(d), filas: [] });
      mapa.get(clave)!.filas.push(it);
    }
    return [...mapa.values()];
  }, [items]);

  const columnas = mostrarCasa ? 6 : 5;

  const acciones = (m: MovimientoFila) => (
    <AccionesFila
      onEditar={() => onEditar(m.id)}
      onDuplicar={() => onDuplicar(m.id)}
      onEliminar={() => onEliminar(m.id)}
      onConvertir={onConvertir ? () => onConvertir(m.id) : undefined}
      concepto={m.concepto}
      tipo={m.tipo}
      puedeEditar={m.puedeEditar !== false}
    />
  );

  return (
    <>
      {/* Por debajo de `md` la tabla se convierte en fichas: seis columnas en
          375 px dejaban el importe fuera de la pantalla, que es justo el dato
          que se viene a mirar. */}
      <ul className="divide-y divide-border md:hidden">
        {grupos.map((g) => {
          const netoMes = g.filas.reduce(
            (s, f) => s + (f.tipo === "GASTO" ? -f.importe : f.importe),
            0,
          );
          return (
            <li key={g.etiqueta}>
              <div className="flex items-baseline justify-between gap-2 border-b border-border bg-muted/40 px-4 py-1.5">
                <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                  {g.etiqueta}
                </span>
                <span className="text-2xs text-muted-foreground">
                  <Money value={netoMes} signo />
                </span>
              </div>

              <ul className="divide-y divide-border">
                {g.filas.map((m) => {
                  const color = armonizarColor(
                    m.categoria.color,
                    resolvedTheme,
                  );
                  return (
                    <li
                      key={m.id}
                      className="group flex items-start gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">
                            {m.concepto}
                          </span>
                          {m.recurrente && (
                            <Repeat
                              className="size-3 shrink-0 text-faint"
                              aria-label="Se repite cada mes"
                            />
                          )}
                          {m.tieneFactura && (
                            <Paperclip
                              className="size-3 shrink-0 text-faint"
                              aria-label="Tiene factura adjunta"
                            />
                          )}
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                          <span>{DIA_FMT.format(new Date(m.fecha))}</span>
                          <span aria-hidden className="text-faint">
                            ·
                          </span>
                          <BotonCategoria
                            nombre={m.categoria.nombre}
                            sub={m.subcategoria?.nombre}
                            icono={m.categoria.icono}
                            color={color}
                            concepto={m.concepto}
                            // Sin permiso para editar, la categoría es solo texto.
                            onClick={
                              m.puedeEditar !== false && onCambiarCategoria
                                ? () => onCambiarCategoria(m.id)
                                : undefined
                            }
                          />
                          {mostrarCasa && m.casa && (
                            <>
                              <span aria-hidden className="text-faint">
                                ·
                              </span>
                              <span className="truncate">{m.casa.nombre}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Money
                          value={m.tipo === "GASTO" ? -m.importe : m.importe}
                          tono="auto"
                          signo
                          className="font-medium"
                        />
                        {acciones(m)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>

      <div className="hidden md:block">
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
                    const color = armonizarColor(
                      m.categoria.color,
                      resolvedTheme,
                    );

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
                            <span className="text-2xs text-faint">
                              {m.origen}
                            </span>
                          )}
                        </TD>

                        <TD>
                          <BotonCategoria
                            nombre={m.categoria.nombre}
                            sub={m.subcategoria?.nombre}
                            icono={m.categoria.icono}
                            color={color}
                            concepto={m.concepto}
                            onClick={
                              m.puedeEditar !== false && onCambiarCategoria
                                ? () => onCambiarCategoria(m.id)
                                : undefined
                            }
                          />
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

                        <TD className="pr-2">{acciones(m)}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              );
            })}
          </Table>
        </TableWrap>
      </div>
    </>
  );
}

/**
 * La categoría de una fila, pulsable para cambiarla.
 *
 * Es el atajo que evita el rodeo por el formulario completo. Se pinta como
 * texto y no como botón: en una lista larga, veinte botones de colores serían
 * ruido. El área táctil sí es de botón —`py-1 -my-1` la engorda sin mover
 * nada de sitio— y el subrayado punteado al posarse dice que se puede tocar.
 */
function BotonCategoria({
  nombre,
  sub,
  icono,
  color,
  concepto,
  onClick,
}: {
  nombre: string;
  sub?: string;
  icono?: string | null;
  color: string;
  concepto: string;
  /** Sin él se pinta el mismo texto, pero inerte. */
  onClick?: () => void;
}) {
  const contenido = (
    <>
      <MarcaCategoria icono={icono} color={color} className="size-3.5 shrink-0" />
      <span className="truncate text-muted-foreground">
        {nombre}
        {sub && <span className="text-faint"> / {sub}</span>}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs">
        {contenido}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Cambiar la categoría de ${concepto}, ahora ${nombre}`}
      className={cn(
        "relative -my-1 inline-flex min-w-0 items-center gap-1.5 rounded-sm py-1 text-xs",
        "transition-colors hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "decoration-dotted underline-offset-4 hover:underline",
        // El texto mide ~26px de alto, por debajo de lo que un pulgar acierta.
        // El pseudo-elemento estira la zona sensible a ~44px sin ocupar ni un
        // píxel más de maquetación, que en una fila tan apretada importa.
        "before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']",
      )}
    >
      {contenido}
    </button>
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
            className="accion-fila"
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

"use client";

import * as React from "react";
import {
  Check,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmarAccion } from "@/components/ui/alert-dialog";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CategoriaChips,
  type CategoriaChip,
} from "@/components/movimiento/categoria-chips";
import { armonizarColor } from "@/components/charts/chart-theme";
import { useTheme } from "@/components/theme-provider";
import { describeFrecuencia } from "@/lib/recurrencia";
import { formatFecha, toDateInputValue } from "@/lib/format";
import type { FormState } from "@/lib/validation/form";
import type {
  PropuestaDTO,
  RecurrenciaDTO,
} from "@/lib/validation/recurrencia";
import { PropuestasPendientes } from "@/components/propuestas-pendientes";
import {
  actualizarRecurrenciaAction,
  cambiarActivaAction,
  crearRecurrenciaAction,
  eliminarRecurrenciaAction,
} from "./actions";

type CasaOpt = { id: string; nombre: string };
type Tipo = "GASTO" | "INGRESO";

/** Precarga que llega al convertir un movimiento existente en recurrencia. */
export type BorradorRecurrencia = {
  tipo: Tipo;
  concepto: string;
  importe: number;
  categoriaId: string;
  subcategoriaId: string | null;
  casaId: string | null;
  contraparte: string | null;
  diaMes: number;
};

const FRECUENCIAS = [
  ["MENSUAL", "Mensual"],
  ["SEMANAL", "Semanal"],
  ["BIMESTRAL", "Bimestral"],
  ["TRIMESTRAL", "Trimestral"],
  ["SEMESTRAL", "Semestral"],
  ["ANUAL", "Anual"],
] as const;

export function RecurrentesClient({
  items,
  propuestas,
  casas,
  categoriasGasto,
  categoriasIngreso,
  puedeGestionar,
  borrador,
}: {
  items: RecurrenciaDTO[];
  propuestas: PropuestaDTO[];
  casas: CasaOpt[];
  categoriasGasto: CategoriaChip[];
  categoriasIngreso: CategoriaChip[];
  puedeGestionar: boolean;
  borrador?: BorradorRecurrencia;
}) {
  const [tipo, setTipo] = React.useState<Tipo>(borrador?.tipo ?? "GASTO");
  const [editando, setEditando] = React.useState<RecurrenciaDTO | null>(null);
  // Con borrador el diálogo nace abierto: se viene de pulsar «convertir».
  const [creando, setCreando] = React.useState(Boolean(borrador));

  const visibles = items.filter((r) => r.tipo === tipo);

  return (
    <>
      {propuestas.length > 0 && (
        <PropuestasPendientes propuestas={propuestas} className="mb-5" />
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          ariaLabel="Tipo de recurrencia"
          value={tipo}
          onChange={setTipo}
          options={[
            { value: "GASTO", label: "Gastos" },
            { value: "INGRESO", label: "Ingresos" },
          ]}
        />
        {puedeGestionar && (
          <Button onClick={() => setCreando(true)}>
            <Plus />
            Nueva recurrencia
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {visibles.length === 0 ? (
          <EmptyState
            icon={Repeat}
            titulo={
              tipo === "GASTO" ? "Sin gastos recurrentes" : "Sin ingresos recurrentes"
            }
            descripcion={
              tipo === "GASTO"
                ? "El alquiler, la cuota del gimnasio o la factura de la luz se apuntan una vez y se repiten solas."
                : "La nómina o el alquiler que cobras entran solos cada mes."
            }
            accion={
              puedeGestionar && (
                <Button size="sm" onClick={() => setCreando(true)}>
                  <Plus />
                  Nueva recurrencia
                </Button>
              )
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Concepto</TH>
                  <TH>Cada</TH>
                  <TH className="w-28">Próxima</TH>
                  <TH numerico className="w-28">
                    Importe
                  </TH>
                  <TH className="w-20">Estado</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {visibles.map((r) => (
                  <FilaRecurrencia
                    key={r.id}
                    r={r}
                    puedeGestionar={puedeGestionar}
                    onEditar={() => setEditando(r)}
                  />
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <RecurrenciaDialog
        abierto={creando}
        onOpenChange={setCreando}
        action={crearRecurrenciaAction}
        inicial={borrador}
        tipoInicial={borrador?.tipo ?? tipo}
        casas={casas}
        categoriasGasto={categoriasGasto}
        categoriasIngreso={categoriasIngreso}
      />
      <RecurrenciaDialog
        key={editando?.id}
        recurrencia={editando ?? undefined}
        abierto={editando !== null}
        onOpenChange={(v) => !v && setEditando(null)}
        action={actualizarRecurrenciaAction}
        tipoInicial={editando?.tipo ?? tipo}
        casas={casas}
        categoriasGasto={categoriasGasto}
        categoriasIngreso={categoriasIngreso}
      />
    </>
  );
}

/* ── Fila ──────────────────────────────────────────────────────────────── */

function FilaRecurrencia({
  r,
  puedeGestionar,
  onEditar,
}: {
  r: RecurrenciaDTO;
  puedeGestionar: boolean;
  onEditar: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const [confirmando, setConfirmando] = React.useState(false);

  return (
    <TR className={r.activa ? undefined : "opacity-55"}>
      <TD>
        <div className="flex items-center gap-2">
          <MarcaCategoria
            icono={r.categoria.icono}
            color={armonizarColor(r.categoria.color, resolvedTheme)}
            className="size-3.5 shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{r.concepto}</p>
            <p className="truncate text-2xs text-faint">
              {r.categoria.nombre}
              {r.casa && ` · ${r.casa.nombre}`}
              {r.generados > 0 && ` · ${r.generados} generados`}
            </p>
          </div>
        </div>
      </TD>

      <TD className="text-xs text-muted-foreground">
        {describeFrecuencia(r.frecuencia, r.intervalo, r.diaMes)}
      </TD>

      <TD className="whitespace-nowrap text-xs text-muted-foreground">
        {formatFecha(r.proximaFecha)}
      </TD>

      <TD numerico className="font-medium">
        <Money value={r.importe} tono={r.tipo === "GASTO" ? "gasto" : "ingreso"} />
      </TD>

      <TD>
        {!r.activa ? (
          <Badge variant="neutral">Pausada</Badge>
        ) : r.automatica ? (
          <Badge variant="success">Automática</Badge>
        ) : (
          <Badge variant="warning">Confirmar</Badge>
        )}
      </TD>

      <TD className="pr-2">
        {puedeGestionar && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Acciones de ${r.concepto}`}
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onEditar}>
                  <Pencil />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <form action={cambiarActivaAction}>
                    <input type="hidden" name="id" value={r.id} />
                    {!r.activa && <input type="hidden" name="activa" value="on" />}
                    <button type="submit" className="flex w-full items-center gap-2">
                      {r.activa ? <X /> : <Check />}
                      {r.activa ? "Pausar" : "Reanudar"}
                    </button>
                  </form>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  peligro
                  onSelect={(e) => {
                    e.preventDefault();
                    setTimeout(() => setConfirmando(true), 0);
                  }}
                >
                  <Trash2 />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmarAccion
              open={confirmando}
              onOpenChange={setConfirmando}
              titulo={`¿Eliminar «${r.concepto}»?`}
              descripcion="Dejará de generarse. Los movimientos ya creados se conservan."
              onConfirmar={() => {
                const fd = new FormData();
                fd.set("id", r.id);
                void eliminarRecurrenciaAction(fd);
              }}
            />
          </>
        )}
      </TD>
    </TR>
  );
}

/* ── Alta y edición ────────────────────────────────────────────────────── */

function RecurrenciaDialog({
  recurrencia,
  inicial,
  abierto,
  onOpenChange,
  action,
  tipoInicial,
  casas,
  categoriasGasto,
  categoriasIngreso,
}: {
  recurrencia?: RecurrenciaDTO;
  inicial?: BorradorRecurrencia;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  tipoInicial: Tipo;
  casas: CasaOpt[];
  categoriasGasto: CategoriaChip[];
  categoriasIngreso: CategoriaChip[];
}) {
  const [estado, setEstado] = React.useState<FormState>(undefined);
  const [tipo, setTipo] = React.useState<Tipo>(recurrencia?.tipo ?? tipoInicial);
  const [categoriaId, setCategoriaId] = React.useState(
    recurrencia?.categoria.id ?? inicial?.categoriaId ?? "",
  );
  const [subcategoriaId, setSubcategoriaId] = React.useState(
    recurrencia?.subcategoria?.id ?? inicial?.subcategoriaId ?? "",
  );
  const [frecuencia, setFrecuencia] = React.useState(
    recurrencia?.frecuencia ?? "MENSUAL",
  );
  const [automatica, setAutomatica] = React.useState(recurrencia?.automatica ?? true);

  const esGasto = tipo === "GASTO";
  const categorias = esGasto ? categoriasGasto : categoriasIngreso;

  // Cambiar de tipo invalida la categoría elegida: son árboles distintos.
  const cambiarTipo = (t: Tipo) => {
    setTipo(t);
    setCategoriaId("");
    setSubcategoriaId("");
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {recurrencia ? "Editar recurrencia" : "Nueva recurrencia"}
          </DialogTitle>
        </DialogHeader>

        <form
          action={async (fd) => {
            const res = await action(estado, fd);
            setEstado(res);
            if (res?.ok) onOpenChange(false);
          }}
        >
          {recurrencia && <input type="hidden" name="id" value={recurrencia.id} />}
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="frecuencia" value={frecuencia} />
          <input type="hidden" name="automatica" value={automatica ? "on" : ""} />

          <DialogBody className="space-y-4">
            {!recurrencia && (
              <Segmented
                ariaLabel="Tipo"
                value={tipo}
                onChange={cambiarTipo}
                options={[
                  { value: "GASTO", label: "Gasto" },
                  { value: "INGRESO", label: "Ingreso" },
                ]}
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Concepto" error={estado?.errors?.concepto}>
                <Input
                  name="concepto"
                  defaultValue={recurrencia?.concepto ?? inicial?.concepto}
                  placeholder={esGasto ? "Alquiler, luz…" : "Nómina, alquiler…"}
                  autoFocus
                  required
                />
              </Field>
              <Field label="Importe" error={estado?.errors?.importe}>
                <Input
                  name="importe"
                  inputMode="decimal"
                  adornoDer="€"
                  defaultValue={recurrencia?.importe ?? inicial?.importe}
                  required
                />
              </Field>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Categoría
              </p>
              <CategoriaChips
                categorias={categorias}
                value={categoriaId}
                onChange={setCategoriaId}
                subValue={subcategoriaId}
                onSubChange={esGasto ? setSubcategoriaId : undefined}
                invalido={Boolean(estado?.errors?.categoriaId)}
              />
            </div>

            {(casas.length > 1 || (esGasto && casas.length === 1)) && (
              <Field label="Casa" opcional={!esGasto} error={estado?.errors?.casaId}>
                <Select
                  name="casaId"
                  defaultValue={recurrencia?.casa?.id ?? inicial?.casaId ?? (casas[0]?.id ?? "")}
                >
                  {!esGasto && <option value="">Sin casa</option>}
                  {casas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Frecuencia">
                <Select
                  value={frecuencia}
                  onChange={(e) =>
                    setFrecuencia(e.target.value as RecurrenciaDTO["frecuencia"])
                  }
                >
                  {FRECUENCIAS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Día del mes"
                opcional
                error={estado?.errors?.diaMes}
                ayuda="Si el mes es corto, se cobra el último día."
              >
                <Input
                  type="number"
                  name="diaMes"
                  min={1}
                  max={31}
                  defaultValue={recurrencia?.diaMes ?? inicial?.diaMes ?? ""}
                  disabled={frecuencia === "SEMANAL"}
                />
              </Field>
              <Field label="Próxima" error={estado?.errors?.proximaFecha}>
                <Input
                  type="date"
                  name="proximaFecha"
                  defaultValue={toDateInputValue(
                    recurrencia?.proximaFecha ?? new Date(),
                  )}
                  required
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Hasta" opcional error={estado?.errors?.fin}>
                <Input
                  type="date"
                  name="fin"
                  defaultValue={
                    recurrencia?.fin ? toDateInputValue(recurrencia.fin) : ""
                  }
                />
              </Field>
              {esGasto && (
                <Field label={"Emisor"} opcional>
                  <Input
                    name="contraparte"
                    defaultValue={recurrencia?.contraparte ?? inicial?.contraparte ?? ""}
                    placeholder="Iberdrola"
                  />
                </Field>
              )}
              {!esGasto && (
                <Field label="Fuente" opcional>
                  <Input
                    name="contraparte"
                    defaultValue={recurrencia?.contraparte ?? inicial?.contraparte ?? ""}
                    placeholder="Empresa"
                  />
                </Field>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-3">
              <Switch
                checked={automatica}
                onCheckedChange={setAutomatica}
                aria-label="Crear el movimiento automáticamente"
              />
              <span className="text-xs">
                <span className="font-medium text-foreground">
                  Crear el movimiento automáticamente
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  Si lo desactivas, cada vez te lo propondremos y decidirás tú.
                </span>
              </span>
            </div>

            {estado?.message && <FormError>{estado.message}</FormError>}
          </DialogBody>

          <DialogFooter className="justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <SubmitButton size="sm">
              {recurrencia ? "Guardar cambios" : "Crear recurrencia"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

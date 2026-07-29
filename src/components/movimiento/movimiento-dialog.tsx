"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, HousePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDateInputValue } from "@/lib/format";
import { formatEUR } from "@/lib/money";
import type { FormState } from "@/lib/validation/form";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Kbd,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FieldError, FormError } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ComboboxTexto, type ComboOption } from "@/components/ui/combobox";
import { ImporteInput } from "./importe-input";
import { FechaChips } from "./fecha-chips";
import { CategoriaChips, type CategoriaChip } from "./categoria-chips";

export type CasaOpt = { id: string; nombre: string };

/** Lo que queda de un presupuesto, para enseñarlo al elegir la categoría. */
export type PresupuestoRestante = { restante: number; importe: number };

/** Lo que una sugerencia de concepto arrastra consigo. */
export type SugerenciaMovimiento = {
  concepto: string;
  categoriaId: string;
  subcategoriaId?: string | null;
  casaId?: string | null;
  /** `emisor` en gastos, `fuente` en ingresos. */
  origen?: string | null;
  metodoPago?: string | null;
  importe: number;
  veces: number;
};

export type MovimientoDefaults = {
  id?: string;
  importe?: number;
  fecha?: string;
  concepto?: string;
  categoriaId?: string;
  subcategoriaId?: string | null;
  casaId?: string | null;
  origen?: string | null;
  metodoPago?: string | null;
  recurrente?: boolean;
};

const METODOS = [
  ["EFECTIVO", "Efectivo"],
  ["TARJETA", "Tarjeta"],
  ["TRANSFERENCIA", "Transferencia"],
  ["DOMICILIACION", "Domiciliación"],
  ["OTRO", "Otro"],
] as const;

const esMac = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function MovimientoDialog({
  tipo,
  abierto,
  onOpenChange,
  action,
  categorias,
  casas,
  sugerencias = [],
  defaults,
  camposGasto = false,
  presupuestos,
}: {
  tipo: "gasto" | "ingreso";
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  categorias: CategoriaChip[];
  casas: CasaOpt[];
  sugerencias?: SugerenciaMovimiento[];
  defaults?: MovimientoDefaults;
  /** Los gastos añaden método de pago y exigen casa. */
  camposGasto?: boolean;
  /** Presupuesto vigente por categoría raíz, para avisar en el momento del alta. */
  presupuestos?: Record<string, PresupuestoRestante>;
}) {
  const editando = Boolean(defaults?.id);
  // Remontar el formulario lo resetea por completo: es la vía limpia de
  // «guardar y crear otro» con campos no controlados.
  const [generacion, setGeneracion] = React.useState(0);

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editando
              ? `Editar ${tipo}`
              : tipo === "gasto"
                ? "Nuevo gasto"
                : "Nuevo ingreso"}
          </DialogTitle>
          <DialogDescription>
            {editando
              ? "Modifica lo que necesites y guarda."
              : "Importe y categoría bastan; el resto se rellena solo."}
          </DialogDescription>
        </DialogHeader>

        <Formulario
          key={generacion}
          tipo={tipo}
          action={action}
          categorias={categorias}
          casas={casas}
          sugerencias={sugerencias}
          defaults={defaults}
          camposGasto={camposGasto}
          presupuestos={presupuestos}
          editando={editando}
          onHecho={(continuar) => {
            if (continuar) setGeneracion((g) => g + 1);
            else onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  tipo,
  action,
  categorias,
  casas,
  sugerencias,
  defaults,
  camposGasto,
  presupuestos,
  editando,
  onHecho,
}: {
  tipo: "gasto" | "ingreso";
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  categorias: CategoriaChip[];
  casas: CasaOpt[];
  sugerencias: SugerenciaMovimiento[];
  defaults?: MovimientoDefaults;
  camposGasto: boolean;
  presupuestos?: Record<string, PresupuestoRestante>;
  editando: boolean;
  onHecho: (continuar: boolean) => void;
}) {
  const [estado, setEstado] = React.useState<FormState>(undefined);
  const [enviando, setEnviando] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);
  const importeRef = React.useRef<HTMLInputElement>(null);
  // Ref y no estado: solo se lee dentro del envío, no afecta al pintado.
  const continuarRef = React.useRef(false);

  const [concepto, setConcepto] = React.useState(defaults?.concepto ?? "");
  const [fecha, setFecha] = React.useState(
    defaults?.fecha ?? toDateInputValue(new Date()),
  );
  const [categoriaId, setCategoriaId] = React.useState(defaults?.categoriaId ?? "");
  const [subcategoriaId, setSubcategoriaId] = React.useState(
    defaults?.subcategoriaId ?? "",
  );
  // Con una sola casa no hay nada que elegir: se preselecciona y se oculta.
  const [casaId, setCasaId] = React.useState(
    defaults?.casaId ?? (casas.length === 1 ? casas[0].id : ""),
  );
  const [origen, setOrigen] = React.useState(defaults?.origen ?? "");
  const [metodoPago, setMetodoPago] = React.useState(defaults?.metodoPago ?? "");
  const [detalles, setDetalles] = React.useState(false);

  const sinCasas = camposGasto && casas.length === 0;

  const opciones: ComboOption[] = React.useMemo(
    () =>
      sugerencias.map((s) => ({
        value: s.concepto,
        label: s.concepto,
        detalle: formatEUR(s.importe),
      })),
    [sugerencias],
  );

  /** Al elegir un concepto previo, se arrastra todo su contexto. */
  const aplicarSugerencia = (opt: ComboOption) => {
    const s = sugerencias.find((x) => x.concepto === opt.value);
    if (!s) return;
    setCategoriaId(s.categoriaId);
    setSubcategoriaId(s.subcategoriaId ?? "");
    if (s.casaId) setCasaId(s.casaId);
    if (s.origen) setOrigen(s.origen);
    if (s.metodoPago) setMetodoPago(s.metodoPago);
    importeRef.current?.focus();
  };

  async function enviar(fd: FormData) {
    setEnviando(true);
    const res = await action(estado, fd);
    setEnviando(false);
    setEstado(res);
    if (res?.ok) onHecho(continuarRef.current);
    continuarRef.current = false;
  }

  const enviarCon = (continuar: boolean) => {
    continuarRef.current = continuar;
    formRef.current?.requestSubmit();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      enviarCon(e.shiftKey && !editando);
    }
  };

  if (sinCasas) {
    return (
      <DialogBody>
        <EmptyState
          icon={HousePlus}
          titulo="Antes necesitas una casa"
          descripcion="Los gastos se asignan siempre a una vivienda. Crea la primera y vuelve aquí."
          accion={
            <Button asChild size="sm">
              <Link href="/casas">Crear una casa</Link>
            </Button>
          }
        />
      </DialogBody>
    );
  }

  const mod = esMac() ? "⌘" : "Ctrl";

  return (
    <form ref={formRef} action={enviar} onKeyDown={onKeyDown}>
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <DialogBody className="space-y-4">
        <div>
          <ImporteInput
            id="mov-importe"
            defaultValue={defaults?.importe}
            invalido={Boolean(estado?.errors?.importe)}
            inputRef={importeRef}
          />
          <FieldError>{estado?.errors?.importe?.[0]}</FieldError>
          {/* El <label> va después y oculto: el campo se explica solo, pero
              los lectores de pantalla y los tests necesitan el nombre. */}
          <label htmlFor="mov-importe" className="sr-only">
            Importe
          </label>
        </div>

        <div>
          <label
            htmlFor="mov-concepto"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Concepto
          </label>
          <ComboboxTexto
            id="mov-concepto"
            name="concepto"
            value={concepto}
            onValueChange={setConcepto}
            onSelect={aplicarSugerencia}
            options={opciones}
            required
            placeholder={
              tipo === "gasto" ? "Compra semanal, luz…" : "Nómina, alquiler…"
            }
            vacio="Sin usos anteriores"
          />
          <FieldError>{estado?.errors?.concepto?.[0]}</FieldError>
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
            onSubChange={camposGasto ? setSubcategoriaId : undefined}
            invalido={Boolean(estado?.errors?.categoriaId)}
          />
          <FieldError>{estado?.errors?.categoriaId?.[0]}</FieldError>
          <RestantePresupuesto info={presupuestos?.[categoriaId]} />
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Fecha</p>
            <FechaChips value={fecha} onChange={setFecha} />
            <FieldError>{estado?.errors?.fecha?.[0]}</FieldError>
          </div>

          {casas.length > 1 ? (
            <div>
              <label
                htmlFor="mov-casa"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Casa
              </label>
              <Select
                id="mov-casa"
                name="casaId"
                value={casaId}
                onChange={(e) => setCasaId(e.target.value)}
                className="h-8 w-auto min-w-36 text-xs"
              >
                {!camposGasto && <option value="">Sin casa</option>}
                {camposGasto && <option value="">Selecciona…</option>}
                {casas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
              <FieldError>{estado?.errors?.casaId?.[0]}</FieldError>
            </div>
          ) : (
            <input type="hidden" name="casaId" value={casaId} />
          )}
        </div>

        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setDetalles((d) => !d)}
            aria-expanded={detalles}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-150",
                detalles && "rotate-180",
              )}
            />
            Más detalles
          </button>

          {detalles && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="mov-origen"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  {camposGasto ? "Emisor" : "Fuente"}
                </label>
                <Input
                  id="mov-origen"
                  name={camposGasto ? "emisor" : "fuente"}
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  placeholder={camposGasto ? "Iberdrola" : "Empresa"}
                />
              </div>

              {camposGasto && (
                <div>
                  <label
                    htmlFor="mov-metodo"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Método de pago
                  </label>
                  <Select
                    id="mov-metodo"
                    name="metodoPago"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    <option value="">Sin especificar</option>
                    {METODOS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Sin <label>: dentro de un formulario Radix monta un checkbox
                  oculto y la etiqueta le reenvía el clic, con lo que el
                  interruptor cambia dos veces y nunca llega a marcarse. */}
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <Switch
                  name="recurrente"
                  defaultChecked={defaults?.recurrente}
                  aria-label="Se repite cada mes"
                />
                <span>Se repite cada mes</span>
              </div>
            </div>
          )}
        </div>

        {estado?.message && <FormError>{estado.message}</FormError>}
      </DialogBody>

      <DialogFooter>
        <p className="hidden items-center gap-1.5 text-2xs text-faint sm:flex">
          <Kbd>{mod}</Kbd>
          <Kbd>↵</Kbd>
          guardar
          {!editando && (
            <>
              <span className="mx-1 text-border-strong">·</span>
              <Kbd>{mod}</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>↵</Kbd>
              y otro
            </>
          )}
        </p>

        <div className="ml-auto flex items-center gap-2">
          {!editando && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={enviando}
              onClick={() => enviarCon(true)}
            >
              Guardar y otro
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={enviando}
            onClick={() => enviarCon(false)}
          >
            {editando ? "Guardar cambios" : `Guardar ${tipo}`}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

/**
 * Cuánto queda del presupuesto de la categoría elegida. Aparece en el momento
 * exacto en que la cifra importa: justo antes de confirmar el gasto.
 */
function RestantePresupuesto({ info }: { info?: PresupuestoRestante }) {
  if (!info) return null;
  const agotado = info.restante <= 0;

  return (
    <p
      className={cn(
        "mt-1.5 text-2xs",
        agotado ? "text-danger" : "text-muted-foreground",
      )}
    >
      {agotado
        ? `Presupuesto agotado: ${formatEUR(Math.abs(info.restante))} de más sobre ${formatEUR(info.importe)}.`
        : `Quedan ${formatEUR(info.restante)} de ${formatEUR(info.importe)} este mes.`}
    </p>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { HousePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDateInputValue } from "@/lib/format";
import { formatEUR } from "@/lib/money";
import type { FormState } from "@/lib/validation/form";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Kbd,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { MasOpciones } from "@/components/ui/mas-opciones";
import { FieldError, FormError } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ComboboxTexto, type ComboOption } from "@/components/ui/combobox";
import { ImporteInput } from "./importe-input";
import { FechaChips } from "./fecha-chips";
import { CategoriaChips, type CategoriaChip } from "./categoria-chips";

export type CasaOpt = { id: string; nombre: string };

export type Tipo = "GASTO" | "INGRESO";

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
  tipo?: Tipo;
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
  tipoInicial,
  abierto,
  onOpenChange,
  action,
  categoriasGasto,
  categoriasIngreso,
  casas,
  sugerenciasGasto = [],
  sugerenciasIngreso = [],
  defaults,
  presupuestos,
}: {
  tipoInicial: Tipo;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  categoriasGasto: CategoriaChip[];
  categoriasIngreso: CategoriaChip[];
  casas: CasaOpt[];
  sugerenciasGasto?: SugerenciaMovimiento[];
  sugerenciasIngreso?: SugerenciaMovimiento[];
  defaults?: MovimientoDefaults;
  /** Presupuesto vigente por categoría raíz, para avisar en el momento del alta. */
  presupuestos?: Record<string, PresupuestoRestante>;
}) {
  const editando = Boolean(defaults?.id);
  // Al editar, el tipo es el que ya tenía y no se cambia: son tablas distintas.
  const [tipo, setTipo] = React.useState<Tipo>(defaults?.tipo ?? tipoInicial);
  // Remontar el formulario lo resetea por completo: es la vía limpia de
  // «guardar y crear otro» con campos no controlados.
  const [generacion, setGeneracion] = React.useState(0);

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editando
              ? tipo === "GASTO"
                ? "Editar gasto"
                : "Editar ingreso"
              : "Nuevo movimiento"}
          </DialogTitle>
        </DialogHeader>

        <Formulario
          key={`${tipo}-${generacion}`}
          tipo={tipo}
          onTipoChange={setTipo}
          conmutador={!editando}
          action={action}
          categorias={tipo === "GASTO" ? categoriasGasto : categoriasIngreso}
          casas={casas}
          sugerencias={tipo === "GASTO" ? sugerenciasGasto : sugerenciasIngreso}
          defaults={defaults}
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
  onTipoChange,
  conmutador,
  action,
  categorias,
  casas,
  sugerencias,
  defaults,
  presupuestos,
  editando,
  onHecho,
}: {
  tipo: Tipo;
  onTipoChange: (t: Tipo) => void;
  conmutador: boolean;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  categorias: CategoriaChip[];
  casas: CasaOpt[];
  sugerencias: SugerenciaMovimiento[];
  defaults?: MovimientoDefaults;
  presupuestos?: Record<string, PresupuestoRestante>;
  editando: boolean;
  onHecho: (continuar: boolean) => void;
}) {
  const camposGasto = tipo === "GASTO";
  const [estado, setEstado] = React.useState<FormState>(undefined);
  const [enviando, setEnviando] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);
  const importeRef = React.useRef<HTMLInputElement>(null);
  // Ref y no estado: solo se lee dentro del envío, no afecta al pintado.
  const continuarRef = React.useRef(false);

  const [concepto, setConcepto] = React.useState(defaults?.concepto ?? "");
  const [importe, setImporte] = React.useState(defaults?.importe ? String(defaults.importe) : "");
  const [mesesProrrateo, setMesesProrrateo] = React.useState<number>(1);
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
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const current = document.activeElement as HTMLElement;
      const esSelect = current?.tagName === "SELECT";
      const esComboboxAbierto = current?.getAttribute("aria-expanded") === "true";

      if (!esSelect && !esComboboxAbierto) {
        e.preventDefault();
        const focusables = Array.from(
          formRef.current?.querySelectorAll<HTMLElement>(
            "input:not([type=hidden]), button, select, [tabindex='0']",
          ) || [],
        ).filter((el) => !el.hasAttribute("disabled"));
        const index = focusables.indexOf(current);
        if (index !== -1) {
          const next =
            e.key === "ArrowDown"
              ? focusables[index + 1] || focusables[0]
              : focusables[index - 1] || focusables[focusables.length - 1];
          next?.focus();
        }
      }
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
        <input type="hidden" name="tipo" value={tipo} />

        {conmutador && (
          <Segmented
            ariaLabel="Tipo de movimiento"
            value={tipo}
            onChange={onTipoChange}
            options={[
              { value: "GASTO", label: "Gasto" },
              { value: "INGRESO", label: "Ingreso" },
            ]}
          />
        )}

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
            placeholder={
              camposGasto ? "Compra semanal, luz…" : "Nómina, alquiler…"
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

        <MasOpciones>
          {camposGasto && !editando && (
            <div className="sm:col-span-2 rounded-lg border border-border bg-muted/20 p-2.5 space-y-1">
              <label
                htmlFor="mov-prorrateo"
                className="block text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Periodo de la factura (Dividir en varios meses)
              </label>
              <select
                id="mov-prorrateo"
                name="mesesProrrateo"
                value={mesesProrrateo}
                onChange={(e) => setMesesProrrateo(Number(e.target.value))}
                className="w-full h-8 text-xs rounded border border-border bg-card px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="1">1 mes (Gasto mensual estándar)</option>
                <option value="2">2 meses (Factura bimensual - Dividir en 2 cuotas)</option>
                <option value="3">3 meses (Factura trimestral - Dividir en 3 cuotas)</option>
              </select>
              {mesesProrrateo > 1 && (
                <p className="text-2xs text-emerald-500 font-medium pt-0.5">
                  Dividirá {importe ? `${importe} €` : "el importe"} en {mesesProrrateo} cuotas mensuales consecutivas de {importe ? `${(Number(importe) / mesesProrrateo).toFixed(2)} €` : "igual valor"}.
                </p>
              )}
            </div>
          )}
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
                  aria-label="Marcar como periódico"
                />
                <span className="text-xs text-muted-foreground">
                  Marcarlo como periódico. Para que se apunte solo cada mes, usa{" "}
                  <strong className="font-medium text-foreground">
                    Convertir en recurrente
                  </strong>{" "}
                  desde su fila.
                </span>
              </div>
        </MasOpciones>

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
              Añadir y otro
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={enviando}
            onClick={() => enviarCon(false)}
          >
            {editando ? "Guardar cambios" : camposGasto ? "Añadir gasto" : "Añadir ingreso"}
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

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmarAccion } from "@/components/ui/alert-dialog";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
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
import { armonizarColor } from "@/components/charts/chart-theme";
import { useTheme } from "@/components/theme-provider";
import { claveMes, sumarMeses, primerDiaDeMes } from "@/lib/periodo";
import { mesKeyLargo } from "@/lib/format";
import { formatEUR } from "@/lib/money";
import type { FormState } from "@/lib/validation/form";
import {
  CLAVE_GLOBAL,
  type PresupuestoConsumo,
} from "@/lib/validation/presupuesto";
import {
  actualizarPresupuestoAction,
  crearPresupuestoAction,
  eliminarPresupuestoAction,
} from "./actions";

type CategoriaOpt = {
  id: string;
  nombre: string;
  color: string;
  icono: string | null;
};

const ETIQUETA_ESTADO = {
  OK: null,
  AVISO: { texto: "Casi agotado", variant: "warning" as const },
  EXCEDIDO: { texto: "Excedido", variant: "danger" as const },
};

export function PresupuestosClient({
  mes,
  items,
  limite,
  gastado,
  categorias,
  casas,
  medias,
  puedeGestionar,
}: {
  mes: string;
  items: PresupuestoConsumo[];
  limite: number;
  gastado: number;
  categorias: CategoriaOpt[];
  casas: { id: string; nombre: string }[];
  medias: Record<string, number>;
  puedeGestionar: boolean;
}) {
  const [editando, setEditando] = React.useState<PresupuestoConsumo | null>(null);
  const [creando, setCreando] = React.useState(false);

  const porcentaje = limite > 0 ? Math.round((gastado / limite) * 100) : 0;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <NavegadorMes mes={mes} />
        {puedeGestionar && (
          <Button onClick={() => setCreando(true)}>
            <Plus />
            Nuevo presupuesto
          </Button>
        )}
      </div>

      {limite > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-2xs font-medium uppercase tracking-wide text-faint">
              Total mensual por categorías
            </p>
            <p className="font-serif text-lg font-medium tabular-nums">
              {formatEUR(gastado)}{" "}
              <span className="text-sm text-faint">de {formatEUR(limite)}</span>
            </p>
          </div>
          <Progress
            className="mt-2.5"
            valor={porcentaje}
            estado={porcentaje > 100 ? "EXCEDIDO" : porcentaje >= 85 ? "AVISO" : "OK"}
            ariaLabel="Consumo total del mes"
          />
        </Card>
      )}

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            titulo="Sin presupuestos este mes"
            descripcion="Pon un límite a una categoría y sabrás en cualquier momento cuánto te queda."
            accion={
              puedeGestionar && (
                <Button size="sm" onClick={() => setCreando(true)}>
                  <Plus />
                  Nuevo presupuesto
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((p) => (
              <FilaPresupuesto
                key={p.id}
                p={p}
                puedeGestionar={puedeGestionar}
                onEditar={() => setEditando(p)}
              />
            ))}
          </ul>
        )}
      </Card>

      <PresupuestoDialog
        abierto={creando}
        onOpenChange={setCreando}
        action={crearPresupuestoAction}
        categorias={categorias}
        casas={casas}
        medias={medias}
        mes={mes}
      />
      <PresupuestoDialog
        key={editando?.id}
        presupuesto={editando ?? undefined}
        abierto={editando !== null}
        onOpenChange={(v) => !v && setEditando(null)}
        action={actualizarPresupuestoAction}
        categorias={categorias}
        casas={casas}
        medias={medias}
        mes={mes}
      />
    </>
  );
}

/* ── Navegación de mes ─────────────────────────────────────────────────── */

function NavegadorMes({ mes }: { mes: string }) {
  const router = useRouter();
  const [pendiente, startTransition] = React.useTransition();

  const ir = (delta: number) => {
    const destino = claveMes(sumarMeses(primerDiaDeMes(mes), delta));
    startTransition(() => {
      router.push(`/presupuestos?mes=${destino}`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="icon-sm" aria-label="Mes anterior" onClick={() => ir(-1)}>
        <ChevronLeft />
      </Button>
      <span className="min-w-28 text-center font-serif text-lg font-medium first-letter:uppercase">
        {mesKeyLargo(mes)}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label="Mes siguiente" onClick={() => ir(1)}>
        <ChevronRight />
      </Button>
      {pendiente && (
        <Loader2 className="size-3.5 animate-spin text-faint" aria-label="Cargando" />
      )}
    </div>
  );
}

/* ── Fila ──────────────────────────────────────────────────────────────── */

function FilaPresupuesto({
  p,
  puedeGestionar,
  onEditar,
}: {
  p: PresupuestoConsumo;
  puedeGestionar: boolean;
  onEditar: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const [confirmando, setConfirmando] = React.useState(false);
  const etiqueta = ETIQUETA_ESTADO[p.estado];
  const nombre = p.categoria?.nombre ?? "Todas las categorías";

  return (
    <li className="group px-4 py-3">
      <div className="flex items-center gap-3">
        <MarcaCategoria
          icono={p.categoria?.icono}
          color={
            p.categoria
              ? armonizarColor(p.categoria.color, resolvedTheme)
              : "currentColor"
          }
          className="size-4 shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium">{nombre}</span>
            {p.casa && (
              <Badge variant="outline" className="shrink-0">
                {p.casa.nombre}
              </Badge>
            )}
            {p.periodo === "ANUAL" && (
              <Badge variant="neutral" className="shrink-0">
                Anual
              </Badge>
            )}
            {etiqueta && (
              <Badge variant={etiqueta.variant} className="shrink-0">
                {etiqueta.texto}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-2xs text-faint">
            {p.restante >= 0
              ? `Quedan ${formatEUR(p.restante)}`
              : `Te has pasado ${formatEUR(Math.abs(p.restante))}`}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm">
            <Money value={p.gastado} tono={p.estado === "OK" ? "neutro" : "gasto"} />
            <span className="text-faint"> / {formatEUR(p.importe)}</span>
          </p>
          <p className="text-2xs tabular-nums text-faint">{p.porcentaje} %</p>
        </div>

        {puedeGestionar && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones de ${nombre}`}
                className="shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEditar}>
                <Pencil />
                Editar
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
        )}
      </div>

      <Progress
        className="mt-2"
        valor={p.porcentaje}
        estado={p.estado}
        ariaLabel={`Consumo de ${nombre}`}
      />

      <ConfirmarAccion
        open={confirmando}
        onOpenChange={setConfirmando}
        titulo={`¿Eliminar el presupuesto de ${nombre}?`}
        descripcion="Los gastos no se tocan; solo desaparece el límite."
        onConfirmar={() => {
          const fd = new FormData();
          fd.set("id", p.id);
          void eliminarPresupuestoAction(fd);
        }}
      />
    </li>
  );
}

/* ── Alta y edición ────────────────────────────────────────────────────── */

function PresupuestoDialog({
  presupuesto,
  abierto,
  onOpenChange,
  action,
  categorias,
  casas,
  medias,
  mes,
}: {
  presupuesto?: PresupuestoConsumo;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  categorias: CategoriaOpt[];
  casas: { id: string; nombre: string }[];
  medias: Record<string, number>;
  mes: string;
}) {
  const [estado, setEstado] = React.useState<FormState>(undefined);
  const [categoriaId, setCategoriaId] = React.useState(
    presupuesto?.categoria?.id ?? "",
  );
  const [periodo, setPeriodo] = React.useState<"MENSUAL" | "ANUAL">(
    presupuesto?.periodo ?? "MENSUAL",
  );

  // La media del histórico es la mejor primera propuesta: evita la página en
  // blanco y ancla la cifra en lo que de verdad se gasta.
  const media = medias[categoriaId || CLAVE_GLOBAL] ?? 0;
  const sugerido = periodo === "ANUAL" ? media * 12 : media;

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {presupuesto ? "Editar presupuesto" : "Nuevo presupuesto"}
          </DialogTitle>
        </DialogHeader>

        <form
          action={async (fd) => {
            const res = await action(estado, fd);
            setEstado(res);
            if (res?.ok) onOpenChange(false);
          }}
        >
          {presupuesto && <input type="hidden" name="id" value={presupuesto.id} />}
          <input type="hidden" name="periodo" value={periodo} />

          <DialogBody className="space-y-3">
            <Field label="Categoría" error={estado?.errors?.categoriaId}>
              <Select
                name="categoriaId"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                <option value="">Todas (presupuesto global)</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>

            {casas.length > 1 && (
              <Field label="Casa" opcional>
                <Select name="casaId" defaultValue={presupuesto?.casa?.id ?? ""}>
                  <option value="">Todas las casas</option>
                  {casas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Periodo
              </span>
              <Segmented
                ariaLabel="Periodo del presupuesto"
                value={periodo}
                onChange={setPeriodo}
                options={[
                  { value: "MENSUAL", label: "Cada mes" },
                  { value: "ANUAL", label: "Al año" },
                ]}
              />
            </div>

            <Field
              label="Límite"
              error={estado?.errors?.importe}
              ayuda={
                sugerido > 0 && !presupuesto
                  ? `Vienes gastando unos ${formatEUR(sugerido)} por ${
                      periodo === "ANUAL" ? "año" : "mes"
                    }.`
                  : undefined
              }
            >
              <Input
                name="importe"
                inputMode="decimal"
                adornoDer="€"
                defaultValue={presupuesto?.importe ?? ""}
                placeholder={sugerido > 0 ? sugerido.toFixed(2) : "0,00"}
                autoFocus
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde" error={estado?.errors?.desde}>
                <Input
                  type="month"
                  name="desde"
                  defaultValue={presupuesto?.desde ?? mes}
                  required
                />
              </Field>
              <Field label="Hasta" opcional error={estado?.errors?.hasta}>
                <Input
                  type="month"
                  name="hasta"
                  defaultValue={presupuesto?.hasta ?? ""}
                />
              </Field>
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
              {presupuesto ? "Guardar cambios" : "Crear presupuesto"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

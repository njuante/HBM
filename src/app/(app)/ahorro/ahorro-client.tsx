"use client";

import React from "react";
import {
  PiggyBank,
  Plus,
  Target,
  Trophy,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { formatEUR } from "@/lib/money";
import { formatFecha } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { ConfirmarAccion } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResumenAhorroGlobal, MetaAhorroDTO } from "@/server/db/ahorro";
import { crearMetaAction, aportarMetaAction, eliminarMetaAction } from "./actions";

const COLORES_META = [
  { nombre: "Azul", hex: "#3b82f6" },
  { nombre: "Esmeralda", hex: "#10b981" },
  { nombre: "Púrpura", hex: "#8b5cf6" },
  { nombre: "Ámbar", hex: "#f59e0b" },
  { nombre: "Rosa", hex: "#ec4899" },
  { nombre: "Cian", hex: "#06b6d4" },
];

export function AhorroClient({ resumen }: { resumen: ResumenAhorroGlobal }) {
  const [creando, setCreando] = React.useState(false);
  const [aportandoMeta, setAportandoMeta] = React.useState<MetaAhorroDTO | null>(null);
  const [tipoOperacion, setTipoOperacion] = React.useState<"APORTAR" | "RETIRAR">("APORTAR");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas de Ahorro y Huchas"
        description="Destina tu dinero ahorrado a tus proyectos futuros (viajes, tecnología, fondo de emergencia)."
        action={
          <Button onClick={() => setCreando(true)}>
            <Plus />
            Nueva Meta de Ahorro
          </Button>
        }
      />

      {/* TARJETAS KPI DE RESUMEN GLOBAL */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-primary">
            <span>Total Ahorrado en Huchas</span>
            <PiggyBank className="size-4" />
          </div>
          <p className="mt-2 font-serif text-2xl font-semibold text-foreground">
            {formatEUR(resumen.totalAhorradoMetas)}
          </p>
          <p className="mt-1 text-2xs text-muted-foreground">
            Suma del capital comprometido en tus metas
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Metas en Progreso</span>
            <Target className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-serif text-2xl font-semibold text-foreground">
            {resumen.metasActivas} <span className="text-sm font-sans font-normal text-muted-foreground">huchas activas</span>
          </p>
          <p className="mt-1 text-2xs text-muted-foreground">
            Objetivos financieros en construcción
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Metas Conseguidas</span>
            <Trophy className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-serif text-2xl font-semibold text-emerald-500">
            {resumen.metasCompletadas} <span className="text-sm font-sans font-normal text-muted-foreground">objetivos cumplidos</span>
          </p>
          <p className="mt-1 text-2xs text-muted-foreground">
            ¡Huchas que han alcanzado el 100%!
          </p>
        </Card>
      </div>

      {/* GRID DE PARCELAS / METAS DE AHORRO */}
      {resumen.metas.length === 0 ? (
        // El mismo estado vacío que el resto de la app, en vez de uno propio.
        <Card>
          <EmptyState
            icon={PiggyBank}
            titulo="Aún no tienes metas de ahorro"
            descripcion="Una hucha para un viaje, un ordenador nuevo o el fondo de emergencia. Créala con «Nueva Meta de Ahorro» ahí arriba y ve echando dinero poco a poco."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumen.metas.map((meta) => (
            <TarjetaMeta
              key={meta.id}
              meta={meta}
              onAportar={() => {
                setTipoOperacion("APORTAR");
                setAportandoMeta(meta);
              }}
              onRetirar={() => {
                setTipoOperacion("RETIRAR");
                setAportandoMeta(meta);
              }}
            />
          ))}
        </div>
      )}

      {/* MODAL CREAR META */}
      <CrearMetaDialog abierto={creando} onOpenChange={setCreando} />

      {/* MODAL APORTAR / RETIRAR DINERO */}
      {aportandoMeta && (
        <AportarDineroDialog
          meta={aportandoMeta}
          tipo={tipoOperacion}
          abierto={Boolean(aportandoMeta)}
          onOpenChange={(v) => !v && setAportandoMeta(null)}
        />
      )}
    </div>
  );
}

/* ── TARJETA INDIVIDUAL DE META DE AHORRO ──────────────────────────────── */

function TarjetaMeta({
  meta,
  onAportar,
  onRetirar,
}: {
  meta: MetaAhorroDTO;
  onAportar: () => void;
  onRetirar: () => void;
}) {
  const { avisar } = useToast();
  const [borrando, setBorrando] = React.useState(false);

  return (
    <Card className="p-4 relative flex flex-col justify-between overflow-hidden border-border hover:border-primary/40 transition-colors">
      <div className="space-y-3">
        {/* Cabecera Tarjeta */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="size-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ backgroundColor: meta.color }}
            >
              {meta.completada ? <CheckCircle2 className="size-5" /> : <PiggyBank className="size-5" />}
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate text-foreground">{meta.nombre}</h4>
              {meta.concepto && (
                <p className="text-2xs text-muted-foreground truncate">{meta.concepto}</p>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Eliminar «${meta.nombre}»`}
            className="shrink-0 text-muted-foreground hover:text-danger"
            onClick={() => setBorrando(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        {/* Progreso e Importes */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-mono font-bold text-base text-foreground">
              {formatEUR(meta.actualImporte)}
            </span>
            <span className="text-2xs text-muted-foreground">
              de <strong>{formatEUR(meta.objetivoImporte)}</strong>
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${meta.porcentaje}%`,
                backgroundColor: meta.completada ? "#10b981" : meta.color,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-2xs text-muted-foreground">
            <span>{meta.porcentaje}% conseguido</span>
            <span>
              {meta.completada ? (
                <strong className="text-emerald-500 font-semibold">¡Completada! 🎉</strong>
              ) : (
                `Faltan ${formatEUR(meta.restante)}`
              )}
            </span>
          </div>
        </div>

        {/* Fecha Objetivo si existe */}
        {meta.fechaObjetivo && (
          <div className="flex items-center gap-1.5 text-2xs text-muted-foreground pt-1">
            <Calendar className="size-3 text-primary" />
            <span>Fecha objetivo: {formatFecha(meta.fechaObjetivo)}</span>
          </div>
        )}
      </div>

      {/* Botones de Acción */}
      <div className="grid grid-cols-2 gap-2 pt-4 mt-2 border-t border-border/60">
        <Button
          variant="secondary"
          size="xs"
          onClick={onRetirar}
          disabled={meta.actualImporte <= 0}
          className="text-2xs"
        >
          <ArrowDownRight className="size-3 text-amber-500 mr-1" />
          Retirar
        </Button>
        <Button size="xs" onClick={onAportar} className="text-2xs">
          <ArrowUpRight className="size-3 mr-1" />
          + Aportar
        </Button>
      </div>

      <ConfirmarAccion
        open={borrando}
        onOpenChange={setBorrando}
        titulo={`¿Eliminar hucha «${meta.nombre}»?`}
        descripcion="Se eliminará la meta de ahorro. El dinero asignado volverá a estar disponible sin clasificar."
        onConfirmar={async () => {
          await eliminarMetaAction(meta.id);
          avisar(`Hucha «${meta.nombre}» eliminada`);
        }}
      />
    </Card>
  );
}

/* ── DIÁLOGO CREAR NUEVA META ───────────────────────────────────────────── */

function CrearMetaDialog({
  abierto,
  onOpenChange,
}: {
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { avisar } = useToast();
  const [color, setColor] = React.useState(COLORES_META[0].hex);
  const [error, setError] = React.useState<string | undefined>();

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Meta de Ahorro</DialogTitle>
        </DialogHeader>

        <form
          action={async (fd) => {
            setError(undefined);
            const res = await crearMetaAction(fd);
            if (res.ok) {
              avisar("Meta de ahorro creada con éxito");
              onOpenChange(false);
            } else {
              // Sin esto el diálogo se quedaba quieto y parecía que no hacía nada.
              setError(res.error ?? "No se ha podido crear la meta.");
            }
          }}
        >
          <input type="hidden" name="color" value={color} />

          <DialogBody className="space-y-4">
            <FormError>{error}</FormError>

            <div>
              <label htmlFor="meta-nombre" className="block text-xs font-medium text-muted-foreground mb-1">
                ¿Para qué quieres ahorrar?
              </label>
              <Input
                id="meta-nombre"
                name="nombre"
                placeholder="Ej: Viaje a Japón, Nuevo PC Gaming, Fondo de emergencia"
                autoFocus
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="meta-objetivo" className="block text-xs font-medium text-muted-foreground mb-1">
                  Importe Objetivo (€)
                </label>
                <Input
                  id="meta-objetivo"
                  name="objetivoImporte"
                  type="number"
                  step="0.01"
                  placeholder="1500"
                  adornoDer="€"
                  required
                />
              </div>

              <div>
                <label htmlFor="meta-fecha" className="block text-xs font-medium text-muted-foreground mb-1">
                  Fecha Objetivo (Opcional)
                </label>
                <Input id="meta-fecha" name="fechaObjetivo" type="date" />
              </div>
            </div>

            <div>
              <label htmlFor="meta-concepto" className="block text-xs font-medium text-muted-foreground mb-1">
                Notas / Descripción (Opcional)
              </label>
              <Input
                id="meta-concepto"
                name="concepto"
                placeholder="Detalles sobre este proyecto o meta..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Color identificativo
              </label>
              <div className="flex items-center gap-2">
                {COLORES_META.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={`size-7 rounded-full transition-transform ${
                      color === c.hex ? "scale-125 ring-2 ring-offset-2 ring-primary" : "opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.nombre}
                  />
                ))}
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm">Crear Hucha</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── DIÁLOGO APORTAR / RETIRAR DINERO ───────────────────────────────────── */

function AportarDineroDialog({
  meta,
  tipo,
  abierto,
  onOpenChange,
}: {
  meta: MetaAhorroDTO;
  tipo: "APORTAR" | "RETIRAR";
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { avisar } = useToast();
  const [importe, setImporte] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();

  const esAportar = tipo === "APORTAR";

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {esAportar ? `Aportar a «${meta.nombre}»` : `Retirar de «${meta.nombre}»`}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(undefined);
            const val = Number(importe);
            if (!val || val <= 0) {
              setError("Escribe un importe mayor que 0.");
              return;
            }
            const finalImporte = esAportar ? val : -val;

            const res = await aportarMetaAction(meta.id, finalImporte, notas);
            if (res.ok) {
              avisar(esAportar ? `+${val} € aportados a ${meta.nombre}` : `-${val} € retirados de ${meta.nombre}`);
              onOpenChange(false);
            } else {
              setError(res.error ?? "No se ha podido registrar el movimiento.");
            }
          }}
        >
          <DialogBody className="space-y-3">
            <FormError>{error}</FormError>

            <div className="bg-muted/30 p-3 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ahorrado actualmente:</span>
                <span className="font-semibold">{formatEUR(meta.actualImporte)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Objetivo total:</span>
                <span className="font-semibold">{formatEUR(meta.objetivoImporte)}</span>
              </div>
            </div>

            <div>
              <label htmlFor="apor-importe" className="block text-xs font-medium text-muted-foreground mb-1">
                {esAportar ? "Importe a Aportar (€)" : "Importe a Retirar (€)"}
              </label>
              <Input
                id="apor-importe"
                type="number"
                step="0.01"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                placeholder="50.00"
                adornoDer="€"
                autoFocus
                required
              />
            </div>

            <div>
              <label htmlFor="apor-notas" className="block text-xs font-medium text-muted-foreground mb-1">
                Nota opcional
              </label>
              <Input
                id="apor-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder={esAportar ? "Ahorro del mes, extra bonus..." : "Compra del billete, pago..."}
              />
            </div>
          </DialogBody>

          <DialogFooter className="justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant={esAportar ? "primary" : "secondary"}>
              {esAportar ? "Añadir a la Hucha" : "Confirmar Retiro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

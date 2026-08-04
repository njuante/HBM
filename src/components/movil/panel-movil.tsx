import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Receipt, TrendingDown } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
import { tonosCategoria } from "@/lib/color-categoria";
import type { CategoriaTotal, Kpis, PuntoMensual } from "@/server/db/dashboard";
import type { PresupuestoConsumo } from "@/lib/validation/presupuesto";
import type { MovimientoDTO } from "@/lib/validation/movimiento";
import type { ProximoCargo } from "@/server/db/recurrencias";
import { AnilloFlujo, AreaTendencia, ArcoConsumo, BarraReparto } from "./graficos";
import { Fila, Grupo, Rotulo, Seccion } from "./lista";

/* ══════════════════════════════════════════════════════════════════════
   Panel para móvil.

   No es la pantalla de la web estrechada: es otra composición sobre los
   mismos datos. Las diferencias de fondo son tres.

   1. Jerarquía en vez de rejilla. En la web caben cuatro KPI en fila y
      todos pesan lo mismo. Aquí hay una sola cifra protagonista —el saldo—
      y el resto la acompaña. En una pantalla que se recorre con el pulgar,
      lo primero que se ve tiene que ser lo que se venía a mirar.

   2. Formas en vez de ejes. Los gráficos son anillos y áreas sin rótulos:
      dicen «cómo va» de un vistazo. El valor exacto se lee en el número,
      que va escrito al lado en grande.

   3. Recorrido en vez de tablero. Las secciones se apilan con aire y un
      rótulo, al modo de la lista agrupada de iOS, para que el pulgar baje
      por un hilo en lugar de saltar entre celdas.
   ══════════════════════════════════════════════════════════════════════ */

const pct = (parte: number, total: number) =>
  total > 0 ? Math.round((parte / total) * 100) : 0;

export function PanelMovil({
  meses,
  kpis,
  kpisAnterior,
  serie,
  categorias,
  presupuestos,
  presupuestoResumen,
  recientes,
  cargos,
  avisos,
}: {
  meses: number;
  kpis: Kpis;
  kpisAnterior: Kpis;
  serie: PuntoMensual[];
  categorias: CategoriaTotal[];
  presupuestos: PresupuestoConsumo[];
  presupuestoResumen: { limite: number; gastado: number };
  recientes: MovimientoDTO[];
  cargos: ProximoCargo[];
  /** Ya montado por el servidor: la banda de facturas y presupuestos. */
  avisos?: React.ReactNode;
}) {
  const hayDatos = kpis.ingresos > 0 || kpis.gastos > 0;
  const tasaAhorro = kpis.ingresos > 0 ? Math.round((kpis.saldo / kpis.ingresos) * 100) : null;

  const netoPorMes = serie.map((p) => p.ingresos - p.gastos);
  const gastoTotal = categorias.reduce((s, c) => s + c.total, 0);

  return (
    <div className="pb-4">
      {avisos}

      {!hayDatos ? (
        <Grupo className="px-5 py-10 text-center">
          <TrendingDown className="mx-auto size-8 text-faint" />
          <p className="mt-3 text-[15px] font-medium">Nada en este periodo</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            En cuanto apuntes el primer gasto o ingreso, aquí aparecerá el resumen.
          </p>
          <Link
            href="/movimientos?nuevo=1"
            className="pulsable mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Apuntar el primero
          </Link>
        </Grupo>
      ) : (
        <div className="entra-escalonado">
          <TarjetaSaldo
            saldo={kpis.saldo}
            tasaAhorro={tasaAhorro}
            neto={netoPorMes}
            meses={meses}
          />

          <Seccion>
            <Rotulo>Flujo del periodo</Rotulo>
            <TarjetaFlujo
              ingresos={kpis.ingresos}
              gastos={kpis.gastos}
              ingresosAnterior={kpisAnterior.ingresos}
              gastosAnterior={kpisAnterior.gastos}
            />
          </Seccion>

          {categorias.length > 0 && (
            <Seccion>
              <Rotulo accion={{ texto: "Ver todo", href: "/movimientos?tipo=GASTO" }}>
                En qué se va
              </Rotulo>
              <Grupo>
                {categorias.slice(0, 5).map((c) => (
                  <Fila
                    key={c.categoriaId ?? c.nombre}
                    icono={
                      <span
                        className="cat flex size-9 items-center justify-center rounded-full"
                        style={{
                          ...tonosCategoria(c.color),
                          backgroundColor: "color-mix(in oklab, var(--cat) 14%, transparent)",
                        }}
                      >
                        <MarcaCategoria icono={c.icono} color="var(--cat)" className="size-4" />
                      </span>
                    }
                    titulo={c.nombre}
                    valor={
                      <span className="text-[15px] font-semibold">{formatEUR(c.total)}</span>
                    }
                    detalle={`${pct(c.total, gastoTotal)}% del gasto`}
                    pie={<BarraReparto fraccion={c.total / (gastoTotal || 1)} color={c.color} />}
                    href={
                      c.categoriaId
                        ? `/movimientos?tipo=GASTO&categoriaId=${c.categoriaId}`
                        : undefined
                    }
                  />
                ))}
              </Grupo>
            </Seccion>
          )}

          {presupuestoResumen.limite > 0 && (
            <Seccion>
              <Rotulo accion={{ texto: "Gestionar", href: "/presupuestos" }}>
                Presupuesto del mes
              </Rotulo>
              <TarjetaPresupuesto
                limite={presupuestoResumen.limite}
                gastado={presupuestoResumen.gastado}
                items={presupuestos}
              />
            </Seccion>
          )}

          {kpis.facturasPendientes > 0 && (
            <Seccion>
              <Grupo>
                <Fila
                  icono={
                    <span className="flex size-9 items-center justify-center rounded-full bg-warning/12 text-warning">
                      <Receipt className="size-4" />
                    </span>
                  }
                  titulo="Facturas sin pagar"
                  detalle="Pendientes de liquidar"
                  valor={
                    <span className="text-[17px] font-semibold tabular-nums">
                      {kpis.facturasPendientes}
                    </span>
                  }
                  href="/facturas?estadoPago=PENDIENTE"
                />
              </Grupo>
            </Seccion>
          )}

          {recientes.length > 0 && (
            <Seccion>
              <Rotulo accion={{ texto: "Ver todos", href: "/movimientos" }}>
                Últimos movimientos
              </Rotulo>
              <Grupo>
                {recientes.slice(0, 5).map((m) => (
                  <FilaMovimiento key={m.id} m={m} />
                ))}
              </Grupo>
            </Seccion>
          )}

          {cargos.length > 0 && (
            <Seccion>
              <Rotulo accion={{ texto: "Recurrentes", href: "/recurrentes" }}>
                Próximos cargos
              </Rotulo>
              <Grupo>
                {cargos.slice(0, 4).map((c) => (
                  <Fila
                    key={`${c.recurrenciaId}-${c.fecha}`}
                    titulo={c.concepto}
                    detalle={formatFecha(c.fecha)}
                    valor={
                      <span
                        className={cn(
                          "text-[15px] font-semibold",
                          c.tipo === "INGRESO" ? "text-success" : "text-foreground",
                        )}
                      >
                        {c.tipo === "INGRESO" ? "+" : "−"}
                        {formatEUR(c.importe)}
                      </span>
                    }
                  />
                ))}
              </Grupo>
            </Seccion>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * La cifra protagonista.
 *
 * El área del fondo no lleva ejes ni cifras a propósito: su trabajo es dar
 * la forma del periodo detrás del número, no que se lean valores en ella.
 */
function TarjetaSaldo({
  saldo,
  tasaAhorro,
  neto,
  meses,
}: {
  saldo: number;
  tasaAhorro: number | null;
  neto: number[];
  meses: number;
}) {
  const positivo = saldo >= 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[26px] border border-border/70 bg-card",
        "shadow-[0_1px_2px_rgb(var(--shadow-color)/0.05),0_16px_40px_-20px_rgb(var(--shadow-color)/0.22)]",
      )}
    >
      {/* El área ocupa el tercio inferior y se funde con la tarjeta. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-24",
          positivo ? "text-success" : "text-danger",
        )}
      >
        <AreaTendencia serie={neto} id="saldo" />
      </div>

      <div className="relative px-5 pb-16 pt-5">
        <p className="text-xs font-medium uppercase tracking-[0.07em] text-muted-foreground">
          Saldo · {meses === 1 ? "este mes" : `${meses} meses`}
        </p>

        <p
          className={cn(
            "mt-2 font-serif text-[42px] font-medium leading-none tracking-tight tabular-nums",
            positivo ? "text-foreground" : "text-danger",
          )}
        >
          {positivo ? "+" : "−"}
          {formatEUR(Math.abs(saldo))}
        </p>

        {tasaAhorro != null && (
          <p className="mt-2.5 text-[13px] text-muted-foreground">
            <span
              className={cn(
                "font-semibold",
                tasaAhorro >= 0 ? "text-success" : "text-danger",
              )}
            >
              {tasaAhorro}%
            </span>{" "}
            de lo que entra se queda
          </p>
        )}
      </div>
    </div>
  );
}

/** Ingresos y gastos como dos aros, con su variación contra el periodo anterior. */
function TarjetaFlujo({
  ingresos,
  gastos,
  ingresosAnterior,
  gastosAnterior,
}: {
  ingresos: number;
  gastos: number;
  ingresosAnterior: number;
  gastosAnterior: number;
}) {
  const delta = (actual: number, previo: number) =>
    previo > 0 ? Math.round(((actual - previo) / previo) * 100) : null;

  const lineas = [
    {
      etiqueta: "Entra",
      valor: ingresos,
      variacion: delta(ingresos, ingresosAnterior),
      clase: "text-success",
      // En ingresos, subir es bueno; en gastos, al revés. El color de la
      // variación sigue eso y no el signo, que por sí solo no dice nada.
      bueno: (d: number) => d >= 0,
      Icono: ArrowDownLeft,
    },
    {
      etiqueta: "Sale",
      valor: gastos,
      variacion: delta(gastos, gastosAnterior),
      clase: "text-danger",
      bueno: (d: number) => d <= 0,
      Icono: ArrowUpRight,
    },
  ];

  return (
    <Grupo sinRelleno className="flex items-center gap-4 p-4">
      <div className="size-[92px] shrink-0">
        <AnilloFlujo ingresos={ingresos} gastos={gastos} />
      </div>

      <dl className="min-w-0 flex-1 space-y-3">
        {lineas.map(({ etiqueta, valor, variacion, clase, bueno, Icono }) => (
          <div key={etiqueta}>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icono className={cn("size-3.5", clase)} />
              {etiqueta}
            </dt>
            <dd className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[19px] font-semibold leading-none tabular-nums">
                {formatEUR(valor)}
              </span>
              {variacion != null && variacion !== 0 && (
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums",
                    bueno(variacion) ? "text-success" : "text-danger",
                  )}
                >
                  {variacion > 0 ? "↑" : "↓"}
                  {Math.abs(variacion)}%
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Grupo>
  );
}

/** Arco de consumo del mes más las categorías que van más apuradas. */
function TarjetaPresupuesto({
  limite,
  gastado,
  items,
}: {
  limite: number;
  gastado: number;
  items: PresupuestoConsumo[];
}) {
  const fraccion = limite > 0 ? gastado / limite : 0;
  const queda = limite - gastado;
  const tono = fraccion >= 1 ? "danger" : fraccion >= 0.8 ? "warning" : "primary";

  // Solo lo que aprieta: un presupuesto al 12% no necesita salir en el panel.
  const apurados = items
    .filter((p) => p.categoria && p.importe > 0)
    .sort((a, b) => b.porcentaje - a.porcentaje)
    .slice(0, 3);

  return (
    <Grupo sinRelleno>
      <div className="flex items-center gap-4 p-4">
        <div className="relative size-[92px] shrink-0">
          <ArcoConsumo fraccion={fraccion} tono={tono} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[19px] font-semibold leading-none tabular-nums">
              {Math.round(fraccion * 100)}%
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              usado
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted-foreground">
            {queda >= 0 ? "Queda por gastar" : "Te has pasado en"}
          </p>
          <p
            className={cn(
              "mt-1 text-[24px] font-semibold leading-none tabular-nums",
              queda >= 0 ? "text-foreground" : "text-danger",
            )}
          >
            {formatEUR(Math.abs(queda))}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
            {formatEUR(gastado)} de {formatEUR(limite)}
          </p>
        </div>
      </div>

      {apurados.length > 0 && (
        <div className="border-t border-border/60 px-4 py-1">
          {apurados.map((p) => (
            <Fila
              key={p.id}
              titulo={p.categoria!.nombre}
              valor={
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Math.round(p.porcentaje)}%
                </span>
              }
              pie={
                <BarraReparto
                  fraccion={p.porcentaje / 100}
                  color={p.categoria!.color}
                />
              }
            />
          ))}
        </div>
      )}
    </Grupo>
  );
}

function FilaMovimiento({ m }: { m: MovimientoDTO }) {
  const esIngreso = m.tipo === "INGRESO";
  const Icono = esIngreso ? ArrowDownLeft : ArrowUpRight;

  return (
    <Fila
      icono={
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-full",
            esIngreso ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
          )}
        >
          <Icono className="size-4" />
        </span>
      }
      titulo={m.concepto}
      detalle={
        <>
          {formatFecha(m.fecha)}
          {m.categoria && ` · ${m.categoria.nombre}`}
        </>
      }
      valor={
        <span
          className={cn(
            "text-[15px] font-semibold",
            esIngreso ? "text-success" : "text-foreground",
          )}
        >
          {esIngreso ? "+" : "−"}
          {formatEUR(m.importe)}
        </span>
      }
      href="/movimientos"
    />
  );
}

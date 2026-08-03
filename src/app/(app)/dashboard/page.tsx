import { Suspense } from "react";
import Link from "next/link";
import { LineChart, TrendingDown, Plus } from "lucide-react";
import { requireFamilia } from "@/server/auth/dal";
import { listCasas } from "@/server/db/casas";
import {
  gastosPorCategoria,
  kpisDashboard,
  resumenMensual,
  serieDiaria,
  type RangoDashboard,
} from "@/server/db/dashboard";
import { listMovimientos } from "@/server/db/movimientos";
import { alertasFacturas } from "@/server/db/facturas";
import { resumenPresupuestos, listPresupuestos } from "@/server/db/presupuestos";
import {
  asegurarRecurrencias,
  listPropuestas,
  proximosCargos,
} from "@/server/db/recurrencias";
import { mesActual } from "@/lib/periodo";
import { PageHeader } from "@/components/page-header";
import { Avisos } from "@/components/avisos";
import { ProximosCargos } from "@/components/proximos-cargos";
import { UltimosMovimientos } from "@/components/ultimos-movimientos";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/charts/kpi-card";
import { FlujoMensualChart } from "@/components/charts/flujo-mensual";
import { GastosPorCategoriaChart } from "@/components/charts/gastos-por-categoria";
import { PresupuestoProgresoChart } from "@/components/charts/presupuesto-progreso-chart";
import { FiltrosPanel } from "./filtros-panel";

export default async function DashboardPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireFamilia();
  const sp = await props.searchParams;

  const casaId = typeof sp.casaId === "string" && sp.casaId ? sp.casaId : undefined;
  const meses =
    Number(sp.meses) === 1 || Number(sp.meses) === 3 || Number(sp.meses) === 12
      ? Number(sp.meses)
      : 6;

  const now = new Date();
  const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const desde = new Date(now.getFullYear(), now.getMonth() - (meses - 1), 1);
  const rango: RangoDashboard = { casaId, desde, hasta };

  // El panel es la puerta de entrada: aquí se ponen al día las recurrencias
  // que ya tocaban, antes de leer nada (ver `asegurarRecurrencias`).
  await asegurarRecurrencias(ctx.familiaId);

  const casas = await listCasas(ctx.familiaId);

  return (
    <div>
      <PageHeader
        title="Panel"
        description={`${ctx.familia.nombre} · últimos ${meses} ${meses === 1 ? "mes" : "meses"}`}
        // Una sola acción, y que haga lo que promete: el «+» abre el diálogo
        // en vez de limitarse a navegar. El botón «Facturas» que había al lado
        // no era una acción, era el enlace que ya está en la navegación.
        action={
          <Button asChild size="sm">
            <Link href="/movimientos?nuevo=1">
              <Plus />
              Apuntar movimiento
            </Link>
          </Button>
        }
      />

      <Suspense fallback={null}>
        <BandaAvisos familiaId={ctx.familiaId} />
      </Suspense>

      <FiltrosPanel casas={casas} casaId={casaId} meses={meses} />

      <Suspense key={`${casaId}-${meses}`} fallback={<PanelSkeleton />}>
        <PanelContenido familiaId={ctx.familiaId} rango={rango} meses={meses} />
      </Suspense>

      {/* El consumo de presupuestos ya lo cuenta `PresupuestoProgresoChart`
          más arriba, y con más detalle. Tenerlo dos veces en la misma pantalla
          era repetir el mismo dato con otra forma. */}
      <div className="mt-3">
        <Suspense fallback={null}>
          <Cargos familiaId={ctx.familiaId} />
        </Suspense>
      </div>
    </div>
  );
}

async function Cargos({ familiaId }: { familiaId: string }) {
  const cargos = await proximosCargos(familiaId, 30);
  if (cargos.length === 0) return null;
  return <ProximosCargos cargos={cargos} />;
}

async function BandaAvisos({ familiaId }: { familiaId: string }) {
  const [facturas, presupuestos, propuestas] = await Promise.all([
    alertasFacturas(familiaId),
    resumenPresupuestos(familiaId, mesActual()),
    listPropuestas(familiaId),
  ]);
  return (
    <Avisos
      vencidas={facturas.vencidas}
      proximas={facturas.proximas}
      excedidos={presupuestos.excedidos}
      avisosPresupuesto={presupuestos.avisos}
      propuestas={propuestas.length}
    />
  );
}

async function PanelContenido({
  familiaId,
  rango,
  meses,
}: {
  familiaId: string;
  rango: RangoDashboard;
  meses: number;
}) {
  // Periodo anterior del mismo tamaño, solo para calcular la variación.
  const anteriorHasta = new Date(rango.desde.getTime() - 1);
  const anteriorDesde = new Date(
    rango.desde.getFullYear(),
    rango.desde.getMonth() - meses,
    1,
  );

  const [kpis, serie, categorias, kpisAnterior, recientes, presupuestosItems, presupuestosResumen] = await Promise.all([
    kpisDashboard(familiaId, rango),
    resumenMensual(familiaId, rango),
    gastosPorCategoria(familiaId, rango),
    kpisDashboard(familiaId, {
      ...rango,
      desde: anteriorDesde,
      hasta: anteriorHasta,
    }),
    listMovimientos(
      familiaId,
      { casaId: rango.casaId },
      { porPagina: 5 },
    ),
    listPresupuestos(familiaId, mesActual()),
    resumenPresupuestos(familiaId, mesActual()),
  ]);

  const hayDatos = kpis.ingresos > 0 || kpis.gastos > 0;

  // Sin base anterior no hay variación que enseñar.
  const delta = (actual: number, previo: number) =>
    previo > 0 ? (actual - previo) / previo : null;

  const tasaAhorro = kpis.ingresos > 0 ? Math.round((kpis.saldo / kpis.ingresos) * 100) : null;
  const sufijoSaldo =
    tasaAhorro != null
      ? `${tasaAhorro}% tasa de ahorro`
      : kpis.saldo >= 0
        ? "ahorro del periodo"
        : "déficit del periodo";

  return (
    <>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ingresos"
          valor={kpis.ingresos}
          tono="ingresos"
          serie={serie.map((p) => p.ingresos)}
          delta={delta(kpis.ingresos, kpisAnterior.ingresos)}
        />
        <KpiCard
          label="Gastos"
          valor={kpis.gastos}
          tono="gastos"
          serie={serie.map((p) => p.gastos)}
          delta={delta(kpis.gastos, kpisAnterior.gastos)}
        />
        <KpiCard
          label="Saldo"
          valor={kpis.saldo}
          serie={serie.map((p) => p.ingresos - p.gastos)}
          sufijo={sufijoSaldo}
        />
        <KpiCard
          label="Facturas pendientes"
          valor={kpis.facturasPendientes}
          crudo
          sufijo="sin pagar"
          href="/facturas?estadoPago=PENDIENTE"
        />
      </div>

      {!hayDatos ? (
        <Card>
          <EmptyState
            icon={LineChart}
            titulo="Todavía no hay movimientos en este periodo"
            descripcion="En cuanto registres el primer gasto o ingreso verás aquí el flujo mensual y el consumo de presupuesto."
            accion={
              <Button asChild size="sm">
                <Link href="/movimientos">Registrar el primero</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        /* `grid-cols-1` explícito y no la columna implícita: `auto` se
           dimensiona por contenido, así que el min-content de un texto
           `truncate` (que lleva `white-space: nowrap`) o del <svg> de Recharts
           clavaba la columna en ~374px y el panel salía recortado en móvil.
           `grid-cols-1` es `minmax(0, 1fr)`, que sí puede encoger. */
        <div className="grid grid-cols-1 gap-3">
          <FlujoMensualChart data={serie} />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {categorias.length > 0 ? (
                <GastosPorCategoriaChart data={categorias} casaId={rango.casaId} />
              ) : (
                <Card className="h-full">
                  <EmptyState
                    compacto
                    icon={TrendingDown}
                    titulo="Sin gastos en este periodo"
                    descripcion="El reparto por categoría aparecerá al registrar el primero."
                  />
                </Card>
              )}
            </div>

            <div className="lg:col-span-2">
              <PresupuestoProgresoChart
                items={presupuestosItems}
                limiteTotal={presupuestosResumen.limite}
                gastadoTotal={presupuestosResumen.gastado}
              />
            </div>
          </div>

          {recientes.items.length > 0 && (
            <div className="mt-1">
              <UltimosMovimientos items={recientes.items} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function PanelSkeleton() {
  return (
    <>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-4 py-3.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-3 h-7 w-28" />
            <Skeleton className="mt-3 h-2.5 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="mt-4 h-60 w-full" />
      </div>
    </>
  );
}

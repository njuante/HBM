import { Suspense } from "react";
import Link from "next/link";
import { LineChart, TrendingDown } from "lucide-react";
import { requireFamilia } from "@/server/auth/dal";
import { listCasas } from "@/server/db/casas";
import {
  gastosPorCategoria,
  kpisDashboard,
  resumenMensual,
  serieDiaria,
  type RangoDashboard,
} from "@/server/db/dashboard";
import { alertasFacturas } from "@/server/db/facturas";
import { resumenPresupuestos } from "@/server/db/presupuestos";
import {
  asegurarRecurrencias,
  listPropuestas,
  proximosCargos,
} from "@/server/db/recurrencias";
import { toDateInputValue } from "@/lib/format";
import { mesActual } from "@/lib/periodo";
import { PageHeader } from "@/components/page-header";
import { Avisos } from "@/components/avisos";
import { PresupuestosPanel } from "@/components/presupuestos-panel";
import { PropuestasPendientes } from "@/components/propuestas-pendientes";
import { ProximosCargos } from "@/components/proximos-cargos";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/charts/kpi-card";
import { FlujoMensualChart } from "@/components/charts/flujo-mensual";
import { GastosPorCategoriaChart } from "@/components/charts/gastos-por-categoria";
import { CalendarioGastoChart } from "@/components/charts/calendario-gasto";
import { FiltrosPanel } from "./filtros-panel";

export default async function DashboardPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireFamilia();
  const sp = await props.searchParams;

  const casaId = typeof sp.casaId === "string" && sp.casaId ? sp.casaId : undefined;
  const meses =
    Number(sp.meses) === 3 || Number(sp.meses) === 12 ? Number(sp.meses) : 6;

  const now = new Date();
  const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const desde = new Date(now.getFullYear(), now.getMonth() - (meses - 1), 1);
  const rango: RangoDashboard = { casaId, desde, hasta };

  // El panel es la puerta de entrada: aquí se ponen al día las recurrencias
  // que ya tocaban, antes de leer nada (ver `asegurarRecurrencias`).
  await asegurarRecurrencias(ctx.familiaId);

  // La cabecera y los filtros se pintan de inmediato; el grueso entra por
  // Suspense para que la página no quede en blanco esperando las consultas.
  const casas = await listCasas(ctx.familiaId);

  return (
    <div>
      <PageHeader
        title="Panel"
        description={`${ctx.familia.nombre} · últimos ${meses} meses`}
      />

      <Suspense fallback={null}>
        <BandaAvisos familiaId={ctx.familiaId} />
      </Suspense>

      <Suspense fallback={null}>
        <Pendientes familiaId={ctx.familiaId} />
      </Suspense>

      <FiltrosPanel casas={casas} casaId={casaId} meses={meses} />

      <Suspense key={`${casaId}-${meses}`} fallback={<PanelSkeleton />}>
        <PanelContenido familiaId={ctx.familiaId} rango={rango} meses={meses} />
      </Suspense>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Suspense fallback={null}>
          <Presupuestos familiaId={ctx.familiaId} />
        </Suspense>
        <Suspense fallback={null}>
          <Cargos familiaId={ctx.familiaId} />
        </Suspense>
      </div>
    </div>
  );
}

async function Pendientes({ familiaId }: { familiaId: string }) {
  const propuestas = await listPropuestas(familiaId);
  return <PropuestasPendientes propuestas={propuestas} className="mb-5" />;
}

async function Cargos({ familiaId }: { familiaId: string }) {
  const cargos = await proximosCargos(familiaId, 30);
  if (cargos.length === 0) return null;
  return <ProximosCargos cargos={cargos} />;
}

async function BandaAvisos({ familiaId }: { familiaId: string }) {
  const [facturas, presupuestos] = await Promise.all([
    alertasFacturas(familiaId),
    resumenPresupuestos(familiaId, mesActual()),
  ]);
  return (
    <Avisos
      vencidas={facturas.vencidas}
      proximas={facturas.proximas}
      excedidos={presupuestos.excedidos}
      avisosPresupuesto={presupuestos.avisos}
    />
  );
}

async function Presupuestos({ familiaId }: { familiaId: string }) {
  const resumen = await resumenPresupuestos(familiaId, mesActual());
  if (resumen.destacados.length === 0) return null;
  return (
    <PresupuestosPanel
      items={resumen.destacados}
      limite={resumen.limite}
      gastado={resumen.gastado}
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

  const [kpis, serie, categorias, diaria, kpisAnterior] = await Promise.all([
    kpisDashboard(familiaId, rango),
    resumenMensual(familiaId, rango),
    gastosPorCategoria(familiaId, rango),
    serieDiaria(familiaId, rango),
    kpisDashboard(familiaId, {
      ...rango,
      desde: anteriorDesde,
      hasta: anteriorHasta,
    }),
  ]);

  const hayDatos = kpis.ingresos > 0 || kpis.gastos > 0;

  // Sin base anterior no hay variación que enseñar.
  const delta = (actual: number, previo: number) =>
    previo > 0 ? (actual - previo) / previo : null;

  return (
    <>
      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          sufijo={kpis.saldo >= 0 ? "ahorro del periodo" : "déficit del periodo"}
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
            descripcion="En cuanto registres el primer gasto o ingreso verás aquí el flujo mensual, el reparto por categoría y la intensidad diaria."
            accion={
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link href="/gastos">Registrar un gasto</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/ingresos">Registrar un ingreso</Link>
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          <FlujoMensualChart data={serie} />

          <div className="grid gap-3 lg:grid-cols-5">
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
              <CalendarioGastoChart
                data={diaria}
                desde={toDateInputValue(rango.desde)}
                hasta={toDateInputValue(rango.hasta)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PanelSkeleton() {
  return (
    <>
      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, PiggyBank } from "lucide-react";
import { formatFecha } from "@/lib/format";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import type { AlertaFactura } from "@/server/db/facturas";
import type { PresupuestoConsumo } from "@/lib/validation/presupuesto";

/**
 * Banda de avisos del panel. Un único sitio para todo lo que reclama atención
 * —facturas que vencen y presupuestos que se agotan—, ordenado por urgencia.
 */
export function Avisos({
  vencidas,
  proximas,
  excedidos,
  avisosPresupuesto,
}: {
  vencidas: AlertaFactura[];
  proximas: AlertaFactura[];
  excedidos: PresupuestoConsumo[];
  avisosPresupuesto: PresupuestoConsumo[];
}) {
  const nada =
    vencidas.length === 0 &&
    proximas.length === 0 &&
    excedidos.length === 0 &&
    avisosPresupuesto.length === 0;
  if (nada) return null;

  return (
    <div className="mb-5 space-y-2">
      {vencidas.length > 0 && (
        <Alert
          variant="danger"
          icon={AlertTriangle}
          titulo={`${plural(vencidas.length, "factura vencida", "facturas vencidas")} sin pagar`}
        >
          <ListaFacturas
            items={vencidas}
            texto={(a) =>
              `venció el ${formatFecha(a.fechaVencimiento)} · hace ${plural(
                Math.abs(a.diasRestantes),
                "día",
                "días",
              )}`
            }
          />
          <Enlace href="/facturas?estadoPago=PENDIENTE" className="text-danger">
            Ver pendientes
          </Enlace>
        </Alert>
      )}

      {excedidos.length > 0 && (
        <Alert
          variant="danger"
          icon={PiggyBank}
          titulo={`${plural(
            excedidos.length,
            "presupuesto excedido",
            "presupuestos excedidos",
          )}`}
        >
          <ListaPresupuestos items={excedidos} />
          <Enlace href="/presupuestos" className="text-danger">
            Ver presupuestos
          </Enlace>
        </Alert>
      )}

      {proximas.length > 0 && (
        <Alert
          variant="warning"
          icon={Clock}
          titulo={`${plural(proximas.length, "factura próxima", "facturas próximas")} a vencer`}
        >
          <ListaFacturas
            items={proximas}
            texto={(a) =>
              `vence el ${formatFecha(a.fechaVencimiento)} · ${
                a.diasRestantes === 0
                  ? "hoy"
                  : `en ${plural(a.diasRestantes, "día", "días")}`
              }`
            }
          />
          <Enlace href="/facturas?estadoPago=PENDIENTE" className="text-warning">
            Ver pendientes
          </Enlace>
        </Alert>
      )}

      {avisosPresupuesto.length > 0 && (
        <Alert
          variant="warning"
          icon={PiggyBank}
          titulo={`${plural(
            avisosPresupuesto.length,
            "presupuesto a punto de agotarse",
            "presupuestos a punto de agotarse",
          )}`}
        >
          <ListaPresupuestos items={avisosPresupuesto} />
          <Enlace href="/presupuestos" className="text-warning">
            Ver presupuestos
          </Enlace>
        </Alert>
      )}
    </div>
  );
}

const plural = (n: number, singular: string, p: string) =>
  `${n} ${n === 1 ? singular : p}`;

function nombreFactura(a: AlertaFactura): string {
  return a.emisor ?? (a.numeroFactura ? `Nº ${a.numeroFactura}` : "Factura");
}

function ListaFacturas({
  items,
  texto,
}: {
  items: AlertaFactura[];
  texto: (a: AlertaFactura) => string;
}) {
  return (
    <Lista
      total={items.length}
      filas={items.slice(0, 4).map((a) => ({
        id: a.id,
        nombre: nombreFactura(a),
        detalle: texto(a),
      }))}
    />
  );
}

function ListaPresupuestos({ items }: { items: PresupuestoConsumo[] }) {
  return (
    <Lista
      total={items.length}
      filas={items.slice(0, 4).map((p) => ({
        id: p.id,
        nombre: p.categoria?.nombre ?? "Presupuesto global",
        detalle:
          p.restante < 0
            ? `${formatEUR(Math.abs(p.restante))} de más · ${p.porcentaje} %`
            : `quedan ${formatEUR(p.restante)} · ${p.porcentaje} %`,
      }))}
    />
  );
}

function Lista({
  filas,
  total,
}: {
  filas: { id: string; nombre: string; detalle: string }[];
  total: number;
}) {
  return (
    <ul className="mt-1 space-y-0.5 text-xs">
      {filas.map((f) => (
        <li key={f.id} className="flex flex-wrap gap-x-1.5">
          <span className="font-medium text-foreground">{f.nombre}</span>
          <span>{f.detalle}</span>
        </li>
      ))}
      {total > filas.length && (
        <li className="text-faint">y {total - filas.length} más</li>
      )}
    </ul>
  );
}

function Enlace({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-3" />
    </Link>
  );
}

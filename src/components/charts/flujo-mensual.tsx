"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEUR } from "@/lib/money";
import { formatEURCompact, mesKeyLabel } from "@/lib/format";
import type { PuntoMensual } from "@/server/db/dashboard";
import { ChartFrame } from "./chart-frame";
import { TooltipPanel } from "./chart-tooltip";
import { useChartTheme } from "./chart-theme";

type Punto = {
  mes: string;
  etiqueta: string;
  ingresos: number;
  /** Negativo a propósito: se dibuja bajo la línea cero. */
  gastosNeg: number;
  gastos: number;
  neto: number;
};

/**
 * Flujo del periodo: ingresos hacia arriba, gastos hacia abajo y el saldo
 * neto como línea sobre ambos.
 *
 * Es un eje cero compartido en vez de dos barras adosadas: el hueco entre
 * la barra de arriba y la de abajo *es* el resultado del mes, y se lee sin
 * hacer ninguna resta mental.
 */
export function FlujoMensualChart({ data }: { data: PuntoMensual[] }) {
  const t = useChartTheme();

  const puntos: Punto[] = data.map((d) => ({
    mes: d.mes,
    etiqueta: mesKeyLabel(d.mes),
    ingresos: d.ingresos,
    gastos: d.gastos,
    gastosNeg: -d.gastos,
    neto: d.ingresos - d.gastos,
  }));

  const totalIngresos = puntos.reduce((s, p) => s + p.ingresos, 0);
  const totalGastos = puntos.reduce((s, p) => s + p.gastos, 0);

  return (
    <ChartFrame
      titulo="Flujo mensual"
      subtitulo={`${formatEUR(totalIngresos)} entran · ${formatEUR(totalGastos)} salen`}
      leyenda={[
        { label: "Ingresos", color: t.ingresos },
        { label: "Gastos", color: t.gastos },
        { label: "Saldo", color: t.neto, forma: "linea" },
      ]}
      descripcion="Ingresos, gastos y saldo neto de cada mes del periodo."
      tabla={{
        cabeceras: ["Mes", "Ingresos", "Gastos", "Saldo"],
        filas: puntos.map((p) => [
          p.etiqueta,
          formatEUR(p.ingresos),
          formatEUR(p.gastos),
          formatEUR(p.neto),
        ]),
      }}
    >
      <ResponsiveContainer width="100%" height={264}>
        <ComposedChart
          data={puntos}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid
            stroke={t.grid}
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="etiqueta"
            tick={{ fill: t.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickFormatter={(v: number) => formatEURCompact(Math.abs(v))}
            tick={{ fill: t.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={54}
          />
          <ReferenceLine y={0} stroke={t.axis} strokeWidth={1} />
          <Tooltip
            cursor={{ fill: t.axis, fillOpacity: 0.06 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Punto;
              return (
                <TooltipPanel
                  titulo={p.etiqueta}
                  filas={[
                    { label: "Ingresos", value: p.ingresos, color: t.ingresos },
                    { label: "Gastos", value: p.gastos, color: t.gastos },
                    {
                      label: "Saldo",
                      value: p.neto,
                      color: t.neto,
                      linea: true,
                      destacado: true,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="ingresos"
            fill={t.ingresos}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="gastosNeg"
            fill={t.gastos}
            radius={[0, 0, 2, 2]}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="neto"
            stroke={t.neto}
            strokeWidth={1.25}
            strokeDasharray="4 3"
            // Sin puntos por mes: en una serie de doce el reguero de círculos
            // pesa más que la propia tendencia.
            dot={false}
            activeDot={{ r: 3, fill: t.neto, stroke: t.superficie, strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

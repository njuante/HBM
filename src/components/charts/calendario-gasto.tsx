"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEUR } from "@/lib/money";
import { formatEURCompact, formatFecha } from "@/lib/format";
import type { PuntoDiario } from "@/server/db/dashboard";
import { ChartFrame } from "./chart-frame";
import { TooltipPanel } from "./chart-tooltip";
import { useChartTheme } from "./chart-theme";

/**
 * Evolución y ritmo del gasto diario.
 *
 * Muestra la serie diaria con una curva suave de área con gradiente,
 * indicando el gasto medio diario y identificando picos de consumo.
 */
export function CalendarioGastoChart({
  data,
  desde,
  hasta,
}: {
  data: PuntoDiario[];
  desde: string;
  hasta: string;
}) {
  const t = useChartTheme();

  const total = data.reduce((s, d) => s + d.total, 0);
  const diasConGasto = data.filter((d) => d.total > 0).length;
  const totalDias = data.length || 1;
  const promedioDiario = total / totalDias;

  const maxObj = data.reduce((max, d) => (d.total > max.total ? d : max), {
    dia: "",
    total: 0,
  });

  const puntos = data.map((d) => ({
    diaIso: d.dia,
    etiqueta: formatFecha(d.dia).slice(0, 6), // "15 jun"
    total: d.total,
  }));

  return (
    <ChartFrame
      titulo="Ritmo de gasto diario"
      subtitulo={`Media de ${formatEUR(promedioDiario)}/día · ${diasConGasto} días con compras`}
      descripcion="Evolución diaria de gastos con resumen de media y picos de consumo."
      acciones={
        maxObj.total > 0 ? (
          <div className="flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-0.5 text-2xs font-medium text-danger">
            <span>Pico: {formatEUR(maxObj.total)}</span>
          </div>
        ) : null
      }
      tabla={{
        cabeceras: ["Día", "Gasto"],
        filas: data.map((d) => [d.dia, formatEUR(d.total)]),
      }}
    >
      <ResponsiveContainer width="100%" height={264}>
        <AreaChart
          data={puntos}
          margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="gastoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={t.gastos} stopOpacity={0.4} />
              <stop offset="95%" stopColor={t.gastos} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={t.grid}
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="etiqueta"
            tick={{ fill: t.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => formatEURCompact(v)}
            tick={{ fill: t.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: t.axis, strokeWidth: 1, strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof puntos)[0];
              return (
                <TooltipPanel
                  titulo={formatFecha(p.diaIso)}
                  filas={[
                    {
                      label: "Gasto del día",
                      value: p.total,
                      color: t.gastos,
                      destacado: true,
                    },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={t.gastos}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#gastoGradient)"
            activeDot={{
              r: 4,
              fill: t.gastos,
              stroke: t.superficie,
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

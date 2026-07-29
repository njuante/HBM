"use client";

import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PuntoDiario } from "@/server/db/dashboard";
import { ChartFrame } from "./chart-frame";
import { useChartTheme } from "./chart-theme";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** Lunes de la semana a la que pertenece `d`. */
function lunesDe(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // 0 = lunes
  out.setDate(out.getDate() - dow);
  return out;
}

const clave = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/**
 * Calendario de intensidad del gasto diario.
 *
 * Responde de un vistazo a algo que ninguna serie mensual contesta: *cuándo*
 * se gasta. Los picos de principio de mes (recibos) y los fines de semana
 * saltan solos.
 */
export function CalendarioGastoChart({
  data,
  desde,
  hasta,
}: {
  data: PuntoDiario[];
  /** ISO 'YYYY-MM-DD'. Se pasan ya calculados desde el servidor. */
  desde: string;
  hasta: string;
}) {
  const t = useChartTheme();

  const porDia = new Map(data.map((d) => [d.dia, d.total]));
  const max = data.reduce((m, d) => Math.max(m, d.total), 0);

  const fin = new Date(`${hasta}T00:00:00`);
  const inicio = lunesDe(new Date(`${desde}T00:00:00`));

  // Columnas = semanas; filas = día de la semana.
  const semanas: Date[][] = [];
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    const semana: Date[] = [];
    for (let i = 0; i < 7; i++) {
      semana.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(semana);
  }

  const inicioReal = new Date(`${desde}T00:00:00`);
  const total = data.reduce((s, d) => s + d.total, 0);
  const diasConGasto = data.filter((d) => d.total > 0).length;

  // Etiqueta de mes en la primera semana que lo estrena, pero solo si hay
  // sitio: dos etiquetas a menos de tres columnas se pisarían.
  let ultimaEtiqueta = -99;
  const etiquetasMes = semanas.map((semana, i) => {
    const mes = semana[0].getMonth();
    const anterior = i > 0 ? semanas[i - 1][0].getMonth() : -1;
    if (mes === anterior || i - ultimaEtiqueta < 3) return "";
    ultimaEtiqueta = i;
    return MESES[mes];
  });

  return (
    <ChartFrame
      titulo="Intensidad diaria"
      subtitulo={`${diasConGasto} ${diasConGasto === 1 ? "día" : "días"} con gasto · ${formatEUR(total)}`}
      descripcion="Gasto de cada día del periodo, en una rejilla de semanas: cuanto más oscura la celda, mayor el gasto de ese día."
      tabla={{
        cabeceras: ["Día", "Gasto"],
        filas: data.map((d) => [d.dia, formatEUR(d.total)]),
      }}
      acciones={
        <div className="flex items-center gap-1.5 text-2xs text-faint">
          <span>menos</span>
          <span aria-hidden className="size-2.5 rounded-xs bg-muted" />
          {[0.25, 0.5, 0.75, 1].map((n) => (
            <span
              key={n}
              aria-hidden
              className="size-2.5 rounded-xs"
              style={{ backgroundColor: t.gastos, opacity: 0.28 + n * 0.72 }}
            />
          ))}
          <span>más</span>
        </div>
      }
    >
      <div className="overflow-x-auto px-3 pb-2 pt-1">
        <div className="inline-flex min-w-full flex-col gap-1">
          <div className="flex gap-[3px] pl-5">
            {etiquetasMes.map((m, i) => (
              <span
                key={i}
                className="relative w-[11px] shrink-0 text-2xs leading-none text-faint"
              >
                <span className="absolute left-0 top-0 whitespace-nowrap">{m}</span>
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            <div className="flex w-4 shrink-0 flex-col gap-[3px] pr-1">
              {DIAS.map((d, i) => (
                <span
                  key={d}
                  className="flex h-[11px] items-center text-2xs leading-none text-faint"
                >
                  {i % 2 === 0 ? d : ""}
                </span>
              ))}
            </div>

            {semanas.map((semana, i) => (
              <div key={i} className="flex shrink-0 flex-col gap-[3px]">
                {semana.map((dia) => {
                  const fuera = dia < inicioReal || dia > fin;
                  const valor = porDia.get(clave(dia)) ?? 0;
                  const intensidad = max > 0 ? valor / max : 0;
                  return (
                    <span
                      key={dia.getTime()}
                      title={
                        fuera
                          ? undefined
                          : `${dia.toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "long",
                            })}: ${formatEUR(valor)}`
                      }
                      className={cn(
                        "size-[11px] rounded-xs",
                        fuera && "opacity-0",
                        // Un día sin gasto es un hueco neutro, no un rojo
                        // clarísimo: solo los días con gasto llevan color.
                        !fuera && valor === 0 && "bg-muted",
                      )}
                      style={
                        fuera || valor === 0
                          ? undefined
                          : {
                              backgroundColor: t.gastos,
                              // Escala con raíz: sin ella un solo día grande
                              // deja el resto del mes casi en blanco.
                              opacity: 0.28 + Math.sqrt(intensidad) * 0.72,
                            }
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ChartFrame>
  );
}

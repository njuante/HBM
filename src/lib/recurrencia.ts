// Aritmética de repeticiones. Sin Prisma ni acceso a datos: es la pieza que
// decide cuándo toca el siguiente movimiento, y se prueba aparte.

export type Frecuencia =
  | "SEMANAL"
  | "MENSUAL"
  | "BIMESTRAL"
  | "TRIMESTRAL"
  | "SEMESTRAL"
  | "ANUAL";

/** Meses que avanza cada frecuencia. `SEMANAL` va aparte, en días. */
const MESES_POR_FRECUENCIA: Record<Exclude<Frecuencia, "SEMANAL">, number> = {
  MENSUAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

export const ETIQUETA_FRECUENCIA: Record<Frecuencia, string> = {
  SEMANAL: "cada semana",
  MENSUAL: "cada mes",
  BIMESTRAL: "cada 2 meses",
  TRIMESTRAL: "cada 3 meses",
  SEMESTRAL: "cada 6 meses",
  ANUAL: "cada año",
};

/** Último día del mes (1-31) al que pertenece la fecha. */
function ultimoDiaDelMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

/**
 * Siguiente ocurrencia después de `fecha`.
 *
 * `diaMes` fija el día del mes; si ese mes no lo tiene (un 31 en abril, un 30
 * en febrero) se recorta al último día, que es lo que hace un recibo real. Sin
 * `diaMes` se conserva el día de la fecha de partida con el mismo recorte.
 */
export function siguienteFecha(
  fecha: Date,
  frecuencia: Frecuencia,
  intervalo = 1,
  diaMes?: number | null,
): Date {
  const pasos = Math.max(1, Math.floor(intervalo));

  if (frecuencia === "SEMANAL") {
    const d = new Date(fecha);
    d.setDate(d.getDate() + 7 * pasos);
    return d;
  }

  const salto = MESES_POR_FRECUENCIA[frecuencia] * pasos;
  const objetivo = diaMes ?? fecha.getDate();

  // Construir sobre el día 1 evita el desbordamiento de JS: `new Date(2026, 0,
  // 31)` + 1 mes daría el 3 de marzo en vez del 28 de febrero.
  const base = new Date(fecha.getFullYear(), fecha.getMonth() + salto, 1);
  const dia = Math.min(objetivo, ultimoDiaDelMes(base.getFullYear(), base.getMonth()));

  return new Date(
    base.getFullYear(),
    base.getMonth(),
    dia,
    fecha.getHours(),
    fecha.getMinutes(),
    fecha.getSeconds(),
    fecha.getMilliseconds(),
  );
}

/**
 * Todas las ocurrencias pendientes desde `desde` (incluida) hasta `hasta`.
 * El tope de 200 es una red de seguridad: con datos corruptos, mejor generar de
 * menos que colgar el proceso.
 */
export function ocurrenciasHasta(
  desde: Date,
  hasta: Date,
  frecuencia: Frecuencia,
  intervalo = 1,
  diaMes?: number | null,
  fin?: Date | null,
  tope = 200,
): Date[] {
  const out: Date[] = [];
  let cursor = new Date(desde);

  while (cursor <= hasta && out.length < tope) {
    if (fin && cursor > fin) break;
    out.push(new Date(cursor));
    cursor = siguienteFecha(cursor, frecuencia, intervalo, diaMes);
  }
  return out;
}

/** Texto legible de la periodicidad: «cada mes el día 3». */
export function describeFrecuencia(
  frecuencia: Frecuencia,
  intervalo: number,
  diaMes?: number | null,
): string {
  const base =
    intervalo > 1 && frecuencia !== "SEMANAL"
      ? `cada ${MESES_POR_FRECUENCIA[frecuencia] * intervalo} meses`
      : intervalo > 1
        ? `cada ${intervalo} semanas`
        : ETIQUETA_FRECUENCIA[frecuencia];

  return diaMes && frecuencia !== "SEMANAL" ? `${base} el día ${diaMes}` : base;
}

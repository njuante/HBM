// Utilidades de periodo. Un "mes" es la cadena 'YYYY-MM' que produce un
// <input type="month">, y es también la clave que usan las series del panel.
//
// Todo se construye en hora local, igual que el resto de la app: las fechas de
// los movimientos se guardan como el día elegido a las 00:00 locales.

/** Date -> 'YYYY-MM'. */
export function claveMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Mes en curso como 'YYYY-MM'. */
export function mesActual(): string {
  return claveMes(new Date());
}

/** 'YYYY-MM' -> Date del día 1 a las 00:00. Con basura devuelve el mes actual. */
export function primerDiaDeMes(mes: string): Date {
  const m = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!m) {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}

/** Suma meses (admite negativos) conservando el día 1. */
export function sumarMeses(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Rango semiabierto [desde, hasta) del mes. */
export function rangoMes(mes: string): { desde: Date; hasta: Date } {
  const desde = primerDiaDeMes(mes);
  return { desde, hasta: sumarMeses(desde, 1) };
}

/** Rango semiabierto [desde, hasta) del año natural al que pertenece el mes. */
export function rangoAno(mes: string): { desde: Date; hasta: Date } {
  const d = primerDiaDeMes(mes);
  return {
    desde: new Date(d.getFullYear(), 0, 1),
    hasta: new Date(d.getFullYear() + 1, 0, 1),
  };
}

/** Lista de meses 'YYYY-MM' desde `mes` hacia atrás, incluido (más reciente primero). */
export function mesesAtras(mes: string, cuantos: number): string[] {
  const base = primerDiaDeMes(mes);
  return Array.from({ length: cuantos }, (_, i) => claveMes(sumarMeses(base, -i)));
}

/** Compara dos meses 'YYYY-MM' como cadenas: el formato ya ordena bien. */
export function mesEnRango(mes: string, desde: string, hasta?: string | null): boolean {
  return mes >= desde && (!hasta || mes <= hasta);
}

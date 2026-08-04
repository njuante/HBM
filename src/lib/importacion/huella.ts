import { createHash } from "node:crypto";

/** Lo mínimo que identifica a un apunte del extracto. */
export type ApunteExtracto = {
  fecha: Date | string;
  concepto: string;
  importe: number;
  tipo: "GASTO" | "INGRESO";
};

/**
 * Normaliza el concepto para que el mismo apunte dé la misma huella aunque el
 * banco cambie espaciado, mayúsculas o acentos entre descargas.
 *
 * No se toca la puntuación: en los extractos del Santander los guiones y las
 * barras separan datos reales (comercio, tarjeta, referencia) y quitarlos
 * acercaría demasiado apuntes que son distintos.
 */
export function normalizarConcepto(concepto: string): string {
  return concepto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // fuera los diacríticos
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** La fecha entra solo por su día natural: la hora no viene en el extracto. */
function diaNatural(fecha: Date | string): string {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Huella estable de un apunte bancario.
 *
 * Es lo que permite reimportar los últimos días una y otra vez sin duplicar:
 * el mismo apunte da siempre la misma huella, así que la restricción única de
 * la base de datos rechaza la segunda copia.
 *
 * Deliberadamente **no** incluye la categoría ni la casa: son decisiones del
 * usuario al importar, y recategorizar un gasto no puede convertirlo en un
 * apunte «nuevo» que la siguiente importación vuelva a meter.
 */
export function huellaApunte(apunte: ApunteExtracto): string {
  const partes = [
    diaNatural(apunte.fecha),
    normalizarConcepto(apunte.concepto),
    // El importe siempre en positivo y con dos decimales: el signo ya está en
    // el tipo, y así 10.1 y 10.10 no dan huellas distintas.
    Math.abs(apunte.importe).toFixed(2),
    apunte.tipo,
  ];
  return createHash("sha256").update(partes.join("|")).digest("hex").slice(0, 32);
}

// Utilidades de dinero. De momento trabajamos solo en EUR (ver plan).
// Los importes se guardan como Decimal en BD; en la app se manejan como number
// (euros) tras convertirlos en la capa de acceso a datos.

const eurFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

/** Formatea un importe en euros: 1234.5 -> "1.234,50 €". */
export function formatEUR(amount: number): string {
  return eurFormatter.format(amount);
}

/**
 * Convierte un valor Decimal de Prisma (o string/number) a number con 2
 * decimales. Prisma serializa Decimal como objeto/string, no como number.
 */
export function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Math.round(n * 100) / 100;
}

/** Suma una lista de importes redondeando a céntimos para evitar errores float. */
export function sumImportes(importes: number[]): number {
  const totalCents = importes.reduce(
    (acc, n) => acc + Math.round(n * 100),
    0,
  );
  return totalCents / 100;
}

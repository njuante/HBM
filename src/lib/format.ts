const fechaFmt = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** 2026-06-15 -> "15 jun 2026". */
export function formatFecha(d: Date | string): string {
  return fechaFmt.format(typeof d === "string" ? new Date(d) : d);
}

/** Devuelve 'YYYY-MM-DD' para inputs type=date. */
export function toDateInputValue(d: Date | string = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

const MES_FMT = new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" });
/** Clave e etiqueta de mes: (2026, 5) -> "jun 26". */
export function formatMes(d: Date | string): string {
  return MES_FMT.format(typeof d === "string" ? new Date(d) : d);
}

/** Etiqueta a partir de una clave 'YYYY-MM' -> "jun 26". */
export function mesKeyLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return MES_FMT.format(new Date(y, (m ?? 1) - 1, 1));
}

const MES_LARGO_FMT = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});
/** Etiqueta larga de una clave 'YYYY-MM' -> "junio de 2026". */
export function mesKeyLargo(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return MES_LARGO_FMT.format(new Date(y, (m ?? 1) - 1, 1));
}

/** Euros compactos para ejes: 1234 -> "1,2k €". */
export function formatEURCompact(n: number): string {
  if (Math.abs(n) >= 1000) {
    return `${(n / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}k €`;
  }
  return `${Math.round(n)} €`;
}

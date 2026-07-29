import { describe, expect, it } from "vitest";
import { armonizarColor } from "./chart-theme";

/** Inversa aproximada de la conversión de `chart-theme`, solo para asertar. */
function oklch(hex: string) {
  const lineal = (v: number) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

  const n = parseInt(hex.slice(1), 16);
  const r = lineal(((n >> 16) & 255) / 255);
  const g = lineal(((n >> 8) & 255) / 255);
  const b = lineal((n & 255) / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    C: Math.hypot(A, B),
    H: (Math.atan2(B, A) * 180) / Math.PI,
  };
}

// Los colores Tailwind-500 crudos que arrastran las familias antiguas.
const CRUDOS = ["#6366f1", "#22c55e", "#0ea5e9", "#f97316", "#ec4899", "#a855f7"];

describe("armonizarColor", () => {
  it("mete la luminosidad y el croma en la banda del sistema (claro)", () => {
    for (const hex of CRUDOS) {
      const { L, C } = oklch(armonizarColor(hex, "light"));
      expect(L).toBeGreaterThanOrEqual(0.42);
      expect(L).toBeLessThanOrEqual(0.57);
      expect(C).toBeLessThanOrEqual(0.13);
    }
  });

  it("mete la luminosidad y el croma en la banda del sistema (oscuro)", () => {
    for (const hex of CRUDOS) {
      const { L, C } = oklch(armonizarColor(hex, "dark"));
      expect(L).toBeGreaterThanOrEqual(0.64);
      expect(L).toBeLessThanOrEqual(0.75);
      expect(C).toBeLessThanOrEqual(0.14);
    }
  });

  it("conserva el matiz, que es la identidad que el usuario reconoce", () => {
    for (const hex of CRUDOS) {
      const antes = oklch(hex).H;
      const despues = oklch(armonizarColor(hex, "light")).H;
      // Diferencia angular, teniendo en cuenta el salto en ±180°.
      const delta = Math.abs(((despues - antes + 540) % 360) - 180);
      expect(delta).toBeLessThan(6);
    }
  });

  it("no colorea un gris: el croma solo se recorta, nunca se sube", () => {
    // #64748b es el gris de reserva; con croma 0.04 debe seguir siendo gris.
    expect(oklch(armonizarColor("#64748b", "light")).C).toBeLessThan(0.06);
    expect(oklch(armonizarColor("#8a8a8a", "light")).C).toBeLessThan(0.03);
  });

  it("deja pasar un color que ya está en banda casi sin tocarlo", () => {
    // #a85b22 es --chart-1: la propia paleta del sistema. El viaje de ida y
    // vuelta a OKLCH redondea, así que se compara canal a canal con holgura de
    // un par de niveles en vez de exigir el mismo hex.
    const salida = armonizarColor("#a85b22", "light");
    const canales = (hex: string) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
    const [r, g, b] = canales(salida);
    const [r0, g0, b0] = canales("#a85b22");
    expect(Math.abs(r - r0)).toBeLessThanOrEqual(2);
    expect(Math.abs(g - g0)).toBeLessThanOrEqual(2);
    expect(Math.abs(b - b0)).toBeLessThanOrEqual(2);
  });

  it("cae en el gris recesivo si el hex no es válido", () => {
    expect(armonizarColor("rojo", "light")).toBe("#78736b");
    expect(armonizarColor("", "dark")).toBe("#8c8880");
    expect(armonizarColor("#abc", "light")).toBe("#78736b");
  });
});

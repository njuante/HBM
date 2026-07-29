import { describe, it, expect } from "vitest";
import { formatEUR, decimalToNumber, sumImportes } from "./money";

describe("money", () => {
  it("formatea euros con decimal ',' y símbolo €", () => {
    // Nota: el separador de miles depende de los datos ICU del entorno,
    // por eso solo comprobamos decimales y símbolo (robusto en cualquier ICU).
    expect(formatEUR(1234.5)).toMatch(/234,50\s?€/);
    expect(formatEUR(0)).toMatch(/0,00\s?€/);
  });

  it("convierte Decimal/string/number a number con 2 decimales", () => {
    expect(decimalToNumber("12.34")).toBe(12.34);
    expect(decimalToNumber(12.345)).toBe(12.35);
    expect(decimalToNumber(null)).toBe(0);
    expect(decimalToNumber({ toString: () => "99.99" })).toBe(99.99);
  });

  it("suma importes sin errores de coma flotante", () => {
    expect(sumImportes([0.1, 0.2])).toBe(0.3);
    expect(sumImportes([10.5, 20.25, 5])).toBe(35.75);
    expect(sumImportes([])).toBe(0);
  });
});

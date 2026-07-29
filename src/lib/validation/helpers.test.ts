import { describe, it, expect } from "vitest";
import { importeSchema, fechaSchema, opcionalTexto } from "./helpers";

describe("importeSchema", () => {
  it("acepta coma o punto decimal y redondea a céntimos", () => {
    expect(importeSchema.parse("12,50")).toBe(12.5);
    expect(importeSchema.parse("12.505")).toBe(12.51);
    expect(importeSchema.parse(30)).toBe(30);
  });

  it("rechaza importes no positivos o no numéricos", () => {
    expect(importeSchema.safeParse("0").success).toBe(false);
    expect(importeSchema.safeParse("-5").success).toBe(false);
    expect(importeSchema.safeParse("abc").success).toBe(false);
  });
});

describe("fechaSchema", () => {
  it("convierte 'YYYY-MM-DD' a Date", () => {
    const d = fechaSchema.parse("2026-06-15");
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2026);
  });
  it("rechaza fechas inválidas", () => {
    expect(fechaSchema.safeParse("no-fecha").success).toBe(false);
    expect(fechaSchema.safeParse("").success).toBe(false);
  });
});

describe("opcionalTexto", () => {
  it("normaliza null y cadena vacía a undefined", () => {
    const s = opcionalTexto(50);
    expect(s.parse(null)).toBeUndefined();
    expect(s.parse("")).toBeUndefined();
    expect(s.parse("  hola  ")).toBe("hola");
  });
});

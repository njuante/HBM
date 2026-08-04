import { describe, expect, it } from "vitest";
import { huellaApunte, normalizarConcepto, type ApunteExtracto } from "./huella";

const base: ApunteExtracto = {
  fecha: new Date(2026, 7, 3),
  concepto: "COMPRA EN MERCADONA",
  importe: 45.2,
  tipo: "GASTO",
};

describe("normalizarConcepto", () => {
  it("iguala mayúsculas, acentos y espaciado", () => {
    expect(normalizarConcepto("  Pagó   en  Múltiple ")).toBe("PAGO EN MULTIPLE");
  });

  it("respeta la puntuación, que en el extracto separa datos reales", () => {
    expect(normalizarConcepto("COMPRA 1234/TARJ-99")).toBe("COMPRA 1234/TARJ-99");
  });
});

describe("huellaApunte", () => {
  it("es estable para el mismo apunte", () => {
    expect(huellaApunte(base)).toBe(huellaApunte({ ...base }));
  });

  it("ignora la hora: al banco solo le consta el día", () => {
    const conHora = { ...base, fecha: new Date(2026, 7, 3, 18, 45, 12) };
    expect(huellaApunte(conHora)).toBe(huellaApunte(base));
  });

  it("acepta la fecha como cadena ISO sin cambiar de huella", () => {
    const comoTexto = { ...base, fecha: new Date(2026, 7, 3).toISOString() };
    expect(huellaApunte(comoTexto)).toBe(huellaApunte(base));
  });

  it("iguala 45.2 y 45.20: el decimal suelto no crea un apunte nuevo", () => {
    expect(huellaApunte({ ...base, importe: 45.2 })).toBe(
      huellaApunte({ ...base, importe: 45.20 }),
    );
  });

  it("no le afecta el signo del importe: el sentido lo marca el tipo", () => {
    expect(huellaApunte({ ...base, importe: -45.2 })).toBe(huellaApunte(base));
  });

  it("distingue por fecha", () => {
    expect(huellaApunte({ ...base, fecha: new Date(2026, 7, 4) })).not.toBe(
      huellaApunte(base),
    );
  });

  it("distingue por importe", () => {
    expect(huellaApunte({ ...base, importe: 45.21 })).not.toBe(huellaApunte(base));
  });

  it("distingue por concepto", () => {
    expect(huellaApunte({ ...base, concepto: "COMPRA EN LIDL" })).not.toBe(
      huellaApunte(base),
    );
  });

  it("distingue un cobro de un pago del mismo importe y día", () => {
    expect(huellaApunte({ ...base, tipo: "INGRESO" })).not.toBe(huellaApunte(base));
  });
});

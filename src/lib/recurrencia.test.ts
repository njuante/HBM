import { describe, it, expect } from "vitest";
import {
  siguienteFecha,
  ocurrenciasHasta,
  describeFrecuencia,
} from "@/lib/recurrencia";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

describe("siguienteFecha", () => {
  it("avanza un mes conservando el día", () => {
    expect(iso(siguienteFecha(new Date(2026, 0, 15), "MENSUAL"))).toBe("2026-02-15");
  });

  it("recorta el día 31 en los meses que no lo tienen", () => {
    // Enero 31 → febrero 28 (2026 no es bisiesto), no el 3 de marzo.
    expect(iso(siguienteFecha(new Date(2026, 0, 31), "MENSUAL", 1, 31))).toBe(
      "2026-02-28",
    );
    // Y al mes siguiente recupera el 31, porque `diaMes` manda.
    expect(iso(siguienteFecha(new Date(2026, 1, 28), "MENSUAL", 1, 31))).toBe(
      "2026-03-31",
    );
  });

  it("respeta el 29 de febrero en año bisiesto", () => {
    expect(iso(siguienteFecha(new Date(2028, 0, 29), "MENSUAL", 1, 29))).toBe(
      "2028-02-29",
    );
    expect(iso(siguienteFecha(new Date(2027, 0, 29), "MENSUAL", 1, 29))).toBe(
      "2027-02-28",
    );
  });

  it("aplica el intervalo", () => {
    expect(iso(siguienteFecha(new Date(2026, 0, 10), "MENSUAL", 3))).toBe(
      "2026-04-10",
    );
    expect(iso(siguienteFecha(new Date(2026, 0, 10), "TRIMESTRAL"))).toBe(
      "2026-04-10",
    );
  });

  it("suma semanas cruzando el cambio de mes", () => {
    expect(iso(siguienteFecha(new Date(2026, 0, 28), "SEMANAL"))).toBe("2026-02-04");
    expect(iso(siguienteFecha(new Date(2026, 0, 1), "SEMANAL", 2))).toBe("2026-01-15");
  });

  it("salta el año en las anuales", () => {
    expect(iso(siguienteFecha(new Date(2026, 11, 5), "ANUAL"))).toBe("2027-12-05");
  });
});

describe("ocurrenciasHasta", () => {
  it("devuelve una ocurrencia por periodo pendiente", () => {
    const fechas = ocurrenciasHasta(
      new Date(2026, 0, 1),
      new Date(2026, 2, 15),
      "MENSUAL",
    );
    expect(fechas.map(iso)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("no devuelve nada si la próxima fecha aún no ha llegado", () => {
    expect(
      ocurrenciasHasta(new Date(2026, 5, 1), new Date(2026, 4, 20), "MENSUAL"),
    ).toEqual([]);
  });

  it("se detiene en la fecha de fin", () => {
    const fechas = ocurrenciasHasta(
      new Date(2026, 0, 1),
      new Date(2026, 11, 1),
      "MENSUAL",
      1,
      null,
      new Date(2026, 2, 1),
    );
    expect(fechas.map(iso)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("nunca pasa del tope de seguridad", () => {
    const fechas = ocurrenciasHasta(
      new Date(2000, 0, 1),
      new Date(2100, 0, 1),
      "SEMANAL",
    );
    expect(fechas).toHaveLength(200);
  });
});

describe("describeFrecuencia", () => {
  it("se lee en castellano llano", () => {
    expect(describeFrecuencia("MENSUAL", 1, 3)).toBe("cada mes el día 3");
    expect(describeFrecuencia("SEMANAL", 1)).toBe("cada semana");
    expect(describeFrecuencia("SEMANAL", 2)).toBe("cada 2 semanas");
    expect(describeFrecuencia("MENSUAL", 4)).toBe("cada 4 meses");
    expect(describeFrecuencia("ANUAL", 1)).toBe("cada año");
  });
});

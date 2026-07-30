import { describe, it, expect } from "vitest";
import fs from "fs";
import { parseSantanderExtract } from "./santander";

describe("parseSantanderExtract", () => {
  it("parsea correctamente el archivo real de extracto de Banco Santander", () => {
    const fileBuffer = fs.readFileSync("/home/dev/Descargas/TransactionExcelFile.xlsx");
    const result = parseSantanderExtract(fileBuffer);

    expect(result.length).toBe(76);

    // Primera transacción del extracto: COMPRA Trade Republic
    const primera = result[0];
    expect(primera.concepto).toContain("COMPRA Trade Republic");
    expect(primera.importe).toBe(10.1);
    expect(primera.tipo).toBe("GASTO");
    expect(primera.fechaString).toBe("29/07/2026");

    // Transacción de ingreso (Bizum): BIZUM DE ROSA MARIA CAYUELA JIMENEZ
    const bizum = result[3];
    expect(bizum.concepto).toContain("BIZUM DE ROSA MARIA CAYUELA JIMENEZ");
    expect(bizum.importe).toBe(65);
    expect(bizum.tipo).toBe("INGRESO");
  });
});

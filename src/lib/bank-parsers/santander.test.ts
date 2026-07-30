import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseSantanderExtract } from "./santander";

/**
 * El extracto se fabrica aquí en vez de leer un fichero.
 *
 * Antes el test abría `/home/dev/Descargas/TransactionExcelFile.xlsx`: una ruta
 * absoluta de la máquina de quien lo escribió, con movimientos bancarios
 * reales. Solo podía pasar en ese ordenador —en CI el fichero ni existe— y
 * obligaba a que datos personales acabaran escritos en las aserciones de un
 * repositorio público.
 *
 * Santander mete unas filas de cabecera antes de la tabla, así que el parser
 * busca la fila de títulos en vez de asumir una posición fija; el preámbulo de
 * aquí abajo está a propósito para cubrir esa búsqueda.
 */
function extractoDePrueba(filas: string[][]): Buffer {
  const hoja = XLSX.utils.aoa_to_sheet([
    ["Banco Santander"],
    ["Titular", "CUENTA DE PRUEBA"],
    ["IBAN", "ES00 0000 0000 0000 0000 0000"],
    [],
    ["Fecha operación", "Fecha valor", "Concepto", "Importe", "Saldo"],
    ...filas,
  ]);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Movimientos");
  return XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parseSantanderExtract", () => {
  it("distingue gastos de ingresos por el signo del importe", () => {
    const buffer = extractoDePrueba([
      ["29/07/2026", "29/07/2026", "COMPRA SUPERMERCADO", "-10,10€", "1.000,00€"],
      ["28/07/2026", "28/07/2026", "BIZUM DE UN AMIGO", "65,00€", "1.010,10€"],
    ]);

    const [gasto, ingreso] = parseSantanderExtract(buffer);

    expect(gasto.concepto).toContain("COMPRA SUPERMERCADO");
    expect(gasto.tipo).toBe("GASTO");
    // El importe se guarda siempre en positivo: el signo lo lleva `tipo`.
    expect(gasto.importe).toBe(10.1);
    expect(gasto.fechaString).toBe("29/07/2026");

    expect(ingreso.tipo).toBe("INGRESO");
    expect(ingreso.importe).toBe(65);
  });

  it("entiende el formato español: miles con punto y decimales con coma", () => {
    const buffer = extractoDePrueba([
      ["01/07/2026", "01/07/2026", "NOMINA", "1.234,56€", "2.000,00€"],
    ]);

    const [movimiento] = parseSantanderExtract(buffer);

    // Sin la conversión, «1.234,56» se leería como 1,23.
    expect(movimiento.importe).toBe(1234.56);
    expect(movimiento.tipo).toBe("INGRESO");
  });

  it("convierte la fecha DD/MM/AAAA sin confundir el día con el mes", () => {
    const buffer = extractoDePrueba([
      ["03/12/2026", "03/12/2026", "RECIBO LUZ", "-45,00€", "500,00€"],
    ]);

    const [movimiento] = parseSantanderExtract(buffer);

    expect(movimiento.fecha.getDate()).toBe(3);
    expect(movimiento.fecha.getMonth()).toBe(11); // diciembre
    expect(movimiento.fecha.getFullYear()).toBe(2026);
  });

  it("se salta las filas incompletas en vez de romperse", () => {
    const buffer = extractoDePrueba([
      ["10/07/2026", "10/07/2026", "COMPRA VALIDA", "-20,00€", "100,00€"],
      ["", "", "", "", ""],
      ["11/07/2026", "11/07/2026", "SIN IMPORTE", "", "100,00€"],
      ["12/07/2026", "12/07/2026", "OTRA VALIDA", "-5,00€", "95,00€"],
    ]);

    const resultado = parseSantanderExtract(buffer);

    expect(resultado).toHaveLength(2);
    expect(resultado.map((m) => m.concepto)).toEqual([
      "COMPRA VALIDA",
      "OTRA VALIDA",
    ]);
  });

  it("devuelve una lista vacía si el fichero no tiene movimientos", () => {
    expect(parseSantanderExtract(extractoDePrueba([]))).toEqual([]);
  });
});

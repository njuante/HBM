import * as XLSX from "xlsx";

export type MovimientoImportado = {
  fecha: Date;
  fechaString: string;
  concepto: string;
  importe: number; // Positivo para ingresos, negativo para gastos
  tipo: "GASTO" | "INGRESO";
  categoriaSugeridaId?: string;
  casaId?: string;
  divisa?: string;
  seleccionado: boolean;
  /** Lo dice el servidor al leer el fichero: ya entró en una importación previa. */
  yaImportado?: boolean;
};

/**
 * Parsea un archivo de extracto bancario de Santander (Formato XLSX / XLS / CSV).
 * Detecta automáticamente la fila de cabecera: Fecha operación | Concepto | Importe.
 */
export function parseSantanderExtract(buffer: ArrayBuffer | Buffer): MovimientoImportado[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convertir a matriz bidimensional de celdas
  const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false });

  if (!rows || rows.length === 0) {
    return [];
  }

  // Buscar la fila que contiene las cabeceras del Santander ("Fecha operación", "Concepto", "Importe")
  let headerIndex = -1;
  let colFechaOp = 0;
  let colConcepto = 2;
  let colImporte = 3;

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (!row) continue;

    const fechaIdx = row.findIndex((cell) => typeof cell === "string" && cell.toLowerCase().includes("fecha op"));
    const conceptoIdx = row.findIndex((cell) => typeof cell === "string" && cell.toLowerCase().includes("concepto"));
    const importeIdx = row.findIndex((cell) => typeof cell === "string" && cell.toLowerCase().includes("importe"));

    if (fechaIdx !== -1 && conceptoIdx !== -1 && importeIdx !== -1) {
      headerIndex = i;
      colFechaOp = fechaIdx;
      colConcepto = conceptoIdx;
      colImporte = importeIdx;
      break;
    }
  }

  // Si no se encontró cabecera explícita, asumimos fila 6 por defecto (estándar Santander)
  if (headerIndex === -1) {
    headerIndex = 5;
  }

  const resultados: MovimientoImportado[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= colConcepto) continue;

    const rawFecha = row[colFechaOp]?.trim();
    const rawConcepto = row[colConcepto]?.trim();
    const rawImporte = row[colImporte]?.trim();

    if (!rawFecha || !rawConcepto || !rawImporte) continue;

    // Convertir Fecha 'DD/MM/YYYY' a Date
    const [dia, mes, ano] = rawFecha.split("/").map(Number);
    if (!dia || !mes || !ano) continue;
    const fechaObj = new Date(ano, mes - 1, dia);

    // Limpiar Importe '-10,10€' -> -10.10
    const importeLimpioStr = rawImporte
      .replace(/€/g, "")
      .replace(/\./g, "") // Quitar puntos de miles
      .replace(/,/g, ".") // Cambiar coma por punto
      .trim();

    const importeNum = parseFloat(importeLimpioStr);
    if (isNaN(importeNum)) continue;

    const tipo: "GASTO" | "INGRESO" = importeNum < 0 ? "GASTO" : "INGRESO";

    resultados.push({
      fecha: fechaObj,
      fechaString: rawFecha,
      concepto: rawConcepto,
      importe: Math.abs(importeNum),
      tipo,
      seleccionado: true,
    });
  }

  return resultados;
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
} from "lucide-react";
import { parseSantanderExtract, type MovimientoImportado } from "@/lib/bank-parsers/santander";
import { formatEUR } from "@/lib/money";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";

type CategoriaOption = {
  id: string;
  nombre: string;
  color?: string;
  tipo: "GASTO" | "INGRESO";
};

type CasaOption = {
  id: string;
  nombre: string;
};

export function ImportadorDialog({
  open,
  onOpenChange,
  categorias = [],
  casas = [],
  actionImportar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: CategoriaOption[];
  casas: CasaOption[];
  actionImportar: (items: any[]) => Promise<{ ok: boolean; importados?: number; error?: string }>;
}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [cargando, setCargando] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const [movimientos, setMovimientos] = React.useState<MovimientoImportado[]>([]);
  const [casaPorDefecto, setCasaPorDefecto] = React.useState<string>(casas[0]?.id ?? "");

  // Asignación de categorías manuales
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = React.useState<Record<number, string>>({});
  const [casasSeleccionadas, setCasasSeleccionadas] = React.useState<Record<number, string>>({});

  // Separar categorías por tipo
  const categoriasGasto = React.useMemo(() => categorias.filter((c) => c.tipo === "GASTO"), [categorias]);
  const categoriasIngreso = React.useMemo(() => categorias.filter((c) => c.tipo === "INGRESO"), [categorias]);

  // Sugerir categoría inicial basada en palabras clave
  const sugerirCategoria = React.useCallback(
    (concepto: string, tipo: "GASTO" | "INGRESO") => {
      const concUpper = concepto.toUpperCase();
      const lista = tipo === "GASTO" ? categoriasGasto : categoriasIngreso;

      if (concUpper.includes("MERCADONA") || concUpper.includes("SUPERMERCADO") || concUpper.includes("CARREFOUR") || concUpper.includes("LIDL")) {
        const found = lista.find((c) => c.nombre.toLowerCase().includes("aliment") || c.nombre.toLowerCase().includes("super"));
        if (found) return found.id;
      }
      if (concUpper.includes("GASOLINA") || concUpper.includes("REPSOL") || concUpper.includes("MOVILIDAD")) {
        const found = lista.find((c) => c.nombre.toLowerCase().includes("transp") || c.nombre.toLowerCase().includes("vehic"));
        if (found) return found.id;
      }
      if (concUpper.includes("CLAUDE") || concUpper.includes("PRIMEVIDEO") || concUpper.includes("NETFLIX")) {
        const found = lista.find((c) => c.nombre.toLowerCase().includes("ocio") || c.nombre.toLowerCase().includes("suscrip"));
        if (found) return found.id;
      }
      return lista[0]?.id ?? "";
    },
    [categoriasGasto, categoriasIngreso],
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCargando(true);
    setErrorText(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const parsed = parseSantanderExtract(buffer);

        if (parsed.length === 0) {
          setErrorText("No se encontraron transacciones en el archivo seleccionado.");
          setMovimientos([]);
        } else {
          setMovimientos(parsed);
          // Auto-sugerir categorías
          const initialCats: Record<number, string> = {};
          parsed.forEach((m, idx) => {
            initialCats[idx] = sugerirCategoria(m.concepto, m.tipo);
          });
          setCategoriasSeleccionadas(initialCats);
        }
      } catch (err) {
        console.error(err);
        setErrorText("Error al leer el archivo de extracto bancario.");
      } finally {
        setCargando(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const toggleSeleccion = (idx: number) => {
    setMovimientos((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, seleccionado: !item.seleccionado } : item)),
    );
  };

  const toggleSeleccionarTodos = () => {
    const todosSeleccionados = movimientos.every((m) => m.seleccionado);
    setMovimientos((prev) => prev.map((m) => ({ ...m, seleccionado: !todosSeleccionados })));
  };

  const seleccionadosCount = movimientos.filter((m) => m.seleccionado).length;

  const handleImportar = async () => {
    const aImportar = movimientos
      .map((m, idx) => ({
        ...m,
        categoriaId: categoriasSeleccionadas[idx] || "",
        casaId: casasSeleccionadas[idx] || casaPorDefecto,
      }))
      .filter((m) => m.seleccionado && m.categoriaId);

    if (aImportar.length === 0) {
      setErrorText("Selecciona al menos un movimiento con categoría asignada.");
      return;
    }

    setGuardando(true);
    setErrorText(null);

    try {
      const res = await actionImportar(aImportar);
      if (res.ok) {
        onOpenChange(false);
        router.refresh();
      } else {
        setErrorText(res.error || "Ocurrió un error al importar los movimientos.");
      }
    } catch (err) {
      console.error(err);
      setErrorText("Error al procesar la importación.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent sinCerrar className="w-[calc(100vw-1.5rem)] max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Cargador de Extractos Bancarios (Santander)
            </DialogTitle>
            <DialogDescription>
              Importa tus movimientos desde un extracto Excel y categorízalos a mano antes de guardarlos.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {errorText && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {movimientos.length === 0 ? (
            /* ZONA DE SUBIDA */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-xl p-10 cursor-pointer transition-colors text-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="size-12 rounded-full bg-primary-soft flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                <Upload className="size-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Haz clic o arrastra aquí tu extracto de Banco Santander (`.xlsx`)
              </p>
              <p className="text-2xs text-muted-foreground mt-1">
                Formatos soportados: Excel (`TransactionExcelFile.xlsx`), XLS o CSV.
              </p>
            </div>
          ) : (
            /* BANDEJA DE CATEGORIZACIÓN MANUAL */
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleSeleccionarTodos}
                    className="h-8 gap-1.5 text-xs"
                  >
                    {movimientos.every((m) => m.seleccionado) ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4 text-muted-foreground" />
                    )}
                    {movimientos.every((m) => m.seleccionado) ? "Deseleccionar todos" : "Seleccionar todos"}
                  </Button>
                  <span className="text-2xs text-muted-foreground">
                    ({movimientos.length} transacciones encontradas)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-2xs font-medium text-muted-foreground">Casa por defecto:</span>
                  <select
                    value={casaPorDefecto}
                    onChange={(e) => setCasaPorDefecto(e.target.value)}
                    className="h-7 text-xs rounded border border-border bg-card px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {casas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TABLA DE MOVIMIENTOS A CATEGORIZAR */}
              <div className="border border-border rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/80 text-muted-foreground font-medium sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 w-10 text-center">Sel.</th>
                      <th className="p-2.5 w-24">Fecha</th>
                      <th className="p-2.5">Concepto</th>
                      <th className="p-2.5 w-24 text-right">Importe</th>
                      <th className="p-2.5 w-48">Categoría asignada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {movimientos.map((m, idx) => {
                      const esGasto = m.tipo === "GASTO";
                      const listaCats = esGasto ? categoriasGasto : categoriasIngreso;
                      const catIdVal = categoriasSeleccionadas[idx] ?? "";

                      return (
                        <tr
                          key={idx}
                          className={cn(
                            "hover:bg-muted/40 transition-colors",
                            !m.seleccionado && "opacity-45 bg-muted/20",
                          )}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={m.seleccionado}
                              onChange={() => toggleSeleccion(idx)}
                              className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 font-mono whitespace-nowrap text-2xs">
                            {m.fechaString}
                          </td>
                          <td className="p-2.5 max-w-[280px]">
                            <div className="truncate font-medium text-foreground" title={m.concepto}>
                              {m.concepto}
                            </div>
                          </td>
                          <td className={cn("p-2.5 font-mono font-semibold text-right whitespace-nowrap", esGasto ? "text-red-500" : "text-emerald-500")}>
                            {esGasto ? "-" : "+"}{formatEUR(m.importe)}
                          </td>
                          <td className="p-2.5">
                            <select
                              value={catIdVal}
                              onChange={(e) =>
                                setCategoriasSeleccionadas((prev) => ({ ...prev, [idx]: e.target.value }))
                              }
                              className="w-full h-8 text-xs rounded border border-border bg-card px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">-- Sin Categoría --</option>
                              {listaCats.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.nombre}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="px-6 py-3.5 border-t border-border bg-muted/40 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          {movimientos.length > 0 && (
            <Button
              onClick={handleImportar}
              disabled={guardando || seleccionadosCount === 0}
              size="sm"
              className="gap-2 font-medium"
            >
              {guardando ? (
                "Guardando..."
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Importar {seleccionadosCount} Movimientos
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

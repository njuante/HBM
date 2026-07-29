"use client";

import { cn } from "@/lib/utils";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
import { armonizarColor } from "@/components/charts/chart-theme";
import { useTheme } from "@/components/theme-provider";

export type CategoriaChip = {
  id: string;
  nombre: string;
  color: string;
  icono?: string | null;
  subcategorias?: { id: string; nombre: string; color: string; icono?: string | null }[];
};

/**
 * Categorías como rejilla de fichas en vez de dos <select> encadenados.
 *
 * Una categoría es una elección visual —se reconoce por icono y color antes
 * que por su nombre—, así que un desplegable la convierte en trabajo de
 * lectura. Las subcategorías solo aparecen si la madre elegida las tiene.
 */
export function CategoriaChips({
  categorias,
  value,
  onChange,
  subValue,
  onSubChange,
  name = "categoriaId",
  subName = "subcategoriaId",
  invalido,
}: {
  categorias: CategoriaChip[];
  value: string;
  onChange: (id: string) => void;
  subValue?: string;
  onSubChange?: (id: string) => void;
  name?: string;
  subName?: string;
  invalido?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const elegida = categorias.find((c) => c.id === value);
  const subs = elegida?.subcategorias ?? [];

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />

      <div
        role="radiogroup"
        aria-label="Categoría"
        aria-invalid={invalido}
        className="flex flex-wrap gap-1.5"
      >
        {categorias.map((c) => (
          <Ficha
            key={c.id}
            nombre={c.nombre}
            icono={c.icono}
            color={armonizarColor(c.color, resolvedTheme)}
            activo={c.id === value}
            onClick={() => {
              onChange(c.id);
              onSubChange?.(""); // cambiar de madre invalida la subcategoría
            }}
          />
        ))}
      </div>

      {subs.length > 0 && onSubChange && (
        <>
          <input type="hidden" name={subName} value={subValue ?? ""} />
          <div
            role="radiogroup"
            aria-label="Subcategoría"
            className="flex flex-wrap gap-1.5 border-l-2 border-border pl-2.5"
          >
            {subs.map((s) => (
              <Ficha
                key={s.id}
                nombre={s.nombre}
                icono={s.icono}
                color={armonizarColor(s.color, resolvedTheme)}
                activo={s.id === subValue}
                pequena
                // Volver a pulsar la subcategoría activa la deselecciona:
                // es opcional y no debe haber que recargar para quitarla.
                onClick={() => onSubChange(s.id === subValue ? "" : s.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Ficha({
  nombre,
  icono,
  color,
  activo,
  onClick,
  pequena,
}: {
  nombre: string;
  icono?: string | null;
  color: string;
  activo: boolean;
  onClick: () => void;
  pequena?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        pequena ? "h-7 px-2 text-2xs" : "h-8 px-2.5 text-xs",
        activo
          ? "border-transparent text-foreground"
          : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
      style={
        activo
          ? {
              // El color de la categoría *es* el estado activo: se tiñe con
              // su propio tono, no con el acento genérico de la app.
              backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
              boxShadow: `inset 0 0 0 1px ${color}`,
            }
          : undefined
      }
    >
      <MarcaCategoria
        icono={icono}
        color={color}
        className={cn(pequena ? "size-3" : "size-3.5")}
      />
      {nombre}
    </button>
  );
}

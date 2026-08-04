"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarcaCategoria } from "@/components/ui/icono-categoria";
import { armonizarColor } from "@/components/charts/chart-theme";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import type { CategoriaChip } from "./categoria-chips";

export type MovimientoACategorizar = {
  id: string;
  tipo: "GASTO" | "INGRESO";
  concepto: string;
  categoriaId: string;
  subcategoriaId?: string;
};

/**
 * Recategorizar de un toque, desde la propia lista.
 *
 * En móvil cambiar la categoría era el camino largo: menú «…» → Editar →
 * formulario entero → Guardar. Cuatro toques y un teclado por medio para
 * tocar un campo. Aquí se toca la categoría del movimiento y se elige la
 * nueva; el propio toque guarda y cierra, sin botón de confirmar.
 *
 * Es una hoja anclada abajo y no un modal centrado porque en un móvil la
 * parte alta de la pantalla no se alcanza con el pulgar, y esta lista puede
 * ser larga.
 */
export function CambiarCategoriaSheet({
  movimiento,
  categoriasGasto,
  categoriasIngreso,
  onOpenChange,
  onElegir,
}: {
  /** `null` cierra la hoja. */
  movimiento: MovimientoACategorizar | null;
  categoriasGasto: CategoriaChip[];
  categoriasIngreso: CategoriaChip[];
  onOpenChange: (abierto: boolean) => void;
  onElegir: (categoriaId: string, subcategoriaId?: string) => void;
}) {
  const categorias =
    movimiento?.tipo === "INGRESO" ? categoriasIngreso : categoriasGasto;

  const elegir = (categoriaId: string, subcategoriaId?: string) => {
    onElegir(categoriaId, subcategoriaId);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={movimiento !== null} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-[2px] data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />

        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col",
            "rounded-t-2xl border-t border-border bg-card shadow-xl focus:outline-none",
            // El área segura evita que la última fila quede bajo el indicador
            // de inicio del iPhone, que es justo donde cae el pulgar.
            "pb-[env(safe-area-inset-bottom)]",
            "data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in",
            // En pantalla ancha deja de ser una hoja y se centra como un panel.
            "sm:inset-x-auto sm:inset-y-0 sm:left-1/2 sm:top-1/2 sm:m-0 sm:h-fit sm:w-full sm:max-w-md",
            "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border",
            "sm:data-[state=closed]:animate-panel-out sm:data-[state=open]:animate-panel-in",
          )}
        >
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong/60 sm:hidden" />

          <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-serif text-base font-medium leading-tight">
                Mover a otra categoría
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 truncate text-xs text-muted-foreground">
                {movimiento?.concepto}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Cerrar">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* La `key` hace el reinicio: al pasar a otro movimiento la lista
              se monta de nuevo y ningún despliegue queda abierto del anterior.
              Es lo que evita un efecto que sincronice ese estado a mano. */}
          <ListaCategorias
            key={movimiento?.id}
            categorias={categorias}
            categoriaId={movimiento?.categoriaId}
            subcategoriaId={movimiento?.subcategoriaId}
            onElegir={elegir}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * La lista en sí. Vive aparte para que su estado —qué madre está desplegada—
 * muera con ella al cambiar de movimiento.
 */
function ListaCategorias({
  categorias,
  categoriaId,
  subcategoriaId,
  onElegir,
}: {
  categorias: CategoriaChip[];
  categoriaId?: string;
  subcategoriaId?: string;
  onElegir: (categoriaId: string, subcategoriaId?: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [desplegada, setDesplegada] = React.useState<string | null>(null);

  return (
    <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border">
      {categorias.map((c) => {
        const color = armonizarColor(c.color, resolvedTheme);
        const activa = c.id === categoriaId;
        const subs = c.subcategorias ?? [];
        const abierta = desplegada === c.id;

        return (
          <li key={c.id} className="border-b border-border/60 last:border-b-0">
            <button
              type="button"
              // 48px de alto: por debajo de eso hay que apuntar.
              className={cn(
                "flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                "active:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                activa && "bg-primary-soft/40",
              )}
              onClick={() => {
                // Con hijas, el primer toque despliega; el de la propia madre
                // en la lista ya abierta la asigna sin subcategoría.
                if (subs.length > 0 && !abierta) return setDesplegada(c.id);
                onElegir(c.id);
              }}
            >
              <MarcaCategoria icono={c.icono} color={color} className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.nombre}</span>
              {subs.length > 0 && (
                <span className="shrink-0 text-2xs text-faint">
                  {abierta ? "elige o toca aquí" : `${subs.length} subcategorías`}
                </span>
              )}
              {activa && <Check className="size-4 shrink-0 text-primary" />}
            </button>

            {abierta && subs.length > 0 && (
              <ul className="border-t border-border/60 bg-muted/30">
                {subs.map((s) => {
                  const subColor = armonizarColor(s.color, resolvedTheme);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex min-h-11 w-full items-center gap-3 py-2 pl-11 pr-4 text-left transition-colors",
                          "active:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                        )}
                        onClick={() => onElegir(c.id, s.id)}
                      >
                        <MarcaCategoria
                          icono={s.icono}
                          color={subColor}
                          className="size-3.5 shrink-0"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">{s.nombre}</span>
                        {s.id === subcategoriaId && (
                          <Check className="size-4 shrink-0 text-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

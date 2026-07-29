"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type FiltrosMovimiento = {
  casaId?: string;
  categoriaId?: string;
  texto?: string;
  desde?: string;
  hasta?: string;
};

type Opt = { id: string; nombre: string };

const FECHA_FMT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
});

/**
 * Buscador siempre visible + el resto de filtros plegados en un popover, y
 * una ficha por filtro activo.
 *
 * La barra anterior mostraba cinco controles a la vez aunque casi nunca se
 * usaran; aquí solo ocupa sitio lo que está puesto.
 */
export function FiltrosMovimientos({
  filtros,
  casas,
  categorias,
  mostrarCasa,
}: {
  filtros: FiltrosMovimiento;
  casas: Opt[];
  categorias: Opt[];
  mostrarCasa: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [texto, setTexto] = React.useState(filtros.texto ?? "");
  const [abierto, setAbierto] = React.useState(false);

  const navegar = (cambios: Partial<FiltrosMovimiento>) => {
    const siguiente = { ...filtros, ...cambios };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(siguiente)) if (v) params.set(k, v);
    router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  };

  const activos: { clave: keyof FiltrosMovimiento; etiqueta: string }[] = [];
  if (filtros.texto) activos.push({ clave: "texto", etiqueta: `«${filtros.texto}»` });
  if (filtros.casaId) {
    activos.push({
      clave: "casaId",
      etiqueta: casas.find((c) => c.id === filtros.casaId)?.nombre ?? "Casa",
    });
  }
  if (filtros.categoriaId) {
    activos.push({
      clave: "categoriaId",
      etiqueta:
        categorias.find((c) => c.id === filtros.categoriaId)?.nombre ?? "Categoría",
    });
  }
  if (filtros.desde) {
    activos.push({
      clave: "desde",
      etiqueta: `desde ${FECHA_FMT.format(new Date(filtros.desde))}`,
    });
  }
  if (filtros.hasta) {
    activos.push({
      clave: "hasta",
      etiqueta: `hasta ${FECHA_FMT.format(new Date(filtros.hasta))}`,
    });
  }

  const avanzados =
    Number(Boolean(filtros.casaId)) +
    Number(Boolean(filtros.categoriaId)) +
    Number(Boolean(filtros.desde || filtros.hasta));

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navegar({ texto });
        }}
        className="relative min-w-48 flex-1 sm:max-w-72"
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => texto !== (filtros.texto ?? "") && navegar({ texto })}
          placeholder="Buscar concepto…"
          aria-label="Buscar"
          className="h-8 pl-8 text-xs"
        />
      </form>

      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm">
            <SlidersHorizontal />
            Filtros
            {avanzados > 0 && (
              <span className="ml-0.5 rounded-xs bg-primary-soft px-1 text-2xs text-primary">
                {avanzados}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3">
          {mostrarCasa && casas.length > 0 && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Casa
              </span>
              <Select
                value={filtros.casaId ?? ""}
                onChange={(e) => navegar({ casaId: e.target.value })}
                className="h-8 text-xs"
              >
                <option value="">Todas</option>
                {casas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Categoría
            </span>
            <Select
              value={filtros.categoriaId ?? ""}
              onChange={(e) => navegar({ categoriaId: e.target.value })}
              className="h-8 text-xs"
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Desde
              </span>
              <Input
                type="date"
                value={filtros.desde ?? ""}
                onChange={(e) => navegar({ desde: e.target.value })}
                className="h-8 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Hasta
              </span>
              <Input
                type="date"
                value={filtros.hasta ?? ""}
                onChange={(e) => navegar({ hasta: e.target.value })}
                className="h-8 text-xs"
              />
            </label>
          </div>
        </PopoverContent>
      </Popover>

      {activos.map(({ clave, etiqueta }) => (
        <button
          key={clave}
          type="button"
          onClick={() => {
            if (clave === "texto") setTexto("");
            navegar({ [clave]: "" });
          }}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md border border-border bg-muted/60 px-2 text-2xs",
            "text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground",
          )}
        >
          {etiqueta}
          <X className="size-3" />
        </button>
      ))}

      {activos.length > 1 && (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            setTexto("");
            router.push(pathname, { scroll: false });
          }}
        >
          Limpiar
        </Button>
      )}
    </div>
  );
}

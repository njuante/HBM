"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SegmentadoMovil } from "./segmentado";

const PERIODOS = [
  { value: "1", label: "1 mes" },
  { value: "3", label: "3 m" },
  { value: "6", label: "6 m" },
  { value: "12", label: "1 año" },
] as const;

/**
 * Los filtros del panel móvil: el periodo y, si hay más de una, la casa.
 *
 * El periodo se pinta antes de que llegue la navegación. Es un parámetro de
 * la URL —y por tanto un viaje al servidor—, pero tocarlo se tiene que sentir
 * inmediato: sin la elección optimista, el segmento se quedaba en el valor
 * viejo hasta que volvían los datos.
 */
export function SelectorPeriodo({
  meses,
  casas = [],
  casaId,
}: {
  meses: number;
  /** Solo se ofrece si hay más de una: con una sola no hay nada que elegir. */
  casas?: { id: string; nombre: string }[];
  casaId?: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = React.useTransition();
  // Se pinta la elección al instante; la navegación llega después.
  const [optimista, setOptimista] = React.useState<string | null>(null);

  const actual = optimista ?? String(meses);
  // Si el servidor acaba en otro sitio (por ejemplo con el botón «atrás»),
  // manda lo que llega por props y se suelta la elección optimista. Se hace
  // durante el render y no en un efecto: así no hay un fotograma intermedio
  // pintando el periodo que el servidor acaba de descartar.
  const [mesesPrevios, setMesesPrevios] = React.useState(meses);
  if (meses !== mesesPrevios) {
    setMesesPrevios(meses);
    setOptimista(null);
  }

  const navegar = (clave: string, valor: string) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      if (valor) params.set(clave, valor);
      else params.delete(clave);
      router.push(`/dashboard?${params}`, { scroll: false });
    });
  };

  const elegir = (valor: string) => {
    setOptimista(valor);
    navegar("meses", valor);
  };

  return (
    <div className="space-y-2">
      <SegmentadoMovil
        ariaLabel="Periodo"
        opciones={PERIODOS}
        value={actual}
        onChange={elegir}
        ocupado={pendiente}
      />

      {casas.length > 1 && (
        <div className="relative">
          <select
            aria-label="Casa"
            value={casaId ?? ""}
            onChange={(e) => navegar("casaId", e.target.value)}
            className={cn(
              "h-9 w-full appearance-none rounded-full border border-border bg-card",
              "px-4 text-[13px] font-medium text-foreground",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            <option value="">Todas las casas</option>
            {casas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-faint"
          />
        </div>
      )}
    </div>
  );
}

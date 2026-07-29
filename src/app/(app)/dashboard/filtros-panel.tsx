"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Segmented } from "@/components/ui/segmented";

export type CasaOpt = { id: string; nombre: string };

const PERIODOS = [
  { value: "3", label: "3 m" },
  { value: "6", label: "6 m" },
  { value: "12", label: "12 m" },
] as const;

/**
 * Barra de filtros del panel. Aplica al instante en vez de exigir un botón
 * «Aplicar»: son dos controles y el coste de equivocarse es volver a tocar.
 *
 * El estado sigue viviendo en la URL, así que el enlace es compartible y el
 * botón «atrás» funciona.
 */
export function FiltrosPanel({
  casas,
  casaId,
  meses,
}: {
  casas: CasaOpt[];
  casaId?: string;
  meses: number;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const navegar = (cambios: Record<string, string>) => {
    const params = new URLSearchParams();
    const siguiente = { casaId: casaId ?? "", meses: String(meses), ...cambios };
    for (const [k, v] of Object.entries(siguiente)) if (v) params.set(k, v);
    startTransition(() => {
      router.push(`/dashboard${params.size ? `?${params}` : ""}`, {
        scroll: false,
      });
    });
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Segmented
        ariaLabel="Periodo"
        value={String(meses)}
        onChange={(v) => navegar({ meses: v })}
        options={[...PERIODOS]}
      />

      {casas.length > 0 && (
        <Select
          aria-label="Casa"
          value={casaId ?? ""}
          onChange={(e) => navegar({ casaId: e.target.value })}
          className="h-8 w-auto min-w-36 text-xs"
        >
          <option value="">Todas las casas</option>
          {casas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      )}

      {pendiente && (
        <Loader2 className="size-3.5 animate-spin text-faint" aria-label="Cargando" />
      )}
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto común de las pantallas de la familia.
 *
 * Vale para todas porque todas tienen la misma forma: cabecera, una barra de
 * filtros y un bloque de contenido. Antes no había ninguno y la navegación se
 * quedaba quieta hasta que el servidor respondía.
 */
export default function Cargando() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-3 h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <Skeleton className="mb-4 h-8 w-64" />

      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-3.5 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mt-4 h-3.5 w-full" />
        ))}
      </div>
    </div>
  );
}

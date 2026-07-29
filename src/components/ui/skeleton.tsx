import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-shimmer rounded-sm bg-muted", className)}
      {...props}
    />
  );
}

/** Esqueleto de tabla: n filas de la altura real, para que no salte el layout. */
export function SkeletonTabla({
  filas = 8,
  columnas = 5,
}: {
  filas?: number;
  columnas?: number;
}) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex h-11 items-center gap-4 px-3">
          {Array.from({ length: columnas }).map((_, j) => (
            <Skeleton
              key={j}
              className={cn(
                "h-3",
                j === 1 ? "flex-1" : j === columnas - 1 ? "w-16" : "w-20",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

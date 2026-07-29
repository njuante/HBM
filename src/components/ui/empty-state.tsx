import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  titulo,
  descripcion,
  accion,
  className,
  compacto,
}: {
  icon?: LucideIcon;
  titulo: string;
  descripcion?: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
  compacto?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compacto ? "py-8" : "py-14",
        className,
      )}
    >
      {Icon && (
        <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-border bg-muted/60">
          <Icon className="size-4 text-faint" />
        </div>
      )}
      <p className="font-serif text-base text-foreground">{titulo}</p>
      {descripcion && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{descripcion}</p>
      )}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

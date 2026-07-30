import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-serif text-3xl font-medium leading-none tracking-tight">
          {title}
        </h1>
        {/* `div` y no `p`: la descripción no siempre es texto suelto —el
            navegador de meses y el saldo son bloques— y anidarlos dentro de un
            párrafo rompía la hidratación. */}
        {description && (
          <div className="mt-2 text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

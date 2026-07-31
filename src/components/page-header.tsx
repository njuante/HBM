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
        "mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-border pb-3 sm:mb-6 sm:pb-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="font-serif text-2xl font-medium leading-tight tracking-tight sm:text-3xl sm:leading-none">
          {title}
        </h1>
        {description && (
          <div className="mt-1.5 text-xs sm:text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

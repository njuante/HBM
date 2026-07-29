import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Aviso en línea. Barra de color a la izquierda en vez de fondo teñido:
 *  informa sin gritar. */
const alertVariants = cva(
  "flex gap-3 rounded-md border border-l-2 py-2.5 pl-3 pr-4 text-sm",
  {
    variants: {
      variant: {
        neutral: "border-border border-l-border-strong bg-muted/40",
        danger: "border-danger/20 border-l-danger bg-danger/6",
        warning: "border-warning/25 border-l-warning bg-warning/6",
        success: "border-success/20 border-l-success bg-success/6",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

const iconTone = {
  neutral: "text-muted-foreground",
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: LucideIcon;
  titulo?: React.ReactNode;
}

export function Alert({
  className,
  variant = "neutral",
  icon: Icon,
  titulo,
  children,
  ...props
}: AlertProps) {
  return (
    <div role="status" className={cn(alertVariants({ variant }), className)} {...props}>
      {Icon && (
        <Icon className={cn("mt-0.5 size-4 shrink-0", iconTone[variant ?? "neutral"])} />
      )}
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-medium">{titulo}</p>}
        {children && (
          <div className={cn("text-muted-foreground", titulo && "mt-0.5")}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

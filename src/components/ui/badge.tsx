import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Etiqueta rectangular, no píldora: la píldora es lo que hace que todo
 *  parezca la misma plantilla. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-px text-2xs font-medium uppercase tracking-wide [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        outline: "border border-border text-muted-foreground",
        success: "bg-success/12 text-success",
        danger: "bg-danger/12 text-danger",
        warning: "bg-warning/14 text-warning",
        primary: "bg-primary/12 text-primary",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

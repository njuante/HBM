import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-1.5",
    "whitespace-nowrap rounded-md text-sm font-medium",
    "transition-[background-color,border-color,color,box-shadow,opacity] duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Acción principal: acento ámbar plano, sin degradado ni sombra de color */
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95",
        /* El caballo de batalla: superficie con filete */
        secondary:
          "border border-border-strong bg-card text-foreground hover:bg-muted",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive:
          "bg-danger text-danger-foreground hover:bg-danger/90 active:bg-danger/95",
        link: "h-auto p-0 text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground",
      },
      size: {
        xs: "h-7 px-2 text-xs [&_svg]:size-3.5",
        sm: "h-8 px-2.5",
        md: "h-9 px-3.5",
        lg: "h-10 px-5",
        icon: "size-9",
        "icon-sm": "size-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renderiza sobre el hijo (p. ej. un <Link>) en vez de un <button>. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };

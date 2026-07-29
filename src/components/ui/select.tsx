import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBase } from "./input";

/**
 * <select> nativo repintado. Se mantiene nativo a propósito: es el control
 * más rápido con teclado, se comporta bien en móvil y no reinventa nada.
 * Para listas largas con búsqueda existe `Combobox`.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(inputBase, "h-9 appearance-none py-1.5 pl-2.5 pr-8", className)}
      {...props}
    >
      {children}
    </select>
    <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
  </div>
));
Select.displayName = "Select";

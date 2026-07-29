import * as React from "react";
import { cn } from "@/lib/utils";

/** Recorrido visual compartido por input, select y textarea. */
export const inputBase = [
  "w-full rounded-md border border-input bg-card text-sm text-foreground",
  "transition-[border-color,box-shadow] duration-150",
  "placeholder:text-faint",
  "hover:border-border-strong",
  "focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20",
].join(" ");

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Adorno fijo a la izquierda (p. ej. «€»). No interactivo. */
  adornoIzq?: React.ReactNode;
  adornoDer?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, adornoIzq, adornoDer, ...props }, ref) => {
    const field = (
      <input
        ref={ref}
        className={cn(
          inputBase,
          "h-9 px-2.5 py-1.5",
          "file:mr-3 file:h-6 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:text-xs file:font-medium file:text-foreground",
          adornoIzq && "pl-7",
          adornoDer && "pr-8",
          className,
        )}
        {...props}
      />
    );

    if (!adornoIzq && !adornoDer) return field;

    return (
      <div className="relative">
        {adornoIzq && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {adornoIzq}
          </span>
        )}
        {field}
        {adornoDer && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {adornoDer}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

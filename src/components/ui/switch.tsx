"use client";

import * as React from "react";
import * as Primitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ComponentRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent",
      "bg-border-strong transition-colors duration-150",
      "data-[state=checked]:bg-primary",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      "disabled:cursor-not-allowed disabled:opacity-45",
      className,
    )}
    {...props}
  >
    <Primitive.Thumb
      className={cn(
        "pointer-events-none block size-3.5 rounded-full bg-card shadow-xs",
        "translate-x-0.5 transition-transform duration-150 data-[state=checked]:translate-x-[0.9rem]",
      )}
    />
  </Primitive.Root>
));
Switch.displayName = "Switch";

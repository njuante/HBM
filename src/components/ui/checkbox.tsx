"use client";

import * as React from "react";
import * as Primitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      "peer size-4 shrink-0 rounded-xs border border-input bg-card transition-colors",
      "hover:border-border-strong",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      "disabled:cursor-not-allowed disabled:opacity-45",
      className,
    )}
    {...props}
  >
    <Primitive.Indicator className="flex items-center justify-center text-current">
      <Check className="size-3" strokeWidth={3} />
    </Primitive.Indicator>
  </Primitive.Root>
));
Checkbox.displayName = "Checkbox";

"use client";

import * as React from "react";
import * as Primitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = Primitive.Provider;

/** Tooltip de una línea. Nunca contiene información imprescindible. */
export function Tooltip({
  children,
  texto,
  side = "top",
  className,
}: {
  children: React.ReactNode;
  texto: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <Primitive.Root delayDuration={350}>
      <Primitive.Trigger asChild>{children}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-50 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-md",
            "data-[state=delayed-open]:animate-pop-in",
            className,
          )}
        >
          {texto}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}

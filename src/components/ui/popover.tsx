"use client";

import * as React from "react";
import * as Primitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;
export const PopoverAnchor = Primitive.Anchor;
export const PopoverClose = Primitive.Close;

export const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, align = "start", sideOffset = 6, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-lg border border-border bg-card p-3 shadow-md outline-none",
        "origin-(--radix-popover-content-transform-origin)",
        "data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out",
        className,
      )}
      {...props}
    />
  </Primitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

"use client";

import * as React from "react";
import * as Primitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = Primitive.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof Primitive.List>,
  React.ComponentPropsWithoutRef<typeof Primitive.List>
>(({ className, ...props }, ref) => (
  <Primitive.List
    ref={ref}
    className={cn("flex items-center gap-5 border-b border-border", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

/** Pestaña con filete inferior, no píldora sobre fondo hundido. */
export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof Primitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof Primitive.Trigger>
>(({ className, ...props }, ref) => (
  <Primitive.Trigger
    ref={ref}
    className={cn(
      "relative -mb-px border-b-2 border-transparent pb-2 pt-1 text-sm font-medium",
      "text-muted-foreground transition-colors hover:text-foreground",
      "data-[state=active]:border-primary data-[state=active]:text-foreground",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, ...props }, ref) => (
  <Primitive.Content
    ref={ref}
    className={cn("mt-5 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

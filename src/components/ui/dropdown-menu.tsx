"use client";

import * as React from "react";
import * as Primitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuGroup = Primitive.Group;
export const DropdownMenuRadioGroup = Primitive.RadioGroup;

const surface = [
  "z-50 min-w-[11rem] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-md",
  "data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out",
  "origin-(--radix-dropdown-menu-content-transform-origin)",
].join(" ");

export const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(surface, className)}
      {...props}
    />
  </Primitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

const itemBase = [
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
  "transition-colors data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
].join(" ");

export const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof Primitive.Item>,
  React.ComponentPropsWithoutRef<typeof Primitive.Item> & { peligro?: boolean }
>(({ className, peligro, ...props }, ref) => (
  <Primitive.Item
    ref={ref}
    className={cn(
      itemBase,
      peligro && "text-danger [&_svg]:text-danger data-[highlighted]:bg-danger/10",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof Primitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof Primitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <Primitive.RadioItem ref={ref} className={cn(itemBase, "pr-7", className)} {...props}>
    {children}
    <Primitive.ItemIndicator className="absolute right-2">
      <Check className="size-3.5 !text-primary" />
    </Primitive.ItemIndicator>
  </Primitive.RadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Primitive.Label>) {
  return (
    <Primitive.Label
      className={cn(
        "px-2 py-1.5 text-2xs font-medium uppercase tracking-wide text-faint",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Primitive.Separator>) {
  return (
    <Primitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

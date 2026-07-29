import * as React from "react";
import { cn } from "@/lib/utils";

/** Envoltorio con desplazamiento horizontal propio: la página nunca debe
 *  desbordarse por culpa de una tabla. */
export function TableWrap({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full overflow-x-auto", className)} {...props} />;
}

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full border-collapse text-sm tabular-nums", className)}
      {...props}
    />
  );
}

export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-border text-muted-foreground", className)}
      {...props}
    />
  );
}

export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TR({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "group border-b border-border transition-colors last:border-0 hover:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
}

export function TH({
  className,
  numerico,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numerico?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "h-8 px-3 text-left align-middle text-2xs font-medium uppercase tracking-wide text-faint",
        numerico && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  numerico,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numerico?: boolean }) {
  return (
    <td
      className={cn(
        "h-11 px-3 align-middle",
        numerico && "whitespace-nowrap text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TFoot({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn("border-t border-border-strong font-medium", className)}
      {...props}
    />
  );
}

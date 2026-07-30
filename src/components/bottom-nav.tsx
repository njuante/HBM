"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ReceiptText,
  PiggyBank,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BottomNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const ITEMS: BottomNavItem[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/facturas", label: "Facturas", icon: ReceiptText },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/casas", label: "Ajustes", icon: Settings },
];

const esActivo = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 block lg:hidden border-t border-border/80 bg-background/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <nav aria-label="Navegación Móvil" className="flex items-center justify-around h-14 px-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const activo = esActivo(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1 gap-1 text-[11px] font-medium transition-all duration-150 active:scale-95",
                activo
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full px-3 py-1 transition-all",
                  activo && "bg-primary-soft text-primary",
                )}
              >
                <Icon className="size-4" />
              </div>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ReceiptText,
  Target,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BottomNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Cuatro destinos diarios y una salida al resto.
 *
 * En móvil esta barra es la única navegación: el cajón ya no tiene su propio
 * botón en la cabecera, se abre desde «Más». Antes convivían las dos y el
 * mismo destino se alcanzaba por dos sitios.
 */
const ITEMS: BottomNavItem[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/facturas", label: "Facturas", icon: ReceiptText },
  { href: "/ahorro", label: "Ahorro", icon: Target },
];

const esActivo = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

/** Clases compartidas por los enlaces y por el botón «Más». */
const CELDA =
  "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-2xs font-medium transition-colors";

export function BottomNav({ onMas }: { onMas: () => void }) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 block lg:hidden border-t border-border/80 bg-background/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <nav
        aria-label="Navegación principal"
        className="flex items-stretch justify-around px-2"
      >
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const activo = esActivo(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                CELDA,
                // 44px es el mínimo táctil; la celda crece con la etiqueta.
                "min-h-11",
                activo ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full px-3 py-1 transition-colors",
                  activo && "bg-primary-soft",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMas}
          aria-label="Más secciones"
          className={cn(CELDA, "min-h-11 text-muted-foreground")}
        >
          <span className="flex items-center justify-center rounded-full px-3 py-1">
            <Menu className="size-4" />
          </span>
          <span className="leading-none">Más</span>
        </button>
      </nav>
    </div>
  );
}

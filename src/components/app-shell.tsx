"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Check,
  Home,
  LayoutDashboard,
  LogOut,
  FolderPlus,
  KeyRound,
  Menu,
  PiggyBank,
  ReceiptText,
  Repeat,
  Tags,
  TrendingDown,
  TrendingUp,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { cambiarFamilia, logout } from "@/server/auth/actions";

export type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/gastos", label: "Gastos", icon: TrendingDown },
  { href: "/ingresos", label: "Ingresos", icon: TrendingUp },
  { href: "/facturas", label: "Facturas", icon: ReceiptText },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/recurrentes", label: "Recurrentes", icon: Repeat },
  { href: "/categorias", label: "Categorías", icon: Tags },
  { href: "/casas", label: "Casas", icon: Home },
  { href: "/familia", label: "Familia", icon: Users },
];

/**
 * Navegación de la familia. Alquileres solo aparece si el módulo está
 * encendido: es opcional y, apagado, no debe ocupar sitio ni existir.
 *
 * Se resuelve aquí, en el cliente, y no en el layout: los iconos son
 * componentes y cruzar la frontera servidor→cliente con ellos no es posible.
 */
function navPara(alquileresActivo: boolean): NavItem[] {
  if (!alquileresActivo) return NAV;
  const i = NAV.findIndex((n) => n.href === "/casas");
  return [
    ...NAV.slice(0, i + 1),
    { href: "/alquileres", label: "Alquileres", icon: KeyRound },
    ...NAV.slice(i + 1),
  ];
}

export type Membership = { familiaId: string; nombre: string };

const esActivo = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

export function AppShell({
  children,
  familiaNombre,
  familiaId,
  userNombre,
  userEmail,
  memberships = [],
  alquileresActivo = false,
}: {
  children: React.ReactNode;
  familiaNombre: string;
  familiaId?: string;
  userNombre: string;
  userEmail?: string;
  memberships?: Membership[];
  alquileresActivo?: boolean;
}) {
  const pathname = usePathname();
  const nav = React.useMemo(() => navPara(alquileresActivo), [alquileresActivo]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center gap-3 px-4 sm:px-6">
          <NavMovil nav={nav} pathname={pathname} familiaNombre={familiaNombre} />

          <Link
            href="/dashboard"
            className="group flex shrink-0 flex-col justify-center leading-none"
          >
            <span className="font-serif text-lg font-medium tracking-tight">
              HBM
            </span>
            <span className="mt-0.5 max-w-[10rem] truncate text-2xs uppercase tracking-[0.09em] text-faint transition-colors group-hover:text-muted-foreground">
              {familiaNombre}
            </span>
          </Link>

          <NavPestanas nav={nav} pathname={pathname} />

          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <ThemeToggle />
            <MenuUsuario
              userNombre={userNombre}
              userEmail={userEmail}
              familiaId={familiaId}
              memberships={memberships}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-7 sm:px-6 sm:py-9">
        {children}
      </main>
    </div>
  );
}

/**
 * Pestañas con indicador deslizante. Se mide la posición del enlace activo
 * en vez de pintar un borde por pestaña: así el subrayado viaja entre
 * secciones en lugar de parpadear.
 */
function NavPestanas({ nav, pathname }: { nav: NavItem[]; pathname: string }) {
  const contenedor = React.useRef<HTMLElement>(null);
  const [barra, setBarra] = React.useState<{ left: number; width: number } | null>(
    null,
  );

  React.useLayoutEffect(() => {
    const el = contenedor.current;
    if (!el) return;

    const medir = () => {
      const activo = el.querySelector<HTMLAnchorElement>("[data-activo='true']");
      if (!activo) return setBarra(null);
      setBarra({ left: activo.offsetLeft, width: activo.offsetWidth });
    };

    medir();
    // Las fuentes web cambian el ancho de las pestañas al terminar de cargar.
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pathname, nav]);

  return (
    <nav
      ref={contenedor}
      aria-label="Secciones"
      className="relative ml-4 hidden h-14 items-center gap-1 lg:flex"
    >
      {nav.map(({ href, label }) => {
        const activo = esActivo(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            data-activo={activo}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "rounded-sm px-2.5 py-1.5 text-sm font-medium transition-colors duration-150",
              activo
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
      <span
        aria-hidden
        className="absolute bottom-0 h-0.5 rounded-t-xs bg-primary transition-[left,width,opacity] duration-250 ease-out-quint"
        style={
          barra
            ? { left: barra.left, width: barra.width, opacity: 1 }
            : { opacity: 0 }
        }
      />
    </nav>
  );
}

/** Cajón lateral en pantallas estrechas. Sustituye a la tira horizontal. */
function NavMovil({
  nav,
  pathname,
  familiaNombre,
}: {
  nav: NavItem[];
  pathname: string;
  familiaNombre: string;
}) {
  const [abierto, setAbierto] = React.useState(false);

  return (
    <DialogPrimitive.Root open={abierto} onOpenChange={setAbierto}>
      <DialogPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Abrir menú"
          className="-ml-1.5 lg:hidden"
        >
          <Menu />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-[2px] data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card p-3 shadow-lg focus:outline-none data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in">
          <div className="mb-4 flex items-start justify-between px-2 pt-1">
            <div className="leading-none">
              <DialogPrimitive.Title className="font-serif text-lg font-medium tracking-tight">
                HBM
              </DialogPrimitive.Title>
              <p className="mt-1 text-2xs uppercase tracking-[0.09em] text-faint">
                {familiaNombre}
              </p>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Cerrar menú">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <nav className="flex flex-col gap-0.5">
            {nav.map(({ href, label, icon: Icon }) => {
              const activo = esActivo(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={activo ? "page" : undefined}
                  // Cerrar aquí y no en un efecto sobre `pathname`: la
                  // navegación es el evento, no una consecuencia del render.
                  onClick={() => setAbierto(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    activo
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function MenuUsuario({
  userNombre,
  userEmail,
  familiaId,
  memberships,
}: {
  userNombre: string;
  userEmail?: string;
  familiaId?: string;
  memberships: Membership[];
}) {
  const iniciales = userNombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Cuenta de ${userNombre}`}
          className="ml-1 flex size-7 items-center justify-center rounded-full border border-border bg-muted text-2xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {iniciales}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{userNombre}</p>
          {userEmail && (
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          )}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/ajustes/perfil">
            <UserCog />
            Tu perfil
          </Link>
        </DropdownMenuItem>

        {memberships.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Familia</DropdownMenuLabel>
            {memberships.map((m) => (
              <form key={m.familiaId} action={cambiarFamilia}>
                <input type="hidden" name="familiaId" value={m.familiaId} />
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full">
                    <span className="min-w-0 flex-1 truncate text-left">
                      {m.nombre}
                    </span>
                    {m.familiaId === familiaId && (
                      <Check className="size-3.5 !text-primary" />
                    )}
                  </button>
                </DropdownMenuItem>
              </form>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding">
            <FolderPlus />
            Crear otra familia
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem asChild peligro>
            <button type="submit" className="w-full">
              <LogOut />
              Cerrar sesión
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

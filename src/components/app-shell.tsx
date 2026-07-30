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
  ArrowLeftRight,
  FolderPlus,
  KeyRound,
  Settings,
  PiggyBank,
  ReceiptText,
  Search,
  Repeat,
  Tags,
  Target,
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
import { PaletaComandos } from "@/components/paleta-comandos";
import { useAtajos } from "@/components/use-atajos";
import { useModTecla } from "@/components/use-mod-tecla";
import { Kbd } from "@/components/ui/dialog";
import { cambiarFamilia, logout } from "@/server/auth/actions";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Lo que se usa a diario. Cinco entradas caben con holgura en la barra; con
 * diez, los rótulos partían en dos líneas en cuanto la ventana bajaba de
 * ~1.140 px, justo por encima del punto en el que la tira aparece.
 */
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/ahorro", label: "Metas Ahorro", icon: Target },
  { href: "/facturas", label: "Facturas", icon: ReceiptText },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/recurrentes", label: "Recurrentes", icon: Repeat },
];

/** Lo que se configura una vez y se toca poco. Vive en un menú aparte. */
function ajustesPara(alquileresActivo: boolean): NavItem[] {
  return [
    { href: "/categorias", label: "Categorías", icon: Tags },
    { href: "/casas", label: "Casas", icon: Home },
    ...(alquileresActivo
      ? [{ href: "/alquileres", label: "Alquileres", icon: KeyRound }]
      : []),
    { href: "/familia", label: "Familia", icon: Users },
  ];
}

export type Membership = { familiaId: string; nombre: string };

const esActivo = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

import { BottomNav } from "@/components/bottom-nav";

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
  const [paleta, setPaleta] = React.useState(false);
  // El cajón vive aquí porque en móvil lo abre la barra inferior, no la cabecera.
  const [cajon, setCajon] = React.useState(false);
  const abrirPaleta = React.useCallback(() => setPaleta(true), []);
  useAtajos(abrirPaleta);
  const atajoBuscar = `${useModTecla()}K`;

  const ajustes = React.useMemo(
    () => ajustesPara(alquileresActivo),
    [alquileresActivo],
  );

  return (
    <div className="flex min-h-screen flex-1 flex-col pb-16 lg:pb-0">
      {/* El relleno superior deja hueco a la barra de estado del iPhone, que
          con `black-translucent` se dibuja encima del contenido. */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center gap-3 px-4 sm:px-6">
          <NavMovil
            nav={NAV}
            ajustes={ajustes}
            pathname={pathname}
            familiaNombre={familiaNombre}
            abierto={cajon}
            onOpenChange={setCajon}
          />

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

          <NavPestanas nav={NAV} pathname={pathname} />

          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            {/* En móvil solo la lupa: el rótulo y el atajo no caben ni sirven. */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={abrirPaleta}
              aria-label="Buscar"
              className="sm:hidden"
            >
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={abrirPaleta}
              className="hidden gap-2 text-muted-foreground sm:inline-flex"
            >
              <Search />
              Buscar
              <Kbd>{atajoBuscar}</Kbd>
            </Button>
            <MenuAjustes ajustes={ajustes} pathname={pathname} />
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

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-5 sm:px-6 sm:py-9">
        {children}
      </main>

      <BottomNav onMas={() => setCajon(true)} />

      <PaletaComandos
        abierta={paleta}
        onOpenChange={setPaleta}
        alquileresActivo={alquileresActivo}
      />
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

/**
 * Cajón lateral en pantallas estrechas. Sustituye a la tira horizontal.
 *
 * No tiene disparador propio: lo abre «Más» en la barra inferior. Tenerlo
 * también en la cabecera dejaba dos navegaciones a la vez en móvil.
 */
function NavMovil({
  nav,
  ajustes,
  pathname,
  familiaNombre,
  abierto,
  onOpenChange,
}: {
  nav: NavItem[];
  ajustes: NavItem[];
  pathname: string;
  familiaNombre: string;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const setAbierto = onOpenChange;

  return (
    <DialogPrimitive.Root open={abierto} onOpenChange={onOpenChange}>
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
            {[...nav, ...ajustes].map(({ href, label, icon: Icon }, i) => {
              const activo = esActivo(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  // Un filete separa el uso diario de la configuración.
                  data-separado={i === nav.length ? "" : undefined}
                  aria-current={activo ? "page" : undefined}
                  // Cerrar aquí y no en un efecto sobre `pathname`: la
                  // navegación es el evento, no una consecuencia del render.
                  onClick={() => setAbierto(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    "data-[separado]:mt-2 data-[separado]:border-t data-[separado]:border-border data-[separado]:pt-3",
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

/**
 * Lo que se configura una vez. Sacarlo de la barra es lo que deja las cinco
 * pestañas de uso diario respirando: con diez, los rótulos se partían.
 */
function MenuAjustes({
  ajustes,
  pathname,
}: {
  ajustes: NavItem[];
  pathname: string;
}) {
  const dentro = ajustes.some((a) => esActivo(pathname, a.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Ajustes"
          className={cn("hidden lg:inline-flex", dentro && "text-primary")}
        >
          <Settings />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {ajustes.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>
              <Icon />
              <span className="flex-1">{label}</span>
              {esActivo(pathname, href) && (
                <Check className="size-3.5 !text-primary" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

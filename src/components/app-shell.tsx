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
  SunMoon,
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

/** Fila del cajón: 44px de alto, que es el mínimo que un pulgar acierta. */
const FILA_CAJON =
  "flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors";

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
    // El hueco de abajo tiene que contar el área segura: la barra inferior es
    // `fixed` y crece con `env(safe-area-inset-bottom)`, así que con un `pb-16`
    // fijo el indicador de inicio del iPhone se comía el final del contenido.
    <div className="flex min-h-screen flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* El cajón vive fuera de la cabecera: ahora que esta desaparece en
          móvil, colgarlo de un contenedor con `display:none` sería atarlo a
          algo que ya no existe justo donde es la única navegación. */}
      <NavMovil
        nav={NAV}
        ajustes={ajustes}
        pathname={pathname}
        familiaNombre={familiaNombre}
        userNombre={userNombre}
        userEmail={userEmail}
        familiaId={familiaId}
        memberships={memberships}
        abierto={cajon}
        onOpenChange={setCajon}
        onBuscar={abrirPaleta}
      />

      {/* Solo escritorio. En móvil el cromo permanente lo pone la barra
          inferior, y el título lo pone cada pantalla: dos barras fijas —esta y
          la del título— se comían una franja de pantalla que en un móvil no
          sobra. El relleno superior deja hueco a la barra de estado del
          iPhone, que con `black-translucent` se dibuja sobre el contenido. */}
      <header className="sticky top-0 z-40 hidden border-b border-border bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-[backdrop-filter]:bg-background/65 lg:block">
        <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center gap-3 px-4 sm:px-6">
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

      {/* Sin cabecera arriba en móvil, el área segura la tiene que reservar el
          propio contenido: si no, el título grande nace debajo del notch. */}
      <main className="mx-auto w-full max-w-[1180px] flex-1 min-w-0 overflow-x-clip px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 lg:py-9">
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
 * El cajón «Más» de la barra inferior.
 *
 * Al retirar la cabecera web en móvil, esto deja de ser sólo una lista de
 * secciones y pasa a ser lo que en una app nativa es la pestaña de ajustes:
 * el único sitio donde viven buscar, el tema y la cuenta. Por eso baja
 * desde el borde inferior y no desde el lateral —el pulgar llega ahí— y por
 * eso las filas miden 44px.
 */
function NavMovil({
  nav,
  ajustes,
  pathname,
  familiaNombre,
  userNombre,
  userEmail,
  familiaId,
  memberships,
  abierto,
  onOpenChange,
  onBuscar,
}: {
  nav: NavItem[];
  ajustes: NavItem[];
  pathname: string;
  familiaNombre: string;
  userNombre: string;
  userEmail?: string;
  familiaId?: string;
  memberships: Membership[];
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  onBuscar: () => void;
}) {
  const cerrar = () => onOpenChange(false);

  const iniciales = userNombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <DialogPrimitive.Root open={abierto} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-[2px] data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col",
            "rounded-t-[22px] border-t border-border bg-card shadow-xl focus:outline-none",
            "pb-[env(safe-area-inset-bottom)]",
            "data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in",
            // En pantalla ancha sigue siendo el cajón lateral de siempre.
            "lg:inset-y-0 lg:right-auto lg:bottom-auto lg:left-0 lg:max-h-none lg:w-64",
            "lg:rounded-none lg:border-r lg:border-t-0",
          )}
        >
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong/60 lg:hidden" />

          <div className="flex items-start justify-between px-4 pb-3 pt-3">
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

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
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
                    onClick={cerrar}
                    className={cn(FILA_CAJON,
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

            {/* Lo que vivía en la cabecera web. En escritorio sigue arriba, así
                que esta parte es sólo para pantallas estrechas. */}
            <div className="mt-2 border-t border-border pt-2 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  cerrar();
                  onBuscar();
                }}
                className={cn(FILA_CAJON, "w-full text-muted-foreground hover:bg-muted hover:text-foreground")}
              >
                <Search className="size-4" />
                Buscar
              </button>

              <div className={cn(FILA_CAJON, "justify-between text-muted-foreground")}>
                <span className="flex items-center gap-2.5">
                  <SunMoon className="size-4" />
                  Tema
                </span>
                <ThemeToggle />
              </div>
            </div>

            <div className="mt-2 border-t border-border pt-2 lg:hidden">
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-2xs font-medium text-muted-foreground">
                  {iniciales}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{userNombre}</span>
                  {userEmail && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {userEmail}
                    </span>
                  )}
                </span>
              </div>

              <Link
                href="/ajustes/perfil"
                onClick={cerrar}
                className={cn(FILA_CAJON, "text-muted-foreground hover:bg-muted hover:text-foreground")}
              >
                <UserCog className="size-4" />
                Tu perfil
              </Link>

              {memberships.length > 1 &&
                memberships.map((m) => (
                  <form key={m.familiaId} action={cambiarFamilia}>
                    <input type="hidden" name="familiaId" value={m.familiaId} />
                    <button
                      type="submit"
                      className={cn(FILA_CAJON, "w-full text-muted-foreground hover:bg-muted hover:text-foreground")}
                    >
                      <Users className="size-4" />
                      <span className="min-w-0 flex-1 truncate text-left">{m.nombre}</span>
                      {m.familiaId === familiaId && (
                        <Check className="size-3.5 shrink-0 text-primary" />
                      )}
                    </button>
                  </form>
                ))}

              <Link
                href="/onboarding"
                onClick={cerrar}
                className={cn(FILA_CAJON, "text-muted-foreground hover:bg-muted hover:text-foreground")}
              >
                <FolderPlus className="size-4" />
                Crear otra familia
              </Link>

              <form action={logout}>
                <button
                  type="submit"
                  className={cn(FILA_CAJON, "w-full text-danger hover:bg-danger/10")}
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
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

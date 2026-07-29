import { logout } from "@/server/auth/actions";
import { requireInquilino } from "@/server/auth/dal";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Marco del portal del inquilino.
 *
 * No monta `AppShell` a propósito: no hay navegación a la app, ni selector de
 * familia, ni acceso a nada más. Lo único que existe aquí es su vivienda.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireInquilino();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
          <div className="mx-auto flex h-14 w-full max-w-[860px] items-center gap-3 px-4 sm:px-6">
            <div className="flex flex-col justify-center leading-none">
              <span className="font-serif text-lg font-medium tracking-tight">
                HBM
              </span>
              <span className="mt-0.5 max-w-[12rem] truncate text-2xs uppercase tracking-[0.09em] text-faint">
                {ctx.casa.nombre}
              </span>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              <span className="mr-1 hidden text-xs text-muted-foreground sm:inline">
                {ctx.user.nombre}
              </span>
              <ThemeToggle />
              <form action={logout}>
                <Button type="submit" variant="ghost" size="sm">
                  Salir
                </Button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[860px] flex-1 px-4 py-7 sm:px-6 sm:py-9">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}

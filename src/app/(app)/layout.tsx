import { requireFamilia } from "@/server/auth/dal";
import { AppShell } from "@/components/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireFamilia();
  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={200}>
      <AppShell
        familiaNombre={ctx.familia.nombre}
        familiaId={ctx.familiaId}
        userNombre={ctx.user.nombre}
        userEmail={ctx.user.email}
        alquileresActivo={ctx.alquileresActivo}
        memberships={ctx.memberships.map((m) => ({
          familiaId: m.familiaId,
          nombre: m.nombre,
        }))}
      >
        {children}
      </AppShell>
    </TooltipProvider>
  );
}

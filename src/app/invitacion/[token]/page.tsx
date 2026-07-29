import Link from "next/link";
import { MailX, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolverInvitacion } from "@/server/db/invitaciones";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { AceptarInvitacion, AltaConInvitacion } from "./invitacion-form";

const ROL_TEXTO: Record<string, string> = {
  OWNER: "propietario",
  ADMIN: "administrador",
  MEMBER: "miembro",
};

export default async function InvitacionPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  const inv = await resolverInvitacion(token);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="flex h-14 items-center justify-between px-5">
        <Link href="/" className="font-serif text-lg font-medium tracking-tight">
          HBM
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[22rem]">
          {inv ? (
            <Contenido token={token} inv={inv} />
          ) : (
            <Card>
              <EmptyState
                icon={MailX}
                titulo="Invitación no válida"
                descripcion="El enlace ha caducado, ya se usó o se revocó. Pide uno nuevo a quien te invitó."
                accion={
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/login">Ir a la app</Link>
                  </Button>
                }
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

async function Contenido({
  token,
  inv,
}: {
  token: string;
  inv: NonNullable<Awaited<ReturnType<typeof resolverInvitacion>>>;
}) {
  const session = await getSession();
  const usuario = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true },
      })
    : null;

  const cabecera = (
    <div className="mb-5 text-center">
      <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-md border border-border bg-muted/60">
        <Users className="size-4 text-muted-foreground" />
      </div>
      <h1 className="font-serif text-xl font-medium tracking-tight">
        Te han invitado a {inv.familia.nombre}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Entrarás como {ROL_TEXTO[inv.rol] ?? "miembro"} · {inv.email}
      </p>
    </div>
  );

  // Con sesión del mismo email basta un clic; con otra cuenta hay que salir.
  if (usuario) {
    return (
      <div>
        {cabecera}
        {usuario.email.toLowerCase() === inv.email ? (
          <AceptarInvitacion token={token} familia={inv.familia.nombre} />
        ) : (
          <Card className="p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Has entrado como <strong>{usuario.email}</strong>, pero la
              invitación es para <strong>{inv.email}</strong>. Cierra la sesión y
              vuelve a abrir este enlace.
            </p>
            <Button asChild size="sm" variant="secondary" className="mt-3">
              <Link href="/login">Cambiar de cuenta</Link>
            </Button>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div>
      {cabecera}
      <AltaConInvitacion token={token} email={inv.email} />
    </div>
  );
}

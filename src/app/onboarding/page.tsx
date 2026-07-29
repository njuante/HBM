import Link from "next/link";
import { verifySession } from "@/server/auth/dal";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await verifySession(); // exige sesión válida

  // La misma pantalla sirve para el alta inicial y para crear una familia
  // adicional desde el menú de usuario; solo cambia el texto.
  const yaTieneFamilia =
    (await prisma.membership.count({ where: { userId: session.userId } })) > 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-14 items-center justify-between px-5">
        {yaTieneFamilia ? (
          <Link
            href="/dashboard"
            className="font-serif text-lg font-medium tracking-tight"
          >
            HBM
          </Link>
        ) : (
          <span className="font-serif text-lg font-medium tracking-tight">HBM</span>
        )}
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[22rem]">
          <h1 className="mb-1 font-serif text-2xl font-medium tracking-tight">
            {yaTieneFamilia ? "Crea otra familia" : "Crea tu familia"}
          </h1>
          <p className="mb-5 text-sm text-muted-foreground">
            {yaTieneFamilia
              ? "Tendrá sus propias casas, categorías y movimientos. Podrás cambiar entre familias desde tu menú."
              : "Aún no perteneces a ninguna. Crea una para empezar a registrar gastos e ingresos."}
          </p>
          <Card>
            <CardContent>
              <OnboardingForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

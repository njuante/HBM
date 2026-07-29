import Link from "next/link";
import { ArrowRight, LineChart, PiggyBank, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="flex-1">
      <header className="mx-auto flex h-14 w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <span className="font-serif text-lg font-medium tracking-tight">HBM</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
        <p className="text-2xs font-medium uppercase tracking-[0.14em] text-primary">
          ERP doméstico
        </p>

        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl">
          Controla los gastos, ingresos y facturas de tu hogar
        </h1>

        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          Un cuadro de mando sobrio para las cuentas de la casa. Registra un
          movimiento en cinco segundos y entiende a dónde va el dinero de un
          vistazo.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/registro">
              Crear cuenta
              <ArrowRight />
            </Link>
          </Button>
          <span className="text-xs text-faint">
            Autoalojado · tus datos no salen de tu servidor
          </span>
        </div>

        <div className="mt-20 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          <Feature
            icon={PiggyBank}
            title="Gastos e ingresos"
            text="Importe, categoría y listo. El concepto se autocompleta con lo que ya registraste."
          />
          <Feature
            icon={ReceiptText}
            title="Facturas"
            text="Sube el PDF o la foto. HBM te avisa antes de que venza y las enlaza con su gasto."
          />
          <Feature
            icon={LineChart}
            title="Visión gráfica"
            text="Flujo mensual, reparto por categoría e intensidad diaria del gasto."
          />
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof PiggyBank;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-background p-6">
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="mt-3.5 font-serif text-lg font-medium tracking-tight">
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

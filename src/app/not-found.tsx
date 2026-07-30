import Link from "next/link";
import { Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NoEncontrada() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="flex h-14 items-center justify-between px-5">
        <Link href="/" className="font-serif text-lg font-medium tracking-tight">
          HBM
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <Card className="w-full max-w-sm">
          <EmptyState
            icon={Compass}
            titulo="Aquí no hay nada"
            descripcion="La página que buscas no existe o ha cambiado de sitio."
            accion={
              <Button asChild size="sm">
                <Link href="/dashboard">Ir al panel</Link>
              </Button>
            }
          />
        </Card>
      </div>
    </div>
  );
}

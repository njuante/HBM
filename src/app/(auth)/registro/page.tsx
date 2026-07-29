import { Card, CardContent } from "@/components/ui/card";
import { RegistroForm } from "./registro-form";

export default function RegistroPage() {
  return (
    <div>
      <h1 className="mb-1 font-serif text-2xl font-medium tracking-tight">
        Crear cuenta
      </h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Tu cuenta y la de tu familia, en un solo paso.
      </p>
      <Card>
        <CardContent>
          <RegistroForm />
        </CardContent>
      </Card>
    </div>
  );
}

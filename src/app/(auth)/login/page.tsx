import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-1 font-serif text-2xl font-medium tracking-tight">
        Bienvenido de vuelta
      </h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Entra para ver las cuentas de tu casa.
      </p>
      <Card>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}

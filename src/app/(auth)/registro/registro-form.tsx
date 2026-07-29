"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registro } from "@/server/auth/actions";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function RegistroForm() {
  const [state, action] = useActionState(registro, undefined);

  return (
    <form action={action} className="space-y-3.5">
      {state?.message && <FormError>{state.message}</FormError>}

      <Field label="Tu nombre" error={state?.errors?.nombre}>
        <Input name="nombre" autoComplete="name" autoFocus required />
      </Field>

      <Field
        label="Nombre de la familia"
        error={state?.errors?.familia}
        ayuda="Podrás cambiarlo después y añadir más casas."
      >
        <Input name="familia" placeholder="Familia García" required />
      </Field>

      <Field label="Email" error={state?.errors?.email}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>

      <Field label="Contraseña" error={state?.errors?.password}>
        <Input name="password" type="password" autoComplete="new-password" required />
      </Field>

      <SubmitButton className="w-full">Crear cuenta</SubmitButton>

      <p className="pt-1 text-center text-xs text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline decoration-border-strong underline-offset-2 hover:decoration-foreground"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}

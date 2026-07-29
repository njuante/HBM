"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/server/auth/actions";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-3.5">
      {state?.message && <FormError>{state.message}</FormError>}

      <Field label="Email" error={state?.errors?.email}>
        <Input name="email" type="email" autoComplete="email" autoFocus required />
      </Field>

      <Field label="Contraseña" error={state?.errors?.password}>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton className="w-full">Entrar</SubmitButton>

      <p className="pt-1 text-center text-xs text-muted-foreground">
        ¿Todavía no tienes cuenta?{" "}
        <Link
          href="/registro"
          className="font-medium text-foreground underline decoration-border-strong underline-offset-2 hover:decoration-foreground"
        >
          Crear una
        </Link>
      </p>
    </form>
  );
}

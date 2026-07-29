"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  aceptarInvitacionAction,
  registroConInvitacionAction,
} from "../actions";

/** Ya hay sesión con el email invitado: un botón y dentro. */
export function AceptarInvitacion({
  token,
  familia,
}: {
  token: string;
  familia: string;
}) {
  return (
    <form action={aceptarInvitacionAction}>
      <input type="hidden" name="token" value={token} />
      <SubmitButton className="w-full">Unirme a {familia}</SubmitButton>
    </form>
  );
}

/**
 * Alta desde el enlace. El email no se pide: viene fijado por la invitación,
 * y aceptar con otro sería colar a un tercero.
 */
export function AltaConInvitacion({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, action] = useActionState(registroConInvitacionAction, undefined);

  return (
    <form action={action} className="space-y-3.5">
      <input type="hidden" name="token" value={token} />
      {state?.message && <FormError>{state.message}</FormError>}

      <Field label="Email">
        <Input value={email} readOnly disabled />
      </Field>

      <Field label="Tu nombre" error={state?.errors?.nombre}>
        <Input name="nombre" autoComplete="name" autoFocus required />
      </Field>

      <Field label="Contraseña" error={state?.errors?.password}>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton className="w-full">Crear cuenta y entrar</SubmitButton>

      <p className="pt-1 text-center text-xs text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline decoration-border-strong underline-offset-2 hover:decoration-foreground"
        >
          Entrar y volver a este enlace
        </Link>
      </p>
    </form>
  );
}

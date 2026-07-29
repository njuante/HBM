"use client";

import { useActionState } from "react";
import { crearFamiliaAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/validation/form";

export function OnboardingForm() {
  const [state, action] = useActionState<FormState, FormData>(
    crearFamiliaAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3.5">
      {state?.message && <FormError>{state.message}</FormError>}

      <Field
        label="Nombre de la familia"
        error={state?.errors?.nombre}
        ayuda="Se crearán también las categorías por defecto."
      >
        <Input name="nombre" placeholder="Familia García" autoFocus required />
      </Field>

      <SubmitButton className="w-full">Crear familia</SubmitButton>
    </form>
  );
}

"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";

/** Botón de envío que se deshabilita y muestra spinner mientras la acción corre. */
export function SubmitButton({ children, disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";

/**
 * Interruptor que envía su formulario al cambiar, sin botón de guardar.
 *
 * Tres detalles que no son evidentes y que hay que respetar:
 *
 * 1. **El interruptor vive fuera del `<form>`.** React 19 resetea el formulario
 *    al terminar su acción y Radix, si el switch está dentro, traduce ese reset
 *    en un cambio: se dispara un segundo envío que deshace el primero.
 * 2. **El estado es controlado**, para que ese mismo reset no pueda moverlo.
 * 3. **El envío va en un efecto**, no en el callback: así el input oculto ya se
 *    ha repintado con el valor nuevo cuando se llama a `requestSubmit()`.
 */
export function SwitchEnvio({
  action,
  name,
  defaultChecked,
  ariaLabel,
  campos,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  name: string;
  defaultChecked: boolean;
  ariaLabel: string;
  /** Campos ocultos extra, p. ej. el id del registro. */
  campos?: Record<string, string>;
  className?: string;
  children?: React.ReactNode;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [activo, setActivo] = React.useState(defaultChecked);
  const montado = React.useRef(false);

  React.useEffect(() => {
    if (!montado.current) {
      montado.current = true;
      return;
    }
    formRef.current?.requestSubmit();
  }, [activo]);

  return (
    <div className={className}>
      <form ref={formRef} action={action} className="hidden">
        {Object.entries(campos ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input type="hidden" name={name} value={activo ? "on" : ""} />
      </form>

      <div className="flex items-start gap-3">
        <Switch checked={activo} onCheckedChange={setActivo} aria-label={ariaLabel} />
        {children}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Campo de solo lectura con botón de copiar y confirmación efímera.
 *
 * Lo usan los dos sitios que reparten enlaces de un solo uso —la invitación a
 * la familia y el acceso del inquilino—, que hasta ahora tenían cada uno su
 * copia literal de este bloque.
 */
export function EnlaceCopiable({
  enlace,
  etiqueta = "Enlace de invitación",
}: {
  enlace: string;
  etiqueta?: string;
}) {
  const [copiado, setCopiado] = React.useState(false);

  return (
    <div className="flex gap-2">
      <Input value={enlace} readOnly aria-label={etiqueta} />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0"
        onClick={async () => {
          await navigator.clipboard.writeText(enlace);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
      >
        {copiado ? <Check /> : <Copy />}
        {copiado ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}

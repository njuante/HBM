"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Avisos efímeros.
 *
 * Hasta ahora dieciséis acciones terminaban en silencio —borrados, cambios de
 * estado, compartir una factura, confirmar una propuesta— y la única señal era
 * que la fila desaparecía. Aquí van todas, con el mismo formato.
 */

type Aviso = {
  id: number;
  texto: string;
  /** Acción de deshacer, cuando la hay. */
  deshacer?: () => void;
};

type Contexto = {
  avisar: (texto: string, deshacer?: () => void) => void;
};

const ToastContext = React.createContext<Contexto | null>(null);

/** Devuelve `avisar(texto, deshacer?)`. Fuera del proveedor no hace nada. */
export function useToast(): Contexto {
  return React.useContext(ToastContext) ?? { avisar: () => {} };
}

const DURACION_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = React.useState<Aviso[]>([]);
  const siguiente = React.useRef(0);

  const quitar = React.useCallback((id: number) => {
    setAvisos((v) => v.filter((a) => a.id !== id));
  }, []);

  const avisar = React.useCallback(
    (texto: string, deshacer?: () => void) => {
      const id = siguiente.current++;
      setAvisos((v) => [...v, { id, texto, deshacer }]);
      setTimeout(() => quitar(id), DURACION_MS);
    },
    [quitar],
  );

  const valor = React.useMemo(() => ({ avisar }), [avisar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}

      {/* `aria-live` para que un lector de pantalla anuncie lo que ha pasado:
          la confirmación no puede ser solo visual. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-3",
              "rounded-lg border border-border bg-card px-3.5 py-2.5 shadow-lg",
              "animate-pop-in",
            )}
          >
            <Check className="size-4 shrink-0 text-success" />
            <p className="min-w-0 flex-1 text-sm">{a.texto}</p>

            {a.deshacer && (
              <Button
                size="xs"
                variant="secondary"
                onClick={() => {
                  a.deshacer?.();
                  quitar(a.id);
                }}
              >
                Deshacer
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Cerrar aviso"
              onClick={() => quitar(a.id)}
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

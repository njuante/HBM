"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/** ¿El foco está en algo donde se escribe? Entonces las letras son texto. */
function escribiendo(destino: EventTarget | null): boolean {
  const el = destino as HTMLElement | null;
  if (!el) return false;
  const etiqueta = el.tagName;
  return (
    etiqueta === "INPUT" ||
    etiqueta === "TEXTAREA" ||
    etiqueta === "SELECT" ||
    el.isContentEditable
  );
}

const IR_A: Record<string, string> = {
  p: "/dashboard",
  m: "/movimientos",
  f: "/facturas",
  r: "/recurrentes",
  b: "/presupuestos",
};

/**
 * Atajos globales de la app.
 *
 * - `⌘/Ctrl + K` o `/` abren la paleta.
 * - `g` seguido de una letra navega (`g m` → movimientos).
 *
 * Todo queda inerte mientras el foco esté en un campo de texto: si no, teclear
 * «gasolina» en el buscador acabaría navegando.
 */
export function useAtajos(abrirPaleta: () => void) {
  const router = useRouter();
  const esperandoDestino = React.useRef(false);

  React.useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        abrirPaleta();
        return;
      }

      if (escribiendo(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (esperandoDestino.current) {
        esperandoDestino.current = false;
        const destino = IR_A[e.key.toLowerCase()];
        if (destino) {
          e.preventDefault();
          router.push(destino);
        }
        return;
      }

      if (e.key === "g") {
        esperandoDestino.current = true;
        // La secuencia caduca sola: si no llega la segunda tecla, no pasa nada.
        setTimeout(() => (esperandoDestino.current = false), 1200);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        abrirPaleta();
      }
    };

    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abrirPaleta, router]);
}

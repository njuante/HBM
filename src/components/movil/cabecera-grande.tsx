"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * La barra de navegación de las pantallas móviles.
 *
 * Empieza como título grande sobre el contenido y, al bajar, se encoge hasta
 * una barra compacta pegada arriba. Es el gesto de iOS, y aquí sale gratis:
 * el `AppShell` ya no pinta cabecera web en móvil, así que esta es la única
 * franja de cromo superior y puede ocupar mientras sirve —al llegar, para
 * situarte— y apartarse en cuanto empiezas a leer.
 *
 * El estado lo decide un `IntersectionObserver` sobre un centinela y no un
 * escuchador de `scroll`: el navegador lo resuelve fuera del hilo principal,
 * así que no hay trabajo nuestro en cada fotograma del desplazamiento.
 */
export function CabeceraGrande({
  titulo,
  subtitulo,
  accion,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  /** Se repite en la barra compacta: al bajar sigue estando a mano. */
  accion?: React.ReactNode;
}) {
  const centinela = React.useRef<HTMLDivElement>(null);
  const [compacta, setCompacta] = React.useState(false);

  React.useEffect(() => {
    const el = centinela.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entrada]) => setCompacta(!entrada.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* La barra vive siempre en el árbol y sólo cambia de opacidad: montarla
          y desmontarla al cruzar el umbral daría un salto de maquetación. */}
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-30 border-b transition-[opacity,border-color] duration-200 lg:hidden",
          "bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl",
          compacta
            ? "border-border/70 opacity-100"
            : "pointer-events-none border-transparent opacity-0",
        )}
      >
        {/* 56px y no los 44 de una barra de iOS: la acción es un botón de 44
            —el mínimo táctil—, y en una barra de 44 lo tocaría todo. */}
        <div className="flex h-14 items-center gap-3 px-4">
          <span className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">
            {titulo}
          </span>
          {accion}
        </div>
      </div>

      {/* Marca dónde deja de verse el título grande. Se coloca a su altura, no
          arriba del todo, para que el relevo ocurra justo al ocultarse. */}
      <div ref={centinela} aria-hidden className="h-px" />

      <header className="mb-6 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-[34px] font-medium leading-none tracking-tight">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="mt-2 text-[13px] text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        {accion && <div className="shrink-0 pb-1">{accion}</div>}
      </header>
    </>
  );
}

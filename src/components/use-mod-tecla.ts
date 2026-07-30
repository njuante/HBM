"use client";

import * as React from "react";

const esMac = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.userAgent);

// La plataforma no cambia en toda la vida de la página: nunca hay que avisar.
const suscribir = () => () => {};
const enCliente = () => (esMac() ? "⌘" : "Ctrl");
const enServidor = () => "Ctrl";

/**
 * Símbolo de la tecla modificadora para las pistas de atajo.
 *
 * Va por `useSyncExternalStore` y no por un `useEffect` porque el servidor no
 * sabe en qué plataforma se va a pintar: así React usa «Ctrl» al hidratar y
 * cambia después, sin discrepancia de hidratación. El atajo funciona igual en
 * ambas plataformas; esto es solo el rótulo.
 */
export function useModTecla() {
  return React.useSyncExternalStore(suscribir, enCliente, enServidor);
}

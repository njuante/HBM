import type * as React from "react";

/**
 * Armonización de los colores de categoría.
 *
 * Vive aquí, en un módulo neutral, y no junto al tema de las gráficas
 * porque aquel es `"use client"` y esto es aritmética pura: el panel móvil
 * lo necesita **en el servidor**, para dejar los colores ya resueltos en el
 * HTML sin arrastrar la lista entera al cliente sólo para saber el tema.
 */

/* ── Armonización de los colores de categoría ────────────────────────────
   Los colores de `Categoria.color` los elige el usuario y las familias
   antiguas arrastran tonos Tailwind-500 crudos que chocan con el papel
   cálido (y varios son indistinguibles entre sí: #0ea5e9 vs #38bdf8).

   En vez de migrar datos, se normalizan al vuelo: se conserva el MATIZ
   —que es la identidad que el usuario reconoce— y se llevan croma y
   luminosidad a la banda del sistema, distinta en claro y oscuro.        */

type OKLCH = { l: number; c: number; h: number };

function srgbALineal(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linealASrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

function hexAOklch(hex: string): OKLCH | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = srgbALineal(((n >> 16) & 255) / 255);
  const g = srgbALineal(((n >> 8) & 255) / 255);
  const b = srgbALineal((n & 255) / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m2 = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m2 - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m2 + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m2 - 0.808675766 * s;

  return {
    l: L,
    c: Math.hypot(A, B),
    h: (Math.atan2(B, A) * 180) / Math.PI,
  };
}

function oklchAHex({ l, c, h }: OKLCH): string {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;

  const canal = (v: number) =>
    Math.max(0, Math.min(255, Math.round(linealASrgb(v) * 255)));

  const r = canal(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_);
  const g = canal(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_);
  const b = canal(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Bandas medidas sobre la propia paleta del sistema (`--chart-1..8`):
 * es literalmente el rango en el que vive un color «de la casa».
 */
const BANDA = {
  light: { l: [0.43, 0.56], cMax: 0.12 },
  dark: { l: [0.65, 0.74], cMax: 0.13 },
} as const;

const sujetar = (v: number, [min, max]: readonly [number, number]) =>
  Math.min(max, Math.max(min, v));

/**
 * Devuelve el color de una categoría ajustado al tema. Si el hex no es
 * válido, cae en el gris recesivo del sistema.
 */
export function armonizarColor(hex: string, tema: "light" | "dark"): string {
  const oklch = hexAOklch(hex);
  if (!oklch) return tema === "dark" ? "#8c8880" : "#78736b";

  const banda = BANDA[tema];
  return oklchAHex({
    l: sujetar(oklch.l, banda.l),
    // El croma solo se recorta, nunca se sube: un color que el usuario
    // eligió apagado (un gris) debe seguir apagado, no volverse un tono.
    c: Math.min(oklch.c, banda.cMax),
    h: oklch.h,
  });
}

/**
 * Las dos versiones del color de una categoría, listas para el HTML.
 *
 * Se emiten como variables CSS junto a la clase `.cat` (ver `globals.css`),
 * que escoge una u otra según el tema. Así el servidor puede pintar el color
 * correcto sin saber qué tema tiene el usuario y sin pasar la lista a
 * cliente sólo para preguntarlo.
 */
export function tonosCategoria(hex: string): React.CSSProperties {
  return {
    ["--cat-claro" as string]: armonizarColor(hex, "light"),
    ["--cat-oscuro" as string]: armonizarColor(hex, "dark"),
  };
}

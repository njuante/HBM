"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "hbm-theme";
const EVENTO = "hbm-theme-change";
const MEDIA = "(prefers-color-scheme: dark)";

type ThemeContextValue = {
  theme: Theme;
  /** El tema realmente pintado: "system" ya resuelto contra el SO. */
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/* ── Preferencia guardada ─────────────────────────────────────────────── */

function suscribirPreferencia(onChange: () => void) {
  // `storage` cubre las otras pestañas; el evento propio, esta misma.
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENTO, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENTO, onChange);
  };
}

function leerPreferencia(): Theme {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" ? v : "system";
}

/* ── Preferencia del sistema ──────────────────────────────────────────── */

function suscribirSistema(onChange: () => void) {
  const mq = window.matchMedia(MEDIA);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const leerSistema = () => window.matchMedia(MEDIA).matches;

/**
 * Fuente única de verdad del tema.
 *
 * Ambas preferencias —la guardada y la del SO— son estado externo a React,
 * así que se leen con `useSyncExternalStore` en vez de copiarlas a estado
 * desde un efecto. El tema resuelto se deriva, no se almacena.
 *
 * Existe sobre todo por las gráficas: Recharts pinta atributos SVG y no
 * puede heredar `var(--chart-1)`, necesita el valor concreto.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    suscribirPreferencia,
    leerPreferencia,
    () => "system" as Theme,
  );

  const sistemaOscuro = useSyncExternalStore(
    suscribirSistema,
    leerSistema,
    () => false,
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (sistemaOscuro ? "dark" : "light") : theme;

  // Sincroniza el DOM (sistema externo) con el tema resuelto. El script en
  // línea de `layout.tsx` ya lo dejó bien antes del primer pintado; esto
  // solo mantiene el valor al cambiarlo.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.dataset.theme = theme;
  }, [theme, resolvedTheme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return (
    <ThemeContext value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>.");
  return ctx;
}

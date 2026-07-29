import type { Metadata, Viewport } from "next";
import { Inter_Tight, Newsreader } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const sans = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter-tight",
  display: "swap",
});

// Serif de texto (no de titular): da el aire de informe impreso a los
// títulos y a las cifras, que es lo que separa esto de una plantilla.
const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HBM — Gestión de gastos del hogar",
  description:
    "ERP doméstico para familias y casas: gastos, ingresos, facturas y visión gráfica.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

// Se ejecuta antes del primer pintado para evitar el destello de tema claro.
// Debe quedarse en línea y sin `defer`: cualquier otra cosa llega tarde.
const THEME_SCRIPT = `
try {
  var t = localStorage.getItem("hbm-theme") || "system";
  var dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HBM ERP Doméstico",
    short_name: "HBM",
    description: "ERP doméstico para familias y casas: gastos, ingresos y facturas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    orientation: "portrait",
    // Hacen falta las dos formas: sin un `any` de 512 el instalador de Android
    // recorta el maskable al usarlo como icono normal.
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

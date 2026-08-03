import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida solo para el build de Docker (servidor de casa / Oracle Cloud).
  // En local (dev, tests e2e con `next start`) se deja el build normal.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,

  // En desarrollo Next devuelve 403 a todo `/_next/*` que llegue con un origen
  // distinto de `localhost` (`blockCrossSiteDEV`). Al abrir el dev server desde
  // el móvil por la IP de la LAN, el HTML llega —lo pinta el servidor— pero
  // ningún chunk de JS: la página se ve entera y no responde un solo botón.
  // Sin esto tampoco conecta el WebSocket de HMR, que sí manda `Origin`.
  // Solo afecta a `next dev`; en producción esta comprobación no existe.
  allowedDevOrigins: [
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "*.local",
  ],
};

export default nextConfig;

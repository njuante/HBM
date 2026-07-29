import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida solo para el build de Docker (servidor de casa / Oracle Cloud).
  // En local (dev, tests e2e con `next start`) se deja el build normal.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
};

export default nextConfig;

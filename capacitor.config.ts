import type { CapacitorConfig } from "@capacitor/cli";

/**
 * HBM es una app con servidor (Server Actions, rutas de API, Prisma y sesión en
 * cookie), así que **no puede empaquetarse dentro del APK**: no hay export
 * estático posible. El APK es una ventana sobre el despliegue real, y por eso
 * `server.url` es obligatorio.
 *
 * La URL se pasa al construir, para no dejar un dominio escrito en el repo:
 *
 *   CAP_SERVER_URL=https://hbm.tudominio.com npm run cap:sync
 *
 * Tiene que ser HTTPS: la cookie de sesión viaja como `Secure` en producción
 * (src/lib/session.ts), y sobre HTTP el navegador la descarta y el login falla
 * sin decir nada.
 */
const url = process.env.CAP_SERVER_URL;

if (!url) {
  throw new Error(
    "Falta CAP_SERVER_URL. Ejemplo:\n" +
      "  CAP_SERVER_URL=https://hbm.tudominio.com npm run cap:sync",
  );
}

const config: CapacitorConfig = {
  appId: "com.hbm.hogar",
  appName: "HBM",
  // Solo se usa como carpeta de arranque; el contenido real llega de `server.url`.
  webDir: "public",
  server: {
    url,
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;

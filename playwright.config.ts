import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

// E2E contra un servidor de producción real (build + start) usando la BD local.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      // El de móvil corre en su propio proyecto, con su viewport.
      testIgnore: /movil\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Un móvil de verdad: sin hover y con pantalla estrecha. Es donde se
    // rompían las acciones de fila, así que tiene que estar cubierto.
    // Sobre chromium y no sobre el webkit que trae el descriptor del iPhone:
    // el proyecto solo instala chromium, y lo que se comprueba aquí —puntero
    // grueso, ausencia de hover y ancho— se emula igual.
    {
      name: "movil",
      testMatch: /movil\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

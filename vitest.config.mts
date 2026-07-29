import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";

// Carga .env para que los tests de integración vean DATABASE_URL.
loadEnv();

const serverOnlyStub = fileURLToPath(
  new URL("./tests/stubs/server-only.ts", import.meta.url),
);

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // Permite importar módulos con `import "server-only"` dentro de Vitest.
    alias: { "server-only": serverOnlyStub },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["node_modules", ".next", "tests/e2e/**"],
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
    },
  },
});

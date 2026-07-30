import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    // Base de usar y tirar que Prisma necesita para comparar el esquema con las
    // migraciones (`migrate dev`, `migrate diff --from-migrations`). Opcional:
    // sin ella el resto de comandos funcionan igual.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});

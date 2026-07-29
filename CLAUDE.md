@AGENTS.md

# HBM — ERP doméstico para familias y casas

App web (Next.js 16 App Router + TypeScript) para gestionar y visualizar gastos,
ingresos y facturas del hogar. Multi-familia (multi-tenant), self-hosted.

## Stack

- Next.js 16 (App Router, Server Components + Server Actions), React 19.2, Turbopack.
- Prisma 7 (generador `prisma-client`, **driver adapter** `@prisma/adapter-pg`) + PostgreSQL.
- Tailwind CSS v4 (tokens en `src/app/globals.css`) + utilidades tipo shadcn (`cn`, CVA, lucide).
- Zod 4 (validación), react-hook-form. Recharts para gráficas.
- Tests: Vitest + Testing Library (unit) y Playwright (e2e en `tests/e2e`).

## Arquitectura clave

- Aislamiento multi-tenant: **toda** consulta se filtra por `familiaId` de la sesión en la
  capa de acceso a datos (`src/server/db/*`). Nunca confiar en `familiaId` del cliente.
- Auth: sesión opaca en BD (`Session`), token en cookie httpOnly. DAL en `src/server/auth`
  (`verifySession`/`requireFamilia`). Chequeo optimista en `proxy.ts` (Next 16 renombró middleware→proxy).
- Cliente Prisma generado en `src/generated/prisma` (gitignored). Import: `@/generated/prisma/client`.
- Almacenamiento de archivos abstraído (`src/server/storage`), impl. local sobre `UPLOADS_DIR`.

## Entorno de desarrollo

- **El daemon de Docker no está activo y no hay sudo sin contraseña.** Para dev/tests se usa un
  PostgreSQL **local** (binarios `/usr/bin/postgres`) en vez de docker. Ver `scripts/dev-db.sh`.
- Docker (`docker-compose.yml` + `Dockerfile`) es la vía de **despliegue** (servidor de casa / Oracle Cloud).
- `.env` local apunta a `postgresql://hbm:...@localhost:5432/hbm`.

## Comandos

- `npm run dev` — servidor de desarrollo.
- `npm test` / `npm run test:watch` — tests unitarios.
- `npm run test:e2e` — tests e2e (requiere `npx playwright install chromium` una vez).
- `npm run db:migrate` — crear/aplicar migración. `npm run db:seed` — datos de ejemplo.
- Requiere la BD local levantada: `bash scripts/dev-db.sh start`.

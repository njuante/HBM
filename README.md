# HBM — ERP doméstico para familias y casas

Aplicación web para **gestionar y visualizar** los gastos, ingresos y facturas del hogar.
Multi-familia (multi-tenant), self-hosted. Registra movimientos, categorízalos, sube facturas
(PDF/imagen) y entiende tus finanzas con un panel gráfico.

## Stack

- **Next.js 16** (App Router, Server Components + Server Actions) + **TypeScript** + Turbopack
- **Prisma 7** (`@prisma/adapter-pg`) + **PostgreSQL**
- **Tailwind CSS v4** + utilidades tipo shadcn · **Recharts** para las gráficas
- **Zod 4** (validación) · **Vitest** + **Playwright** (tests)

## Módulos

- 🔐 Usuarios, familias y roles (OWNER/ADMIN/MEMBER) con aislamiento multi-tenant
- 🏷️ Categorías configurables (color, subcategorías) — base de la categorización
- 💸 Gastos e ingresos: alta/edición y visor con filtros y totales
- 🧾 Facturas: subida de PDF/imagen, visor y control de estado de pago
- 📊 Panel gráfico: ingresos vs gastos por mes, gastos por categoría, KPIs y saldo
- 🔔 Alertas de facturas vencidas o próximas a vencer

## Puesta en marcha (desarrollo)

Requisitos: Node ≥ 20 y PostgreSQL (local o Docker).

```bash
npm install
cp .env.example .env            # ajusta DATABASE_URL y UPLOADS_DIR si hace falta

# Base de datos local sin Docker (usa binarios de postgres del sistema):
bash scripts/dev-db.sh start
npm run db:deploy               # aplica migraciones
npm run db:seed                 # datos de ejemplo (demo@hbm.local / Demo1234)

npm run dev                     # http://localhost:3000
```

> Si tienes Docker, puedes levantar solo la BD con `docker compose up -d db` en vez del script.

## Tests

```bash
npm test                        # unitarios + integración (Vitest) — requiere la BD levantada
npx playwright install chromium # una sola vez
npm run test:e2e                # e2e (Playwright): hace build + start automáticamente
```

## Despliegue (Docker)

Pensado para un servidor de casa u Oracle Cloud. El mismo `docker-compose.yml` levanta app + BD +
volumen de uploads; las migraciones se aplican al arrancar.

```bash
cp .env.example .env            # define al menos POSTGRES_PASSWORD
docker compose up -d --build    # app en el puerto 3000
```

## Estructura

```
src/
  app/(auth)/         Login y registro
  app/(app)/          Panel, gastos, ingresos, facturas, categorías, casas, familia
  app/api/            Route handlers (p. ej. servir archivos de facturas)
  server/auth/        DAL de sesión y autorización (requireFamilia, tenant guard)
  server/db/          Acceso a datos, siempre filtrado por familiaId
  server/storage/     Almacenamiento de archivos (impl. local sobre UPLOADS_DIR)
  lib/                Utilidades, validación (Zod) y formato
  components/         UI (primitivas tipo shadcn, shell, gráficas)
prisma/               schema.prisma, migraciones y seed
tests/e2e/            Tests end-to-end (Playwright)
```

Convención clave: **toda** consulta de datos se filtra por el `familiaId` de la sesión en
`src/server/db/*`. Nunca se confía en el `familiaId` que envíe el cliente.

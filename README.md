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

## Despliegue

En producción (Oracle Cloud, ARM) el despliegue es automático: **cada push a `main` que pase CI
publica una imagen y la instala en el servidor**. Lo describe `.github/workflows/deploy.yml`.

```
push a main
  └─ CI: tipos, lint, unitarios, e2e (escritorio y móvil)
      └─ build de la imagen en un runner ARM nativo → ghcr.io/njuante/hbm
          └─ ssh al servidor: docker compose pull && up -d
              └─ comprueba que los servicios siguen en pie y que el sitio responde 200
```

`docker-compose.prod.yml` levanta Postgres y la app; las migraciones se aplican al arrancar el
contenedor (`docker-entrypoint.sh`). Postgres no publica nada y la app solo escucha en
`127.0.0.1:3000`, así que desde fuera no hay nada accesible: **el TLS lo pone un proxy delante**.

Hay dos formas de poner ese proxy, y en este servidor manda aaPanel:

| | Quién termina el TLS | Cuándo |
| --- | --- | --- |
| **aaPanel** (por defecto) | El nginx del panel, con su Let's Encrypt | El servidor ya tiene aaPanel ocupando el 80 y el 443 |
| **Caddy** | El contenedor `caddy` del compose | Máquina limpia, sin panel. Se activa con `COMPOSE_PROFILES=caddy` en el `.env` |

### Con aaPanel (lo que aplica aquí)

En aaPanel: **Website → Add site** con el dominio `nucahome.me`, y dentro del sitio:

1. **SSL → Let's Encrypt** para emitir el certificado, y activa *Force HTTPS*.
2. **Reverse proxy → Add**, destino `http://127.0.0.1:3000`.
3. Comprueba que la configuración incluye estas cabeceras — aaPanel no siempre pone la de
   `X-Forwarded-Proto`, y sin ella la app no sabe que va por HTTPS:

   ```nginx
   proxy_set_header Host              $host;
   proxy_set_header X-Real-IP         $remote_addr;
   proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   client_max_body_size 25m;   # para subir facturas en PDF o foto
   ```

> **El HTTPS no es cosmético.** En producción la cookie de sesión va marcada `Secure`
> (`src/lib/session.ts`), así que sobre HTTP el navegador la descarta y **el login falla sin dar
> ningún error**.

### Preparar el servidor (una sola vez)

1. **DNS**: en Cloudflare, registro **A** de `nucahome.me` → IP pública de la instancia, con
   **Proxy status: DNS only** (nube gris). Con la nube naranja Cloudflare corta el TLS por su
   cuenta y el reto de Let's Encrypt no llega al servidor.

2. **Los dos cortafuegos de Oracle.** Es el tropiezo clásico: OCI filtra en la *security list* de la
   VCN **y además** la propia máquina trae reglas que solo dejan pasar el 22. Hay que abrir 80 y 443
   en los dos sitios, o Let's Encrypt no podrá validar el dominio:

   ```bash
   # En la consola de OCI: Networking → VCN → Security List → Ingress
   #   0.0.0.0/0 TCP 80 y 443
   # (aaPanel suele abrirlos en la máquina, pero nunca en la security list de OCI)
   # Y en la máquina (Ubuntu):
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   # (En Oracle Linux es firewall-cmd --add-service={http,https} --permanent && firewall-cmd --reload)
   ```

3. **Docker**, si no está: `curl -fsSL https://get.docker.com | sh` y
   `sudo usermod -aG docker $USER`.

4. **El `.env`**, que vive solo en el servidor y nunca en git:

   ```bash
   sudo mkdir -p /www/apps/hbm && cd /www/apps/hbm
   # Hexadecimal a propósito: la contraseña viaja dentro de DATABASE_URL, y un
   # `@`, `:` o `/` la partiría en dos al interpretarse la URL.
   printf 'POSTGRES_PASSWORD=%s\nDOMAIN=nucahome.me\n' "$(openssl rand -hex 32)" > .env
   chmod 600 .env
   ```

5. **El paquete de GHCR ya es público**, así que el servidor descarga la imagen sin credenciales.
   Si alguna vez lo pasas a privado, habrá que autenticar el `docker pull` en la máquina.

### Configurar GitHub

Secretos (Settings → Secrets and variables → Actions):

| Secreto            | Qué es                                                       |
| ------------------ | ------------------------------------------------------------ |
| `SSH_HOST`         | IP pública de la instancia                                   |
| `SSH_USER`         | Usuario de acceso (`ubuntu` o `opc` según la imagen)          |
| `SSH_KEY`          | Clave **privada** de despliegue, entera                       |
| `SSH_KNOWN_HOSTS`  | *Opcional.* Salida de `ssh-keyscan <IP>`. Si no está, la primera conexión acepta la huella que responda y la ancla a partir de ahí |

Variables opcionales: `DEPLOY_PATH` (por defecto `/www/apps/hbm`) y `DOMAIN`.

Conviene una clave dedicada solo a desplegar, no la personal:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/hbm_deploy -C "github-actions" -N ""
ssh-copy-id -i ~/.ssh/hbm_deploy.pub usuario@IP

gh secret set SSH_KEY < ~/.ssh/hbm_deploy
gh secret set SSH_HOST --body "IP"
gh secret set SSH_USER --body "ubuntu"
# Opcional pero recomendable: fija la huella del servidor de antemano.
gh secret set SSH_KNOWN_HOSTS --body "$(ssh-keyscan IP 2>/dev/null)"
```

Sin `SSH_KNOWN_HOSTS` el despliegue funciona igual, pero esa primera conexión confía en quien
conteste. En una red que no controlas, alguien en medio podría hacerse pasar por el servidor y
quedarse con la clave de despliegue. Una vez anclada la huella, los despliegues siguientes ya
detectarían el cambio.

### Volver atrás

Cada imagen queda etiquetada con el sha del commit, así que revertir es apuntar a la anterior sin
recompilar nada:

```bash
cd /www/apps/hbm
APP_IMAGE=ghcr.io/njuante/hbm:sha-<commit> docker compose -f docker-compose.prod.yml up -d
```

Ojo: eso no deshace una migración de base de datos ya aplicada.

### Desarrollo local con Docker

`docker-compose.yml` (sin `.prod`) sigue sirviendo para levantar todo en local compilando la imagen
al vuelo, sin Caddy ni registry:

```bash
cp .env.example .env
docker compose up -d --build    # app en el puerto 3000
```

## Móvil

**iOS — PWA.** Se instala desde Safari con «Añadir a pantalla de inicio»; no hay proyecto Xcode.
Requiere que el sitio se sirva por HTTPS, o iOS no lo trata como instalable.

**Android — APK con Capacitor.** HBM se renderiza en el servidor (Server Actions, Prisma, sesión
en cookie), así que **no se puede empaquetar dentro del APK**: el APK es una ventana sobre el
despliegue real y necesita su URL.

```bash
# Node ≥ 22 (lo exige el CLI de Capacitor; el resto del proyecto va con 20)
CAP_SERVER_URL=https://hbm.tudominio.com npm run cap:sync
cd android && ./gradlew assembleRelease
```

Para que el APK salga firmado, crea `android/keystore.properties` (está fuera de git):

```properties
storeFile=hbm-release.jks
storePassword=…
keyAlias=hbm
keyPassword=…
```

y genera la clave una sola vez con
`keytool -genkeypair -v -keystore android/hbm-release.jks -alias hbm -keyalg RSA -keysize 2048 -validity 10000`.
Guárdala bien: si se pierde, no se pueden publicar actualizaciones de la misma app. Sin ese
fichero el build sigue funcionando, pero el APK sale sin firmar y no se puede instalar.

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

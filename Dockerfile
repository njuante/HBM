# syntax=docker/dockerfile:1

# ── Dependencias ─────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Genera el cliente de Prisma y compila Next (salida standalone).
ENV BUILD_STANDALONE=1
RUN npx prisma generate
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# El CLI de Prisma, que hace falta en el arranque para aplicar migraciones.
#
# Va ANTES de copiar la salida standalone, y a propósito: `npm init` escribe un
# package.json y el standalone trae el suyo, que es el que tiene que mandar. Al
# copiarlo después, el de Next se impone y el node_modules se fusiona.
#
# Y se instala en vez de copiar node_modules/prisma y @prisma desde el build:
# copiarlos a mano dejaba fuera transitivas suyas —`effect` entre ellas— y el
# contenedor moría al arrancar con «Cannot find module 'effect'», reiniciándose
# en bucle sin llegar a migrar nunca. La versión sale del package.json del
# proyecto para que no se desincronice con la de desarrollo.
COPY --from=builder /app/package.json /tmp/pkg.json
# Sin `--ignore-scripts` a propósito: el postinstall de Prisma es justo lo que
# descarga el motor de migraciones (schema-engine). Sin él, el CLI intenta
# bajarlo en caliente al arrancar, sobre una carpeta de root y con el proceso
# corriendo como `nextjs`, y muere con «Can't write to /app/node_modules».
RUN VERSION=$(node -p "require('/tmp/pkg.json').devDependencies.prisma") \
 && npm init -y > /dev/null \
 && npm install --omit=optional --no-audit --no-fund "prisma@$VERSION" \
 && rm -f /tmp/pkg.json \
 && npm cache clean --force \
 && chown -R nextjs:nodejs /app/node_modules

# Artefactos de la salida standalone de Next. Su package.json sustituye al que
# dejó `npm init`, y su node_modules se mezcla con el del CLI.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Schema y migraciones, para poder migrar en el arranque.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

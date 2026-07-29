#!/bin/sh
set -e

# Aplica migraciones pendientes antes de arrancar la app.
echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

echo "Arrancando la aplicación..."
exec "$@"

#!/bin/sh
set -e

# Aplica migraciones pendientes antes de arrancar la app.
#
# Se invoca el fichero del CLI directamente y no `npx prisma`: la imagen final
# copia `node_modules/prisma` pero no el enlace `node_modules/.bin/prisma`, que
# es donde `npx` busca. Sin esto el contenedor moría con «prisma: not found» y
# se reiniciaba en bucle sin llegar a migrar nunca.
echo "Aplicando migraciones de base de datos..."
node node_modules/prisma/build/index.js migrate deploy

echo "Arrancando la aplicación..."
exec "$@"
